/* ===========================================================
   indicator.js — the listening pill.

   Once the wake word is armed it stays armed: closing the app does not
   stop it, so there has to be something on screen that says so from
   anywhere in the system.

   Waiting is a blue dot and nothing else — small, quiet, always there,
   the way a phone shows the microphone is live. It opens into a full
   pill only when there is something to say: for a moment when the name
   is heard, and for as long as a command is being captured, where it
   turns red and shows the words as they arrive. Then it shrinks back.

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

  const trim = (s, n) => (s.length > n ? '…' + s.slice(-n) : s);

  let flash = null;                 // keeps the pill open briefly after a detection
  const openFor = (ms) => {
    clearTimeout(flash);
    flash = setTimeout(() => { flash = null; paint(); }, ms);
  };

  function paint() {
    const e = window.WalleEngine;
    if (!e) return;
    const s = e.state;
    const on = s === 'wake' || s === 'listen' || s === 'starting';

    pill.hidden = !on;
    if (!on) return;

    pill.dataset.state = s;

    /* waiting collapses to the dot; anything happening opens it up */
    const open = s !== 'wake' || flash !== null;
    pill.classList.toggle('is-dot', !open);
    pill.title = s === 'wake' ? 'WALL·E is listening for its name' : 'WALL·E is listening';

    if (s === 'listen') {
      text().textContent = e.interim ? trim(e.interim, 34) : 'Listening…';
    } else if (s === 'starting') {
      text().textContent = 'Starting…';
    } else {
      const name = e.config.wakeMode === 'phrase'
        ? (String(e.config.phrases).split(',')[0] || '').trim()
        : (e.config.keyword === 'custom' ? e.config.customLabel : e.config.keyword);
      text().textContent = 'Waiting for “' + name + '”';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(pill);
    const e = window.WalleEngine;
    if (!e) return;
    e.on((ev) => {
      if (ev.type === 'wake') openFor(2200);          // show that it triggered
      if (ev.type === 'state' && ev.state === 'wake' && !flash) openFor(1600);
      if (ev.type === 'heard') return;                 // the dot stays a dot while waiting
      paint();
    });
    paint();
  });
})();
