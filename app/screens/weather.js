/* Weather — current conditions, hourly strip, 10-day forecast, detail tiles. */
(() => {
  const ICONS = {
    clear:  '<circle cx="12" cy="12" r="4.4" fill="#ffd644" stroke="none"/><g stroke="#ffd644" stroke-width="1.9" stroke-linecap="round"><path d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.6 5.4 16.9 7.1M7.1 16.9 5.4 18.6M18.6 18.6 16.9 16.9M7.1 7.1 5.4 5.4"/></g>',
    partly: '<circle cx="8.6" cy="8.2" r="3.4" fill="#ffd644" stroke="none"/><path d="M9.4 20h8.2a3.4 3.4 0 0 0 .3-6.8 4.6 4.6 0 0 0-8.8-1 3.9 3.9 0 0 0 .3 7.8Z" fill="#e9eef5" stroke="none"/>',
    cloudy: '<path d="M8 19.4h9a3.7 3.7 0 0 0 .3-7.4 5 5 0 0 0-9.6-1.1A3.9 3.9 0 0 0 8 19.4Z" fill="#dfe6ee" stroke="none"/>',
    rain:   '<path d="M8 15.4h9a3.7 3.7 0 0 0 .3-7.4 5 5 0 0 0-9.6-1.1A3.9 3.9 0 0 0 8 15.4Z" fill="#cfd8e3" stroke="none"/><g stroke="#5ac8fa" stroke-width="1.9" stroke-linecap="round"><path d="M9 18.2 8.2 21M13 18.2 12.2 21M17 18.2 16.2 21"/></g>',
  };

  const HOURLY = [
    ['Now', 'clear', 27], ['13', 'clear', 28], ['14', 'clear', 29], ['15', 'partly', 29],
    ['16', 'partly', 28], ['17', 'partly', 27], ['18', 'cloudy', 25], ['19', 'cloudy', 24],
    ['20', 'cloudy', 23], ['21', 'clear', 22], ['22', 'clear', 22], ['23', 'clear', 21],
  ];

  const DAILY = [
    ['Today', 'clear', 21, 29], ['Sat', 'partly', 20, 28], ['Sun', 'partly', 20, 27],
    ['Mon', 'rain', 19, 24], ['Tue', 'rain', 18, 23], ['Wed', 'cloudy', 19, 25],
    ['Thu', 'clear', 20, 27], ['Fri', 'clear', 21, 29], ['Sat', 'clear', 22, 30],
    ['Sun', 'partly', 21, 28],
  ];

  const TILES = [
    ['UV Index', '4', 'Moderate'],
    ['Sunset', '19:34', 'Sunrise: 06:12'],
    ['Wind', '12 km/h', 'From the west'],
    ['Feels Like', '29°', 'Humidity makes it warmer'],
    ['Humidity', '61%', 'Dew point 18°'],
    ['Visibility', '16 km', 'Perfectly clear'],
  ];

  const lo = Math.min(...DAILY.map((d) => d[2]));
  const hi = Math.max(...DAILY.map((d) => d[3]));

  SCREENS['Weather'] = {
    statusBar: 'light',
    mount(nav) {
      nav.push({
        title: '', large: false, transparent: true, bodyClass: 'wx-body',
        build(body, _nav, screen) {
          screen.classList.add('wx-screen');

          /* ---- hero ---- */
          const hero = UI.el('div', 'wx-hero');
          hero.innerHTML =
            '<div class="wx-city">Tel Aviv</div>' +
            '<div class="wx-temp">27°</div>' +
            '<div class="wx-cond">Mostly Sunny</div>' +
            '<div class="wx-hl">H:29°  L:21°</div>';
          body.appendChild(hero);

          /* ---- hourly ---- */
          const hCard = UI.el('div', 'wx-card');
          hCard.appendChild(UI.el('div', 'wx-card-title', 'Sunny conditions will continue all day.'));
          const strip = UI.el('div', 'wx-hours');
          HOURLY.forEach(([h, ic, t]) => {
            const c = UI.el('div', 'wx-hour');
            c.appendChild(UI.el('div', 'wx-hour-l', h));
            c.appendChild(UI.svg(ICONS[ic], 'wx-ico'));
            c.appendChild(UI.el('div', 'wx-hour-t', t + '°'));
            strip.appendChild(c);
          });
          hCard.appendChild(strip);
          body.appendChild(hCard);

          /* ---- 10 day ---- */
          const dCard = UI.el('div', 'wx-card');
          dCard.appendChild(UI.el('div', 'wx-card-title', '10-DAY FORECAST'));
          DAILY.forEach(([d, ic, l, h]) => {
            const r = UI.el('div', 'wx-day');
            r.appendChild(UI.el('div', 'wx-day-l', d));
            r.appendChild(UI.svg(ICONS[ic], 'wx-ico'));
            r.appendChild(UI.el('div', 'wx-day-lo', l + '°'));

            const track = UI.el('div', 'wx-track');
            const fill = UI.el('div', 'wx-fill');
            fill.style.left  = ((l - lo) / (hi - lo) * 100) + '%';
            fill.style.right = ((hi - h) / (hi - lo) * 100) + '%';
            track.appendChild(fill);
            r.appendChild(track);

            r.appendChild(UI.el('div', 'wx-day-hi', h + '°'));
            dCard.appendChild(r);
          });
          body.appendChild(dCard);

          /* ---- detail tiles ---- */
          const grid = UI.el('div', 'wx-grid');
          TILES.forEach(([t, v, s]) => {
            const c = UI.el('div', 'wx-tile');
            c.innerHTML =
              '<div class="wx-tile-t">' + t + '</div>' +
              '<div class="wx-tile-v">' + v + '</div>' +
              '<div class="wx-tile-s">' + s + '</div>';
            grid.appendChild(c);
          });
          body.appendChild(grid);
        },
      });
    },
  };
})();
