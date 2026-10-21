import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDatabase, loadDatabase, saveDatabase, updateUser, deleteAccount, validateUsername } from '../src/data/storage.js';
import { createAccount, authenticate } from '../src/auth/service.js';
import { lessons, categories } from '../src/lessons/content.js';
import { completeLesson, trainingStats, nextLesson, achievements } from '../src/xp/progress.js';
import { createTeam, joinTeam, editTeam, removeMember, canManage, teamForUser } from '../src/teams/service.js';

const values = { firstName: 'Jordan', lastName: 'Taylor', username: 'jtaylor', email: 'jordan@example.com', password: 'CorrectHorse42' };
async function fixture() {
  const owner = await createAccount(emptyDatabase(), values);
  const db = { ...emptyDatabase(), users: [owner], session: owner.id };
  const member = await createAccount(db, { ...values, username: 'samplayer', email: 'sam@example.com', firstName: 'Sam' });
  db.users.push(member);
  return { db, owner, member };
}
test('all training categories contain complete, uniquely identified lessons and valid checks', () => {
  assert.equal(lessons.length, 21);
  assert.equal(new Set(lessons.map(l => l.id)).size, lessons.length);
  for (const category of categories) assert.ok(lessons.filter(l => l.category === category.id).length >= 3);
  for (const l of lessons) {
    assert.ok(l.sections.length >= 3);
    assert.ok(l.sections.every(s => s.text.length > 150));
    assert.ok([25, 50, 75, 100].includes(l.xp));
    assert.ok(l.check.answer >= 0 && l.check.answer < l.check.options.length);
  }
});
test('account authentication stores salted hashes, validates passwords, and rejects duplicates', async () => {
  const { db, owner, member } = await fixture();
  assert.ok(!JSON.stringify(owner).includes(values.password));
  assert.notEqual(owner.credentials.salt, member.credentials.salt);
  assert.notEqual(owner.credentials.hash, member.credentials.hash);
  assert.equal((await authenticate(db, 'JORDAN@example.com', values.password)).id, owner.id);
  await assert.rejects(authenticate(db, values.email, 'wrong-password'));
  await assert.rejects(createAccount(db, { ...values, username: 'different' }), /email already exists/);
  await assert.rejects(createAccount(db, { ...values, email: 'new@example.com', username: 'JTAYLOR' }), /username is already taken/);
  await assert.rejects(createAccount(db, { ...values, email: 'new@example.com', username: 'new_user', password: 'short' }), /at least 8/);
});
test('XP is earned once, preserves the completion timestamp, and does not follow future reward edits', async () => {
  const { owner } = await fixture(); const l = lessons[0];
  const first = completeLesson(owner, l, '2026-10-16T18:00:00Z');
  const reviewed = completeLesson(first.user, l, '2026-10-17T18:00:00Z');
  assert.equal(first.earned, l.xp); assert.equal(reviewed.earned, 0);
  assert.equal(reviewed.user.completed[l.id].at, first.user.completed[l.id].at);
  assert.equal(trainingStats(reviewed.user, lessons).xp, l.xp);
  assert.equal(trainingStats(reviewed.user, lessons.map(x => x.id === l.id ? { ...x, xp: 100 } : x)).xp, l.xp);
  assert.equal(nextLesson(reviewed.user, lessons).id, lessons[1].id);
  assert.equal(owner.completed[l.id], undefined);
});
test('completion progress and account sessions survive storage round trips without leaking to another account', async () => {
  const { db, owner, member } = await fixture();
  const storage = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
  const updated = completeLesson(owner, lessons[0]).user;
  const next = updateUser(db, owner.id, { completed: updated.completed, progress: { ...updated.progress, [lessons[1].id]: 1 }, firstName: 'New Name' });
  saveDatabase(next, storage); const restored = loadDatabase(storage);
  assert.equal(restored.session, owner.id);
  assert.equal(restored.users[0].firstName, 'New Name');
  assert.equal(restored.users[0].progress[lessons[1].id], 1);
  assert.equal(trainingStats(restored.users[0], lessons).xp, lessons[0].xp);
  assert.equal(trainingStats(restored.users.find(u => u.id === member.id), lessons).xp, 0);
  storage.value = '{bad-json'; assert.throws(() => loadDatabase(storage));
});
test('achievements unlock from actual earned progress and all lessons reach 100 percent', async () => {
  let { owner: user } = await fixture();
  assert.ok(achievements.every(a => !a.test(trainingStats(user, lessons))));
  user = completeLesson(user, lessons[0]).user;
  assert.equal(achievements[0].test(trainingStats(user, lessons)), true);
  assert.equal(achievements[1].test(trainingStats(user, lessons)), false);
  for (const l of lessons) user = completeLesson(user, l).user;
  const stats = trainingStats(user, lessons);
  assert.equal(stats.percent, 100); assert.equal(stats.remaining, 0);
  assert.equal(stats.xp, lessons.reduce((sum, l) => sum + l.xp, 0));
  assert.ok(achievements.every(a => a.test(stats)));
  assert.equal(nextLesson(user, lessons), undefined);
});
test('teams validate invitations, enforce management roles, and allow members to leave', async () => {
  let { db, owner, member } = await fixture();
  const team = createTeam(db, owner, { name: 'Wildcats', description: '', coachSelf: false }); db.teams.push(team);
  assert.match(team.code, /^[A-Z2-9]{8}$/); assert.equal(team.coachId, null);
  assert.throws(() => joinTeam(db, member.id, 'BADCODE1'), /No team/);
  db = joinTeam(db, member.id, team.code.toLowerCase());
  assert.equal(teamForUser(db, member.id).id, team.id);
  assert.throws(() => joinTeam(db, member.id, team.code), /already belong/);
  assert.throws(() => createTeam(db, member, { name: 'Other', description: '' }), /Leave your current/);
  assert.throws(() => editTeam(db, member.id, team.id, { name: 'Hacked' }), /Only the owner/);
  assert.throws(() => removeMember(db, member.id, team.id, owner.id), /permission/);
  assert.throws(() => editTeam(db, owner.id, team.id, { coachId: 'missing' }), /must be a team member/);
  db = editTeam(db, owner.id, team.id, { coachId: member.id });
  assert.equal(canManage(db.teams[0], member.id), true);
  db = editTeam(db, member.id, team.id, { name: 'New Team', ownerId: member.id, code: 'BAD' });
  assert.equal(db.teams[0].name, 'New Team'); assert.equal(db.teams[0].ownerId, owner.id); assert.equal(db.teams[0].code, team.code);
  db = removeMember(db, member.id, team.id, member.id);
  assert.equal(db.teams[0].coachId, null); assert.equal(teamForUser(db, member.id), undefined);
  assert.throws(() => removeMember(db, owner.id, team.id, owner.id), /owner must delete/);
});
test('deleting an account removes its membership and owned teams without deleting others’ training', async () => {
  let { db, owner, member } = await fixture();
  const owned = createTeam(db, owner, { name: 'Owner Team', description: '', coachSelf: true }); db.teams.push(owned);
  db = joinTeam(db, member.id, owned.code);
  const trained = completeLesson(member, lessons[0]); db = updateUser(db, member.id, { completed: trained.user.completed });
  const remaining = deleteAccount(db, owner.id);
  assert.equal(remaining.session, null); assert.equal(remaining.teams.length, 0);
  assert.equal(remaining.users.length, 1); assert.equal(trainingStats(remaining.users[0], lessons).xp, lessons[0].xp);
});
test('profile uniqueness is case-insensitive while an unchanged username is valid', async () => {
  const { db, owner, member } = await fixture();
  assert.doesNotThrow(() => validateUsername(db, owner.username, owner.id));
  assert.throws(() => validateUsername(db, owner.username.toUpperCase(), member.id));
  assert.throws(() => validateUsername(db, 'bad name', owner.id));
});
