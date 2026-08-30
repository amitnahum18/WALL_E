/* ===========================================================
   agent.js — the phone half of the bridge to the reasoning graph.

   The page holds the transcript and the frames; the model key lives in
   the Python process and never reaches the browser. That split is the
   only reason there is a server here at all, so this file stays dumb:
   it posts what was heard and seen, and takes back an answer.

   Everything is best-effort. The agent not running is a normal state,
   not an error state — the transcript is still worth keeping.
   =========================================================== */
(() => {
  const AGENT = {
    url: 'http://127.0.0.1:8077',

    async health() {
      try {
        const res = await fetch(this.url + '/health', { method: 'GET' });
        if (!res.ok) return { ok: false, error: 'HTTP ' + res.status };
        const body = await res.json();
        return { ok: true, model: body.model, key: !!body.key };
      } catch (e) {
        return { ok: false, error: 'not running' };
      }
    },

    /* ask({ text, screens, currentApp }) -> { answer, decision }

       Errors are worded for whoever is standing there waiting for an answer,
       not for a console: a dead server and a broken model read completely
       differently and are fixed in completely different places. */
    async ask(o) {
      let res;
      try {
        res = await fetch(this.url + '/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: o.text || '',
            screens: o.screens || [],
            current_app: o.currentApp || null,
            memory_context: o.memory || '',
            identity_context: o.identity || '',
          }),
        });
      } catch (e) {
        throw new Error('The agent is not running — start agent\\run.ps1');
      }
      if (!res.ok) throw new Error('The agent answered HTTP ' + res.status);
      return res.json();
    },
  };

  window.AGENT = AGENT;
})();
