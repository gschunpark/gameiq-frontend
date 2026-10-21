export const STORAGE_KEY = 'gameiq.local.v1';
export const emptyDatabase = () => ({ version: 1, users: [], teams: [], session: null });
export function loadDatabase(storage = localStorage) {
  const saved = storage.getItem(STORAGE_KEY);
  if (!saved) return emptyDatabase();
  const db = JSON.parse(saved);
  if (db.version !== 1 || !Array.isArray(db.users) || !Array.isArray(db.teams)) throw new Error('Saved data could not be read. Please keep your browser data and contact support.');
  return db;
}
export function saveDatabase(db, storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}
export function updateUser(db, userId, changes) {
  return { ...db, users: db.users.map(user => user.id === userId ? { ...user, ...changes } : user) };
}
export function validateUsername(db, username, exceptId) {
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) throw new Error('Use 3–24 letters, numbers, or underscores for your username.');
  if (db.users.some(u => u.id !== exceptId && u.username.toLowerCase() === username.toLowerCase())) throw new Error('That username is already taken on this device.');
}
export function deleteAccount(db, id) {
  return { ...db, session: null, users: db.users.filter(u => u.id !== id), teams: db.teams.filter(t => t.ownerId !== id).map(t => ({ ...t, coachId: t.coachId === id ? null : t.coachId, memberIds: t.memberIds.filter(m => m !== id) })) };
}
