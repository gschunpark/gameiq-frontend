import { newId, scenarioData } from './model.js';

export const PLAY_STORAGE_KEY = 'gameiq.play-versions.v1';
export function readVersions(storage = localStorage) {
  const raw = storage.getItem(PLAY_STORAGE_KEY);
  if (!raw) return [];
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('Saved plays could not be read. Your stored versions have been left untouched.'); }
  if (data.schema !== 1 || !Array.isArray(data.versions) || data.versions.length > 50) throw new Error('Saved plays have an unsupported format.');
  return data.versions.map(record => {
    if (!record.id || !record.rootId || typeof record.name !== 'string' || !Number.isFinite(Date.parse(record.savedAt))) throw new Error('A saved version is invalid.');
    return { id: record.id, rootId: record.rootId, parentId: record.parentId || null, name: record.name.slice(0, 120), savedAt: record.savedAt, original: !!record.original, scenario: scenarioData(record.scenario) };
  });
}
export function saveVersion({ original, updated, rootId = original.id, parentId = null, name, originalOnly = false }, storage = localStorage) {
  const versions = readVersions(storage);
  const now = new Date().toISOString();
  if (!versions.some(v => v.id === rootId)) versions.push({ id: rootId, rootId, parentId: null, name: original.title, savedAt: now, original: true, scenario: scenarioData(original) });
  let saved = versions.find(v => v.id === rootId);
  if (!originalOnly) {
    const number = versions.filter(v => v.rootId === rootId).length + 1;
    const parent = versions.some(v => v.id === parentId && v.rootId === rootId) ? parentId : rootId;
    saved = { id: newId(), rootId, parentId: parent, name: name?.trim().slice(0, 120) || `${original.title} — Version ${number}`, savedAt: now, original: false, scenario: scenarioData(updated) };
    versions.push(saved);
  }
  if (versions.length > 50) throw new Error('This device already has 50 saved versions. Remove an older version before saving another.');
  try { storage.setItem(PLAY_STORAGE_KEY, JSON.stringify({ schema: 1, versions })); }
  catch { throw new Error('Could not save the play. Browser storage may be full or disabled. Your current drawing is still open.'); }
  return { versions, saved };
}

export function removeVersion(id, storage = localStorage) {
  const versions = readVersions(storage), record = versions.find(v => v.id === id);
  if (!record) return versions;
  if (record.original && versions.some(v => v.rootId === id && v.id !== id)) throw new Error('Remove the modified versions before deleting their original.');
  // Keep the ancestry chain valid when removing an intermediate version.
  const remaining = versions.filter(v => v.id !== id).map(v => v.parentId === id ? { ...v, parentId: record.parentId } : v);
  try { storage.setItem(PLAY_STORAGE_KEY, JSON.stringify({ schema: 1, versions: remaining })); }
  catch { throw new Error('Could not remove the saved version. Browser storage is unavailable.'); }
  return remaining;
}
