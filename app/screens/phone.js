/* Phone — favourites, recents, contacts and a keypad that actually dials. */
(() => {
  const TAB_ICONS = {
    fav:    '<path d="m12 3.6 2.6 5.4 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3.6Z"/>',
    recent: '<circle cx="12" cy="12" r="9"/><path d="M12 6.6V12l3.8 2.4"/>',
    people: '<circle cx="12" cy="8.2" r="3.8"/><path d="M4.8 20a7.4 7.4 0 0 1 14.4 0"/>',
    keypad: '<circle cx="6.4" cy="6" r="1.6"/><circle cx="12" cy="6" r="1.6"/><circle cx="17.6" cy="6" r="1.6"/><circle cx="6.4" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="17.6" cy="12" r="1.6"/><circle cx="6.4" cy="18" r="1.6"/><circle cx="12" cy="18" r="1.6"/><circle cx="17.6" cy="18" r="1.6"/>',
    vm:     '<circle cx="6.4" cy="13" r="3.6"/><circle cx="17.6" cy="13" r="3.6"/><path d="M6.4 16.6h11.2"/>',
  };

  const PEOPLE = [
    ['Dana Levi', 'mobile', '+972 52-441-8890'],
    ['Yoav Cohen', 'iPhone', '+972 54-118-2043'],
    ['Noa Barak', 'work', '+972 3-612-4400'],
    ['Ron Mizrahi', 'mobile', '+972 50-773-9012'],
    ['Shira Aviv', 'home', '+972 9-951-2287'],
    ['Amit Nahum', 'iPhone', '+972 52-000-1111'],
  ];

  const RECENTS = [
    ['Dana Levi', 'mobile', 'in', '09:24'],
    ['Yoav Cohen', 'iPhone', 'out', '08:47'],
    ['Unknown', '+972 3-555-0102', 'missed', 'Yesterday'],
    ['Noa Barak', 'work', 'out', 'Yesterday'],
    ['Ron Mizrahi', 'mobile', 'in', 'Tuesday'],
  ];

  const LETTERS = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ' };

  const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  function avatar(name, hue) {
    const a = UI.el('span', 'msg-avatar', initials(name));
    a.style.cssText =
      'width:38px;height:38px;font-size:15px;background:linear-gradient(150deg,hsl(' +
      hue + ' 55% 62%),hsl(' + (hue + 30) + ' 50% 46%))';
    return a;
  }

  function favourites(host) {
    const rows = PEOPLE.slice(0, 5).map(([n, kind], i) => {
      const r = UI.row({ label: n, sub: kind, chevron: false, onTap: () => {} });
      r.prepend(avatar(n, i * 57));
      return r;
    });
    host.appendChild(UI.group(rows));
  }

  function recents(host) {
    const rows = RECENTS.map(([n, kind, dir, time], i) => {
      const r = UI.row({
        label: n, sub: (dir === 'out' ? 'Outgoing · ' : dir === 'missed' ? 'Missed · ' : 'Incoming · ') + kind,
        value: time, chevron: false, onTap: () => {},
      });
      if (dir === 'missed') r.querySelector('b').style.color = 'var(--ios-red)';
      r.prepend(avatar(n, i * 71));
      return r;
    });
    host.appendChild(UI.group(rows, { title: 'All' }));
  }

  function contacts(host) {
    host.appendChild(UI.searchField('Search'));
    const sorted = PEOPLE.slice().sort((a, b) => a[0].localeCompare(b[0]));
    let letter = null, box = null;
    sorted.forEach(([n, kind, num], i) => {
      const l = n[0].toUpperCase();
      if (l !== letter) {
        letter = l;
        box = [];
        host.appendChild(UI.el('div', 'group-title', l));
        const g = UI.el('div', 'group');
        host.appendChild(g);
        box = g;
      }
      box.appendChild(UI.row({ label: n, sub: num, chevron: false, onTap: () => {} }));
    });
  }

  function keypad(host) {
    const out = UI.el('div', 'kp-out');
    const pad = UI.el('div', 'kp-grid');
    host.append(out, pad);

    let number = '';
    const format = (s) => s.replace(/(\d{3})(?=\d)/, '$1-');
    const paint = () => {
      out.textContent = format(number);
      out.style.fontSize = number.length > 11 ? '28px' : '36px';
      del.classList.toggle('hidden', number.length === 0);
    };

    '123456789*0#'.split('').forEach((d) => {
      const b = UI.el('button', 'kp-key');
      b.type = 'button';
      b.appendChild(UI.el('span', 'kp-digit', d));
      if (LETTERS[d]) b.appendChild(UI.el('span', 'kp-letters', LETTERS[d]));
      if (d === '0') b.appendChild(UI.el('span', 'kp-letters', '+'));
      b.addEventListener('click', () => { if (number.length < 15) { number += d; paint(); } });
      pad.appendChild(b);
    });

    const bottom = UI.el('div', 'kp-bottom');
    const call = UI.el('button', 'kp-call');
    call.type = 'button';
    call.appendChild(UI.svg('<path d="M6.6 3.4c1 0 1.6.5 2 1.4l1.2 2.8c.4.9.2 1.7-.5 2.3l-1 .8a12 12 0 0 0 4.9 4.9l.8-1c.6-.7 1.4-.9 2.3-.5l2.8 1.2c.9.4 1.4 1 1.4 2v2.2c0 1.4-1 2.3-2.5 2.2C9.4 21.1 2.9 14.6 2.4 5c-.1-1.5.8-2.5 2.2-2.5h2Z"/>'));
    call.querySelector('svg').style.cssText = 'width:32px;height:32px;fill:#fff;stroke:none';

    const del = UI.el('button', 'kp-del');
    del.type = 'button';
    del.appendChild(UI.svg('<path d="M9 5h9.6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9L2.6 12 9 5Z"/><path d="m12.4 9.6 5 4.8M17.4 9.6l-5 4.8"/>'));
    del.querySelector('svg').style.cssText =
      'width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round';
    del.addEventListener('click', () => { number = number.slice(0, -1); paint(); });

    bottom.append(UI.el('span'), call, del);
    host.appendChild(bottom);

    call.addEventListener('click', () => {
      if (!number) {
        number = UI.store('phone.last', '');
      } else {
        UI.save('phone.last', number);
        out.textContent = 'Calling ' + format(number) + '…';
        return;
      }
      paint();
    });

    paint();
  }

  function voicemail(host) {
    host.appendChild(UI.group([
      UI.row({ label: 'Dana Levi', sub: 'mobile · 0:14', value: '09:02', chevron: false }),
      UI.row({ label: 'Unknown', sub: '+972 3-555-0102 · 0:31', value: 'Yesterday', chevron: false }),
    ], { note: 'Voicemail transcription is on.' }));
  }

  SCREENS['Phone'] = {
    statusBar: 'auto',
    mount(nav) {
      const TABS = [
        { label: 'Favourites', icon: TAB_ICONS.fav,    title: 'Favourites', build: favourites },
        { label: 'Recents',    icon: TAB_ICONS.recent, title: 'Recents',    build: recents },
        { label: 'Contacts',   icon: TAB_ICONS.people, title: 'Contacts',   build: contacts },
        { label: 'Keypad',     icon: TAB_ICONS.keypad, title: '',           build: keypad },
        { label: 'Voicemail',  icon: TAB_ICONS.vm,     title: 'Voicemail',  build: voicemail },
      ];

      nav.push({
        title: 'Favourites',
        build(body, nav, screen) {
          const heading = screen.querySelector('.large-title');
          const barTitle = screen.querySelector('.nav-title');
          const host = UI.el('div');
          body.appendChild(host);

          const show = (i) => {
            host.innerHTML = '';
            heading.textContent = TABS[i].title;
            heading.classList.toggle('hidden', !TABS[i].title);
            barTitle.textContent = TABS[i].title;
            body.scrollTop = 0;
            TABS[i].build(host, nav);
          };
          screen.appendChild(UI.tabs(TABS, 0, show).el);
          show(0);
        },
      });
    },
  };
})();
