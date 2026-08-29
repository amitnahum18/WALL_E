/* ===========================================================
   main.js — the springboard: builds the home screen,
   opens apps and hands them a Nav stack.
   The app catalog is in apps.js, each app's code in screens/.
   =========================================================== */

const $ = (s) => document.querySelector(s);

const pagesEl = $('#pages');
const dotsEl  = $('#dots');
const dockEl  = $('#dock');
const viewEl  = $('#appView');
const hostEl  = $('#navHost');
const toastEl = $('#toast');

const ICON_ELS = new Map();   // app name -> icon element

/* ---------- icon building ---------- */

function glyph(app) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', app.mode === 'fill' ? 'fill' : 'stroke');
  svg.innerHTML = app.icon;
  return svg;
}

const CUSTOM = {
  calendar(box) {
    const now = new Date();
    const dow = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    box.innerHTML =
      '<span class="cal-dow">' + dow + '</span>' +
      '<span class="cal-day">' + now.getDate() + '</span>';
  },

  photos(box) {
    const colors = ['#fbd11a', '#f79a1c', '#ef4d2e', '#e0308c',
                    '#9b4dd4', '#4a5fd6', '#25a9e0', '#3fc06a'];
    const petals = colors.map((c, i) =>
      '<ellipse cx="50" cy="31" rx="12.5" ry="19.5" fill="' + c +
      '" transform="rotate(' + (i * 45) + ' 50 50)"/>').join('');
    box.innerHTML =
      '<svg viewBox="0 0 100 100" style="width:74%;height:74%">' +
      '<g style="mix-blend-mode:multiply">' + petals + '</g></svg>';
  },

  clock(box) {
    box.innerHTML =
      '<svg viewBox="0 0 100 100" style="width:86%;height:86%">' +
      '<circle cx="50" cy="50" r="42" fill="#fff"/>' +
      '<circle cx="50" cy="50" r="42" fill="none" stroke="#111" stroke-width="3"/>' +
      '<g id="clock-hands" stroke="#111" stroke-linecap="round">' +
      '<line class="h" x1="50" y1="50" x2="50" y2="28" stroke-width="5"/>' +
      '<line class="m" x1="50" y1="50" x2="50" y2="18" stroke-width="3.4"/>' +
      '<line class="s" x1="50" y1="56" x2="50" y2="16" stroke="#ff9500" stroke-width="2"/>' +
      '<circle cx="50" cy="50" r="3.4" fill="#111"/></g></svg>';
  },

  reminders(box) {
    const dots = ['#ff3b30', '#0a84ff', '#34c759'];
    box.innerHTML =
      '<svg viewBox="0 0 100 100" style="width:70%;height:70%">' +
      dots.map((c, i) =>
        '<circle cx="22" cy="' + (26 + i * 24) + '" r="9" fill="' + c + '"/>' +
        '<rect x="40" y="' + (21 + i * 24) + '" width="' + (44 - i * 8) +
        '" height="9" rx="4.5" fill="#c9ccd2"/>').join('') +
      '</svg>';
  },
};

function makeIcon(app) {
  const btn = document.createElement('button');
  btn.className = 'app';
  btn.type = 'button';

  const box = document.createElement('span');
  box.className = 'icon' + (app.custom ? ' ' + app.custom : '');
  if (app.bg) box.style.background = app.bg;
  if (app.fg) box.style.setProperty('--fg', app.fg);

  if (app.custom) CUSTOM[app.custom](box);
  else box.appendChild(glyph(app));

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = app.name;

  btn.append(box, label);
  btn.addEventListener('click', () => openApp(app, box));
  ICON_ELS.set(app.name, box);
  return btn;
}

/* ---------- home screen ---------- */

/* A page holds 24 icons and the home screen only pages sideways — it never
   scrolls up and down, exactly like the real thing. So the catalog is
   reflowed into pages of 24: a 25th app starts a new page instead of
   being clipped below the fold where nothing can reach it. */
const PER_PAGE = 24;
const PAGES = [];
[].concat(...APP_PAGES).forEach((app) => {
  if (!PAGES.length || PAGES[PAGES.length - 1].length === PER_PAGE) PAGES.push([]);
  PAGES[PAGES.length - 1].push(app);
});

PAGES.forEach((apps) => {
  const page = document.createElement('div');
  page.className = 'page';
  apps.forEach((app) => page.appendChild(makeIcon(app)));
  pagesEl.appendChild(page);
});

PAGES.forEach(() => dotsEl.appendChild(document.createElement('i')));
APP_DOCK.forEach((app) => dockEl.appendChild(makeIcon(app)));

function syncDots() {
  const i = Math.round(pagesEl.scrollLeft / pagesEl.clientWidth);
  [...dotsEl.children].forEach((d, k) => d.classList.toggle('on', k === i));
}
pagesEl.addEventListener('scroll', syncDots, { passive: true });
syncDots();

dotsEl.addEventListener('click', (e) => {
  const i = [...dotsEl.children].indexOf(e.target);
  if (i >= 0) pagesEl.scrollTo({ left: i * pagesEl.clientWidth, behavior: 'smooth' });
});

/* the Clock icon keeps real time */
function tickClock() {
  const hands = document.querySelector('#clock-hands');
  if (!hands) return;
  const n = new Date();
  const set = (sel, deg) =>
    hands.querySelector(sel).setAttribute('transform', 'rotate(' + deg + ' 50 50)');
  set('.h', (n.getHours() % 12) * 30 + n.getMinutes() * 0.5);
  set('.m', n.getMinutes() * 6);
  set('.s', n.getSeconds() * 6);
}
tickClock();
setInterval(tickClock, 1000);

/* ---------- opening and closing an app ---------- */

let lastRect = null;
let isOpen = false;
let nav = null;
let currentBar = 'dark';
/* bumped on every open and close, so a finishing close animation can tell
   whether anything has opened since it started */
let openSeq = 0;

const themeIsDark = () => document.documentElement.dataset.theme === 'dark';

function resolveBar(pref) {
  if (pref === 'light' || pref === 'dark') return pref;
  return themeIsDark() ? 'light' : 'dark';       // 'auto'
}

const ctx = {
  setStatusBar(style) {
    currentBar = style;
    window.sim && sim.setStatusBar(style);
  },
  close: () => closeApp(),
};

/* fallback screen for apps that have no module yet */
function genericScreen(app) {
  return {
    statusBar: 'auto',
    mount(nav) {
      nav.push({
        title: app.name,
        build(body) {
          body.appendChild(UI.group(
            (app.rows || ['Nothing here yet']).map((r) =>
              UI.row({ label: r, onTap: () => {} })),
            { note: 'This app is a placeholder. Give it a file in screens/ to make it real.' }
          ));
        },
      });
    },
  };
}

function openApp(app, iconBox) {
  if (isOpen) return;
  isOpen = true;
  openSeq++;
  lastRect = iconBox.getBoundingClientRect();

  hostEl.innerHTML = '';
  nav = new Nav(hostEl);

  const mod = SCREENS[app.name] || genericScreen(app);
  currentBar = resolveBar(mod.statusBar);
  ctx.setStatusBar(currentBar);
  mod.mount(nav, ctx);

  viewEl.hidden = false;
  document.body.classList.add('app-open');
  viewEl.animate(zoomFrames(lastRect), zoomOptions());

  if (!UI.store('hint.seen', false)) {
    UI.save('hint.seen', true);
    toastEl.hidden = false;
    setTimeout(() => { toastEl.hidden = true; }, 3200);
  }
}

function closeApp() {
  if (!isOpen) return;
  isOpen = false;

  hostEl.querySelectorAll('.screen').forEach((s) =>
    s.dispatchEvent(new CustomEvent('screen:teardown')));

  const seq = ++openSeq;
  const anim = viewEl.animate(zoomFrames(lastRect).reverse(), zoomOptions());
  document.body.classList.remove('app-open');
  window.sim && sim.setStatusBar('light');
  anim.onfinish = () => {
    if (seq !== openSeq) return;      // another app opened while we were closing
    viewEl.hidden = true;
    hostEl.innerHTML = '';
    nav = null;
  };
}

function zoomFrames(r) {
  const W = window.innerWidth, H = window.innerHeight;
  return [
    { opacity: 0.2, borderRadius: '26px',
      transform: 'translate(' + r.left + 'px,' + r.top + 'px) scale(' +
                 (r.width / W) + ',' + (r.height / H) + ')' },
    { opacity: 1, borderRadius: '0px', transform: 'translate(0px,0px) scale(1,1)' },
  ];
}
const zoomOptions = () => ({ duration: 340, easing: 'cubic-bezier(.22,.9,.24,1)' });

/* Esc goes back one screen, then home */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !isOpen) return;
  if (nav && nav.stack.length > 1) nav.pop();
  else closeApp();
});

/* swipe up from the home indicator */
let swipeY = null;
const zone = $('#closeZone');
zone.addEventListener('pointerdown', (e) => { swipeY = e.clientY; zone.setPointerCapture(e.pointerId); });
zone.addEventListener('pointermove', (e) => {
  if (swipeY !== null && swipeY - e.clientY > 34) { swipeY = null; closeApp(); }
});
zone.addEventListener('pointerup', () => { swipeY = null; });

/* ---------- keep in sync with the simulator ---------- */
window.addEventListener('sim:config', () => {
  window.sim.setStatusBar(isOpen ? currentBar : 'light');
});

window.addEventListener('load', () => {
  const saved = UI.store('set.theme', null);
  if (saved && window.sim) sim.setTheme(saved);
  window.sim && sim.setStatusBar('light');
});

/* open an app from outside the springboard — the listening pill uses this */
window.openAppByName = (name) => {
  const app = [].concat(...APP_PAGES, APP_DOCK)
    .find((a) => a.name.toLowerCase() === String(name).toLowerCase());
  if (app) openApp(app, ICON_ELS.get(app.name));
};

/* ---------- deep link:  index.html#app=Mail  ---------- */
if (location.hash.startsWith('#app=')) {
  const wanted = decodeURIComponent(location.hash.slice(5));
  requestAnimationFrame(() => window.openAppByName(wanted));
}
