/**
 * CameraCaptureOverlay — HTML/CSS overlay layered on top of the Phaser canvas.
 *
 * Shows a webcam preview, capture button, and disclosure notice.
 * On capture: crops the video frame to a centered circle, returns a data URL.
 *
 * Usage:
 *   const overlay = new CameraCaptureOverlay();
 *   const dataUrl = await overlay.show();  // resolves with base64 PNG or null if skipped
 *   overlay.destroy();
 */

const CIRCLE_SIZE = 300; // px — diameter of the face crop circle

export default class CameraCaptureOverlay {
  constructor() {
    this._stream = null;
    this._container = null;
    this._resolve = null;
  }

  /**
   * Show the overlay and start the camera.
   * Returns a Promise that resolves with the cropped face data URL (base64 PNG)
   * or null if the user skips / camera fails.
   */
  show() {
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._buildDOM();
      this._startCamera();
    });
  }

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------

  _buildDOM() {
    this._container = document.createElement('div');
    this._container.id = 'camera-overlay';
    this._container.innerHTML = `
      <style>
        #camera-overlay {
          position: fixed;
          inset: 0;
          z-index: 100000;
          background: rgba(0, 0, 0, 0.92);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: "Press Start 2P", monospace;
          color: #FFFFFF;
        }
        #camera-overlay .title {
          font-size: 20px;
          color: #FF9900;
          margin-bottom: 16px;
        }
        #camera-overlay .video-wrapper {
          position: relative;
          width: ${CIRCLE_SIZE}px;
          height: ${CIRCLE_SIZE}px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid #FF9900;
          margin-bottom: 20px;
        }
        #camera-overlay video {
          width: ${CIRCLE_SIZE}px;
          height: ${CIRCLE_SIZE}px;
          object-fit: cover;
          transform: scaleX(-1) scale(1.6); /* mirror + zoom in to match crop */
        }
        #camera-overlay .btn {
          font-family: "Press Start 2P", monospace;
          font-size: 12px;
          padding: 14px 28px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          margin: 6px;
        }
        #camera-overlay .btn-capture {
          background: #FF9900;
          color: #232F3E;
        }
        #camera-overlay .btn-skip {
          background: #333;
          color: #888;
        }
        #camera-overlay .btn:hover { opacity: 0.85; }
        #camera-overlay .disclosure {
          font-family: "VT323", monospace;
          font-size: 18px;
          color: #888;
          margin-top: 18px;
          max-width: 500px;
          text-align: center;
          line-height: 1.4;
        }
        #camera-overlay .error {
          color: #FF3333;
          font-size: 14px;
          margin-top: 12px;
          font-family: "VT323", monospace;
        }
      </style>
      <div class="title">TAKE A SELFIE!</div>
      <div class="video-wrapper">
        <video id="cam-video" autoplay playsinline muted></video>
      </div>
      <div>
        <button class="btn btn-capture" id="cam-capture">CAPTURE</button>
        <button class="btn btn-skip" id="cam-skip">NO THANKS</button>
      </div>
      <div class="disclosure">
        Your photo may appear as an enemy for other players today.
        By capturing, you consent to this use.
      </div>
      <div class="error" id="cam-error"></div>
    `;

    document.body.appendChild(this._container);

    // Button listeners
    document.getElementById('cam-capture').addEventListener('click', () => this._capture());
    document.getElementById('cam-skip').addEventListener('click', () => this._skip());
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------

  async _startCamera() {
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 320 },
        audio: false,
      });
      const video = document.getElementById('cam-video');
      video.srcObject = this._stream;
    } catch (err) {
      console.warn('Camera access failed:', err);
      document.getElementById('cam-error').textContent =
        'Camera unavailable. Click SKIP to continue without a photo.';
    }
  }

  // ---------------------------------------------------------------------------
  // Capture + Crop
  // ---------------------------------------------------------------------------

  _capture() {
    const video = document.getElementById('cam-video');
    if (!video || !video.srcObject) {
      this._skip();
      return;
    }

    // Draw video frame to an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width  = CIRCLE_SIZE;
    canvas.height = CIRCLE_SIZE;
    const ctx = canvas.getContext('2d');

    // Circular clip mask
    ctx.beginPath();
    ctx.arc(CIRCLE_SIZE / 2, CIRCLE_SIZE / 2, CIRCLE_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw mirrored video frame (matching the preview mirror)
    ctx.save();
    ctx.translate(CIRCLE_SIZE, 0);
    ctx.scale(-1, 1);

    // Center-crop the video into the circle — zoom in by using only the center 60%
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const zoomFactor = 0.6; // use center 60% of the frame (more zoomed in)
    const cropSize = Math.min(vw, vh) * zoomFactor;
    const sx = (vw - cropSize) / 2;
    const sy = (vh - cropSize) / 2;

    ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, CIRCLE_SIZE, CIRCLE_SIZE);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/png');

    this._stopCamera();
    this._resolve(dataUrl);
  }

  _skip() {
    this._stopCamera();
    this._resolve(null);
  }

  _stopCamera() {
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy() {
    this._stopCamera();
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._container = null;
  }
}
