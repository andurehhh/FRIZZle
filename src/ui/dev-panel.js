import PhotoPool from '../state/photoPool.js';
import Leaderboard from '../state/leaderboard.js';

/**
 * DevPanel — secret admin overlay for monitoring data.
 *
 * Access: Ctrl+Shift+D from anywhere
 * Shows: Photo pool grid (all 20 faces) + full leaderboard list
 * Actions: Clear photos, Clear leaderboard, Close
 */

let _isOpen = false;
let _container = null;

function _buildPanel() {
  _container = document.createElement('div');
  _container.id = 'dev-panel';
  _container.innerHTML = `
    <style>
      #dev-panel {
        position: fixed;
        inset: 0;
        z-index: 200000;
        background: rgba(0, 0, 0, 0.95);
        color: #FFFFFF;
        font-family: "VT323", monospace;
        font-size: 18px;
        overflow-y: auto;
        padding: 30px;
      }
      #dev-panel h1 { font-family: "Press Start 2P", monospace; font-size: 18px; color: #FF9900; margin-bottom: 20px; }
      #dev-panel h2 { font-family: "Press Start 2P", monospace; font-size: 14px; color: #00FF41; margin: 20px 0 10px; }
      #dev-panel .photo-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
      #dev-panel .photo-grid img { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #FF9900; object-fit: cover; }
      #dev-panel .photo-grid .empty { width: 80px; height: 80px; border-radius: 50%; border: 2px dashed #333; display: flex; align-items: center; justify-content: center; color: #444; font-size: 12px; }
      #dev-panel table { border-collapse: collapse; width: 100%; max-width: 700px; }
      #dev-panel th { text-align: left; color: #FF9900; padding: 6px 12px; border-bottom: 1px solid #333; }
      #dev-panel td { padding: 6px 12px; border-bottom: 1px solid #1a1a1a; }
      #dev-panel .btn { font-family: "Press Start 2P", monospace; font-size: 10px; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
      #dev-panel .btn-danger { background: #FF3333; color: #FFF; }
      #dev-panel .btn-close { background: #444; color: #FFF; }
      #dev-panel .btn:hover { opacity: 0.8; }
      #dev-panel .actions { margin-top: 20px; }
    </style>
    <h1>DEV ADMIN PANEL</h1>
    <div class="actions">
      <button class="btn btn-close" id="dev-close">CLOSE (Ctrl+Shift+D)</button>
      <button class="btn btn-danger" id="dev-clear-photos">CLEAR ALL PHOTOS</button>
      <button class="btn btn-danger" id="dev-clear-scores">CLEAR LEADERBOARD</button>
    </div>
    <h2>PHOTO POOL (last 20)</h2>
    <div class="photo-grid" id="dev-photos"></div>
    <h2>FULL LEADERBOARD</h2>
    <div id="dev-leaderboard"></div>
  `;
  document.body.appendChild(_container);

  document.getElementById('dev-close').addEventListener('click', close);
  document.getElementById('dev-clear-photos').addEventListener('click', async () => {
    if (confirm('Clear ALL photos from the pool?')) {
      await PhotoPool.clear();
      _loadPhotos();
    }
  });
  document.getElementById('dev-clear-scores').addEventListener('click', async () => {
    if (confirm('Clear ALL leaderboard scores?')) {
      await Leaderboard.clear();
      _loadLeaderboard();
    }
  });

  _loadPhotos();
  _loadLeaderboard();
}

async function _loadPhotos() {
  const grid = document.getElementById('dev-photos');
  if (!grid) return;

  try {
    const photos = await PhotoPool.getPhotos();
    grid.innerHTML = '';

    if (photos.length === 0) {
      grid.innerHTML = '<div class="empty">No photos yet</div>';
      return;
    }

    photos.forEach((entry, i) => {
      const img = document.createElement('img');
      img.src   = entry.dataUrl;
      img.title = `#${i + 1} — ${new Date(entry.date).toLocaleString()}`;
      grid.appendChild(img);
    });
  } catch (e) {
    grid.innerHTML = '<span style="color:#FF3333">Error loading photos</span>';
  }
}

async function _loadLeaderboard() {
  const container = document.getElementById('dev-leaderboard');
  if (!container) return;

  try {
    const scores = await Leaderboard.getAllScores();

    if (scores.length === 0) {
      container.innerHTML = '<p style="color:#666">No scores yet</p>';
      return;
    }

    let html = `<p style="color:#888">Total plays: ${scores.length}</p>`;
    html += `<table><tr><th>#</th><th>Name</th><th>Score</th><th>Date/Time</th></tr>`;
    scores.forEach((entry, i) => {
      const d = new Date(entry.date);
      const dateStr = d.toLocaleString();
      const highlight = i < 10 ? ' style="color:#00FF41"' : '';
      html += `<tr${highlight}><td>${i + 1}</td><td>${entry.name}</td><td>${entry.score}</td><td>${dateStr}</td></tr>`;
    });
    html += '</table>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<span style="color:#FF3333">Error loading leaderboard</span>';
  }
}

function open() {
  if (_isOpen) return;
  _isOpen = true;
  _buildPanel();
}

function close() {
  if (!_isOpen) return;
  _isOpen = false;
  if (_container && _container.parentNode) {
    _container.parentNode.removeChild(_container);
  }
  _container = null;
}

function toggle() {
  if (_isOpen) close();
  else open();
}

// Global keyboard shortcut: Ctrl+Shift+D
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    toggle();
  }
});

export default { open, close, toggle };
