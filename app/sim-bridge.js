/* ===========================================================
   sim-bridge.js — הגשר בין האפליקציה לסימולטור.
   הוסף אותו לכל דף שרץ בתוך המכשיר:
       <script src="sim-bridge.js"> ... closing tag

   מה הוא נותן לך:
   • משתני CSS של האזורים הבטוחים:  --sat  --sab  --sal  --sar
   • מאפיינים על <html>:  data-platform  data-theme  data-orientation
   • גלילה בגרירת עכבר (כמו אצבע) כולל תנופה
   • הסתרת פסי גלילה + שמירת מיקום הגלילה בין רענונים
   =========================================================== */
(() => {
  const root = document.documentElement;

  /* ---- הסתרת פסי גלילה + ברירות מחדל של אזור בטוח ---- */
  const style = document.createElement('style');
  style.textContent = `
    :root{ --sat:0px; --sab:0px; --sal:0px; --sar:0px; }
    html{ scrollbar-width:none; -ms-overflow-style:none; }
    html::-webkit-scrollbar, body::-webkit-scrollbar,
    *::-webkit-scrollbar{ width:0; height:0; display:none; }
    html.sim-dragging, html.sim-dragging *{
      user-select:none !important; cursor:grabbing !important;
    }
  `;
  document.head.appendChild(style);

  /* ---- קליטת ההגדרות מהסימולטור ---- */
  let restored = false;

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (!m || typeof m !== 'object') return;

    if (m.type === 'sim:reload') { location.reload(); return; }
    if (m.type !== 'sim:config') return;

    root.style.setProperty('--sat', m.safe.top + 'px');
    root.style.setProperty('--sab', m.safe.bottom + 'px');
    root.style.setProperty('--sal', m.safe.left + 'px');
    root.style.setProperty('--sar', m.safe.right + 'px');

    root.dataset.platform    = m.platform;
    if (!themeLock) root.dataset.theme = m.theme;
    root.dataset.orientation = m.orientation;

    if (!restored && m.restoreScroll) {
      restored = true;
      window.scrollTo(0, m.restoreScroll);
    }

    // אירוע שאפשר להאזין לו מקוד האפליקציה
    window.dispatchEvent(new CustomEvent('sim:config', { detail: m }));
  });

  /* ---- API שהאפליקציה יכולה לקרוא לו ---- */
  let themeLock = false;

  window.sim = {
    // האפליקציה קובעת ערכה בעצמה, והסימולטור מפסיק לדרוס אותה
    setTheme(t) { themeLock = true; root.dataset.theme = t; },

    // 'light' = אייקונים לבנים (רקע כהה), 'dark' = אייקונים שחורים
    setStatusBar(style) {
      try { parent.postMessage({ type: 'sim:statusbar', style }, '*'); } catch (e) {}
    },
  };

  const announce = () => {
    try { parent.postMessage({ type: 'sim:ready' }, '*'); } catch (e) {}
  };
  announce();
  window.addEventListener('load', announce);

  /* ---- דיווח מיקום גלילה להורה ---- */
  let raf = 0;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      try { parent.postMessage({ type: 'sim:scroll', y: window.scrollY }, '*'); } catch (e) {}
    });
  }, { passive: true });

  /* ---- גלילה בגרירת עכבר, עם תנופה ---- */
  const SCROLLER = (node) => {
    while (node && node.nodeType === 1 && node !== document.body) {
      const cs = getComputedStyle(node);
      const scrollableY = /auto|scroll|overlay/.test(cs.overflowY) &&
                          node.scrollHeight > node.clientHeight + 1;
      const scrollableX = /auto|scroll|overlay/.test(cs.overflowX) &&
                          node.scrollWidth > node.clientWidth + 1;
      if (scrollableY || scrollableX) return node;
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  };

  const INTERACTIVE = 'input,textarea,select,option,[contenteditable="true"]';
  const THRESHOLD = 5;

  let drag = null;
  let glide = 0;

  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (e.target.closest && e.target.closest(INTERACTIVE)) return;
    cancelAnimationFrame(glide);
    drag = {
      target: SCROLLER(e.target),
      x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY,
      vx: 0, vy: 0, t: performance.now(),
      active: false,
    };
    drag.left = drag.target.scrollLeft;
    drag.top  = drag.target.scrollTop;
  }, true);

  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.active) {
      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
      drag.active = true;
      root.classList.add('sim-dragging');
    }

    e.preventDefault();
    const now = performance.now();
    const dt = Math.max(1, now - drag.t);
    drag.vx = (drag.x - e.clientX) / dt * 16;
    drag.vy = (drag.y - e.clientY) / dt * 16;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;

    drag.target.scrollLeft = drag.left - dx;
    drag.target.scrollTop  = drag.top  - dy;
  }, true);

  function endDrag() {
    if (!drag) return;
    const d = drag;
    drag = null;
    root.classList.remove('sim-dragging');
    if (!d.active) return;

    // בלימה הדרגתית, כמו על מסך מגע
    let { vx, vy } = d;
    const step = () => {
      vx *= 0.94; vy *= 0.94;
      if (Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4) return;
      d.target.scrollLeft += vx;
      d.target.scrollTop  += vy;
      glide = requestAnimationFrame(step);
    };
    glide = requestAnimationFrame(step);

    // מניעת קליק מקרי בסוף גרירה
    const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => removeEventListener('click', swallow, true), 0);
  }

  addEventListener('pointerup', endDrag, true);
  addEventListener('pointercancel', endDrag, true);
  addEventListener('dragstart', (e) => { if (drag && drag.active) e.preventDefault(); }, true);
})();
