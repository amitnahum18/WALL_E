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
    captureScreen: false,           // grab what was on screen when the name landed
    maxShots: 4,                    // per command, kept only when the screen changes
    askAgent: false,                // send finished commands to the reasoning graph
    agentUrl: 'http://127.0.0.1:8077',
  };

  const MAX_ENTRIES = 8;            // entries whose frames are still held
  const SAMPLE_MS = 320;            // ~3 looks a second, cheap; keeping is what costs
  const CHANGE = 0.035;             // share of the picture that must move to count
  const TAIL_MS = 2200;             // keep watching after the sentence ends
  const NAV_SETTLE = 420;           // let the open-app zoom finish before looking

  const cfg = Object.assign({}, DEFAULTS, UI.store('walle.cfg', {}));

  const ENGINE = {
    state: 'idle',              // idle | starting | wake | listen | error
    error: null,                // { code, message }
    interim: '',
    log: UI.store('walle.log', []),
    metrics: UI.store('walle.metrics', { detections: 0, falsePositives: 0, wakeMs: 0, sttMs: 0 }),

    heard: '',                  // what the phrase listener last made out

    /* Frames live in memory only. A screenshot is far too big for
       localStorage — a handful would blow the quota and take the
       transcripts down with them — so the log records that a frame
       existed and the pixels last only as long as the page does. */
    frames: new Map(),
    getFrame(id) { return this.frames.get(id) || null; },
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
          onWake: () => this._onWake(),
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
          silenceMs: cfg.silenceMs,
          maxMs: cfg.maxMs,
          onWake: () => {
            this.metrics.detections++;
            this._wokeAt = performance.now();
            this.metrics.wakeMs = 0;               // no handoff: the turn is already running
            this.interim = '';
            this._snap();                          // before the screen reacts
            this._emit({ type: 'wake' });
            if (cfg.beep) beep();
            this._set('listen');
          },
          onHeard: (text) => {
            if (text === '__denied__') { this._fail('NO_MIC', 'Microphone permission was denied.'); return; }
            this.heard = text;
            this._emit({ type: 'heard', text });
          },
          onCommandInterim: (text) => {
            this.interim = text;
            this._emit({ type: 'interim', text });
          },
          onCommand: (text) => {
            const ms = this._wokeAt ? Math.round(performance.now() - this._wokeAt) : 0;
            this.interim = '';
            this.heard = '';
            if (text) {
              this.metrics.sttMs = ms;
              this._commit({ at: Date.now(), text, via: 'wake', sttMs: ms, wakeMs: 0 });
            }
            this._set(PHRASE.running ? 'wake' : 'idle');
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
      this._stopSampling();
      this._shots = [];
      if (this._stt) { this._stt.abort(); this._stt = null; }
      PHRASE.release();
      await WAKE.release();
      if (this._stale(gen)) return;               // a start overtook us
      this.interim = '';
      this.heard = '';
      this._set('idle');
    },

    /* Porcupine only. Phrase mode never gets here: it hears the name inside
       a session that is already transcribing, and keeps that session for the
       command rather than handing the microphone to a second recogniser. */
    _onWake() {
      if (this.state !== 'wake') return;          // deaf while a command is running
      this.metrics.detections++;
      this._wokeAt = performance.now();
      this._snap();                              // before the screen reacts
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
      if (PHRASE.capturing) PHRASE.finish();
    },

    /* The screen as it was when the name was heard — and then again
       whenever it stops looking like that, right through the sentence and
       for a moment after it. The tail is the point: "what's the weather"
       is very often said on the way to the weather, and the screen you
       were reaching for arrives after you have stopped talking. Ending
       the capture with the speech would record the screen you were
       leaving and nothing else. */
    _snap() {
      this._shots = [];
      this._stopSampling();
      if (!cfg.captureScreen || !SCREEN.active) return;

      const first = SCREEN.grab();
      if (!first) return;
      this._navAt = 0;
      this._sampling = true;
      this._keep(first);
      this._sampler = setInterval(() => this._look(), SAMPLE_MS);
    },

    /* the cheap half runs every tick; the expensive half only when the
       picture actually moved */
    _look(force) {
      if (!this._sampling || !this._shots.length) return;
      const last = this._shots[this._shots.length - 1];
      const app = window.currentAppName || '';

      /* Opening an app is not a guess. The phone is a small frame inside
         whatever is being shared, so the surest signal that the screen
         changed is the simulator saying it changed — no threshold can beat
         knowing. Wait out the zoom first, or the frame is a blur. */
      if (app !== last.app) {
        if (!this._navAt) this._navAt = Date.now();
        if (!force && Date.now() - this._navAt < NAV_SETTLE) return;
        this._navAt = 0;
        const shot = SCREEN.grab();
        if (shot) this._keep(shot);
        return;
      }
      this._navAt = 0;

      const sig = SCREEN.peek();
      if (!sig || SCREEN.diff(sig, last.sig) < CHANGE) return;
      const shot = SCREEN.grab();
      if (shot) this._keep(shot);
    },

    /* Over the cap it is the middle that goes. The first frame is where
       you started and the newest is where you ended up; those two carry
       the question between them, and the newest must never be the one
       dropped because it is usually the one being asked about. */
    _keep(shot) {
      shot.app = window.currentAppName || '';
      this._shots.push(shot);
      while (this._shots.length > Math.max(1, cfg.maxShots)) this._shots.splice(1, 1);
    },

    _stopSampling() {
      this._sampling = false;
      clearInterval(this._sampler);
      this._sampler = null;
    },

    _commit(entry) {
      entry.id = entry.at + '-' + Math.random().toString(36).slice(2, 6);

      this.log.unshift(entry);
      this.log = this.log.slice(0, 50);
      UI.save('walle.log', this.log);
      UI.save('walle.metrics', this.metrics);
      this._emit({ type: 'final', entry });   // the words, straight away

      this._settle(entry);                     // the pictures, a moment later
    },

    /* The transcript is already on screen; this is the short wait for the
       screen to catch up with the sentence. The pill says "Thinking…" for
       the whole of it, which is true — the question is in flight. */
    async _settle(entry) {
      const asking = cfg.askAgent && !!entry.text;
      if (asking) {
        entry.thinking = true;
        this._emit({ type: 'answered', entry });
      }

      if (this._sampling) {
        await new Promise((r) => setTimeout(r, TAIL_MS));
        this._look(true);                      // one last look before we stop
      }
      this._stopSampling();

      const shots = this._shots || [];
      this._shots = [];
      if (shots.length) {
        this.frames.set(entry.id, shots);
        entry.shots = shots.length;
        while (this.frames.size > MAX_ENTRIES) {
          this.frames.delete(this.frames.keys().next().value);
        }
        this._emit({ type: 'final', entry });  // now the thumbnails exist
      }

      this._ask(entry);
    },

    /* Hand the command to the graph. Deliberately not awaited by anything:
       the transcript is already saved and useful, and a graph that is slow,
       unreachable, or not running must not hold up the next wake word. */
    async _ask(entry) {
      if (!cfg.askAgent || !entry.text) return;

      AGENT.url = cfg.agentUrl;
      const shots = this.frames.get(entry.id) || [];
      try {
        const out = await AGENT.ask({
          text: entry.text,
          screens: shots.map((s) => s.dataUrl),
          currentApp: window.currentAppName || null,
        });
        entry.answer = out.answer || '';
        entry.decision = out.decision ? out.decision.type : null;
      } catch (e) {
        entry.answerError = String((e && e.message) || e);
      }

      entry.thinking = false;
      UI.save('walle.log', this.log);
      this._emit({ type: 'answered', entry });
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
