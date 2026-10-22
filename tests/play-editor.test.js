import test from 'node:test';
import assert from 'node:assert/strict';
import { samplePlay } from '../src/scenarios/editor/samplePlay.js';
import { applyChanges, alignmentWarnings, clone, historyReducer, initialHistory, scenarioData, upsertChange } from '../src/scenarios/editor/model.js';
import { crossedAssignments, smoothPath } from '../src/scenarios/editor/geometry.js';
import { cleanRoute, interpretDrawing } from '../src/scenarios/editor/recognition.js';
import { PLAY_STORAGE_KEY, readVersions, removeVersion, saveVersion } from '../src/scenarios/editor/versions.js';

const receiver = samplePlay.players.find(p => p.id === 'WR1');
const rb = samplePlay.players.find(p => p.id === 'RB');
const routeEdit = (selected = true) => ({ id: 'edit-wr1', type: 'set-assignment', playerId: 'WR1', routeId: 'WR1-route', kind: 'route', label: 'Post', points: [{ x: 5, y: 60 }, { x: 5, y: 50 }, { x: 17, y: 38 }], selected });
const move = (selected = true) => ({ id: 'move-rb', type: 'move-player', playerId: 'RB', position: { x: 22, y: 66 }, selected });
function storage() { const data = new Map([['gameiq.local.v1', 'private account data']]); return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; }

test('the example has 22 stable player identities, valid origins, and no baseline alignment warning', () => {
  assert.equal(samplePlay.players.length, 22);
  assert.deepEqual(scenarioData(samplePlay), samplePlay);
  assert.deepEqual(alignmentWarnings(samplePlay), []);
});
test('applying a checked route and unchecked move changes only the intended assignment', () => {
  const before = clone(samplePlay);
  const updated = applyChanges(samplePlay, [routeEdit(), move(false)]);
  assert.deepEqual(updated.players, samplePlay.players);
  assert.deepEqual(updated.field, samplePlay.field);
  assert.equal(updated.offenseDirection, samplePlay.offenseDirection);
  assert.equal(updated.assignments.find(a => a.id === 'WR1-route').label, 'Post');
  for (const assignment of samplePlay.assignments.filter(a => a.id !== 'WR1-route')) assert.deepEqual(updated.assignments.find(a => a.id === assignment.id), assignment);
  assert.deepEqual(samplePlay, before);
});
test('moving a player anchors all its assignments and leaves unrelated players and routes unchanged', () => {
  const updated = applyChanges(samplePlay, [move()]);
  assert.deepEqual(updated.players.find(p => p.id === 'RB'), { ...rb, x: 22 });
  assert.equal(updated.assignments.find(a => a.id === 'RB-route').points[0].x, 22);
  for (const assignment of samplePlay.assignments.filter(a => a.playerId !== 'RB')) assert.deepEqual(updated.assignments.find(a => a.id === assignment.id), assignment);
  assert.deepEqual(updated.field.ball, samplePlay.field.ball);
});
test('route and move selection are independent and their order cannot detach a route', () => {
  const movedReceiver = { ...move(), playerId: 'WR1', position: { x: 9, y: 60 } };
  const fromMovedOrigin = { ...routeEdit(), points: [{ x: 9, y: 60 }, { x: 9, y: 50 }, { x: 21, y: 38 }] };
  const routeOnly = applyChanges(samplePlay, [fromMovedOrigin, { ...movedReceiver, selected: false }]);
  assert.deepEqual(routeOnly.assignments.find(a => a.id === 'WR1-route').points[0], { x: receiver.x, y: receiver.y });
  const first = applyChanges(samplePlay, [fromMovedOrigin, movedReceiver]);
  const second = applyChanges(samplePlay, [movedReceiver, fromMovedOrigin]);
  assert.deepEqual(first, second);
  assert.deepEqual(first.assignments.find(a => a.id === 'WR1-route').points[0], { x: 9, y: 60 });
});
test('only selected removals delete routes and conflicting edits coalesce by exact identity', () => {
  const removal = { id: 'delete', type: 'remove-assignment', routeId: 'WR1-route', playerId: 'WR1', selected: true };
  const updated = applyChanges(samplePlay, [removal, { ...removal, routeId: 'WR2-route', playerId: 'WR2', selected: false }]);
  assert.equal(updated.assignments.length, samplePlay.assignments.length - 1);
  assert.ok(updated.assignments.some(a => a.id === 'WR2-route'));
  assert.equal(upsertChange([routeEdit(), move()], removal).length, 2);
  assert.equal(upsertChange([routeEdit(), move()], removal).find(c => c.routeId === 'WR1-route').type, 'remove-assignment');
});
test('rough post, slant, out, cross, and blitz drawings receive reviewable interpretations', () => {
  const post = interpretDrawing([{ x: 5, y: 60 }, { x: 5.3, y: 57 }, { x: 4.8, y: 53 }, { x: 5, y: 50 }, { x: 9, y: 46 }, { x: 17, y: 38 }], receiver, 'route', samplePlay);
  assert.equal(post.label, 'Post'); assert.equal(post.points.length, 3);
  assert.equal(interpretDrawing([{ x: 5, y: 60 }, { x: 11, y: 53 }], receiver, 'route', samplePlay).label, 'Slant');
  const wr2 = samplePlay.players.find(p => p.id === 'WR2');
  assert.equal(interpretDrawing([{ x: 48, y: 60 }, { x: 48, y: 51 }, { x: 52, y: 51 }], wr2, 'route', samplePlay).label, 'Out');
  assert.equal(interpretDrawing([{ x: 5, y: 60 }, { x: 5, y: 55 }, { x: 20, y: 55 }], receiver, 'route', samplePlay).label, 'Cross');
  const lb = samplePlay.players.find(p => p.id === 'LB1');
  const blitz = interpretDrawing([{ x: lb.x, y: lb.y }, { x: 26, y: 65 }], lb, 'coverage', samplePlay);
  assert.equal(blitz.kind, 'blitz'); assert.equal(blitz.label, 'Blitz');
});
test('custom multi-turn paths preserve intent and render as rounded vector segments', () => {
  const path = [{ x: 5, y: 60 }, { x: 5, y: 51 }, { x: 14, y: 51 }, { x: 14, y: 44 }, { x: 9, y: 39 }];
  const custom = interpretDrawing(path, receiver, 'route', samplePlay);
  assert.equal(custom.label, 'Custom smooth'); assert.ok(custom.points.length >= 4);
  assert.deepEqual(custom.points.at(-1), path.at(-1));
  assert.ok(smoothPath(custom.points).includes(' Q '));
  assert.deepEqual(cleanRoute('Custom smooth', path, receiver, samplePlay), path);
});
test('cross-out geometry targets intersected assignments rather than unrelated routes', () => {
  const hits = crossedAssignments([{ x: 2, y: 40 }, { x: 8, y: 42 }], samplePlay.assignments);
  assert.deepEqual(hits.map(a => a.id), ['WR1-route']);
});
test('undo and redo restore drawing edits, selection, deletion, and invalidate an obsolete redo branch', () => {
  let state = historyReducer(initialHistory(), { type: 'change', value: [routeEdit()] });
  state = historyReducer(state, { type: 'change', value: [routeEdit(), move(false)] });
  state = historyReducer(state, { type: 'undo' }); assert.equal(state.present.length, 1);
  state = historyReducer(state, { type: 'redo' }); assert.equal(state.present[1].selected, false);
  state = historyReducer(state, { type: 'change', value: [] });
  state = historyReducer(state, { type: 'undo' }); assert.equal(state.present.length, 2);
  state = historyReducer(state, { type: 'change', value: [move()] }); assert.equal(state.future.length, 0);
});
test('alignment warnings identify offside, covered receivers, moved centers, and overlaps without auto-moving players', () => {
  const play = clone(samplePlay);
  play.players.find(p => p.id === 'LB1').y = 61;
  play.players.find(p => p.id === 'C').x = 25;
  play.players.find(p => p.id === 'WR3').y = 60;
  play.players.find(p => p.id === 'RB').x = 80 / 3; play.players.find(p => p.id === 'RB').y = 65;
  const warnings = alignmentWarnings(play).join(' ');
  assert.match(warnings, /offside/); assert.match(warnings, /center/); assert.match(warnings, /covered/); assert.match(warnings, /overlap/);
  assert.equal(play.players.find(p => p.id === 'LB1').y, 61);
});
test('play-only version storage keeps original and updated diagrams separate, preserves parents, and never stores accounts or raw strokes', () => {
  const store = storage();
  const updated = applyChanges(samplePlay, [routeEdit()]);
  updated.email = 'not-saved@example.com'; updated.credentials = { password: 'never-save' }; updated.rawPoints = [1, 2];
  let result = saveVersion({ original: samplePlay, updated, name: 'Modified Routes' }, store);
  assert.equal(result.versions.length, 2);
  assert.deepEqual(result.versions[0].scenario, samplePlay);
  assert.equal(result.saved.scenario.assignments.find(a => a.id === 'WR1-route').label, 'Post');
  const version2 = result.saved.id;
  result = saveVersion({ original: samplePlay, updated, parentId: version2, name: 'Blitz Adjustment' }, store);
  assert.equal(result.saved.parentId, version2);
  assert.equal(readVersions(store).length, 3);
  assert.equal(store.data.get('gameiq.local.v1'), 'private account data');
  assert.ok(!store.data.get(PLAY_STORAGE_KEY).includes('never-save'));
  assert.ok(!store.data.get(PLAY_STORAGE_KEY).includes('not-saved@example.com'));
  assert.ok(!store.data.get(PLAY_STORAGE_KEY).includes('rawPoints'));
});
test('corrupt versions, invalid points, duplicate identities, and quota failures surface errors without overwriting saved data', () => {
  const store = storage(); store.data.set(PLAY_STORAGE_KEY, 'broken');
  assert.throws(() => readVersions(store), /left untouched/);
  assert.throws(() => saveVersion({ original: samplePlay, updated: samplePlay }, store));
  assert.equal(store.data.get(PLAY_STORAGE_KEY), 'broken');
  const bad = clone(samplePlay); bad.players[0].x = NaN; assert.throws(() => scenarioData(bad));
  const duplicate = clone(samplePlay); duplicate.players[0].id = 'QB'; assert.throws(() => scenarioData(duplicate));
  assert.throws(() => saveVersion({ original: samplePlay, updated: samplePlay }, { getItem: () => null, setItem: () => { throw new Error('quota'); } }), /Could not save/);
});

test('removing a saved version protects its original and reconnects descendants without changing their diagrams', () => {
  const store = storage();
  const one = saveVersion({ original: samplePlay, updated: applyChanges(samplePlay, [routeEdit()]) }, store);
  const two = saveVersion({ original: samplePlay, updated: applyChanges(samplePlay, [move()]), parentId: one.saved.id }, store);
  assert.throws(() => removeVersion(samplePlay.id, store), /modified versions/);
  const remaining = removeVersion(one.saved.id, store);
  assert.equal(remaining.length, 2);
  assert.equal(remaining[1].parentId, samplePlay.id);
  assert.deepEqual(remaining[1].scenario, two.saved.scenario);
  assert.equal(store.data.get('gameiq.local.v1'), 'private account data');
});
