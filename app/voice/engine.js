/* ===========================================================
   engine.js — the WALL·E voice pipeline.

     idle ─start─▶ wake ─detected─▶ listen ─final/timeout─▶ wake
                  (Porcupine,                (Web Speech,
                   on-device)                 en-US)

   The one thing this file exists to get right is microphone ownership.
   Porcupine holds the microphone through an AudioWorklet; SpeechRecognition
   opens a stream of its own. Left running together, Porcupine hears the
   command and fires the wake word again mid-sentence. So the wake listener
   is paused for the whole command turn and only resumes once recognition
   has fully ended.

   It is a module-level singleton on purpose: today it lives and dies with
   the WALL·E screen, but nothing here assumes that, so always-on listening
   is a matter of moving who calls start().
   =========================================================== */
(() => {
  const DEFAULTS = {
    accessKey: '',
    keyword: 'Computer',            // a BuiltInKeyword name, or 'custom'
    customPath: 'voice/models/hi-walle.ppn',
    customLabel: 'Hi WALL·E',
    sensitivity: 0.5,
    lang: 'en-US',
    maxMs: 12000,
    beep: true,
  };

  const cfg = Object.assign({}, DEFAULTS, UI.store('walle.cfg', {}));

  const ENGINE = {
    state: 'idle',              // idle | starting | wake | listen | error
    error: null,                // { code, message }
    interim: '',
    log: UI.store('walle.log', []),
    metrics: UI.store('walle.metrics', { detections: 0, falsePositives: 0, wakeMs: 0, sttMs: 0 }),

    /* ---------- config ---------- */
    get config() { return Object.assign({}, cfg); },
    setConfig(patch) {
      Object.assign(cfg, patch);
      UI.save('walle.cfg', cfg);
      this._emit({ type: 'config' });
    },

    /* ---------- subscribers ---------- */
    _subs: new Set(),
    on(fn) { this._subs.add(fn); return () => this._subs.delete(fn); },
    _emit(ev) { this._subs.forEach((fn) => { try { fn(ev); } catch (e) { console.error(e); } }); },

    _set(state, error) {
      this.state = state;
      this.error = error || null;
      this._emit({ type: 'state', state, error: this.error });
    },

    _fail(code, message) {
      this._stt = null;
      this._set('error', { code, message });
    },

    /* ---------- microphone permission ---------- */
    /* Asking once up front means the later handoff never trips a prompt
       in the middle of a command. */
    async ensureMic() {
      if (!window.isSecureContext) {
        this._fail('NO_MIC', 'Open the simulator through serve.ps1 — the microphone is blocked on file://');
        return false;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this._fail('NO_MIC', 'This browser exposes no microphone API.');
        return false;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        return true;
      } catch (e) {
        this._fail('NO_MIC', 'Microphone permission was denied.');
        return false;
      }
    },

    /* ---------- wake word ---------- */
    async start() {
      if (this.state === 'wake' || this.state === 'listen' || this.state === 'starting') return;

      if (!WAKE.available) {
        this._fail('NO_SDK', 'Porcupine did not load. Check the network, or use push-to-talk.');
        return;
      }
      if (!cfg.accessKey) {
        this._fail('NO_KEY', 'Add a Picovoice AccessKey in Settings to arm the wake word.');
        return;
      }
      if (!(await this.ensureMic())) return;

      this._set('starting');
      try {
        await WAKE.start({
          accessKey: cfg.accessKey,
          keyword: cfg.keyword === 'custom'
            ? { path: cfg.customPath, label: cfg.customLabel }
            : { builtin: cfg.keyword },
          sensitivity: cfg.sensitivity,
          onWake: () => this._onWake(),
        });
        this._set('wake');
      } catch (e) {
        const msg = String((e && e.message) || e);
        if (/AccessKey|activation|401/i.test(msg)) this._fail('NO_KEY', 'Picovoice rejected the AccessKey.');
        else if (/no-key/.test(msg)) this._fail('NO_KEY', 'Add a Picovoice AccessKey in Settings.');
        else this._fail('ERROR', msg);
      }
    },

    async stop() {
      if (this._stt) { this._stt.abort(); this._stt = null; }
      await WAKE.release();
      this.interim = '';
      this._set('idle');
    },

    _onWake() {
      if (this.state !== 'wake') return;          // deaf while a command is running
      this.metrics.detections++;
      this._wokeAt = performance.now();
      this._emit({ type: 'wake' });
      if (cfg.beep) beep();
      this._listen('wake');
    },

    /* ---------- the command turn ---------- */
    async talk() {                                 // push-to-talk
      if (this.state === 'listen') return;
      if (!STT.supported) {
        this._fail('NO_STT', 'Speech recognition needs Chrome. Firefox and Safari do not expose it.');
        return;
      }
      if (!(await this.ensureMic())) return;
      this._wokeAt = null;
      this._listen('push');
    },

    async _listen(via) {
      if (!STT.supported) {
        this._fail('NO_STT', 'Speech recognition needs Chrome. Firefox and Safari do not expose it.');
        return;
      }

      try { await WAKE.pause(); } catch (e) {}     // hand the microphone over
      this.interim = '';
      this._set('listen');
      if (this._wokeAt) {
        this.metrics.wakeMs = Math.round(performance.now() - this._wokeAt);
      }

      const startedAt = performance.now();
      const done = (entry) => {
        this._stt = null;
        this.interim = '';
        if (entry) {
          this.log.unshift(entry);
          this.log = this.log.slice(0, 50);
          UI.save('walle.log', this.log);
          this._emit({ type: 'final', entry });
        }
        UI.save('walle.metrics', this.metrics);
        this._resume();
      };

      this._stt = STT.listenOnce({
        lang: cfg.lang,
        maxMs: cfg.maxMs,
        onInterim: (text) => {
          this.interim = text;
          this._emit({ type: 'interim', text });
        },
        onFinal: (text) => {
          this.metrics.sttMs = Math.round(performance.now() - startedAt);
          done({ at: Date.now(), text, via, sttMs: this.metrics.sttMs, wakeMs: this._wokeAt ? this.metrics.wakeMs : null });
        },
        onError: (code) => {
          this._emit({ type: 'sttError', code });
          if (code === 'not-allowed') { this._fail('NO_MIC', 'Microphone permission was denied.'); return; }
          if (code === 'unsupported') { this._fail('NO_STT', 'Speech recognition needs Chrome.'); return; }
          done(null);                              // no-speech / network hiccup: just go back to waiting
        },
      });
    },

    stopListening() {
      if (this._stt) this._stt.stop();             // keep whatever was heard
    },

    /* Chrome keeps the microphone for a moment after recognition ends;
       resubscribing too early makes Porcupine start on a dead stream. */
    async _resume() {
      if (this.state !== 'listen') return;
      await new Promise((r) => setTimeout(r, 300));
      try { await WAKE.resume(); } catch (e) {}
      this._set(WAKE.running ? 'wake' : 'idle');
    },

    /* ---------- tuning aids ---------- */
    markFalsePositive() {
      this.metrics.falsePositives++;
      UI.save('walle.metrics', this.metrics);
      this._emit({ type: 'metrics' });
    },
    resetMetrics() {
      this.metrics = { detections: 0, falsePositives: 0, wakeMs: 0, sttMs: 0 };
      UI.save('walle.metrics', this.metrics);
      this._emit({ type: 'metrics' });
    },
    clearLog() {
      this.log = [];
      UI.save('walle.log', this.log);
      this._emit({ type: 'metrics' });
    },
  };

  /* a short rising blip, so a detection is obvious without watching the screen */
  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
      osc.onended = () => ctx.close();
    } catch (e) {}
  }

  /* never leave the microphone open behind a reload */
  window.addEventListener('pagehide', () => { ENGINE.stop(); });

  window.WalleEngine = ENGINE;
})();
