/* Settings — grouped lists, working switches, push navigation. */
(() => {
  const G = {
    plane:   '<path d="M12 2.5c.9 0 1.4.7 1.4 1.7v4.4l7.6 4.4v2.2l-7.6-2.3v4l2.6 1.9v1.7L12 19.4l-4 1.1v-1.7l2.6-1.9v-4L3 15.2V13l7.6-4.4V4.2c0-1 .5-1.7 1.4-1.7Z"/>',
    wifi:    '<path d="M4.6 9.4a11 11 0 0 1 14.8 0M7.4 13a7 7 0 0 1 9.2 0M10.2 16.5a3 3 0 0 1 3.6 0"/><circle cx="12" cy="19.4" r=".9" fill="#fff" stroke="none"/>',
    bt:      '<path d="m8.4 7.6 7.2 8.8L12 20V4l3.6 3.6-7.2 8.8"/>',
    cell:    '<path d="M4 18v-3M9.3 18V11M14.7 18V7M20 18V3"/>',
    hotspot: '<path d="M12 12.6a4.4 4.4 0 0 1 0-8.8 4.4 4.4 0 0 1 0 8.8Z"/><path d="M12 12.6 7.6 20.4h8.8L12 12.6Z"/>',
    bell:    '<path d="M12 3.4a5.8 5.8 0 0 0-5.8 5.8c0 4.4-1.4 5.6-1.4 5.6h14.4s-1.4-1.2-1.4-5.6A5.8 5.8 0 0 0 12 3.4Z"/><path d="M10.2 18.2a2 2 0 0 0 3.6 0"/>',
    sound:   '<path d="M11 4.6 6.6 8.4H3.4v7.2h3.2L11 19.4V4.6Z"/><path d="M15.4 9a4.2 4.2 0 0 1 0 6M18.4 6.2a8.2 8.2 0 0 1 0 11.6"/>',
    focus:   '<path d="M18.6 14.4A7.4 7.4 0 0 1 9 4.8a7.8 7.8 0 1 0 9.6 9.6Z"/>',
    time:    '<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.4 2"/>',
    gear:    '<path fill="#fff" stroke="none" fill-rule="evenodd" d="M13.9 2.6h-3.8l-.4 2.5a7.4 7.4 0 0 0-1.8 1.1L5.5 5.1 3.6 8.4l2 1.6a7.4 7.4 0 0 0 0 2.1l-2 1.6 1.9 3.3 2.4-1.1c.5.4 1.1.8 1.8 1.1l.4 2.5h3.8l.4-2.5c.7-.3 1.3-.7 1.8-1.1l2.4 1.1 1.9-3.3-2-1.6a7.4 7.4 0 0 0 0-2.1l2-1.6-1.9-3.3-2.4 1.1a7.4 7.4 0 0 0-1.8-1.1l-.4-2.5ZM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z"/>',
    cc:      '<path d="M5 7h14M5 12h14M5 17h14"/><circle cx="9" cy="7" r="2" fill="#fff" stroke="none"/><circle cx="15" cy="12" r="2" fill="#fff" stroke="none"/><circle cx="10" cy="17" r="2" fill="#fff" stroke="none"/>',
    display: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5 16.8 7.2M7.2 16.8 5.5 18.5M18.5 18.5 16.8 16.8M7.2 7.2 5.5 5.5"/>',
    grid:    '<rect x="3.6" y="3.6" width="6.6" height="6.6" rx="1.8"/><rect x="13.8" y="3.6" width="6.6" height="6.6" rx="1.8"/><rect x="3.6" y="13.8" width="6.6" height="6.6" rx="1.8"/><rect x="13.8" y="13.8" width="6.6" height="6.6" rx="1.8"/>',
    access:  '<circle cx="12" cy="4.8" r="1.8"/><path d="M4.6 8.4h14.8M12 8.4v6M12 14.4l-3 5.4M12 14.4l3 5.4"/>',
    wall:    '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4"/><circle cx="9" cy="10" r="1.8"/><path d="m4.6 17.6 5-5 4.4 4.4 2.6-2.4 3.4 3"/>',
    siri:    '<circle cx="12" cy="12" r="8.4"/><path d="M8.4 12a3.6 3.6 0 0 1 7.2 0 3.6 3.6 0 0 1-7.2 0Z"/>',
    lock:    '<rect x="5" y="10.4" width="14" height="10" rx="2.6"/><path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8"/>',
    store:   '<path d="M5.4 17.6 11 6.6M18.6 17.6 13 6.6M8.6 12.6h6.8"/>',
    battery: '<rect x="2.6" y="7.4" width="16" height="9.2" rx="2.8"/><path d="M21.4 10.6v2.8"/><rect x="4.6" y="9.4" width="9" height="5.2" rx="1.4" fill="#fff" stroke="none"/>',
    vpn:     '<path d="M12 2.8 4.4 6v6c0 4.4 3.2 7.8 7.6 9.2 4.4-1.4 7.6-4.8 7.6-9.2V6L12 2.8Z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
    standby: '<rect x="2.4" y="5.4" width="19.2" height="13.2" rx="2.6"/><circle cx="12" cy="12" r="3.4"/><path d="M12 9.8V12l1.6 1"/>',
    search:  '<circle cx="10.8" cy="10.8" r="6.4"/><path d="m19.6 19.6-4-4"/>',
    faceid:  '<path d="M4 8.6V6.4a2.4 2.4 0 0 1 2.4-2.4h2.2M15.4 4h2.2A2.4 2.4 0 0 1 20 6.4v2.2M20 15.4v2.2a2.4 2.4 0 0 1-2.4 2.4h-2.2M8.6 20H6.4A2.4 2.4 0 0 1 4 17.6v-2.2"/><path d="M9.2 10v1.6M14.8 10v1.6M12 10.4v3.2h-1.1M9.6 15.8a3.9 3.9 0 0 0 4.8 0"/>',
    sos:     '<path d="M12 2.8 2.6 19.6h18.8L12 2.8Z"/><path d="M12 9.4v4.2M12 16.6v.1"/>',
    game:    '<circle cx="8.8" cy="9.6" r="3.2"/><circle cx="15.2" cy="9.6" r="3.2"/><circle cx="8.8" cy="15.2" r="3.2"/><circle cx="15.2" cy="15.2" r="3.2"/>',
    icloud:  '<path d="M7.4 18.4h9.8a3.8 3.8 0 0 0 .3-7.6 5.4 5.4 0 0 0-10.4-1.2 3.9 3.9 0 0 0 .3 8.8Z"/>',
    wallet:  '<rect x="2.6" y="6.4" width="18.8" height="12.4" rx="3"/><path d="M2.6 10.6h18.8"/><path d="M6.2 6.4 8 3.6h8l1.8 2.8"/>',
  };

  const state = {
    airplane: UI.store('set.airplane', false),
    wifi:     UI.store('set.wifi', true),
    bt:       UI.store('set.bt', true),
    hotspot:  UI.store('set.hotspot', false),
    autoLock: UI.store('set.autolock', true),
  };
  const persist = (k, v) => { state[k] = v; UI.save('set.' + k, v); };

  const NETWORKS = ['Home_5G', 'Home_2.4G', 'Cafe Guest', 'Neighbour-2', 'iPhone (Amit)'];

  /* ---------- sub screens ---------- */

  function wifiScreen(nav) {
    nav.push({
      title: 'Wi-Fi',
      build(body) {
        const chosen = UI.store('set.network', 'Home_5G');

        body.appendChild(UI.group([
          UI.row({ label: 'Wi-Fi', right: UI.switchEl(state.wifi, (v) => persist('wifi', v)) }),
        ]));

        const rows = NETWORKS.map((n) =>
          UI.row({
            label: n,
            value: n === chosen ? '✓' : '',
            sub: n === chosen ? 'Connected' : null,
            onTap: () => { UI.save('set.network', n); nav.pop(); },
          }));
        body.appendChild(UI.group(rows, {
          title: 'My Networks',
          note: 'Known networks will be joined automatically.',
        }));
      },
    });
  }

  function displayScreen(nav, ctx) {
    nav.push({
      title: 'Display & Brightness',
      build(body) {
        const root = document.documentElement;
        const setTheme = (t) => {
          root.dataset.theme = t;
          UI.save('set.theme', t);
          ctx.setStatusBar(t === 'dark' ? 'light' : 'dark');
          light.querySelector('.row-value').textContent = t === 'light' ? '✓' : '';
          dark.querySelector('.row-value').textContent  = t === 'dark'  ? '✓' : '';
        };
        const light = UI.row({ label: 'Light', value: root.dataset.theme !== 'dark' ? '✓' : '', chevron: false, onTap: () => setTheme('light') });
        const dark  = UI.row({ label: 'Dark',  value: root.dataset.theme === 'dark' ? '✓' : '', chevron: false, onTap: () => setTheme('dark') });

        body.appendChild(UI.group([light, dark], {
          title: 'Appearance',
          note: 'Switching here really repaints every screen in the simulator.',
        }));

        body.appendChild(UI.group([
          UI.row({ label: 'Auto-Lock', value: '30 Seconds', onTap: () => {} }),
          UI.row({ label: 'Raise to Wake', right: UI.switchEl(state.autoLock, (v) => persist('autoLock', v)) }),
        ]));

        body.appendChild(UI.group([
          UI.row({ label: 'Text Size', onTap: () => {} }),
          UI.row({ label: 'Bold Text', right: UI.switchEl(false) }),
        ]));
      },
    });
  }

  function aboutScreen(nav) {
    nav.push({
      title: 'About',
      build(body) {
        body.appendChild(UI.group([
          UI.row({ label: 'Name', value: 'iPhone', onTap: () => {} }),
          UI.row({ label: 'Software Version', value: '17.4.1' }),
          UI.row({ label: 'Model Name', value: 'iPhone 15 Pro' }),
          UI.row({ label: 'Model Number', value: 'MTQ83HB/A' }),
          UI.row({ label: 'Serial Number', value: 'F2LX9K4QW1' }),
        ]));
        body.appendChild(UI.group([
          UI.row({ label: 'Songs', value: '1,204' }),
          UI.row({ label: 'Photos', value: '2,481' }),
          UI.row({ label: 'Applications', value: '32' }),
          UI.row({ label: 'Capacity', value: '256 GB' }),
          UI.row({ label: 'Available', value: '84.2 GB' }),
        ]));
        body.appendChild(UI.group([
          UI.row({ label: 'Wi-Fi Address', value: 'A4:83:E7:2C:19:F0' }),
          UI.row({ label: 'Bluetooth', value: 'A4:83:E7:2C:19:F3' }),
        ]));
      },
    });
  }

  function generalScreen(nav) {
    nav.push({
      title: 'General',
      build(body) {
        body.appendChild(UI.group([
          UI.row({ label: 'About', onTap: () => aboutScreen(nav) }),
          UI.row({ label: 'Software Update', value: '1', onTap: () => {} }),
        ]));
        body.appendChild(UI.group([
          UI.row({ label: 'AirDrop', onTap: () => {} }),
          UI.row({ label: 'AirPlay & Handoff', onTap: () => {} }),
          UI.row({ label: 'CarPlay', onTap: () => {} }),
        ]));
        body.appendChild(UI.group([
          UI.row({ label: 'iPhone Storage', value: '84.2 GB free', onTap: () => {} }),
          UI.row({ label: 'Background App Refresh', onTap: () => {} }),
        ]));
        body.appendChild(UI.group([
          UI.row({ label: 'Date & Time', onTap: () => {} }),
          UI.row({ label: 'Keyboard', onTap: () => {} }),
          UI.row({ label: 'Language & Region', onTap: () => {} }),
        ]));
        body.appendChild(UI.group([
          UI.row({ label: 'Transfer or Reset iPhone', onTap: () => {} }),
          UI.row({ label: 'Shut Down', labelColor: 'var(--ios-blue)', chevron: false, onTap: () => {} }),
        ]));
      },
    });
  }

  /* ---------- root ---------- */

  SCREENS['Settings'] = {
    statusBar: 'auto',
    mount(nav, ctx) {
      nav.push({
        title: 'Settings',
        build(body) {
          body.appendChild(UI.searchField('Search'));

          const me = UI.row({
            label: 'Amit Nahum',
            sub: 'Apple Account, iCloud, and more',
            onTap: () => {},
          });
          const av = UI.el('span', 'row-icon');
          av.style.cssText =
            'width:58px;height:58px;border-radius:50%;background:' +
            'linear-gradient(135deg,#7a8ea8,#4a5a70);color:#fff;font:600 24px/1 inherit';
          av.textContent = 'AN';
          me.prepend(av);
          me.classList.remove('has-icon');
          body.appendChild(UI.group([me]));

          body.appendChild(UI.group([
            UI.row({ icon: G.plane, iconBg: '#ff9500', label: 'Airplane Mode',
                     right: UI.switchEl(state.airplane, (v) => persist('airplane', v)) }),
            UI.row({ icon: G.wifi, iconBg: '#007aff', label: 'Wi-Fi',
                     value: state.wifi ? UI.store('set.network', 'Home_5G') : 'Off',
                     onTap: () => wifiScreen(nav) }),
            UI.row({ icon: G.bt, iconBg: '#007aff', label: 'Bluetooth',
                     value: state.bt ? 'On' : 'Off', onTap: () => {} }),
            UI.row({ icon: G.cell, iconBg: '#34c759', label: 'Cellular', onTap: () => {} }),
            UI.row({ icon: G.hotspot, iconBg: '#34c759', label: 'Personal Hotspot',
                     value: state.hotspot ? 'On' : 'Off', onTap: () => {} }),
            UI.row({ icon: G.vpn, iconBg: '#007aff', label: 'VPN', value: 'Not Connected', onTap: () => {} }),
          ]));

          body.appendChild(UI.group([
            UI.row({ icon: G.bell, iconBg: '#ff3b30', label: 'Notifications', onTap: () => {} }),
            UI.row({ icon: G.sound, iconBg: '#ff2d55', label: 'Sounds & Haptics', onTap: () => {} }),
            UI.row({ icon: G.focus, iconBg: '#5e5ce6', label: 'Focus', onTap: () => {} }),
            UI.row({ icon: G.time, iconBg: '#5e5ce6', label: 'Screen Time', onTap: () => {} }),
          ]));

          body.appendChild(UI.group([
            UI.row({ icon: G.gear, iconBg: '#8e8e93', label: 'General', onTap: () => generalScreen(nav) }),
            UI.row({ icon: G.cc, iconBg: '#8e8e93', label: 'Control Centre', onTap: () => {} }),
            UI.row({ icon: G.display, iconBg: '#007aff', label: 'Display & Brightness',
                     onTap: () => displayScreen(nav, ctx) }),
            UI.row({ icon: G.grid, iconBg: '#5856d6', label: 'Home Screen & App Library', onTap: () => {} }),
            UI.row({ icon: G.access, iconBg: '#007aff', label: 'Accessibility', onTap: () => {} }),
            UI.row({ icon: G.wall, iconBg: '#00c7be', label: 'Wallpaper', onTap: () => {} }),
            UI.row({ icon: G.standby, iconBg: '#1c1c1e', label: 'StandBy', onTap: () => {} }),
            UI.row({ icon: G.siri, iconBg: '#1c1c1e', label: 'Siri', onTap: () => {} }),
            UI.row({ icon: G.search, iconBg: '#8e8e93', label: 'Search', onTap: () => {} }),
          ]));

          body.appendChild(UI.group([
            UI.row({ icon: G.faceid, iconBg: '#34c759', label: 'Face ID & Passcode', onTap: () => {} }),
            UI.row({ icon: G.sos, iconBg: '#ff3b30', label: 'Emergency SOS', onTap: () => {} }),
            UI.row({ icon: G.battery, iconBg: '#34c759', label: 'Battery', value: '87%', onTap: () => {} }),
            UI.row({ icon: G.lock, iconBg: '#007aff', label: 'Privacy & Security', onTap: () => {} }),
          ]));

          body.appendChild(UI.group([
            UI.row({ icon: G.store, iconBg: '#007aff', label: 'App Store', onTap: () => {} }),
            UI.row({ icon: G.game, iconBg: '#63c7f5', label: 'Game Centre', onTap: () => {} }),
            UI.row({ icon: G.icloud, iconBg: '#3aabf0', label: 'iCloud', value: '84.2 GB free', onTap: () => {} }),
            UI.row({ icon: G.wallet, iconBg: '#1c1c1e', label: 'Wallet & Apple Pay', onTap: () => {} }),
          ]));

          body.appendChild(UI.group([
            UI.row({ icon: G.grid, iconBg: '#8e8e93', label: 'Apps', onTap: () => {} }),
          ]));
        },
      });
    },
  };
})();
