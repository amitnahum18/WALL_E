/* ===========================================================
   screen.js — what was on the screen while you spoke.

   Deliberately not a recording, and deliberately not a fixed frame rate.
   Three frames a second across a ten second question is thirty images;
   for a vision model that is thirty to forty thousand tokens, and almost
   all of them are the same picture, because a screen rarely moves while
   someone is talking to it. Sampling often is cheap — it is a canvas
   draw — but *keeping* a frame is expensive, so frames are kept only
   when the screen actually changed.

   Change is measured on a 32x20 grayscale signature taken from the same
   draw: a scene cut moves it a lot, a blinking cursor moves it by
   nothing. The first frame is always kept, because what you were looking
   at when you started talking is the one that is always relevant.
   =========================================================== */
(() => {
  const MAX_W = 1280;              // enough for a model to read UI text
  const QUALITY = 0.72;
  const SIG_W = 32, SIG_H = 20;    // the thumbnail that changes are judged on

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
        return { dataUrl: c.toDataURL('image/jpeg', QUALITY), w, h, at: Date.now(), sig: this._sig(v) };
      } catch (e) {
        return null;
      }
    },

    /* Just the signature, without paying for a JPEG. This is what the
       sampling loop calls several times a second. */
    peek() {
      const v = this._video;
      if (!this._stream || !v || !v.videoWidth) return null;
      try { return this._sig(v); } catch (e) { return null; }
    },

    _sig(v) {
      const c = this._sigCanvas || (this._sigCanvas = document.createElement('canvas'));
      c.width = SIG_W; c.height = SIG_H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(v, 0, 0, SIG_W, SIG_H);
      const px = ctx.getImageData(0, 0, SIG_W, SIG_H).data;
      const out = new Uint8Array(SIG_W * SIG_H);
      for (let i = 0, j = 0; i < px.length; i += 4, j++) {
        out[j] = (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8;   // luma
      }
      return out;
    },

    /* 0 = identical, 1 = nothing in common */
    diff(a, b) {
      if (!a || !b || a.length !== b.length) return 1;
      let sum = 0;
      for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
      return sum / (a.length * 255);
    },
  };

  window.SCREEN = SCREEN;
})();
