import { clamp, distance, simplify } from './geometry.js';

export const routeLabels = ['Custom smooth', 'Go', 'Slant', 'Post', 'Out', 'Cross'];
export const defenseLabels = ['Custom smooth', 'Blitz', 'Zone adjustment', 'Man assignment'];

// Deterministic on-device geometry, not an AI/model call. The interface accepts
// structured paths so a future authenticated recognition service can replace it.
export function interpretDrawing(raw, player, kind, play) {
  const points = simplify(raw, 1);
  const start = points[0], end = points.at(-1);
  const inward = player.x < play.field.width / 2 ? 1 : -1;
  const dx = end.x - start.x, depth = start.y - end.y;
  let label = 'Custom smooth', confidence = 0.45;
  if (kind === 'block') return { label: 'Blocking assignment', kind, confidence: 0.9, points, explanation: 'Smoothed blocking path. Review the target and legality with your coach.' };
  if (kind === 'movement') return { label: 'Player movement', kind, confidence: 0.8, points, explanation: 'Smoothed movement path; no route category is imposed.' };
  if (player.side === 'defense') {
    const qb = play.players.find(p => p.id === 'QB');
    if (qb && distance(end, qb) < 5 && end.y > start.y + 2) { label = 'Blitz'; kind = 'blitz'; confidence = 0.85; }
    else { label = 'Zone adjustment'; kind = 'coverage'; confidence = 0.55; }
  } else if (points.length <= 2 && depth > 5 && Math.abs(dx) < Math.max(1.7, depth * 0.12)) { label = 'Go'; confidence = 0.9; }
  else if (points.length <= 2 && depth > 2 && dx * inward > 2 && Math.abs(dx) / depth < 1.8) { label = 'Slant'; confidence = 0.7; }
  else if (points.length === 3) {
    const bend = points[1];
    const firstDepth = start.y - bend.y, secondDepth = bend.y - end.y;
    const secondX = end.x - bend.x;
    const startsVertical = firstDepth > 3 && Math.abs(bend.x - start.x) < 2;
    if (startsVertical && secondX * inward > 3 && secondDepth > 3) { label = 'Post'; confidence = 0.82; }
    else if (startsVertical && Math.abs(secondDepth) < 2.5 && secondX * inward < -3) { label = 'Out'; confidence = 0.85; }
    else if (firstDepth > 0 && Math.abs(secondDepth) < 2.5 && secondX * inward > 4) { label = 'Cross'; confidence = 0.78; }
  }
  return { label, kind, confidence, points: cleanRoute(label, points, player, play), explanation: label === 'Custom smooth' ? 'Custom path preserved. Review or choose a route type before applying.' : `Suggested ${label.toLowerCase()} from the path’s geometry. Confirm or correct this interpretation.` };
}

export function cleanRoute(label, points, player, play) {
  if (!points.length) return [];
  const start = { ...points[0] }, end = { ...points.at(-1) };
  const inward = player.x < play.field.width / 2 ? 1 : -1;
  const depth = Math.max(5, start.y - end.y);
  const width = Math.max(5, Math.abs(end.x - start.x));
  const keepInField = p => ({ x: clamp(p.x, 0.4, play.field.width - 0.4), y: clamp(p.y, 0.4, 99.6) });
  if (label === 'Go') return [start, keepInField({ x: start.x, y: start.y - depth })];
  if (label === 'Slant') return [start, keepInField({ x: start.x + inward * width, y: start.y - depth })];
  if (['Post', 'Out', 'Cross'].includes(label)) {
    const bend = { x: start.x, y: points.length === 3 ? points[1].y : start.y - (label === 'Post' ? depth * 0.55 : label === 'Cross' ? 4 : Math.min(10, depth)) };
    return [start, keepInField(bend), keepInField({ x: start.x + (label === 'Out' ? -inward : inward) * width, y: label === 'Post' ? start.y - depth : bend.y })];
  }
  return simplify(points, 0.65).map(keepInField);
}
