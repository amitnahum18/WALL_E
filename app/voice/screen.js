/* ===========================================================
   screen.js — what was on the screen when you spoke.

   Deliberately not a recording. An agent reading a command needs to see
   what you were looking at at that instant, and a video of the seconds
   around it is the same information at a hundred times the size, in a
   form no model reads directly. So the share is opened once and held
   open, and a single frame is pulled from it the moment the wake word
   lands — which is also the moment before the screen changes in response
   to whatever happens next.

   The stream is a live handle: grabbing costs a canvas draw, so it is
   cheap enough to do on every detection and nothing is stored unless a
   command actually comes of it.
   =========================================================== */
(() => {
  const MAX_W = 1280;              // enough for a model to read UI text
  const QUALITY = 0.72;

  const SCREEN = {
    get supported() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    },

    _stream: null,
    _video: null,
    _canvas: null,
    _onEnd: null,

    get active() { return !!this._stream; },
    get label() {
      const t = this._stream && this._stream.getVideoTracks()[0];
      return t ? (t.label || 'screen') : '';
    },

    onEnded(fn) { this._onEnd = fn; },

    /* Must be called from a user gesture — the browser will not open a
       picker otherwise. Returns false if the user cancels. */
    async enable() {
      if (!this.supported) throw new Error('unsupported');
      if (this._stream) return true;

      let stream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 5 },      // a still every 200ms is plenty
          audio: false,
        });
      } catch (e) {
        return false;                   // cancelled at the picker
      }

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      try { await video.play(); } catch (e) {}

      this._stream = stream;
      this._video = video;

      /* the browser's own "stop sharing" button lives outside the page */
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener('ended', () => {
          this.disable();
          this._onEnd && this._onEnd();
        });
      });

      return true;
    },

    disable() {
      if (this._stream) this._stream.getTracks().forEach((t) => t.stop());
      this._stream = null;
      if (this._video) { this._video.srcObject = null; this._video = null; }
    },

    /* one frame, right now — null when nothing is being shared */
    grab() {
      const v = this._video;
      if (!this._stream || !v || !v.videoWidth) return null;

      const scale = Math.min(1, MAX_W / v.videoWidth);
      const w = Math.round(v.videoWidth * scale);
      const h = Math.round(v.videoHeight * scale);

      const c = this._canvas || (this._canvas = document.createElement('canvas'));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }

      try {
        c.getContext('2d').drawImage(v, 0, 0, w, h);
        return { dataUrl: c.toDataURL('image/jpeg', QUALITY), w, h, at: Date.now() };
      } catch (e) {
        return null;
      }
    },
  };

  window.SCREEN = SCREEN;
})();
