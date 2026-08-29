/* ===========================================================
   stt.js — speech to text, one utterance at a time.

   Wraps the browser's SpeechRecognition. The engine only ever asks for
   a single command, so `continuous` stays off and the browser's own
   end-of-speech detection closes the turn. A hard cap is layered on top
   so a noisy room can never hold the microphone open forever.

   Swapping this file for a Whisper-backed one is the intended upgrade
   path: keep `listenOnce` and the four callbacks and nothing else moves.
   =========================================================== */
(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const STT = {
    get supported() { return !!SR; },

    /* listenOnce({ lang, maxMs, onInterim, onFinal, onError })
       -> { stop(), abort() }
       Exactly one of onFinal / onError fires, and only once. */
    listenOnce(o = {}) {
      if (!SR) {
        setTimeout(() => o.onError && o.onError('unsupported'), 0);
        return { stop() {}, abort() {} };
      }

      const r = new SR();
      r.lang = o.lang || 'he-IL';
      r.continuous = false;
      r.interimResults = true;
      r.maxAlternatives = 1;

      let settled = false;
      let finalText = '';
      let interim = '';

      const cap = setTimeout(() => { try { r.stop(); } catch (e) {} }, o.maxMs || 12000);

      const settle = (kind, payload) => {
        if (settled) return;
        settled = true;
        clearTimeout(cap);
        if (kind === 'final') o.onFinal && o.onFinal(payload);
        else o.onError && o.onError(payload);
      };

      r.onresult = (ev) => {
        interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (res.isFinal) finalText += res[0].transcript;
          else interim += res[0].transcript;
        }
        o.onInterim && o.onInterim((finalText + interim).trim());
      };

      /* onerror always precedes onend; onend is what actually closes the turn,
         so a clean stop after some speech still resolves as a final result. */
      r.onerror = (ev) => {
        const code = ev.error || 'error';
        if (code === 'no-speech' || code === 'aborted') return;   // let onend decide
        settle('error', code);
      };

      r.onend = () => {
        const text = (finalText || interim).trim();
        if (text) settle('final', text);
        else settle('error', 'no-speech');
      };

      try {
        r.start();
      } catch (e) {
        settle('error', 'start-failed');
      }

      return {
        stop() { try { r.stop(); } catch (e) {} },        // keep what was heard
        abort() { try { r.abort(); } catch (e) {} },      // throw it away
      };
    },
  };

  window.STT = STT;
})();
