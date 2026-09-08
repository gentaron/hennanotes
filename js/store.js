// 画像を端末内 IndexedDB に保存する簡易ストア
const DB_NAME = 'henna-notes';
const STORE = 'images';
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return dbp;
}

function tx(mode, fn) {
  return open().then(db => new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
  }));
}

export const store = {
  async add(file) {
    const rec = { blob: file, name: file.name || 'image', added: Date.now() };
    return tx('readwrite', s => s.add(rec));
  },
  async all() {
    return tx('readonly', s => s.getAll());
  },
  async remove(id) {
    return tx('readwrite', s => s.delete(id));
  },
  async clear() {
    return tx('readwrite', s => s.clear());
  }
};
