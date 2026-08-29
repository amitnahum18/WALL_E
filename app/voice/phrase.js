/* ===========================================================
   phrase.js — the wake word without a model: keep a continuous
   recogniser running and watch the transcript for the name.

   No key, no training, no download. The cost is real and worth stating
   plainly: this streams the microphone to the speech service the whole
   time it is armed, so the "nothing leaves the machine until you say the
   name" property of the Porcupine path is gone. It is the quick way to
   see the pipeline work, not the way to ship it.

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
    _re: null,
    _phrases: [],
    _lang: 'en-US',
    _onWake: null,
    _onHeard: null,
    _fails: 0,

    get running() { return this._armed && !this._paused; },
    get label() { return this._phrases[0] || ''; },

    /* null when the name is not in there; otherwise whatever followed it */
    match(text, phrases) {
      const re = phrases ? build(phrases) : this._re;
      if (!re) return null;
      const t = norm(text);
      const m = re.exec(t);
      return m ? t.slice(m.index + m[0].length).trim() : null;
    },

    start({ phrases, lang, onWake, onHeard }) {
      if (!SR) throw new Error('no-stt');
      this.release();
      this._phrases = (phrases || []).slice();
      this._re = build(this._phrases);
      if (!this._re) throw new Error('no-phrase');
      this._lang = lang || 'en-US';
      this._onWake = onWake;
      this._onHeard = onHeard;
      this._armed = true;
      this._paused = false;
      this._fails = 0;
      this._spin();
    },

    pause() {
      this._paused = true;
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
      this._kill();
      this._re = null;
      this._phrases = [];
    },

    _kill() {
      const r = this._r;
      this._r = null;
      if (!r) return;
      r.onend = null; r.onresult = null; r.onerror = null;
      try { r.abort(); } catch (e) {}
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
        let text = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) text += ev.results[i][0].transcript;
        const t = norm(text);
        if (!t) return;
        this._onHeard && this._onHeard(t);

        const rest = this.match(t);
        if (rest === null) return;                 // '' is a hit with nothing after it
        this._fails = 0;
        this.pause();
        this._onWake && this._onWake(rest);
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

      /* Chrome closes the session on its own; back off if it keeps failing
         so a broken service cannot turn into a restart storm. */
      r.onend = () => {
        if (this._r !== r) return;
        this._r = null;
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
