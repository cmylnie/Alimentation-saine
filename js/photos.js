// Photos des repas pris dehors : réduites puis rangées dans IndexedDB, sur le téléphone uniquement.
const DB = 'mon-assiette-photos';
const STORE = 'photos';
const MAX = 1280;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

// Réduit la photo (1280 px au plus, JPEG) pour ne pas remplir la mémoire du téléphone.
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', 0.8));
  } catch (e) {
    return file;
  }
}

export async function savePhoto(file, id) {
  const blob = await shrink(file);
  await tx('readwrite', s => s.put(blob, id));
  return id;
}

export const getPhoto = id => tx('readonly', s => s.get(id));
export const deletePhoto = id => tx('readwrite', s => s.delete(id)).catch(() => {});

const urls = new Map();
export async function photoURL(id) {
  if (urls.has(id)) return urls.get(id);
  const blob = await getPhoto(id).catch(() => null);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urls.set(id, u);
  return u;
}
