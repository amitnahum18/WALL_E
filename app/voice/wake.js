/* ===========================================================
   wake.js — the wake word listener (Picovoice Porcupine, on-device).

   Everything here runs in WebAssembly on this machine. Nothing is sent
   anywhere while WALL·E is only waiting for its name; the network is
   touched exactly once, to fetch the model files.

   The engine owns the microphone handoff, so this module exposes
   `pause()` / `resume()` separately from `release()`: pausing drops the
   audio subscription (and with it the microphone) but keeps the loaded
   model warm, which makes the trip back from a command instant.
   =========================================================== */
(() => {
  /* The IIFE bundles publish a namespace object per package. Resolve them
     lazily — the CDN scripts may still be in flight when the app mounts. */
  function sdk() {
    const pv = window.PorcupineWeb || window.Porcupine || null;
    const ns = window.WebVoiceProcessor || null;
    const wvp = ns && (ns.WebVoiceProcessor || ns);
    if (!pv || !pv.PorcupineWorker || !wvp || !wvp.subscribe) return null;
    return { PorcupineWorker: pv.PorcupineWorker, BuiltInKeyword: pv.BuiltInKeyword, wvp };
  }

  const LOCAL_MODEL = 'voice/models/porcupine_params.pv';
  const CDN_MODEL =
    'https://cdn.jsdelivr.net/gh/Picovoice/porcupine@master/lib/common/porcupine_params.pv';

  /* Prefer a model committed next to the app; fall back to the CDN copy so
     the wake word works before anyone has downloaded anything by hand. */
  let modelPromise = null;
  function modelPath() {
    if (!modelPromise) {
      modelPromise = fetch(LOCAL_MODEL, { method: 'GET', headers: { Range: 'bytes=0-0' } })
        .then((res) => (res.ok ? LOCAL_MODEL : CDN_MODEL))
        .catch(() => CDN_MODEL);
    }
    return modelPromise;
  }

  const WAKE = {
    get available() { return !!sdk(); },

    _worker: null,
    _subscribed: false,
    _label: '',

    get running() { return this._subscribed; },
    get label() { return this._label; },

    /* keyword: { builtin: 'Computer' } | { path: '...ppn', label: 'Hi WALL·E' } */
    async start({ accessKey, keyword, sensitivity = 0.5, onWake }) {
      const s = sdk();
      if (!s) throw new Error('sdk-missing');
      if (!accessKey) throw new Error('no-key');

      await this.release();

      let spec;
      if (keyword && keyword.path) {
        spec = { publicPath: keyword.path, label: keyword.label || 'Custom', sensitivity };
        this._label = spec.label;
      } else {
        const name = (keyword && keyword.builtin) || 'Computer';
        const builtin = s.BuiltInKeyword && s.BuiltInKeyword[name];
        if (!builtin) throw new Error('unknown-keyword');
        spec = { builtin, sensitivity };
        this._label = name;
      }

      this._worker = await s.PorcupineWorker.create(
        accessKey,
        spec,
        (detection) => onWake && onWake(detection),
        { publicPath: await modelPath() },
      );

      await this.resume();
    },

    /* drop the microphone, keep the model loaded */
    async pause() {
      const s = sdk();
      if (!s || !this._worker || !this._subscribed) return;
      this._subscribed = false;
      await s.wvp.unsubscribe(this._worker);
    },

    async resume() {
      const s = sdk();
      if (!s || !this._worker || this._subscribed) return;
      await s.wvp.subscribe(this._worker);
      this._subscribed = true;
    },

    async release() {
      if (!this._worker) return;
      await this.pause();
      try { this._worker.release(); } catch (e) {}
      try { this._worker.terminate(); } catch (e) {}
      this._worker = null;
      this._label = '';
    },
  };

  window.WAKE = WAKE;
})();
