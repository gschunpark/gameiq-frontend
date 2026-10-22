import { distance } from './geometry.js';

export const clone = value => structuredClone(value);
export const newId = () => globalThis.crypto?.randomUUID?.() || `play-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function applyChanges(original, changes) {
  const play = clone(original);
  const selected = changes.filter(c => c.selected !== false);
  // Apply moves first; path edits remain relative to their own player's final origin.
  for (const change of selected.filter(c => c.type === 'move-player')) {
    const player = play.players.find(p => p.id === change.playerId);
    if (!player) throw new Error('The selected player no longer exists.');
    const dx = change.position.x - player.x, dy = change.position.y - player.y;
    Object.assign(player, change.position);
    for (const route of play.assignments.filter(a => a.playerId === player.id)) route.points = route.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
  }
  for (const change of selected.filter(c => c.type !== 'move-player')) {
    const player = play.players.find(p => p.id === change.playerId);
    if (!player) throw new Error('The selected player no longer exists.');
    if (change.type === 'remove-assignment') {
      play.assignments = play.assignments.filter(a => !(a.id === change.routeId && a.playerId === player.id));
    } else if (change.type === 'set-assignment') {
      const origin = change.points[0];
      const route = { id: change.routeId, playerId: player.id, kind: change.kind, label: change.label, points: change.points.map(p => ({ x: p.x + player.x - origin.x, y: p.y + player.y - origin.y })) };
      const existing = play.assignments.findIndex(a => a.id === route.id && a.playerId === player.id);
      if (existing >= 0) play.assignments[existing] = route;
      else play.assignments.push(route);
    }
  }
  return play;
}
export function upsertChange(changes, next) {
  const target = c => c.type === 'move-player' ? `move:${c.playerId}` : `route:${c.routeId}`;
  return [...changes.filter(c => target(c) !== target(next)), { ...next, selected: next.selected !== false }];
}
export const initialHistory = () => ({ past: [], present: [], future: [] });
export function historyReducer(state, action) {
  if (action.type === 'reset') return initialHistory();
  if (action.type === 'undo') return state.past.length ? { past: state.past.slice(0, -1), present: state.past.at(-1), future: [state.present, ...state.future] } : state;
  if (action.type === 'redo') return state.future.length ? { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) } : state;
  const next = typeof action.value === 'function' ? action.value(state.present) : action.value;
  if (!next) return state;
  return { past: [...state.past.slice(-79), state.present], present: next, future: [] };
}
export function changeDescription(change, play) {
  const player = play.players.find(p => p.id === change.playerId);
  if (change.type === 'move-player') {
    const qb = play.players.find(p => p.id === 'QB');
    const position = player?.id === 'RB' && qb ? ` to the ${change.position.x < qb.x ? 'left' : 'right'} of the quarterback` : ` to x ${change.position.x.toFixed(1)}, yard ${change.position.y.toFixed(1)}`;
    return `${change.playerId} — Move starting position${position}.`;
  }
  const previous = play.assignments.find(a => a.id === change.routeId);
  if (change.type === 'remove-assignment') return `${change.playerId} — Remove ${previous?.label || 'selected assignment'}.`;
  return `${change.playerId} — ${previous ? `Change ${previous.label} to` : 'Add'} ${change.label.toLowerCase()}${change.kind === 'route' ? ' route' : ''}.`;
}

export function alignmentWarnings(play) {
  const warnings = [];
  const offense = play.players.filter(p => p.side === 'offense'), defense = play.players.filter(p => p.side === 'defense');
  const los = play.field.lineOfScrimmage;
  if (offense.length !== 11 || defense.length !== 11) warnings.push('This 11-on-11 example should contain eleven players on each side.');
  for (const p of play.players) {
    if (p.x < 0 || p.x > play.field.width || p.y < 0 || p.y > 100) warnings.push(`${p.id} is outside the field. Move the player inbounds.`);
    if (p.side === 'offense' && p.y < los - 0.5) warnings.push(`${p.id} is beyond the line of scrimmage before the snap.`);
    if (p.side === 'defense' && p.y >= los - 0.5) warnings.push(`${p.id} may be in the neutral zone or offside.`);
    if (p.side === 'offense' && p.y > los + 0.5 && p.y < los + 1) warnings.push(`${p.id} is not clearly on or off the line. Check the alignment.`);
  }
  const onLine = offense.filter(p => Math.abs(p.y - los) <= 0.5).sort((a, b) => a.x - b.x);
  if (onLine.length < 7) warnings.push('Fewer than seven offensive players are on the line. Check the formation against your league’s rules.');
  for (const p of onLine.slice(1, -1).filter(p => p.eligible)) warnings.push(`${p.id} is covered by an outside player on the line and may be ineligible for a forward pass.`);
  const center = offense.find(p => p.id === 'C');
  if (center && distance(center, play.field.ball) > 0.8) warnings.push('The center has moved away from the football. Keep the center over the snap spot.');
  for (let i = 0; i < play.players.length; i++) for (let j = i + 1; j < play.players.length; j++) if (distance(play.players[i], play.players[j]) < 1.5) warnings.push(`${play.players[i].id} and ${play.players[j].id} overlap. Separate their starting positions.`);
  for (const a of play.assignments) {
    const p = play.players.find(p => p.id === a.playerId);
    if (!p || !a.points.length || distance(p, a.points[0]) > 0.05) warnings.push(`${a.playerId} has an assignment disconnected from its starting position.`);
    if (a.kind === 'route' && p && !p.eligible) warnings.push(`${p.id} is marked as an ineligible lineman. Review this receiving route with your coach.`);
    if (a.points.some(p => p.x < 0 || p.x > play.field.width || p.y < 0 || p.y > 100)) warnings.push(`${a.playerId} has an assignment outside the field. Adjust the path.`);
  }
  return [...new Set(warnings)];
}

// A strict boundary for the future scenario generator and the local version store.
export function scenarioData(value) {
  const point = p => {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 160 / 3 || p.y < 0 || p.y > 100) throw new Error('A play contains an invalid field coordinate.');
    return { x: p.x, y: p.y };
  };
  const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
  if (value?.schema !== 1 || value.offenseDirection !== 'up' || Math.abs(value.field?.width - 160 / 3) > 0.001 || value.field?.length !== 100 || !Array.isArray(value.players) || value.players.length !== 22 || !Array.isArray(value.assignments) || value.assignments.length > 100) throw new Error('This play has an unsupported format.');
  const players = value.players.map(p => {
    if (!['offense', 'defense'].includes(p.side) || !p.id || !p.label) throw new Error('Invalid player data.');
    return { id: text(p.id, 64), label: text(p.label, 12), ...point(p), side: p.side, eligible: !!p.eligible };
  });
  if (new Set(players.map(p => p.id)).size !== 22 || players.filter(p => p.side === 'offense').length !== 11) throw new Error('Player identities must be unique in an 11-on-11 play.');
  const assignments = value.assignments.map(a => {
    if (!a.id || !players.some(p => p.id === a.playerId) || !['route', 'block', 'coverage', 'blitz', 'movement'].includes(a.kind) || !Array.isArray(a.points) || a.points.length < 2 || a.points.length > 512) throw new Error('Invalid assignment data.');
    return { id: text(a.id, 100), playerId: a.playerId, kind: a.kind, label: text(a.label, 80), points: a.points.map(point) };
  });
  if (new Set(assignments.map(a => a.id)).size !== assignments.length) throw new Error('Assignment identities must be unique.');
  const field = { width: 160 / 3, length: 100, lineOfScrimmage: value.field.lineOfScrimmage, firstDown: value.field.firstDown, ball: point(value.field.ball) };
  if (![field.lineOfScrimmage, field.firstDown].every(v => Number.isFinite(v) && v >= 0 && v <= 100)) throw new Error('Invalid field markings.');
  return { schema: 1, id: text(value.id, 100), title: text(value.title, 120), source: text(value.source, 60), description: text(value.description, 600), offenseDirection: 'up', field, players, assignments };
}
