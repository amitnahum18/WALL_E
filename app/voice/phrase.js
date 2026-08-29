/* ===========================================================
   phrase.js — the wake word without a model: keep a continuous
   recogniser running and watch the transcript for the name.

   No key, no training, no download. The cost is real and worth stating
   plainly: this streams the microphone to the speech service the whole
   time it is armed, so the "nothing leaves the machine until you say the
   name" property of the Porcupine path is gone. It is the quick way to
   see the pipeline work, not the way to ship it.

   The command is captured by this same recogniser rather than handed to
   a fresh one. That matters: the name is matched on an interim result,
   in the middle of the sentence being spoken, so tearing the session
   down at that moment would throw away the rest of the sentence and
   lose whatever is said while a new one starts. Instead the session
   keeps running and the command is simply everything after the name,
   re-read from the full transcript on every update.

   Chrome ends a continuous session on its own every so often, so the
   recogniser is restarted whenever it stops while still armed.
   =========================================================== */
(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const norm = (s) => (s || '')
    .toLowerCase()
    .replace(/[^a-z֐-ת ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /* Whitespace is optional between every letter, so one configured phrase
     covers "hi walle", "hi wall e" and "hiwalle" alike — which matters,
     because how the recogniser chooses to spell a name is a coin toss. */
  function build(phrases) {
    const parts = phrases
      .map(norm).filter(Boolean)
      .map((p) => '\\b' + p.replace(/\s+/g, '').split('').map(esc).join('\\s*'));
    return parts.length ? new RegExp('(?:' + parts.join('|') + ')') : null;
  }

  const PHRASE = {
    get available() { return !!SR; },

    _r: null,
    _armed: false,
    _paused: false,
    _capturing: false,
    _cmd: '',
    _quiet: null,
    _re: null,
    _phrases: [],
    _lang: 'en-US',
    _silenceMs: 2000,
    _fails: 0,

    get running() { return this._armed && !this._paused; },
    get capturing() { return this._capturing; },
    get label() { return this._phrases[0] || ''; },

    /* null when the name is not in there; otherwise whatever followed it */
    match(text, phrases) {
      const re = phrases ? build(phrases) : this._re;
      if (!re) return null;
      const t = norm(text);
      const m = re.exec(t);
      return m ? t.slice(m.index + m[0].length).trim() : null;
    },

    start(o) {
      if (!SR) throw new Error('no-stt');
      this.release();
      this._phrases = (o.phrases || []).slice();
      this._re = build(this._phrases);
      if (!this._re) throw new Error('no-phrase');
      this._lang = o.lang || 'en-US';
      this._silenceMs = o.silenceMs || 2000;
      this._onWake = o.onWake;
      this._onHeard = o.onHeard;
      this._onCommandInterim = o.onCommandInterim;
      this._onCommand = o.onCommand;
      this._armed = true;
      this._paused = false;
      this._capturing = false;
      this._cmd = '';
      this._fails = 0;
      this._spin();
    },

    pause() {
      this._paused = true;
      this._endCapture();
      this._kill();
    },

    resume() {
      if (!this._armed) return;
      this._paused = false;
      this._spin();
    },

    release() {
      this._armed = false;
      this._paused = false;
      this._endCapture();
      this._kill();
      this._re = null;
      this._phrases = [];
    },

    /* end the command turn now instead of waiting out the silence */
    finish() {
      if (!this._capturing) return;
      const cmd = this._cmd;
      this._endCapture();
      this._restart();                 // a fresh session, so old text cannot re-trigger
      this._onCommand && this._onCommand(cmd);
    },

    _endCapture() {
      this._capturing = false;
      this._cmd = '';
      clearTimeout(this._quiet);
      this._quiet = null;
    },

    /* every scrap of speech pushes the finish line back */
    _armQuiet() {
      clearTimeout(this._quiet);
      this._quiet = setTimeout(() => this.finish(), this._silenceMs);
    },

    _kill() {
      const r = this._r;
      this._r = null;
      if (!r) return;
      r.onend = null; r.onresult = null; r.onerror = null;
      try { r.abort(); } catch (e) {}
    },

    _restart() {
      this._kill();
      setTimeout(() => this._spin(), 120);
    },

    _spin() {
      if (!this._armed || this._paused || this._r) return;

      const r = new SR();
      r.lang = this._lang;
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;
      this._r = r;

      r.onresult = (ev) => {
        /* the whole session, not just the newest slice: the command is
           defined as everything after the name, so it has to be re-read
           from the full transcript each time */
        let text = '';
        for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript + ' ';
        const t = norm(text);
        if (!t) return;

        const rest = this.match(t);

        if (!this._capturing) {
          this._onHeard && this._onHeard(t);
          if (rest === null) return;
          this._capturing = true;
          this._fails = 0;
          this._onWake && this._onWake();
        }

        if (rest !== null) this._cmd = rest;
        this._onCommandInterim && this._onCommandInterim(this._cmd);
        this._armQuiet();
      };

      r.onerror = (ev) => {
        const code = ev.error || 'error';
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          this._armed = false;
          this._onHeard && this._onHeard('__denied__');
        } else if (code !== 'no-speech' && code !== 'aborted') {
          this._fails++;
        }
      };

      /* Chrome closes the session on its own; keep whatever a command turn
         had collected, and back off if it keeps failing so a broken service
         cannot turn into a restart storm. */
      r.onend = () => {
        if (this._r !== r) return;
        this._r = null;
        if (this._capturing) {
          const cmd = this._cmd;
          this._endCapture();
          this._onCommand && this._onCommand(cmd);
        }
        if (!this._armed || this._paused) return;
        const wait = this._fails > 3 ? Math.min(1000 * this._fails, 8000) : 250;
        setTimeout(() => this._spin(), wait);
      };

      try {
        r.start();
      } catch (e) {
        this._r = null;
        this._fails++;
        setTimeout(() => this._spin(), 600);
      }
    },
  };

  window.PHRASE = PHRASE;
})();
