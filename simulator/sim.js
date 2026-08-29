/* ===== לוגיקת הסימולטור ===== */
(() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    device: $('device'), zoom: $('zoom'), rotate: $('rotate'), theme: $('theme'),
    reload: $('reload'), live: $('live'), url: $('url'), go: $('go'), open: $('open'),
    stage: $('stage'), scaler: $('scaler'), deviceEl: $('deviceEl'), screen: $('screen'),
    frame: $('frame'), clock: $('clock'), sbIcons: $('sbIcons'), readout: $('readout'),
  };

  const STORE = 'walle.sim.state';
  const state = Object.assign({
    deviceId: 'iphone-15-pro',
    orientation: 'portrait',
    zoom: 'fit',
    theme: 'light',
    live: false,
    url: 'app/index.html',
  }, load());

  // ?url=... ו-?device=... דורסים את המצב השמור – נוח לקישור ישיר למסך מסוים
  const q = new URLSearchParams(location.search);
  if (q.get('url'))    state.url = q.get('url');
  if (q.get('device')) state.deviceId = q.get('device');

  const scrollMemory = new Map();
  let sbStyle = null;   // סגנון שורת הסטטוס שהאפליקציה ביקשה: 'light' | 'dark'

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }

  const device = () => DEVICES.find(d => d.id === state.deviceId) || DEVICES[0];

  /* ---------- אתחול פקדים ---------- */
  DEVICES.forEach(d => {
    const o = document.createElement('option');
    o.value = d.id;
    o.textContent = d.name + '  ·  ' + d.width + '×' + d.height;
    el.device.appendChild(o);
  });

  el.device.value = state.deviceId;
  el.zoom.value = state.zoom;
  el.url.value = state.url;
  el.live.checked = state.live;

  /* ---------- ציור המכשיר ---------- */
  function render() {
    const d = device();
    const land = state.orientation === 'landscape';
    const w = land ? d.height : d.width;
    const h = land ? d.width : d.height;

    const dev = el.deviceEl;
    dev.style.setProperty('--w', w + 'px');
    dev.style.setProperty('--h', h + 'px');
    dev.style.setProperty('--bezel', d.bezel + 'px');
    dev.style.setProperty('--radius', d.radius + 'px');
    dev.style.setProperty('--chin', (d.chin || 0) + 'px');

    dev.dataset.platform    = d.platform;
    dev.dataset.notch       = land ? 'none' : d.notch;
    dev.dataset.orientation = state.orientation;
    dev.dataset.home        = String(!!d.chin);
    dev.dataset.indicator   = d.homeIndicator ? d.platform : 'none';

    // אזורים בטוחים – משתנים לפי כיוון המכשיר
    const safe = land
      ? { top: d.platform === 'ios' ? 0 : 24,
          bottom: d.homeIndicator ? 21 : 0,
          left:  d.notch !== 'none' ? 44 : 0,
          right: d.notch !== 'none' ? 44 : 0 }
      : { top: d.safe.top, bottom: d.safe.bottom, left: 0, right: 0 };

    const sbH = land ? 24 : d.safe.top;
    dev.style.setProperty('--sb-h', sbH + 'px');
    const fg = sbStyle ? (sbStyle === 'light' ? '#fff' : '#000')
                       : (state.theme === 'dark' ? '#fff' : '#000');
    dev.style.setProperty('--sb-fg', fg);
    el.screen.style.background = state.theme === 'dark' ? '#000' : '#fff';

    drawStatusIcons(d.platform);
    applyZoom(w, h, d);

    el.readout.textContent =
      d.name + ' · ' + w + '×' + h + ' · ' + state.orientation +
      ' · ' + state.theme + ' · safe(' + safe.top + '/' + safe.bottom + ')';

    postConfig(d, w, h, safe);
    save();
  }

  /* ---------- זום ---------- */
  function applyZoom(w, h, d) {
    const fullW = w + d.bezel * 2;
    const fullH = h + d.bezel * 2 + (d.chin || 0);
    let s;
    if (state.zoom === 'fit') {
      const pad = 48;
      s = Math.min(1,
        (el.stage.clientHeight - pad) / fullH,
        (el.stage.clientWidth  - pad) / fullW);
    } else {
      s = parseFloat(state.zoom);
    }
    s = Math.max(0.2, s);
    el.scaler.style.transform = 'scale(' + s + ')';
    el.scaler.style.margin =
      ((fullH * s - fullH) / 2) + 'px ' + ((fullW * s - fullW) / 2) + 'px';
  }

  /* ---------- אייקוני שורת הסטטוס ---------- */
  function drawStatusIcons(platform) {
    const cellular = '<svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">' +
      '<rect x="0" y="7" width="3" height="4" rx="1"/>' +
      '<rect x="4.6" y="5" width="3" height="6" rx="1"/>' +
      '<rect x="9.2" y="2.5" width="3" height="8.5" rx="1"/>' +
      '<rect x="13.8" y="0" width="3" height="11" rx="1"/></svg>';
    const wifi = '<svg width="16" height="11" viewBox="0 0 16 12" fill="currentColor">' +
      '<path d="M8 11.2 5.6 8.6a3.4 3.4 0 0 1 4.8 0L8 11.2Z"/>' +
      '<path d="M3.6 6.5 2.1 5A8.4 8.4 0 0 1 13.9 5l-1.5 1.5a6.3 6.3 0 0 0-8.8 0Z"/>' +
      '<path d="M5.6 8.5 4.2 7.1a5.4 5.4 0 0 1 7.6 0l-1.4 1.4a3.4 3.4 0 0 0-4.8 0Z"/></svg>';
    const battery = '<svg width="25" height="12" viewBox="0 0 25 12">' +
      '<rect x=".5" y=".5" width="21" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".38"/>' +
      '<rect x="2.2" y="2.2" width="15" height="7.6" rx="1.8" fill="currentColor"/>' +
      '<path d="M23 4.2v3.6c1.1-.4 1.1-3.2 0-3.6Z" fill="currentColor" opacity=".45"/></svg>';
    el.sbIcons.innerHTML = platform === 'ios'
      ? cellular + wifi + battery
      : wifi + cellular + battery;
  }

  /* ---------- שעון ---------- */
  function tick() {
    const n = new Date();
    el.clock.textContent = n.getHours() + ':' + String(n.getMinutes()).padStart(2, '0');
  }
  tick();
  setInterval(tick, 10000);

  /* ---------- גשר אל האפליקציה שבתוך המסגרת ---------- */
  function postConfig(d, w, h, safe) {
    const msg = {
      type: 'sim:config',
      platform: d.platform,
      deviceName: d.name,
      theme: state.theme,
      orientation: state.orientation,
      width: w, height: h,
      safe: safe,
      restoreScroll: scrollMemory.get(el.frame.src) || 0,
    };
    try { el.frame.contentWindow.postMessage(msg, '*'); } catch (e) {}
  }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (!m || typeof m !== 'object') return;
    if (m.type === 'sim:ready')  render();
    if (m.type === 'sim:statusbar') { sbStyle = m.style; render(); }
    if (m.type === 'sim:scroll') scrollMemory.set(el.frame.src, m.y || 0);
  });

  el.frame.addEventListener('load', () => { sbStyle = null; setTimeout(render, 0); });

  /* ---------- אירועים ---------- */
  el.device.addEventListener('change', () => { state.deviceId = el.device.value; render(); });
  el.zoom.addEventListener('change',   () => { state.zoom = el.zoom.value; render(); });

  el.rotate.addEventListener('click', () => {
    state.orientation = state.orientation === 'portrait' ? 'landscape' : 'portrait';
    render();
  });

  el.theme.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    el.theme.classList.toggle('on', state.theme === 'dark');
    render();
  });

  // ב-file:// המסגרת נחשבת ממקור שונה, לכן יש נפילה חזרה לגשר שבתוך האפליקציה
  function reload() {
    try { el.frame.contentWindow.location.reload(); }
    catch (e) { el.frame.contentWindow.postMessage({ type: 'sim:reload' }, '*'); }
  }
  el.reload.addEventListener('click', reload);

  el.live.addEventListener('change', () => {
    state.live = el.live.checked;
    el.live.parentElement.classList.toggle('on', state.live);
    save();
  });
  // מצב Live: כל חזרה לחלון הדפדפן טוענת מחדש – ומיקום הגלילה נשמר
  window.addEventListener('focus', () => { if (state.live) reload(); });

  function loadUrl() {
    state.url = el.url.value.trim() || 'app/index.html';
    el.frame.src = state.url;
    save();
  }
  el.go.addEventListener('click', loadUrl);
  el.url.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadUrl(); });
  el.open.addEventListener('click', () => window.open(el.frame.src, '_blank'));

  window.addEventListener('resize', () => { if (state.zoom === 'fit') render(); });

  document.addEventListener('keydown', (e) => {
    const t = e.target.tagName;
    if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
    if (e.key === 'r' || e.key === 'R') reload();
    if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      el.rotate.click();
    }
  });

  /* ---------- הפעלה ---------- */
  el.theme.classList.toggle('on', state.theme === 'dark');
  el.live.parentElement.classList.toggle('on', state.live);
  if (el.frame.getAttribute('src') !== state.url) el.frame.src = state.url;
  render();
})();
