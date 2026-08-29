/* Clock — four tabs; the stopwatch and the timer really run. */
(() => {
  const TAB_ICONS = {
    world: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"/>',
    alarm: '<circle cx="12" cy="13" r="7.6"/><path d="M12 9.4V13l2.6 1.6"/><path d="m4.4 5.6 2.8-2.4M19.6 5.6l-2.8-2.4"/>',
    stop:  '<circle cx="12" cy="13.4" r="7.6"/><path d="M12 9.6v3.8M9.6 2.8h4.8"/>',
    timer: '<circle cx="12" cy="12" r="9"/><path d="M12 6.8V12l3.6 2.2"/>',
  };

  const CITIES = [
    ['Cupertino', -7], ['New York', -4], ['London', 1],
    ['Paris', 2], ['Tokyo', 9], ['Sydney', 10],
  ];

  const ALARMS = [
    ['07:00', 'Wake up', true], ['07:30', 'Weekdays', true],
    ['09:15', 'Standup', false], ['13:00', 'Lunch', false], ['22:30', 'Wind down', true],
  ];

  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- tab builders ---------- */

  function worldClock(host, timers) {
    const rows = CITIES.map(([city, off]) => {
      const r = UI.el('div', 'row clock-city');
      const main = UI.el('div', 'row-main');
      const delta = off - (-new Date().getTimezoneOffset() / 60);
      main.innerHTML =
        '<small>' + (delta === 0 ? 'Today' : (delta > 0 ? '+' : '') + delta + 'HRS') + '</small>' +
        '<b>' + city + '</b>';
      const time = UI.el('div', 'clock-city-time');
      r.append(main, time);
      r._paint = () => {
        const d = new Date(Date.now() + (off * 60 + new Date().getTimezoneOffset()) * 60000);
        time.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
      };
      r._paint();
      return r;
    });
    host.appendChild(UI.group(rows));
    timers.push(setInterval(() => rows.forEach((r) => r._paint()), 1000));
  }

  function alarms(host) {
    const rows = ALARMS.map(([t, label, on]) => {
      const r = UI.el('div', 'row clock-alarm');
      const main = UI.el('div', 'row-main');
      main.innerHTML = '<b class="clock-alarm-t">' + t + '</b><small>' + label + '</small>';
      r.append(main, UI.switchEl(on));
      r.classList.toggle('off', !on);
      return r;
    });
    host.appendChild(UI.group(rows, { title: 'Other' }));
  }

  function stopwatch(host, timers) {
    let t0 = 0, elapsed = 0, running = false, lapBase = 0, laps = [];

    const face = UI.el('div', 'sw-face', '00:00.00');
    const actions = UI.el('div', 'sw-actions');
    const lapBtn = UI.el('button', 'sw-btn grey', 'Lap');
    const goBtn = UI.el('button', 'sw-btn green', 'Start');
    lapBtn.type = goBtn.type = 'button';
    lapBtn.disabled = true;
    actions.append(lapBtn, goBtn);
    const list = UI.el('div', 'sw-laps');
    host.append(face, actions, list);

    const show = (ms) => {
      const m = Math.floor(ms / 60000);
      const s = Math.floor(ms / 1000) % 60;
      const cs = Math.floor(ms / 10) % 100;
      return pad(m) + ':' + pad(s) + '.' + pad(cs);
    };
    const paint = () => { face.textContent = show(elapsed + (running ? Date.now() - t0 : 0)); };

    goBtn.addEventListener('click', () => {
      if (running) {
        elapsed += Date.now() - t0; running = false;
        goBtn.textContent = 'Start'; goBtn.className = 'sw-btn green';
        lapBtn.textContent = 'Reset';
      } else {
        t0 = Date.now(); running = true;
        goBtn.textContent = 'Stop'; goBtn.className = 'sw-btn red';
        lapBtn.textContent = 'Lap'; lapBtn.disabled = false;
      }
    });

    lapBtn.addEventListener('click', () => {
      const total = elapsed + (running ? Date.now() - t0 : 0);
      if (!running) {
        elapsed = 0; lapBase = 0; laps = []; list.innerHTML = '';
        lapBtn.disabled = true; lapBtn.textContent = 'Lap'; paint(); return;
      }
      laps.unshift(total - lapBase); lapBase = total;
      list.innerHTML = '';
      laps.forEach((l, i) => {
        const row = UI.el('div', 'sw-lap');
        row.innerHTML = '<span>Lap ' + (laps.length - i) + '</span><span>' + show(l) + '</span>';
        list.appendChild(row);
      });
    });

    timers.push(setInterval(paint, 33));
  }

  function timerTab(host, timers) {
    let total = 300000, left = 300000, running = false, last = 0;

    const ring = UI.el('div', 'tm-ring');
    ring.innerHTML =
      '<svg viewBox="0 0 200 200">' +
      '<circle cx="100" cy="100" r="88" fill="none" stroke="var(--ios-fill)" stroke-width="9"/>' +
      '<circle class="tm-arc" cx="100" cy="100" r="88" fill="none" stroke="var(--ios-orange)" ' +
      'stroke-width="9" stroke-linecap="round" transform="rotate(-90 100 100)"/></svg>' +
      '<div class="tm-time">05:00</div>';
    const arc = ring.querySelector('.tm-arc');
    const label = ring.querySelector('.tm-time');
    const C = 2 * Math.PI * 88;
    arc.style.strokeDasharray = C;

    const presets = UI.el('div', 'tm-presets');
    [1, 3, 5, 10, 15, 30].forEach((m) => {
      const b = UI.el('button', 'tm-preset', m + ' min');
      b.type = 'button';
      b.addEventListener('click', () => { total = left = m * 60000; running = false; go.textContent = 'Start'; go.className = 'sw-btn green'; paint(); });
      presets.appendChild(b);
    });

    const actions = UI.el('div', 'sw-actions');
    const cancel = UI.el('button', 'sw-btn grey', 'Cancel');
    const go = UI.el('button', 'sw-btn green', 'Start');
    cancel.type = go.type = 'button';
    actions.append(cancel, go);

    host.append(ring, presets, actions);

    function paint() {
      const s = Math.max(0, Math.ceil(left / 1000));
      const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
      label.textContent = (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s % 60);
      arc.style.strokeDashoffset = C * (1 - left / total);
    }
    go.addEventListener('click', () => {
      running = !running;
      last = Date.now();
      go.textContent = running ? 'Pause' : 'Resume';
      go.className = running ? 'sw-btn orange' : 'sw-btn green';
    });
    cancel.addEventListener('click', () => {
      running = false; left = total;
      go.textContent = 'Start'; go.className = 'sw-btn green'; paint();
    });

    timers.push(setInterval(() => {
      if (running) {
        const now = Date.now();
        left = Math.max(0, left - (now - last));
        last = now;
        if (left === 0) { running = false; go.textContent = 'Start'; go.className = 'sw-btn green'; }
      }
      paint();
    }, 100));
    paint();
  }

  /* ---------- root ---------- */
  SCREENS['Clock'] = {
    statusBar: 'auto',
    mount(nav) {
      const TABS = [
        { label: 'World Clock', icon: TAB_ICONS.world, title: 'World Clock', build: worldClock },
        { label: 'Alarms',      icon: TAB_ICONS.alarm, title: 'Alarms',      build: alarms },
        { label: 'Stopwatch',   icon: TAB_ICONS.stop,  title: 'Stopwatch',   build: stopwatch },
        { label: 'Timers',      icon: TAB_ICONS.timer, title: 'Timers',      build: timerTab },
      ];

      nav.push({
        title: 'World Clock',
        build(body, _nav, screen) {
          const timers = [];
          const heading = screen.querySelector('.large-title');
          const barTitle = screen.querySelector('.nav-title');
          const host = UI.el('div');
          body.appendChild(host);

          const show = (i) => {
            timers.splice(0).forEach(clearInterval);
            host.innerHTML = '';
            heading.textContent = TABS[i].title;
            barTitle.textContent = TABS[i].title;
            TABS[i].build(host, timers);
          };

          const tabs = UI.tabs(TABS, 0, show);
          screen.appendChild(tabs.el);
          show(0);

          screen.addEventListener('screen:teardown', () =>
            timers.splice(0).forEach(clearInterval));
        },
      });
    },
  };
})();
