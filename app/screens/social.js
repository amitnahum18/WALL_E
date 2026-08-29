/* Loop — a social feed: stories, posts, working likes and saves. */
(() => {
  const TAB_ICONS = {
    home:     '<path d="M3.4 10.6 12 3.4l8.6 7.2"/><path d="M5.8 9.4V20.6h12.4V9.4"/>',
    search:   '<circle cx="10.8" cy="10.8" r="6.6"/><path d="m19.6 19.6-4-4"/>',
    create:   '<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.6"/><path d="M12 8.4v7.2M8.4 12h7.2"/>',
    activity: '<path d="M12 20.4S3.8 15.6 3.8 9.9a4.4 4.4 0 0 1 8.2-2.3A4.4 4.4 0 0 1 20.2 9.9c0 5.7-8.2 10.5-8.2 10.5Z"/>',
    profile:  '<circle cx="12" cy="8.2" r="3.8"/><path d="M4.8 20.4a7.4 7.4 0 0 1 14.4 0"/>',
  };

  const PEOPLE = [
    ['dana.levi',   334], ['yoav_c',      212], ['noa.barak',   32],
    ['ron.mzr',     268], ['shira.aviv',  190], ['tlv.daily',   150],
    ['studio.north', 15], ['amit',        220],
  ];

  const POSTS = [
    { by: 'dana.levi', place: 'Tel Aviv', hue: 334, likes: 248, ago: '2h',
      caption: 'Six rows and the dock finally breathes. Small change, big difference.',
      comments: 18 },
    { by: 'tlv.daily', place: 'Jaffa Port', hue: 196, likes: 1204, ago: '5h',
      caption: 'Golden hour on the old port. Never gets old.', comments: 63 },
    { by: 'studio.north', place: '', hue: 24, likes: 87, ago: '9h',
      caption: 'New type specimen arrived today. That ampersand.', comments: 7 },
    { by: 'noa.barak', place: 'Ramat Gan', hue: 150, likes: 412, ago: '14h',
      caption: '482 tests, zero failures, one very good coffee.', comments: 24 },
    { by: 'yoav_c', place: '', hue: 268, likes: 96, ago: '1d',
      caption: 'Weekend build. Still not finished, still very happy.', comments: 11 },
  ];

  const grad = (hue, a = 62, b = 40) =>
    'linear-gradient(150deg, hsl(' + hue + ' 70% ' + a + '%), hsl(' + ((hue + 42) % 360) + ' 62% ' + b + '%))';

  const avatar = (name, hue, size) => {
    const a = UI.el('span', 'so-avatar');
    a.style.cssText = 'width:' + size + 'px;height:' + size + 'px;background:' + grad(hue, 66, 46);
    a.textContent = name[0].toUpperCase();
    a.style.fontSize = Math.round(size * 0.42) + 'px';
    return a;
  };

  const liked = () => UI.store('loop.likes', {});
  const saved = () => UI.store('loop.saves', {});

  function feed(host) {
    /* stories */
    const stories = UI.el('div', 'so-stories');
    const you = UI.el('button', 'so-story');
    you.type = 'button';
    const yr = UI.el('span', 'so-ring you');
    yr.appendChild(avatar('amit', 220, 58));
    yr.appendChild(UI.el('i', 'so-plus', '+'));
    you.append(yr, UI.el('span', 'so-story-name', 'Your story'));
    stories.appendChild(you);

    PEOPLE.slice(0, 6).forEach(([name, hue]) => {
      const s = UI.el('button', 'so-story');
      s.type = 'button';
      const ring = UI.el('span', 'so-ring');
      ring.appendChild(avatar(name, hue, 58));
      s.append(ring, UI.el('span', 'so-story-name', name));
      stories.appendChild(s);
    });
    host.appendChild(stories);

    /* posts */
    const likes = liked(), saves = saved();

    POSTS.forEach((p, i) => {
      const card = UI.el('article', 'so-post');

      const head = UI.el('div', 'so-head');
      const person = PEOPLE.find(([n]) => n === p.by) || [p.by, p.hue];
      head.appendChild(avatar(p.by, person[1], 32));
      const who = UI.el('div', 'so-who');
      who.appendChild(UI.el('b', null, p.by));
      if (p.place) who.appendChild(UI.el('small', null, p.place));
      head.appendChild(who);
      const more = UI.el('button', 'so-more');
      more.type = 'button';
      more.textContent = '···';
      head.appendChild(more);
      card.appendChild(head);

      const photo = UI.el('div', 'so-photo');
      photo.style.background = grad(p.hue);
      card.appendChild(photo);

      const acts = UI.el('div', 'so-acts');
      const heart = UI.el('button', 'so-act so-heart');
      const chat = UI.el('button', 'so-act');
      const share = UI.el('button', 'so-act');
      const save = UI.el('button', 'so-act so-save');
      heart.type = chat.type = share.type = save.type = 'button';

      const HEART = '<path d="M12 20.4S3.8 15.6 3.8 9.9a4.4 4.4 0 0 1 8.2-2.3A4.4 4.4 0 0 1 20.2 9.9c0 5.7-8.2 10.5-8.2 10.5Z"/>';
      heart.appendChild(UI.svg(HEART));
      chat.appendChild(UI.svg('<path d="M20.6 11.6a8.2 8.2 0 0 1-11.8 7.4L3.4 20.6l1.6-5.4a8.2 8.2 0 1 1 15.6-3.6Z"/>'));
      share.appendChild(UI.svg('<path d="M21 3 10.4 13.6M21 3l-6.8 18-3.8-7.4L3 9.8 21 3Z"/>'));
      save.appendChild(UI.svg('<path d="M6.4 3.6h11.2v16.8L12 16l-5.6 4.4V3.6Z"/>'));

      const spacer = UI.el('span', 'so-spacer');
      acts.append(heart, chat, share, spacer, save);
      card.appendChild(acts);

      const count = UI.el('div', 'so-likes');
      const cap = UI.el('div', 'so-caption');
      cap.innerHTML = '<b>' + p.by + '</b> ' + p.caption;
      const meta = UI.el('div', 'so-meta',
        'View all ' + p.comments + ' comments · ' + p.ago);
      card.append(count, cap, meta);

      const id = 'p' + i;
      function paint() {
        const on = !!likes[id];
        heart.classList.toggle('on', on);
        save.classList.toggle('on', !!saves[id]);
        count.textContent = (p.likes + (on ? 1 : 0)).toLocaleString() + ' likes';
      }
      heart.addEventListener('click', () => {
        likes[id] = !likes[id];
        UI.save('loop.likes', likes);
        heart.classList.add('pop');
        setTimeout(() => heart.classList.remove('pop'), 320);
        paint();
      });
      save.addEventListener('click', () => {
        saves[id] = !saves[id];
        UI.save('loop.saves', saves);
        paint();
      });
      paint();

      host.appendChild(card);
    });
  }

  function explore(host) {
    host.appendChild(UI.searchField('Search'));
    const grid = UI.el('div', 'so-explore');
    for (let i = 0; i < 21; i++) {
      const t = UI.el('button', 'so-tile');
      t.type = 'button';
      t.style.background = grad((i * 47) % 360);
      grid.appendChild(t);
    }
    host.appendChild(grid);
  }

  function activity(host) {
    const rows = [
      ['dana.levi', 334, 'liked your photo', '2h'],
      ['yoav_c', 212, 'started following you', '5h'],
      ['noa.barak', 32, 'commented: “this is great”', '9h'],
      ['tlv.daily', 196, 'mentioned you in a comment', '1d'],
      ['shira.aviv', 190, 'liked your photo', '2d'],
      ['ron.mzr', 268, 'started following you', '3d'],
    ].map(([name, hue, what, ago]) => {
      const r = UI.row({ label: name, sub: what, value: ago, chevron: false });
      r.prepend(avatar(name, hue, 40));
      r.classList.add('so-act-row');
      return r;
    });
    host.appendChild(UI.group(rows, { title: 'This Week' }));
  }

  function profile(host) {
    const head = UI.el('div', 'so-profile');
    head.appendChild(avatar('amit', 220, 84));
    const stats = UI.el('div', 'so-stats');
    [['128', 'Posts'], ['4,206', 'Followers'], ['312', 'Following']].forEach(([n, l]) => {
      const s = UI.el('div', 'so-stat');
      s.innerHTML = '<b>' + n + '</b><span>' + l + '</span>';
      stats.appendChild(s);
    });
    head.appendChild(stats);
    host.appendChild(head);

    const bio = UI.el('div', 'so-bio');
    bio.innerHTML = '<b>Amit Nahum</b>Building things for small screens. Tel Aviv.';
    host.appendChild(bio);

    const grid = UI.el('div', 'so-explore');
    for (let i = 0; i < 12; i++) {
      const t = UI.el('button', 'so-tile');
      t.type = 'button';
      t.style.background = grad((i * 61 + 20) % 360);
      grid.appendChild(t);
    }
    host.appendChild(grid);
  }

  SCREENS['Loop'] = {
    statusBar: 'auto',
    mount(nav) {
      const TABS = [
        { label: '', icon: TAB_ICONS.home,     title: 'Loop',     build: feed },
        { label: '', icon: TAB_ICONS.search,   title: 'Explore',  build: explore },
        { label: '', icon: TAB_ICONS.create,   title: 'New Post', build: explore },
        { label: '', icon: TAB_ICONS.activity, title: 'Activity', build: activity },
        { label: '', icon: TAB_ICONS.profile,  title: 'Profile',  build: profile },
      ];

      nav.push({
        title: 'Loop',
        build(body, nav, screen) {
          screen.classList.add('so-screen');
          const heading = screen.querySelector('.large-title');
          const barTitle = screen.querySelector('.nav-title');
          heading.classList.add('so-wordmark');
          const host = UI.el('div');
          body.appendChild(host);

          const tabs = UI.tabs(TABS, 0, show);
          tabs.el.classList.add('so-tabs');
          screen.appendChild(tabs.el);

          function show(i) {
            host.innerHTML = '';
            heading.textContent = TABS[i].title;
            barTitle.textContent = TABS[i].title;
            body.scrollTop = 0;
            TABS[i].build(host, nav);
          }
          show(0);
        },
      });
    },
  };
})();
