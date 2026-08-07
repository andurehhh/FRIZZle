import { PHOTO_POOL_MAX } from '../config/constants.js';

/**
 * PhotoPool — persists player face photos in IndexedDB.
 * Rolling cap at PHOTO_POOL_MAX (20). Oldest auto-evicted when full.
 *
 * Each entry: { id (auto), dataUrl: string, date: string }
 *
 * API:
 *   await PhotoPool.init()
 *   await PhotoPool.addPhoto(dataUrl)   — stores photo, evicts oldest if at cap
 *   await PhotoPool.getPhotos()         — returns array of { dataUrl, date } (newest first)
 *   await PhotoPool.getRandomPhotos(n)  — returns up to n random dataUrls from the pool
 *   await PhotoPool.clear()             — wipe all photos
 */

const DB_NAME    = 'frizzle_photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

let _db = null;

function _openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = (e) => {
      console.error('PhotoPool DB error:', e.target.error);
      reject(e.target.error);
    };
  });
}

const PhotoPool = {
  async init() {
    if (_db) return;
    await _openDB();
  },

  /**
   * Store a new photo. Evicts the oldest entry if pool is at capacity.
   * @param {string} dataUrl — base64 PNG data URL from the camera capture
   */
  async addPhoto(dataUrl) {
    await this.init();

    const entry = {
      dataUrl,
      date: new Date().toISOString(),
    };

    await new Promise((resolve, reject) => {
      const tx    = _db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add(entry);
      tx.oncomplete = () => resolve();
      tx.onerror    = (e) => reject(e.target.error);
    });

    // Evict oldest if over cap
    await this._pruneOldest();
  },

  /**
   * Get all photos, newest first.
   * @returns {Promise<Array<{ dataUrl: string, date: string }>>}
   */
  async getPhotos() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx    = _db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('date');
      const req   = index.openCursor(null, 'prev'); // newest first
      const results = [];

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      req.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Get up to n random photos from the pool (for enemy faces).
   * @param {number} n
   * @returns {Promise<string[]>} — array of dataUrl strings
   */
  async getRandomPhotos(n) {
    const all = await this.getPhotos();
    if (all.length === 0) return [];

    // Shuffle and take n
    const shuffled = all.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n).map(entry => entry.dataUrl);
  },

  /**
   * Remove oldest entries if pool exceeds PHOTO_POOL_MAX.
   */
  async _pruneOldest() {
    return new Promise((resolve, reject) => {
      const tx    = _db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const countReq = store.count();
      countReq.onsuccess = () => {
        const total    = countReq.result;
        const toDelete = total - PHOTO_POOL_MAX;
        if (toDelete <= 0) { resolve(); return; }

        // Delete oldest (lowest date index = ascending)
        const index  = store.index('date');
        const delReq = index.openCursor(null, 'next'); // oldest first
        let deleted  = 0;

        delReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor && deleted < toDelete) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        delReq.onerror = (e) => reject(e.target.error);
      };
      countReq.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Clear all photos (event-day reset).
   */
  async clear() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx    = _db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror    = (e) => reject(e.target.error);
    });
  },
};

export default PhotoPool;
