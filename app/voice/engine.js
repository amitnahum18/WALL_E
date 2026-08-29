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

   It is a module-level singleton on purpose: an armed wake word outlives
   the WALL·E screen and keeps listening system-wide, which is why nothing
   here is owned by a screen. indicator.js is what makes that visible.
   =========================================================== */
(() => {
  const DEFAULTS = {
    wakeMode: 'porcupine',          // 'porcupine' (by sound) | 'phrase' (by transcript)
    accessKey: '',
    keyword: 'Computer',            // a BuiltInKeyword name, or 'custom'
    customPath: 'voice/models/hi-walle.ppn',
    customLabel: 'Hi WALL·E',
    sensitivity: 0.5,
    phrases: 'hi walle, hi wally, hey walle, hey wally',
    lang: 'en-US',
    silenceMs: 2000,                // end the command after this much quiet
    maxMs: 60000,                   // ceiling, not the normal way a turn ends
    beep: true,
  };

  const cfg = Object.assign({}, DEFAULTS, UI.store('walle.cfg', {}));

  const ENGINE = {
    state: 'idle',              // idle | starting | wake | listen | error
    error: null,                // { code, message }
    interim: '',
    log: UI.store('walle.log', []),
    metrics: UI.store('walle.metrics', { detections: 0, falsePositives: 0, wakeMs: 0, sttMs: 0 }),

    heard: '',                  // what the phrase listener last made out
    _armedFlag: false,
    /* true from the moment the wake word is armed until it is turned off —
       it stays true across a command turn, and across closing the app */
    get armed() { return this._armedFlag; },

    /* ---------- config ---------- */
    get config() { return Object.assign({}, cfg); },
    setConfig(patch) {
      const modeChanged = 'wakeMode' in patch && patch.wakeMode !== cfg.wakeMode;
      Object.assign(cfg, patch);
      UI.save('walle.cfg', cfg);
      if (modeChanged) this.stop();       // never leave the other listener holding the mic
      this._emit({ type: 'config' });
    },

    /* the listener for the current mode — both expose the same five members */
    _wake() { return cfg.wakeMode === 'phrase' ? PHRASE : WAKE; },
    phraseList() {
      return String(cfg.phrases || '').split(',').map((s) => s.trim()).filter(Boolean);
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
      this._armedFlag = false;
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
    /* Starting and stopping both await teardown, so a slow stop could land
       after a fast start and stamp the wrong state on top of it. Every
       start/stop takes a ticket and drops what it was doing if a newer one
       has been issued since. */
    _gen: 0,
    _stale(gen) { return gen !== this._gen; },

    async start() {
      if (this.state === 'wake' || this.state === 'listen' || this.state === 'starting') return;
      this.heard = '';
      const gen = ++this._gen;
      return cfg.wakeMode === 'phrase' ? this._startPhrase(gen) : this._startPorcupine(gen);
    },

    /* by sound: an acoustic model, on-device, deaf to everything else */
    async _startPorcupine(gen) {
      if (!WAKE.available) {
        this._fail('NO_SDK', 'Porcupine did not load. Check the network, or switch to phrase mode.');
        return;
      }
      if (!cfg.accessKey) {
        this._fail('NO_KEY', 'Porcupine needs a free AccessKey. Add one in Settings, or switch Detection to "By transcript" — that needs no key.');
        return;
      }
      if (!(await this.ensureMic())) return;
      if (this._stale(gen)) return;

      this._set('starting');
      try {
        await WAKE.start({
          accessKey: cfg.accessKey,
          keyword: cfg.keyword === 'custom'
            ? { path: cfg.customPath, label: cfg.customLabel }
            : { builtin: cfg.keyword },
          sensitivity: cfg.sensitivity,
          onWake: () => this._onWake(''),
        });
        if (this._stale(gen)) { await WAKE.release(); return; }
        this._armedFlag = true;
        this._set('wake');
      } catch (e) {
        const msg = String((e && e.message) || e);
        if (/AccessKey|activation|401/i.test(msg)) this._fail('NO_KEY', 'Picovoice rejected the AccessKey.');
        else if (/no-key/.test(msg)) this._fail('NO_KEY', 'Add a Picovoice AccessKey in Settings.');
        else this._fail('ERROR', msg);
      }
    },

    /* by transcript: keep a recogniser running and read the text it produces */
    async _startPhrase(gen) {
      if (!PHRASE.available) {
        this._fail('NO_STT', 'Speech recognition needs Chrome. Firefox and Safari do not expose it.');
        return;
      }
      const phrases = this.phraseList();
      if (!phrases.length) {
        this._fail('ERROR', 'Set at least one wake phrase in Settings.');
        return;
      }
      if (!(await this.ensureMic())) return;
      if (this._stale(gen)) return;

      try {
        PHRASE.start({
          phrases,
          lang: cfg.lang,
          onWake: (rest) => this._onWake(rest),
          onHeard: (text) => {
            if (text === '__denied__') { this._fail('NO_MIC', 'Microphone permission was denied.'); return; }
            this.heard = text;
            this._emit({ type: 'heard', text });
          },
        });
        this._armedFlag = true;
        this._set('wake');
      } catch (e) {
        this._fail('ERROR', String((e && e.message) || e));
      }
    },

    async stop() {
      const gen = ++this._gen;
      this._armedFlag = false;
      if (this._stt) { this._stt.abort(); this._stt = null; }
      PHRASE.release();
      await WAKE.release();
      if (this._stale(gen)) return;               // a start overtook us
      this.interim = '';
      this.heard = '';
      this._set('idle');
    },

    _onWake(rest) {
      if (this.state !== 'wake') return;          // deaf while a command is running
      this.metrics.detections++;
      this._wokeAt = performance.now();
      this._emit({ type: 'wake' });
      if (cfg.beep) beep();

      /* "hi walle what's on tomorrow" arrives as one utterance — the command
         is already in hand, so there is nothing left to listen for. */
      if (rest && rest.split(' ').length >= 2) {
        this.metrics.wakeMs = Math.round(performance.now() - this._wokeAt);
        this._commit({ at: Date.now(), text: rest, via: 'wake', sttMs: 0, wakeMs: this.metrics.wakeMs });
        this._set('listen');                      // brief, just so the orb flashes
        setTimeout(() => this._resume(), 400);
        return;
      }
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

      try { await this._wake().pause(); } catch (e) {}   // hand the microphone over
      this.interim = '';
      this._set('listen');
      if (this._wokeAt) {
        this.metrics.wakeMs = Math.round(performance.now() - this._wokeAt);
      }

      const startedAt = performance.now();
      const done = (entry) => {
        this._stt = null;
        this.interim = '';
        if (entry) this._commit(entry);
        UI.save('walle.metrics', this.metrics);
        this._resume();
      };

      this._stt = STT.listenOnce({
        lang: cfg.lang,
        silenceMs: cfg.silenceMs,
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

    _commit(entry) {
      this.log.unshift(entry);
      this.log = this.log.slice(0, 50);
      UI.save('walle.log', this.log);
      UI.save('walle.metrics', this.metrics);
      this._emit({ type: 'final', entry });
    },

    /* Chrome keeps the microphone for a moment after recognition ends;
       resubscribing too early makes Porcupine start on a dead stream. */
    async _resume() {
      if (this.state !== 'listen') return;
      await new Promise((r) => setTimeout(r, 300));
      const w = this._wake();
      try { await w.resume(); } catch (e) {}
      this._set(w.running ? 'wake' : 'idle');
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
