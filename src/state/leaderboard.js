import { LEADERBOARD_SIZE } from '../config/constants.js';

/**
 * Leaderboard — persists top 10 scores in IndexedDB.
 *
 * API:
 *   await Leaderboard.init()         — open/create the DB (call once at boot)
 *   await Leaderboard.addScore(name, score) — insert a score, returns rank (1-based) or null if not top 10
 *   await Leaderboard.getScores()    — returns sorted array [{ name, score, date }] (max 10)
 *   await Leaderboard.clear()        — wipe all scores (for event-day reset)
 */

const DB_NAME    = 'frizzle_leaderboard';
const DB_VERSION = 1;
const STORE_NAME = 'scores';

let _db = null;

function _openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('score', 'score', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = (e) => {
      console.error('Leaderboard DB error:', e.target.error);
      reject(e.target.error);
    };
  });
}

const Leaderboard = {
  /**
   * Initialize the database. Safe to call multiple times.
   */
  async init() {
    if (_db) return;
    await _openDB();
  },

  /**
   * Get top scores sorted descending.
   * @returns {Promise<Array<{ name: string, score: number, date: string }>>}
   */
  async getScores() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx    = _db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('score');
      const req   = index.openCursor(null, 'prev'); // descending by score
      const results = [];

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && results.length < LEADERBOARD_SIZE) {
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
   * Add a score entry. Returns the 1-based rank if it made top 10, otherwise null.
   * @param {string} name  Player name/identifier (can be "Player" for kiosk)
   * @param {number} score
   * @returns {Promise<number|null>}
   */
  async addScore(name, score) {
    await this.init();

    // Get current top scores to determine rank
    const current = await this.getScores();

    // Check if this score qualifies for the leaderboard
    if (current.length >= LEADERBOARD_SIZE && score <= current[current.length - 1].score) {
      return null; // didn't make the cut
    }

    // Add the new entry
    const entry = {
      name,
      score,
      date: new Date().toISOString(),
    };

    await new Promise((resolve, reject) => {
      const tx    = _db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add(entry);
      tx.oncomplete = () => resolve();
      tx.onerror    = (e) => reject(e.target.error);
    });

    // If we now have more than LEADERBOARD_SIZE, remove the lowest
    const updated = await this.getScores();
    if (updated.length > LEADERBOARD_SIZE) {
      // Get all entries sorted ascending and delete the extras
      await this._pruneExtras();
    }

    // Determine rank
    const final = await this.getScores();
    const rank  = final.findIndex(e => e.score === score && e.name === name && e.date === entry.date);
    return rank >= 0 ? rank + 1 : null;
  },

  /**
   * Remove entries beyond the top LEADERBOARD_SIZE.
   */
  async _pruneExtras() {
    return new Promise((resolve, reject) => {
      const tx    = _db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('score');
      const req   = index.openCursor(null, 'next'); // ascending — lowest first
      let count   = 0;

      // Count total first
      const countReq = store.count();
      countReq.onsuccess = () => {
        const total   = countReq.result;
        const toDelete = total - LEADERBOARD_SIZE;
        if (toDelete <= 0) { resolve(); return; }

        let deleted = 0;
        const delReq = index.openCursor(null, 'next');
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
   * Clear all scores (event-day reset).
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

export default Leaderboard;
