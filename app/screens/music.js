/* Music — library, a mini player, and a Now Playing screen whose
   scrubber actually advances while it is playing. */
(() => {
  const TRACKS = [
    { title: 'Night Drive',      artist: 'Kavu',            album: 'Long Way Round', len: 214, hue: 268 },
    { title: 'Paper Lanterns',   artist: 'Elia Mars',       album: 'Slow Light',     len: 187, hue: 24  },
    { title: 'Coastline',        artist: 'The Warm Signal', album: 'Coastline',      len: 243, hue: 196 },
    { title: 'Static Bloom',     artist: 'Nadia Roth',      album: 'Interiors',      len: 201, hue: 334 },
    { title: 'Harbour Lights',   artist: 'Kavu',            album: 'Long Way Round', len: 232, hue: 210 },
    { title: 'Everything Twice', artist: 'Odd Hours',       album: 'Doubles',        len: 176, hue: 150 },
    { title: 'Low Tide',         artist: 'Elia Mars',       album: 'Slow Light',     len: 258, hue: 40  },
    { title: 'Blue Hour',        artist: 'The Warm Signal', album: 'Coastline',      len: 195, hue: 224 },
  ];

  const TAB_ICONS = {
    now:     '<path d="M12 3.6v12.2"/><path d="M8.4 6.6 12 3.6l3.6 3"/><circle cx="8" cy="17.6" r="3"/><circle cx="18" cy="15.6" r="3"/>',
    library: '<path d="M4 5.4h16M4 12h16M4 18.6h16"/>',
    search:  '<circle cx="10.8" cy="10.8" r="6.4"/><path d="m19.6 19.6-4-4"/>',
  };

  const art = (t) =>
    'linear-gradient(150deg, hsl(' + t.hue + ' 72% 62%), hsl(' + ((t.hue + 45) % 360) + ' 64% 38%))';

  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  /* one shared player, so the mini bar and Now Playing stay in step */
  const player = {
    index: 0,
    at: 42,
    playing: false,
    listeners: new Set(),
    get track() { return TRACKS[this.index]; },
    emit() { this.listeners.forEach((fn) => fn()); },
    toggle() { this.playing = !this.playing; this.emit(); },
    seek(v) { this.at = Math.max(0, Math.min(this.track.len, v)); this.emit(); },
    skip(n) {
      this.index = (this.index + n + TRACKS.length) % TRACKS.length;
      this.at = 0;
      this.emit();
    },
    tick() {
      if (!this.playing) return;
      this.at += 0.25;
      if (this.at >= this.track.len) this.skip(1);
      this.emit();
    },
  };

  function nowPlaying(nav) {
    nav.push({
      title: '', large: false, transparent: true, bodyClass: 'np-body no-pad',
      build(body, _nav, screen) {
        screen.classList.add('np-screen');

        const cover = UI.el('div', 'np-art');
        const meta = UI.el('div', 'np-meta');
        const title = UI.el('div', 'np-title');
        const artist = UI.el('div', 'np-artist');
        meta.append(title, artist);

        const bar = UI.el('div', 'np-bar');
        const fill = UI.el('div', 'np-bar-fill');
        const knob = UI.el('div', 'np-knob');
        bar.append(fill, knob);
        const times = UI.el('div', 'np-times');
        const tNow = UI.el('span'), tLeft = UI.el('span');
        times.append(tNow, tLeft);

        const controls = UI.el('div', 'np-controls');
        const back = UI.el('button', 'np-btn');
        const play = UI.el('button', 'np-btn np-play');
        const fwd = UI.el('button', 'np-btn');
        back.type = play.type = fwd.type = 'button';
        back.appendChild(UI.svg(
          '<path d="M18.8 5.4v13.2L9.2 12z"/><rect x="5.2" y="5.4" width="2.8" height="13.2" rx="1.4"/>'));
        fwd.appendChild(UI.svg(
          '<path d="M5.2 5.4v13.2L14.8 12z"/><rect x="16" y="5.4" width="2.8" height="13.2" rx="1.4"/>'));
        controls.append(back, play, fwd);

        const vol = UI.el('div', 'np-vol');
        vol.innerHTML =
          '<span class="np-vol-min"></span><div class="np-vol-bar"><i></i></div><span class="np-vol-max"></span>';

        body.append(cover, meta, bar, times, controls, vol);

        const playIcon = '<path d="M7.6 4.8 19 12 7.6 19.2V4.8Z"/>';
        const pauseIcon = '<path d="M8.4 4.8h3.2v14.4H8.4zM14.4 4.8h3.2v14.4h-3.2z"/>';

        function paint() {
          const t = player.track;
          cover.style.background = art(t);
          cover.classList.toggle('paused', !player.playing);
          title.textContent = t.title;
          artist.textContent = t.artist + ' — ' + t.album;
          const pct = (player.at / t.len) * 100;
          fill.style.width = pct + '%';
          knob.style.left = pct + '%';
          tNow.textContent = mmss(player.at);
          tLeft.textContent = '-' + mmss(t.len - player.at);
          play.innerHTML = '';
          play.appendChild(UI.svg(player.playing ? pauseIcon : playIcon));
        }

        play.addEventListener('click', () => player.toggle());
        back.addEventListener('click', () => (player.at > 4 ? player.seek(0) : player.skip(-1)));
        fwd.addEventListener('click', () => player.skip(1));
        bar.addEventListener('click', (e) => {
          const r = bar.getBoundingClientRect();
          player.seek(((e.clientX - r.left) / r.width) * player.track.len);
        });

        player.listeners.add(paint);
        screen.addEventListener('screen:teardown', () => player.listeners.delete(paint));
        paint();
      },
    });
  }

  function library(host, nav) {
    const rows = TRACKS.map((t, i) => {
      const r = UI.row({
        strong: true,
        label: t.title,
        sub: t.artist,
        chevron: false,
        onTap: () => { player.index = i; player.at = 0; player.playing = true; player.emit(); nowPlaying(nav); },
      });
      const cover = UI.el('span', 'mu-cover');
      cover.style.background = art(t);
      r.prepend(cover);
      r.appendChild(UI.el('span', 'mu-len', mmss(t.len)));
      return r;
    });
    host.appendChild(UI.group(rows, { title: 'Songs' }));
  }

  function listenNow(host, nav) {
    host.appendChild(UI.el('div', 'mu-head', 'Recently Played'));
    const rail = UI.el('div', 'mu-rail');
    TRACKS.slice(0, 5).forEach((t, i) => {
      const c = UI.el('button', 'mu-card');
      c.type = 'button';
      const cover = UI.el('span', 'mu-card-art');
      cover.style.background = art(t);
      c.append(cover, UI.el('span', 'mu-card-t', t.title), UI.el('span', 'mu-card-a', t.artist));
      c.addEventListener('click', () => {
        player.index = i; player.at = 0; player.playing = true; player.emit(); nowPlaying(nav);
      });
      rail.appendChild(c);
    });
    host.appendChild(rail);

    host.appendChild(UI.el('div', 'mu-head', 'Made for You'));
    const grid = UI.el('div', 'mu-grid');
    ['Chill Mix', 'Late Night', 'Focus', 'Discovery'].forEach((name, i) => {
      const c = UI.el('button', 'mu-tile');
      c.type = 'button';
      c.style.background = art(TRACKS[(i * 2) % TRACKS.length]);
      c.appendChild(UI.el('span', null, name));
      c.addEventListener('click', () => {
        player.index = (i * 2) % TRACKS.length; player.at = 0; player.playing = true;
        player.emit(); nowPlaying(nav);
      });
      grid.appendChild(c);
    });
    host.appendChild(grid);
  }

  function search(host) {
    host.appendChild(UI.searchField('Artists, Songs, Lyrics and More'));
    const grid = UI.el('div', 'mu-grid');
    ['Pop', 'Indie', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical'].forEach((g, i) => {
      const c = UI.el('button', 'mu-tile');
      c.type = 'button';
      c.style.background = art(TRACKS[(i * 3) % TRACKS.length]);
      c.appendChild(UI.el('span', null, g));
      grid.appendChild(c);
    });
    host.appendChild(grid);
  }

  SCREENS['Music'] = {
    statusBar: 'auto',
    mount(nav) {
      const TABS = [
        { label: 'Listen Now', icon: TAB_ICONS.now,     title: 'Listen Now', build: listenNow },
        { label: 'Library',    icon: TAB_ICONS.library, title: 'Library',    build: library },
        { label: 'Search',     icon: TAB_ICONS.search,  title: 'Search',     build: search },
      ];

      nav.push({
        title: 'Listen Now',
        build(body, nav, screen) {
          const heading = screen.querySelector('.large-title');
          const barTitle = screen.querySelector('.nav-title');
          const host = UI.el('div');
          body.appendChild(host);

          /* mini player, docked above the tab bar like the real app */
          const mini = UI.el('button', 'mu-mini');
          mini.type = 'button';
          const mArt = UI.el('span', 'mu-mini-art');
          const mTxt = UI.el('span', 'mu-mini-txt');
          const mPlay = UI.el('span', 'mu-mini-play');
          mini.append(mArt, mTxt, mPlay);
          mini.addEventListener('click', (e) => {
            if (e.target.closest('.mu-mini-play')) { player.toggle(); return; }
            nowPlaying(nav);
          });

          const paintMini = () => {
            const t = player.track;
            mArt.style.background = art(t);
            mTxt.textContent = t.title;
            mPlay.innerHTML = '';
            mPlay.appendChild(UI.svg(player.playing
              ? '<path d="M8.4 4.8h3.2v14.4H8.4zM14.4 4.8h3.2v14.4h-3.2z"/>'
              : '<path d="M7.6 4.8 19 12 7.6 19.2V4.8Z"/>'));
          };
          player.listeners.add(paintMini);
          paintMini();

          screen.appendChild(mini);
          screen.appendChild(UI.tabs(TABS, 0, show).el);

          const timer = setInterval(() => player.tick(), 250);
          screen.addEventListener('screen:teardown', () => {
            clearInterval(timer);
            player.listeners.delete(paintMini);
          });

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
