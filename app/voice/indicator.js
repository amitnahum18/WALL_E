/* ===========================================================
   indicator.js — the listening pill.

   Once the wake word is armed it stays armed: closing the app does not
   stop it, so there has to be something on screen that says so from
   anywhere in the system. This is that something — a pill under the
   status bar, blue while waiting for the name, red while a command is
   being captured, gone when nothing is listening.

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

  function paint() {
    const e = window.WalleEngine;
    if (!e) return;
    const s = e.state;
    const on = s === 'wake' || s === 'listen' || s === 'starting';

    pill.hidden = !on;
    if (!on) return;

    pill.dataset.state = s;
    if (s === 'listen') {
      text().textContent = e.interim ? trim(e.interim, 34) : 'Listening…';
    } else if (s === 'starting') {
      text().textContent = 'Starting…';
    } else {
      const name = e.config.wakeMode === 'phrase'
        ? (String(e.config.phrases).split(',')[0] || '').trim()
        : (e.config.keyword === 'custom' ? e.config.customLabel : e.config.keyword);
      text().textContent = e.heard ? trim(e.heard, 34) : 'Waiting for “' + name + '”';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(pill);
    if (window.WalleEngine) {
      window.WalleEngine.on(paint);
      paint();
    }
  });
})();
