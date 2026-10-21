export function teamForUser(db, id) { return db.teams.find(t => t.memberIds.includes(id)); }
export function canManage(team, id) { return team.ownerId === id || team.coachId === id; }
export function createTeam(db, user, values) {
  if (!db.users.some(u => u.id === user.id)) throw new Error('Sign in before creating a team.');
  if (teamForUser(db, user.id)) throw new Error('Leave your current team before creating another.');
  if (!values.name.trim()) throw new Error('Enter a team name.');
  let code;
  do { code = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join(''); } while (db.teams.some(t => t.code === code));
  return { id: crypto.randomUUID(), name: values.name.trim(), description: values.description.trim(), logo: values.logo || '', coachId: values.coachSelf ? user.id : null, coachInvitationName: values.coachName?.trim() || '', ownerId: user.id, memberIds: [user.id], code };
}
export function joinTeam(db, userId, code) {
  if (!db.users.some(u => u.id === userId)) throw new Error('Sign in before joining a team.');
  if (teamForUser(db, userId)) throw new Error('You already belong to a team.');
  const team = db.teams.find(t => t.code === code.trim().toUpperCase());
  if (!team) throw new Error('No team with that code exists in this browser. Shared team codes need a server.');
  return { ...db, teams: db.teams.map(t => t.id === team.id ? { ...t, memberIds: [...t.memberIds, userId] } : t) };
}
export function editTeam(db, actorId, teamId, changes) {
  const team = db.teams.find(t => t.id === teamId);
  if (!team || !canManage(team, actorId)) throw new Error('Only the owner or assigned coach can manage this team.');
  if (changes.coachId && !team.memberIds.includes(changes.coachId)) throw new Error('The coach must be a team member.');
  if (changes.name !== undefined && !changes.name.trim()) throw new Error('Enter a team name.');
  const allowed = Object.fromEntries(Object.entries(changes).filter(([key]) => ['name', 'description', 'logo', 'coachId', 'coachInvitationName'].includes(key)));
  return { ...db, teams: db.teams.map(t => t.id === teamId ? { ...t, ...allowed } : t) };
}
export function removeMember(db, actorId, teamId, memberId) {
  const team = db.teams.find(t => t.id === teamId);
  if (!team || (!canManage(team, actorId) && memberId !== actorId)) throw new Error('You do not have permission to remove this member.');
  if (team.ownerId === memberId) throw new Error('The team owner must delete the team before leaving.');
  if (!team.memberIds.includes(memberId)) throw new Error('This user is not a team member.');
  return { ...db, teams: db.teams.map(t => t.id === teamId ? { ...t, coachId: t.coachId === memberId ? null : t.coachId, memberIds: t.memberIds.filter(id => id !== memberId) } : t) };
}
