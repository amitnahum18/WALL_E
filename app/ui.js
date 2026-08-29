/* ===========================================================
   ui.js — the little framework the apps are built on.

   UI.el / UI.group / UI.row / UI.switchEl / UI.tabs  build UIKit-ish pieces.
   Nav  pushes and pops screens with the iOS slide animation,
        including the drag-from-the-left-edge back gesture.
   =========================================================== */

const UI = {
  el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  },

  svg(inner, cls) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = inner;
    return s;
  },

  chevron() {
    const s = UI.svg('<path d="M2 1.5 7 7l-5 5.5"/>', 'chev');
    s.setAttribute('viewBox', '0 0 9 14');
    return s;
  },

  /* ---- a grouped list section ---- */
  group(rows, opts = {}) {
    const frag = document.createDocumentFragment();
    if (opts.title) frag.appendChild(UI.el('div', 'group-title', opts.title));
    const box = UI.el('div', 'group');
    rows.filter(Boolean).forEach((r) => box.appendChild(r));
    frag.appendChild(box);
    if (opts.note) frag.appendChild(UI.el('div', 'group-note', opts.note));
    return frag;
  },

  /* ---- one list row ---- */
  row(o = {}) {
    const tag = o.onTap ? 'button' : 'div';
    const r = UI.el(tag, 'row' + (o.onTap ? ' tap' : '') + (o.icon ? ' has-icon' : '') +
                        (o.strong ? ' row-strong' : ''));
    if (tag === 'button') r.type = 'button';

    if (o.icon) {
      const box = UI.el('span', 'row-icon');
      box.style.background = o.iconBg || 'var(--ios-blue)';
      box.appendChild(UI.svg(o.icon));
      r.appendChild(box);
    }

    const main = UI.el('div', 'row-main');
    const b = UI.el('b', null, o.label);
    if (o.labelColor) b.style.color = o.labelColor;
    main.appendChild(b);
    if (o.sub) main.appendChild(UI.el('small', null, o.sub));
    r.appendChild(main);

    if (o.value != null) r.appendChild(UI.el('span', 'row-value', o.value));
    if (o.right) r.appendChild(o.right);
    if (o.chevron !== false && o.onTap) r.appendChild(UI.chevron());

    if (o.onTap) r.addEventListener('click', o.onTap);
    return r;
  },

  switchEl(checked, onChange) {
    const s = UI.el('button', 'switch');
    s.type = 'button';
    s.setAttribute('role', 'switch');
    s.setAttribute('aria-checked', String(!!checked));
    s.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = s.getAttribute('aria-checked') !== 'true';
      s.setAttribute('aria-checked', String(next));
      onChange && onChange(next);
    });
    return s;
  },

  /* ---- bottom tab bar; returns { el, select } ---- */
  tabs(items, active, onChange) {
    const bar = UI.el('div', 'tabs');
    const btns = items.map((it, i) => {
      const b = UI.el('button');
      b.type = 'button';
      b.setAttribute('aria-selected', String(i === active));
      b.appendChild(UI.svg(it.icon));
      b.appendChild(UI.el('span', null, it.label));
      b.addEventListener('click', () => { select(i); onChange && onChange(i); });
      bar.appendChild(b);
      return b;
    });
    function select(i) {
      btns.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    }
    return { el: bar, select };
  },

  searchField(placeholder) {
    const f = UI.el('div', 'search-field');
    f.appendChild(UI.svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>'));
    f.appendChild(UI.el('span', null, placeholder || 'Search'));
    return f;
  },

  /* ---- tiny persisted store, one key per app ---- */
  store(key, fallback) {
    const k = 'ios.' + key;
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  save(key, value) {
    try { localStorage.setItem('ios.' + key, JSON.stringify(value)); } catch (e) {}
  },
};

/* ===========================================================
   Nav — the screen stack
   =========================================================== */
class Nav {
  constructor(host) {
    this.host = host;
    this.stack = [];
    this._edgeSwipe();
  }

  get top() { return this.stack[this.stack.length - 1]; }

  push(view) {
    const screen = UI.el('div', 'screen');
    screen.dataset.title = view.title || '';

    /* nav bar */
    const bar = UI.el('div', 'navbar');
    if (this.stack.length) {
      const back = UI.el('button', 'nav-back');
      back.type = 'button';
      back.appendChild(UI.svg('<path d="M15 4 7 12l8 8"/>'));
      back.appendChild(UI.el('span', null, this.top.dataset.title || 'Back'));
      back.addEventListener('click', () => this.pop());
      bar.appendChild(back);
    } else if (view.leftAction) {
      bar.appendChild(view.leftAction);
    }
    bar.appendChild(UI.el('div', 'nav-spacer'));
    if (view.rightAction) bar.appendChild(view.rightAction);
    bar.appendChild(UI.el('div', 'nav-title', view.title || ''));
    screen.appendChild(bar);

    /* body */
    const body = UI.el('div', 'screen-body' + (view.bodyClass ? ' ' + view.bodyClass : ''));
    if (view.large !== false && view.title) {
      body.appendChild(UI.el('h1', 'large-title', view.title));
    } else if (!view.transparent) {
      bar.classList.add('solid');
    }
    screen.appendChild(body);
    screen.appendChild(UI.el('div', 'dim'));

    if (view.large !== false && view.title) {
      const onScroll = () => bar.classList.toggle('solid', body.scrollTop > 32);
      body.addEventListener('scroll', onScroll, { passive: true });
    }

    view.build && view.build(body, this, screen);

    const prev = this.top;
    this.host.appendChild(screen);
    this.stack.push(screen);

    if (prev) {
      screen.style.transform = 'translateX(100%)';
      screen.getBoundingClientRect();                 // flush layout
      screen.classList.add('sliding');
      prev.classList.add('sliding', 'behind');
      screen.style.transform = '';
      const done = () => {
        screen.classList.remove('sliding');
        prev.classList.remove('sliding');
        screen.removeEventListener('transitionend', done);
      };
      screen.addEventListener('transitionend', done);
    }
    return screen;
  }

  pop() {
    if (this.stack.length < 2) return;
    const cur = this.stack.pop();
    const prev = this.top;
    cur.classList.add('sliding');
    prev.classList.add('sliding');
    cur.style.transform = 'translateX(100%)';
    prev.classList.remove('behind');
    const done = () => {
      cur.remove();
      prev.classList.remove('sliding');
    };
    cur.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 420);                            // safety net
  }

  /* drag in from the left edge to go back */
  _edgeSwipe() {
    let start = null;
    const W = () => this.host.clientWidth;

    this.host.addEventListener('pointerdown', (e) => {
      if (this.stack.length < 2) return;
      if (e.clientX - this.host.getBoundingClientRect().left > 24) return;
      start = { x: e.clientX, cur: this.top, prev: this.stack[this.stack.length - 2] };
      start.cur.classList.remove('sliding');
      start.prev.classList.remove('sliding');
    }, true);

    this.host.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = Math.max(0, e.clientX - start.x);
      start.cur.style.transform = 'translateX(' + dx + 'px)';
      start.prev.style.transform = 'translateX(' + (-28 + (dx / W()) * 28) + '%)';
    }, true);

    const end = (e) => {
      if (!start) return;
      const dx = Math.max(0, (e.clientX || 0) - start.x);
      const s = start; start = null;
      s.cur.style.transform = '';
      s.prev.style.transform = '';
      if (dx > W() * 0.32) this.pop();
    };
    this.host.addEventListener('pointerup', end, true);
    this.host.addEventListener('pointercancel', end, true);
  }
}

window.UI = UI;
window.Nav = Nav;
window.SCREENS = {};
