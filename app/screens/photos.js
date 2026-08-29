/* Photos — library grid, full-screen viewer, albums. */
(() => {
  const TAB_ICONS = {
    lib:    '<path d="M3.4 6.6h17.2v13.8H3.4z"/><path d="m4.6 17.4 5-5.4 3.6 3.8 2.6-2.4 4 4"/><circle cx="8.6" cy="10.4" r="1.5"/><path d="M6.4 3.6h11.2"/>',
    foryou: '<path d="M12 20.4S3.8 15.6 3.8 9.9a4.4 4.4 0 0 1 8.2-2.3A4.4 4.4 0 0 1 20.2 9.9c0 5.7-8.2 10.5-8.2 10.5Z"/>',
    albums: '<rect x="3.4" y="7.4" width="17.2" height="13" rx="2.4"/><path d="M6 4.6h12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  };

  /* deterministic "photos" so the library looks the same every reload */
  const PHOTOS = Array.from({ length: 60 }, (_, i) => {
    const h = (i * 47) % 360;
    return {
      id: i,
      css: 'linear-gradient(' + (120 + i * 13 % 180) + 'deg, hsl(' + h + ' 68% 62%), hsl(' +
           ((h + 48) % 360) + ' 62% 40%))',
      day: ['Today', 'Yesterday', 'Tuesday', 'Last week'][Math.floor(i / 15)],
    };
  });

  const ALBUMS = [
    ['Recents', 2481], ['Favourites', 96], ['Screenshots', 310], ['Selfies', 74],
    ['Live Photos', 128], ['Portrait', 41], ['Panoramas', 12], ['Videos', 203],
  ];

  function viewer(nav, idx) {
    nav.push({
      title: 'Photo', large: false, transparent: true, bodyClass: 'no-pad',
      build(body, _nav, screen) {
        screen.classList.add('ph-viewer');
        const img = UI.el('div', 'ph-full');
        img.style.background = PHOTOS[idx].css;
        body.appendChild(img);

        const strip = UI.el('div', 'ph-strip');
        PHOTOS.slice(Math.max(0, idx - 6), idx + 7).forEach((p) => {
          const t = UI.el('div', 'ph-strip-item');
          t.style.background = p.css;
          if (p.id === idx) t.classList.add('on');
          strip.appendChild(t);
        });
        screen.appendChild(strip);
      },
    });
  }

  function library(host, nav) {
    let last = null;
    let grid = null;
    PHOTOS.forEach((p) => {
      if (p.day !== last) {
        last = p.day;
        host.appendChild(UI.el('div', 'ph-day', p.day));
        grid = UI.el('div', 'ph-grid');
        host.appendChild(grid);
      }
      const t = UI.el('button', 'ph-tile');
      t.type = 'button';
      t.style.background = p.css;
      t.addEventListener('click', () => viewer(nav, p.id));
      grid.appendChild(t);
    });
  }

  function forYou(host, nav) {
    host.appendChild(UI.el('div', 'ph-day', 'Memories'));
    const rail = UI.el('div', 'ph-memories');
    ['Trip to Rome', 'Best of 2025', 'Dana & Amit', 'Sunsets'].forEach((title, i) => {
      const c = UI.el('button', 'ph-memory');
      c.type = 'button';
      c.style.background = PHOTOS[i * 9].css;
      c.appendChild(UI.el('span', null, title));
      c.addEventListener('click', () => viewer(nav, i * 9));
      rail.appendChild(c);
    });
    host.appendChild(rail);

    host.appendChild(UI.el('div', 'ph-day', 'Shared with You'));
    const grid = UI.el('div', 'ph-grid');
    PHOTOS.slice(20, 32).forEach((p) => {
      const t = UI.el('button', 'ph-tile');
      t.type = 'button';
      t.style.background = p.css;
      t.addEventListener('click', () => viewer(nav, p.id));
      grid.appendChild(t);
    });
    host.appendChild(grid);
  }

  function albums(host, nav) {
    const grid = UI.el('div', 'ph-albums');
    ALBUMS.forEach(([name, n], i) => {
      const c = UI.el('button', 'ph-album');
      c.type = 'button';
      const cover = UI.el('span', 'ph-album-cover');
      cover.style.background = PHOTOS[i * 7].css;
      c.append(cover, UI.el('span', 'ph-album-name', name),
               UI.el('span', 'ph-album-count', n.toLocaleString()));
      c.addEventListener('click', () => viewer(nav, i * 7));
      grid.appendChild(c);
    });
    host.appendChild(grid);
  }

  function search(host) {
    host.appendChild(UI.searchField('Photos, People, Places'));
    const grid = UI.el('div', 'ph-albums');
    ['People', 'Places', 'Trips', 'Food', 'Beach', 'City'].forEach((name, i) => {
      const c = UI.el('button', 'ph-album');
      c.type = 'button';
      const cover = UI.el('span', 'ph-album-cover');
      cover.style.background = PHOTOS[i * 5 + 3].css;
      c.append(cover, UI.el('span', 'ph-album-name', name));
      grid.appendChild(c);
    });
    host.appendChild(grid);
  }

  SCREENS['Photos'] = {
    statusBar: 'auto',
    mount(nav) {
      const TABS = [
        { label: 'Library',  icon: TAB_ICONS.lib,    title: 'Library',   build: library },
        { label: 'For You',  icon: TAB_ICONS.foryou, title: 'For You',   build: forYou },
        { label: 'Albums',   icon: TAB_ICONS.albums, title: 'Albums',    build: albums },
        { label: 'Search',   icon: TAB_ICONS.search, title: 'Search',    build: search },
      ];

      nav.push({
        title: 'Library',
        build(body, nav, screen) {
          const heading = screen.querySelector('.large-title');
          const barTitle = screen.querySelector('.nav-title');
          const host = UI.el('div');
          body.appendChild(host);

          const show = (i) => {
            host.innerHTML = '';
            heading.textContent = TABS[i].title;
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
