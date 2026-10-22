export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function distanceToSegment(p, a, b) {
  const length = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  const t = length ? clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / length, 0, 1) : 0;
  return distance(p, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
}
export function simplify(points, tolerance = 0.9) {
  if (points.length <= 2) return points.map(p => ({ ...p }));
  let max = 0, index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = distanceToSegment(points[i], points[0], points.at(-1));
    if (d > max) { max = d; index = i; }
  }
  return max > tolerance ? [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)] : [{ ...points[0] }, { ...points.at(-1) }];
}
const fmt = value => Number(value.toFixed(3));
export function smoothPath(points) {
  if (!points.length) return '';
  let path = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1], corner = points[i], next = points[i + 1];
    const d1 = distance(prev, corner), d2 = distance(corner, next);
    const round = Math.min(1.25, d1 * 0.24, d2 * 0.24);
    if (!d1 || !d2) continue;
    const before = { x: corner.x + (prev.x - corner.x) * round / d1, y: corner.y + (prev.y - corner.y) * round / d1 };
    const after = { x: corner.x + (next.x - corner.x) * round / d2, y: corner.y + (next.y - corner.y) * round / d2 };
    path += ` L ${fmt(before.x)} ${fmt(before.y)} Q ${fmt(corner.x)} ${fmt(corner.y)} ${fmt(after.x)} ${fmt(after.y)}`;
  }
  if (points.length > 1) path += ` L ${fmt(points.at(-1).x)} ${fmt(points.at(-1).y)}`;
  return path;
}
function segmentsMeet(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const c1 = cross(a, b, c), c2 = cross(a, b, d), c3 = cross(c, d, a), c4 = cross(c, d, b);
  return c1 * c2 < 0 && c3 * c4 < 0;
}
export function crossedAssignments(stroke, assignments) {
  return assignments.filter(route => stroke.some((p, i) => i > 0 && route.points.some((q, j) => j > 0 && (
    segmentsMeet(stroke[i - 1], p, route.points[j - 1], q) ||
    distanceToSegment(p, route.points[j - 1], q) < 0.65 || distanceToSegment(q, stroke[i - 1], p) < 0.65
  ))));
}
export function closestPlayer(point, players, radius = 3) {
  return [...players].sort((a, b) => distance(a, point) - distance(b, point)).find(p => distance(p, point) <= radius);
}
