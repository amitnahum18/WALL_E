/* Messages — chat list and threads, matched closely to iOS:
   grouped bubbles with tails, time separators, delivery receipt,
   and a composer that behaves like the real one. */
(() => {
  const M = 60000, H = 3600000, D = 86400000;
  const now = Date.now();
  /* anchor the samples to a plausible morning so a recording always
     shows "Today" with sensible clock times */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const at = (day, h, m) => today.getTime() - day * D + h * H + m * M;

  const CHATS = [
    {
      id: 'dana', name: 'Dana Levi', hue: 334,
      msgs: [
        ['in',  'Morning! Did the build go out last night?', at(0, 9, 12)],
        ['out', 'Yep, 23:40. All green.',                    at(0, 9, 14)],
        ['out', 'Took three tries though 😅',                 at(0, 9, 14)],
        ['in',  'Ha, classic. Did you sort the icon thing?',  at(0, 9, 20)],
        ['out', "Fixed — they're all SVG now, so they stay sharp at any size.", at(0, 9, 21)],
        ['in',  'Sending the new mockups in a sec',           at(0, 9, 24)],
        ['in',  'Can you look before standup?',               at(0, 9, 24)],
      ],
    },
    {
      id: 'yoav', name: 'Yoav Cohen', hue: 212,
      msgs: [
        ['out', 'Standup at 9?',        at(0, 8, 40)],
        ['in',  'Yes, same link',       at(0, 8, 47)],
        ['in',  "I'll be two minutes late", at(0, 8, 47)],
        ['out', '👍',                    at(0, 8, 51)],
      ],
    },
    {
      id: 'work', name: 'Work group', hue: 152, group: true,
      msgs: [
        ['in',  'Deploy window moved to 17:00', at(1, 16, 2)],
        ['in',  'Anyone reviewing the PR?',     at(1, 16, 5)],
        ['out', 'On it',                        at(1, 16, 11)],
        ['in',  'Merged, thanks!',              at(1, 16, 40)],
      ],
    },
    {
      id: 'noa', name: 'Noa Barak', hue: 32,
      msgs: [
        ['in',  'Regression suite is green ✅',  at(1, 14, 20)],
        ['in',  '482 passed, 0 failed',         at(1, 14, 20)],
        ['out', 'Perfect, thanks Noa',          at(1, 14, 33)],
      ],
    },
    {
      id: 'ron', name: 'Ron Mizrahi', hue: 268,
      msgs: [
        ['in',  'Quick question about the API shape', at(3, 11, 5)],
        ['in',  'Are we versioning the endpoints?',   at(3, 11, 5)],
        ['out', "Let's talk after lunch",             at(3, 11, 40)],
      ],
    },
    {
      id: 'shira', name: 'Shira Aviv', hue: 190,
      msgs: [
        ['in',  'Uploaded the updated design assets to Drive', at(4, 17, 12)],
        ['out', 'Got them, thanks!',                          at(4, 17, 30)],
      ],
    },
  ];

  const UNREAD = { dana: true, work: true };

  const REPLIES = [
    'Got it 👍', 'Nice, that works.', 'Let me check and come back to you.',
    'Sounds good.', 'Sending it over now.', 'Ha, exactly 😄', 'On my way.',
  ];

  const pad = (n) => String(n).padStart(2, '0');
  const clock = (ts) => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  /* "Today 09:24" in the thread, "09:24" / "Yesterday" in the list */
  function dayName(ts) {
    const d = new Date(ts), t = new Date();
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, t)) return 'Today';
    const y = new Date(t.getTime() - D);
    if (same(d, y)) return 'Yesterday';
    if (t - ts < 6 * D) return d.toLocaleDateString('en-US', { weekday: 'long' });
    return d.toLocaleDateString('en-GB');
  }
  const listStamp = (ts) => (dayName(ts) === 'Today' ? clock(ts) : dayName(ts));

  function avatar(chat, size) {
    const a = UI.el('span', 'msg-avatar', initials(chat.name));
    a.style.width = a.style.height = size + 'px';
    a.style.fontSize = Math.round(size * 0.38) + 'px';
    a.style.background =
      'linear-gradient(155deg, hsl(' + chat.hue + ' 58% 66%), hsl(' + (chat.hue + 30) + ' 52% 48%))';
    return a;
  }

  const load = (c) => UI.store('msg.' + c.id, c.msgs);
  const persist = (c, m) => UI.save('msg.' + c.id, m);

  /* ---------- one conversation ---------- */
  function thread(nav, chat) {
    nav.push({
      title: chat.name,
      large: false,
      bodyClass: 'msg-thread no-pad',
      build(body, _nav, screen) {
        /* iOS puts the contact's avatar and name in the bar itself */
        const bar = screen.querySelector('.navbar');
        bar.classList.add('msg-navbar');
        const who = UI.el('div', 'msg-who');
        who.appendChild(avatar(chat, 50));
        const nm = UI.el('span', 'msg-who-name', chat.name.split(' ')[0]);
        nm.appendChild(UI.svg('<path d="M9 6l6 6-6 6"/>', 'msg-who-chev'));
        who.appendChild(nm);
        bar.appendChild(who);

        const msgs = load(chat);

        function paint() {
          body.innerHTML = '';
          let prevAt = 0;
          msgs.forEach(([dir, text, ts], i) => {
            const stamp = ts || now;
            if (stamp - prevAt > 20 * M) {
              const sep = UI.el('div', 'msg-sep');
              sep.innerHTML = '<b>' + dayName(stamp) + '</b> ' + clock(stamp);
              body.appendChild(sep);
            }
            const next = msgs[i + 1];
            const endsGroup = !next || next[0] !== dir || (next[2] || now) - stamp > 20 * M;

            const b = UI.el('div', 'bubble ' + dir + (endsGroup ? ' tail' : ''), text);
            body.appendChild(b);

            /* iOS shows Delivered under the last outgoing message only */
            const isLast = i === msgs.length - 1;
            if (isLast && dir === 'out') body.appendChild(UI.el('div', 'msg-receipt', 'Delivered'));
            prevAt = stamp;
          });
        }
        paint();

        /* ---- composer ---- */
        const bar2 = UI.el('div', 'composer');
        const plus = UI.el('button', 'composer-plus');
        plus.type = 'button';
        plus.appendChild(UI.svg('<path d="M12 5v14M5 12h14"/>'));

        const pill = UI.el('div', 'composer-pill');
        const field = UI.el('input', 'composer-field');
        field.type = 'text';
        field.placeholder = 'iMessage';
        const mic = UI.el('span', 'composer-mic');
        mic.appendChild(UI.svg(
          '<rect x="9" y="3" width="6" height="10" rx="3"/>' +
          '<path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8V21"/>'));

        const send = UI.el('button', 'composer-send');
        send.type = 'button';
        send.appendChild(UI.svg('<path d="M12 19V6M6 12l6-6 6 6"/>'));
        pill.append(field, mic, send);
        bar2.append(plus, pill);
        screen.appendChild(bar2);

        const toBottom = () => { body.scrollTop = body.scrollHeight; };
        setTimeout(toBottom, 0);

        const sync = () => pill.classList.toggle('has-text', field.value.trim().length > 0);
        field.addEventListener('input', sync);
        sync();

        function submit() {
          const text = field.value.trim();
          if (!text) return;
          field.value = ''; sync();
          msgs.push(['out', text, Date.now()]);
          persist(chat, msgs);
          paint(); toBottom();

          const dots = UI.el('div', 'bubble in tail typing');
          dots.innerHTML = '<i></i><i></i><i></i>';
          setTimeout(() => { body.appendChild(dots); toBottom(); }, 500);
          setTimeout(() => {
            dots.remove();
            msgs.push(['in', REPLIES[Math.floor(Math.random() * REPLIES.length)], Date.now()]);
            persist(chat, msgs);
            paint(); toBottom();
          }, 1700);
        }

        send.addEventListener('click', submit);
        field.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        setTimeout(() => field.focus(), 380);
      },
    });
  }

  /* ---------- root ---------- */
  SCREENS['Messages'] = {
    statusBar: 'auto',
    mount(nav) {
      nav.push({
        title: 'Messages',
        rightAction: (() => {
          const b = UI.el('button', 'nav-action');
          b.type = 'button';
          b.appendChild(UI.svg(
            '<path d="M4 20h4L18.4 9.6a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6 4 20Z"/><path d="m14.6 7.4 2.6 2.6"/>'));
          b.querySelector('svg').style.cssText =
            'width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round';
          return b;
        })(),
        build(body, nav) {
          body.appendChild(UI.searchField('Search'));

          const rows = CHATS.map((c) => {
            const msgs = load(c);
            const last = msgs[msgs.length - 1];
            const r = UI.row({
              strong: true,
              label: c.name,
              sub: last ? last[1] : '',
              chevron: false,               // the time and chevron travel together
              onTap: () => { UNREAD[c.id] = false; thread(nav, c); },
            });
            r.classList.add('msg-row');
            r.prepend(avatar(c, 50));
            r.prepend(UI.el('span', 'msg-dot' + (UNREAD[c.id] ? '' : ' ghost')));

            const meta = UI.el('div', 'msg-meta');
            meta.appendChild(UI.el('span', 'msg-time', last ? listStamp(last[2] || now) : ''));
            meta.appendChild(UI.chevron());
            r.appendChild(meta);
            return r;
          });
          body.appendChild(UI.group(rows));
        },
      });
    },
  };
})();
