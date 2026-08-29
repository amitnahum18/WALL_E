/* Maps — a procedurally drawn street map, a route, and the bottom sheet. */
(() => {
  const W = 400, H = 900;

  /* deterministic pseudo-random, so the same city is drawn every time */
  function rng(seed) {
    let s = seed;
    return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  }

  function drawMap(dark) {
    const r = rng(20260829);
    const land = dark ? '#1b1d21' : '#f2efe9';
    const road = dark ? '#2e3238' : '#ffffff';
    const roadEdge = dark ? '#24272c' : '#e6e1d7';
    const water = dark ? '#16324a' : '#a8d3f0';
    const park = dark ? '#1e3324' : '#cfe6c4';
    const block = dark ? '#212429' : '#eae5dc';

    let s = '';
    s += `<rect width="${W}" height="${H}" fill="${land}"/>`;

    // a river running down the right side
    s += `<path d="M${W - 40} -10 C ${W - 90} 180, ${W - 20} 340, ${W - 70} 520
           C ${W - 110} 690, ${W - 30} 800, ${W - 60} ${H + 10}
           L ${W + 60} ${H + 10} L ${W + 60} -10 Z" fill="${water}"/>`;

    // two parks
    s += `<rect x="30" y="150" width="120" height="96" rx="16" fill="${park}"/>`;
    s += `<rect x="196" y="596" width="130" height="120" rx="20" fill="${park}"/>`;

    // city blocks
    for (let i = 0; i < 34; i++) {
      const x = 12 + r() * (W - 120);
      const y = 20 + r() * (H - 90);
      const w = 26 + r() * 56;
      const h = 22 + r() * 46;
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}"
             height="${h.toFixed(1)}" rx="3" fill="${block}"/>`;
    }

    // street grid, drawn edge-first so the roads read as casings
    const hy = [70, 148, 262, 348, 442, 530, 618, 706, 800];
    const vx = [46, 118, 196, 268, 334];
    let minor = '', major = '';
    hy.forEach((y, i) => {
      const jitter = (r() - 0.5) * 16;
      const d = `M-10 ${y} C 120 ${y + jitter}, 260 ${y - jitter}, ${W + 10} ${y}`;
      (i % 3 === 1 ? (major += `<path d="${d}"/>`) : (minor += `<path d="${d}"/>`));
    });
    vx.forEach((x, i) => {
      const jitter = (r() - 0.5) * 18;
      const d = `M${x} -10 C ${x + jitter} 280, ${x - jitter} 600, ${x} ${H + 10}`;
      (i % 2 === 0 ? (major += `<path d="${d}"/>`) : (minor += `<path d="${d}"/>`));
    });

    s += `<g fill="none" stroke="${roadEdge}" stroke-width="9">${minor}</g>`;
    s += `<g fill="none" stroke="${road}" stroke-width="6">${minor}</g>`;
    s += `<g fill="none" stroke="${roadEdge}" stroke-width="16">${major}</g>`;
    s += `<g fill="none" stroke="${road}" stroke-width="12">${major}</g>`;

    // the route
    const route = 'M118 742 C 118 660, 196 620, 196 530 C 196 430, 268 400, 268 300 C 268 210, 196 190, 196 148';
    s += `<path d="${route}" fill="none" stroke="#0a58c8" stroke-width="11"
           stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>`;
    s += `<path d="${route}" fill="none" stroke="#3b82f6" stroke-width="7"
           stroke-linecap="round" stroke-linejoin="round"/>`;

    // destination pin
    s += `<g transform="translate(196 148)">
            <path d="M0 6 C -13 -8, -11 -28, 0 -28 C 11 -28, 13 -8, 0 6 Z" fill="#ff3b30"/>
            <circle cx="0" cy="-19" r="4.6" fill="#fff"/>
          </g>`;

    // current location
    s += `<g transform="translate(118 742)">
            <circle r="22" fill="#3b82f6" opacity=".18"/>
            <circle r="9" fill="#fff"/>
            <circle r="6.5" fill="#0a84ff"/>
          </g>`;

    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${s}</svg>`;
  }

  SCREENS['Maps'] = {
    statusBar: 'auto',
    mount(nav, ctx) {
      nav.push({
        title: '', large: false, transparent: true, bodyClass: 'map-body no-pad',
        build(body, _nav, screen) {
          screen.classList.add('map-screen');

          const canvas = UI.el('div', 'map-canvas');
          const paintMap = () => {
            canvas.innerHTML = drawMap(document.documentElement.dataset.theme === 'dark');
          };
          paintMap();
          window.addEventListener('sim:config', paintMap);
          screen.addEventListener('screen:teardown', () =>
            window.removeEventListener('sim:config', paintMap));
          body.appendChild(canvas);

          /* floating controls, like the real app */
          const side = UI.el('div', 'map-side');
          [
            ['<path d="M12 2.6v18.8M2.6 12h18.8"/><circle cx="12" cy="12" r="7.4"/>', 'compass'],
            ['<path d="M12 3.2 20.4 12 12 20.8 3.6 12Z"/><circle cx="12" cy="12" r="3"/>', 'locate'],
          ].forEach(([d, name]) => {
            const b = UI.el('button', 'map-fab');
            b.type = 'button';
            b.setAttribute('aria-label', name);
            b.appendChild(UI.svg(d));
            side.appendChild(b);
          });
          screen.appendChild(side);

          /* bottom sheet */
          const sheet = UI.el('div', 'map-sheet');
          sheet.appendChild(UI.el('div', 'map-grabber'));
          sheet.appendChild(UI.searchField('Search for a place or address'));

          const eta = UI.el('div', 'map-eta');
          eta.innerHTML =
            '<div class="map-eta-main"><b>18 min</b><span>6.4 km · fastest route</span></div>' +
            '<button class="map-go" type="button">GO</button>';
          sheet.appendChild(eta);

          const rows = [
            ['Home', '18 min · light traffic', '#8e8e93',
             '<path d="M3.4 10.6 12 3.6l8.6 7"/><path d="M5.8 9.2V20h12.4V9.2"/>'],
            ['Work', '32 min · heavy traffic', '#8e8e93',
             '<path d="M3.4 8.4h17.2v11.2H3.4z"/><path d="M8.6 8.4V5.6h6.8v2.8"/>'],
            ['Noa Barak', 'Jaffa · 24 min', '#34c759',
             '<circle cx="12" cy="8.4" r="3.6"/><path d="M5.2 19.6a6.8 6.8 0 0 1 13.6 0"/>'],
          ].map(([label, sub, bg, icon]) =>
            UI.row({ icon, iconBg: bg, label, sub, onTap: () => {} }));

          sheet.appendChild(UI.group(rows, { title: 'Favourites' }));
          screen.appendChild(sheet);
        },
      });
    },
  };
})();
