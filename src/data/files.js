const openDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('gameiq-files', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('files');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error('File storage is unavailable in this browser.'));
});
async function transaction(mode, action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', mode);
    const req = action(tx.objectStore('files'));
    tx.oncomplete = () => { resolve(req?.result); db.close(); };
    tx.onerror = () => { reject(new Error('Could not save or read this file. Check available device storage.')); db.close(); };
  });
}
export const putFile = (key, file) => transaction('readwrite', store => store.put(file, key));
export const getFile = key => transaction('readonly', store => store.get(key));
export const deleteFile = key => transaction('readwrite', store => store.delete(key));
export async function imageData(file) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Choose a JPG, PNG, or WebP image smaller than 2 MB.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const scale = Math.min(1, 320 / Math.max(img.width, img.height)); canvas.width = img.width * scale; canvas.height = img.height * scale; canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/webp', 0.8)); }; img.onerror = () => reject(new Error('This image could not be opened.')); img.src = reader.result; };
    reader.onerror = () => reject(new Error('This image could not be read.'));
    reader.readAsDataURL(file);
  });
}
