/* Calendar — month grid with event dots, and the day's schedule below. */
(() => {
  const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

  /* events are placed relative to today so the month always looks lived-in */
  const today = new Date();
  const rel = (offset, h, m, title, place, colour) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return { day: key(d), h, m, title, place, colour };
  };

  const EVENTS = [
    rel(0, 9, 0,  'Standup',              'Zoom',            '#ff3b30'),
    rel(0, 11, 30,'Design review',        'Meeting room 2',  '#007aff'),
    rel(0, 14, 0, '1:1 with Dana',        'Coffee bar',      '#34c759'),
    rel(0, 17, 0, 'Deploy window',        'Remote',          '#ff9500'),
    rel(1, 10, 0, 'Sprint planning',      'Meeting room 1',  '#007aff'),
    rel(1, 13, 0, 'Lunch with Ron',       'Dizengoff',       '#34c759'),
    rel(2, 9, 30, 'Design sync',          'Zoom',            '#5856d6'),
    rel(3, 8, 0,  'Gym',                  '',                '#ff2d55'),
    rel(3, 15, 0, 'Client demo',          'Tel Aviv office', '#ff9500'),
    rel(5, 19, 30,'Dinner — Noa birthday','Jaffa',           '#ff2d55'),
    rel(7, 11, 0, 'Quarterly review',     'Boardroom',       '#007aff'),
    rel(-2, 16, 0,'Retro',                'Meeting room 1',  '#5856d6'),
    rel(-5, 12, 0,'Dentist',              'Ramat Gan',       '#34c759'),
  ];

  const byDay = (k) => EVENTS.filter((e) => e.day === k)
                             .sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));

  SCREENS['Calendar'] = {
    statusBar: 'auto',
    mount(nav) {
      let view = new Date(today.getFullYear(), today.getMonth(), 1);
      let picked = new Date(today);

      nav.push({
        title: '', large: false,
        rightAction: (() => {
          const b = UI.el('button', 'nav-action', 'Today');
          b.type = 'button';
          return b;
        })(),
        build(body, _nav, screen) {
          const bar = screen.querySelector('.navbar');
          const title = UI.el('div', 'cal-title');
          bar.insertBefore(title, bar.querySelector('.nav-spacer'));

          const prev = UI.el('button', 'cal-arrow');
          const next = UI.el('button', 'cal-arrow');
          prev.type = next.type = 'button';
          prev.appendChild(UI.svg('<path d="M15 5 8 12l7 7"/>'));
          next.appendChild(UI.svg('<path d="M9 5l7 7-7 7"/>'));
          bar.appendChild(prev);
          bar.appendChild(next);

          const head = UI.el('div', 'cal-dow-row');
          DOW.forEach((d) => head.appendChild(UI.el('span', null, d)));
          body.appendChild(head);

          const grid = UI.el('div', 'cal-grid');
          body.appendChild(grid);

          const listWrap = UI.el('div', 'cal-list');
          body.appendChild(listWrap);

          function paintList() {
            listWrap.innerHTML = '';
            const evts = byDay(key(picked));
            const label = picked.toLocaleDateString('en-US',
              { weekday: 'long', day: 'numeric', month: 'long' });
            listWrap.appendChild(UI.el('div', 'cal-list-head', label.toUpperCase()));

            if (!evts.length) {
              listWrap.appendChild(UI.el('div', 'cal-empty', 'No Events'));
              return;
            }
            const box = UI.el('div', 'group');
            evts.forEach((e) => {
              const row = UI.el('div', 'cal-event');
              const t = UI.el('div', 'cal-event-time');
              t.innerHTML = '<b>' + pad(e.h) + ':' + pad(e.m) + '</b>';
              const stripe = UI.el('span', 'cal-stripe');
              stripe.style.background = e.colour;
              const txt = UI.el('div', 'cal-event-txt');
              txt.appendChild(UI.el('b', null, e.title));
              if (e.place) txt.appendChild(UI.el('small', null, e.place));
              row.append(t, stripe, txt);
              box.appendChild(row);
            });
            listWrap.appendChild(box);
          }

          function paint() {
            title.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
            grid.innerHTML = '';

            const first = new Date(view.getFullYear(), view.getMonth(), 1);
            const lead = first.getDay();
            const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

            for (let i = 0; i < lead; i++) grid.appendChild(UI.el('span', 'cal-cell muted'));

            for (let d = 1; d <= days; d++) {
              const date = new Date(view.getFullYear(), view.getMonth(), d);
              const cell = UI.el('button', 'cal-cell');
              cell.type = 'button';
              cell.appendChild(UI.el('span', 'cal-num', String(d)));

              const evts = byDay(key(date));
              if (evts.length) {
                const dots = UI.el('span', 'cal-dots');
                evts.slice(0, 3).forEach((e) => {
                  const dot = UI.el('i');
                  dot.style.background = e.colour;
                  dots.appendChild(dot);
                });
                cell.appendChild(dots);
              }
              if (key(date) === key(today)) cell.classList.add('is-today');
              if (key(date) === key(picked)) cell.classList.add('is-picked');

              cell.addEventListener('click', () => {
                picked = date;
                paint();
                paintList();
              });
              grid.appendChild(cell);
            }
            paintList();
          }

          const shift = (n) => {
            view = new Date(view.getFullYear(), view.getMonth() + n, 1);
            paint();
          };
          prev.addEventListener('click', () => shift(-1));
          next.addEventListener('click', () => shift(1));
          screen.querySelector('.nav-action').addEventListener('click', () => {
            view = new Date(today.getFullYear(), today.getMonth(), 1);
            picked = new Date(today);
            paint();
          });

          paint();
        },
      });
    },
  };
})();
