/* Mail — inbox, unread markers, message detail with a reply bar. */
(() => {
  const D = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const at = (day, h, m) => today.getTime() - day * D + h * 3600000 + m * 60000;
  const pad = (n) => String(n).padStart(2, '0');

  const MAIL = [
    { from: 'Dana Levi', hue: 334, unread: true, at: at(0, 9, 41),
      subject: 'Mockups for the home screen',
      body: `Hi,\n\nAttached are the updated mockups. The main change is the icon grid — I moved to a 6-row layout so the dock has more breathing room.\n\nTwo things I need from you before standup:\n\n1. Confirm the icon corner radius (22.5% looks right to me)\n2. Check the dark mode contrast on the search pill\n\nThanks,\nDana` },
    { from: 'GitHub', hue: 220, unread: true, at: at(0, 8, 12),
      subject: '[wall-e] Deploy succeeded on main',
      body: `Your deployment finished successfully.\n\nCommit  a4f21c9\nBranch  main\nTime    2m 14s\n\nAll 482 checks passed.` },
    { from: 'Yoav Cohen', hue: 212, unread: false, at: at(1, 17, 30),
      subject: 'Re: API versioning',
      body: `Sounds good. Let's keep /v1 stable and put the new shape behind /v2.\n\nI'll write it up tomorrow morning.` },
    { from: 'Noa Barak', hue: 32, unread: false, at: at(1, 14, 22),
      subject: 'Regression run — all green',
      body: `482 passed, 0 failed, 3 skipped.\n\nThe three skips are the flaky upload tests. I've opened a ticket to fix them properly rather than keep skipping.` },
    { from: 'Apple Developer', hue: 200, unread: false, at: at(2, 11, 0),
      subject: 'Your subscription renews soon',
      body: `Your Apple Developer Program membership renews on 12 September.\n\nNo action is needed — we'll charge the card on file.` },
    { from: 'Shira Aviv', hue: 190, unread: false, at: at(3, 16, 45),
      subject: 'Design assets — final',
      body: `Everything is in the shared folder now: icons, wallpapers and the type scale.\n\nShout if anything is missing.` },
    { from: 'Ron Mizrahi', hue: 268, unread: false, at: at(4, 10, 8),
      subject: 'Lunch Thursday?',
      body: `There's a new place near the office. Thursday around 13:00?` },
  ];

  const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  function when(ts) {
    const d = new Date(ts), t = new Date();
    if (d.toDateString() === t.toDateString()) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (t - ts < 6 * D) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function avatar(m, size) {
    const a = UI.el('span', 'msg-avatar', initials(m.from));
    a.style.width = a.style.height = size + 'px';
    a.style.fontSize = Math.round(size * 0.38) + 'px';
    a.style.background =
      'linear-gradient(155deg, hsl(' + m.hue + ' 58% 66%), hsl(' + (m.hue + 30) + ' 52% 48%))';
    return a;
  }

  function detail(nav, m) {
    nav.push({
      title: '', large: false, bodyClass: 'mail-read',
      build(body, _nav, screen) {
        const head = UI.el('div', 'mail-head');
        head.appendChild(UI.el('h1', 'mail-subject', m.subject));

        const line = UI.el('div', 'mail-from');
        line.appendChild(avatar(m, 40));
        const who = UI.el('div', 'mail-who');
        who.innerHTML = '<b>' + m.from + '</b><small>To: Amit Nahum</small>';
        const stamp = UI.el('span', 'mail-stamp', when(m.at));
        line.append(who, stamp);
        head.appendChild(line);
        body.appendChild(head);

        const text = UI.el('div', 'mail-body');
        m.body.split('\n').forEach((para) => {
          text.appendChild(UI.el('p', null, para || ' '));
        });
        body.appendChild(text);

        const bar = UI.el('div', 'mail-actions');
        [
          ['archive', '<path d="M3.4 7.4h17.2v11.2a1.8 1.8 0 0 1-1.8 1.8H5.2a1.8 1.8 0 0 1-1.8-1.8Z"/><path d="M2.6 3.6h18.8v3.8H2.6zM9.6 11.6h4.8"/>'],
          ['bin', '<path d="M5.4 6.6h13.2l-1 12.6a1.8 1.8 0 0 1-1.8 1.6H8.2a1.8 1.8 0 0 1-1.8-1.6Z"/><path d="M3.4 6.6h17.2M9 6.6V4.2h6v2.4"/>'],
          ['reply', '<path d="M9.4 5 3.6 10.8l5.8 5.8"/><path d="M3.6 10.8h9a7.8 7.8 0 0 1 7.8 7.8V20"/>'],
          ['compose', '<path d="M4 20h4L18.4 9.6a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6 4 20Z"/><path d="m14.6 7.4 2.6 2.6"/>'],
        ].forEach(([name, d]) => {
          const b = UI.el('button', 'mail-action');
          b.type = 'button';
          b.setAttribute('aria-label', name);
          b.appendChild(UI.svg(d));
          bar.appendChild(b);
        });
        screen.appendChild(bar);
      },
    });
  }

  SCREENS['Mail'] = {
    statusBar: 'auto',
    mount(nav) {
      const unread = MAIL.filter((m) => m.unread).length;

      nav.push({
        title: 'Inbox',
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

          const rows = MAIL.map((m) => {
            const r = UI.row({
              strong: true,
              label: m.from,
              chevron: false,
              onTap: () => { m.unread = false; detail(nav, m); },
            });
            r.classList.add('mail-row');
            r.prepend(UI.el('span', 'msg-dot' + (m.unread ? '' : ' ghost')));

            const main = r.querySelector('.row-main');
            main.appendChild(UI.el('div', 'mail-subj', m.subject));
            main.appendChild(UI.el('small', null, m.body.split('\n')[0]));

            const meta = UI.el('div', 'msg-meta');
            meta.appendChild(UI.el('span', 'msg-time', when(m.at)));
            meta.appendChild(UI.chevron());
            r.appendChild(meta);
            return r;
          });

          body.appendChild(UI.group(rows, {
            note: unread + ' unread · Updated just now',
          }));
        },
      });
    },
  };
})();
