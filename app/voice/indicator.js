/* ===========================================================
   indicator.js — the pill.

   Once the wake word is armed it stays armed: closing the app does not
   stop it, so there has to be something on screen that says so from
   anywhere in the system. It reads at a glance, and it only ever says
   three things:

     blue dot, no text   nothing is happening — armed, waiting for its name
     red, with text      listening to you, showing the words as they arrive
     blue, with text     the agent talking back

   Waiting never carries text. If there are words in the pill, something
   is happening, and the colour says which of the two it is.

   Tapping it opens WALL·E. It lives outside the app view on purpose.
   =========================================================== */
(() => {
  const APP = 'WALL·E';

  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'listen-pill';
  pill.hidden = true;
  pill.innerHTML = '<span class="listen-dot"></span><span class="listen-text"></span>';

  const text = () => pill.querySelector('.listen-text');

  pill.addEventListener('click', () => {
    if (typeof window.openAppByName === 'function') window.openAppByName(APP);
  });

  const trim = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

  /* what the agent last said, and how long it stays up: long enough to
     read, and no longer, because this sits over whatever you are doing */
  let agent = null;
  let agentTimer = null;

  function showAgent(body, kind, ms) {
    agent = { body, kind };
    clearTimeout(agentTimer);
    if (ms) agentTimer = setTimeout(() => { agent = null; paint(); }, ms);
    paint();
  }

  const readingTime = (s) => Math.min(14000, 4000 + String(s).length * 55);

  function paint() {
    const e = window.WalleEngine;
    if (!e) return;

    const s = e.state;
    const live = s === 'wake' || s === 'listen' || s === 'starting';

    /* the agent can still be talking after the listener has gone quiet,
       but nothing is shown once the wake word is off entirely */
    if (!live && !agent) { pill.hidden = true; return; }
    pill.hidden = false;

    if (s === 'listen') {                       // you are talking
      pill.dataset.state = 'listen';
      pill.classList.remove('is-dot');
      text().textContent = e.interim ? trim(e.interim, 90) : 'Listening…';
      pill.title = 'WALL·E is listening to you';
      return;
    }

    if (agent) {                                // the agent is talking
      pill.dataset.state = agent.kind === 'error' ? 'agent-error' : 'agent';
      pill.classList.remove('is-dot');
      text().textContent = agent.body;
      pill.title = 'WALL·E answered';
      return;
    }

    if (s === 'starting') {
      pill.dataset.state = 'starting';
      pill.classList.remove('is-dot');
      text().textContent = 'Starting…';
      return;
    }

    pill.dataset.state = 'wake';                // nothing happening
    pill.classList.add('is-dot');
    text().textContent = '';
    pill.title = 'WALL·E is listening for its name';
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(pill);
    const e = window.WalleEngine;
    if (!e) return;

    e.on((ev) => {
      if (ev.type === 'heard') return;          // waiting stays a bare dot

      /* Once "Thinking…" has gone up, something has to replace it. Falling
         back to the bare dot would read as "nothing happened", which is the
         one thing that is certainly untrue — a command was just sent. Every
         outcome gets words, including the empty one. */
      if (ev.type === 'answered') {
        const entry = ev.entry || {};
        if (entry.thinking) showAgent('Thinking…', 'thinking', 90000);
        else if (entry.answer) showAgent(entry.answer, 'answer', readingTime(entry.answer));
        else if (entry.answerError) showAgent(entry.answerError, 'error', 8000);
        else showAgent('The agent had nothing to say.', 'error', 5000);
        return;
      }

      /* a new command clears the last answer — it is no longer the newest
         thing that happened */
      if (ev.type === 'wake') { agent = null; clearTimeout(agentTimer); }
      paint();
    });

    paint();
  });
})();
