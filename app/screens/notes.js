/* Notes — a real editor. Everything you type is kept in localStorage. */
(() => {
  const SEED = [
    { id: 1, text: 'Shopping list\nMilk\nCoffee beans\nOlive oil\nSourdough', at: Date.now() - 3.6e6 },
    { id: 2, text: 'Meeting notes\nDeploy window moved to 17:00.\nDana reviews the PR.\nShip the icon set first.', at: Date.now() - 9e7 },
    { id: 3, text: 'Ideas\nDrag-to-scroll everywhere\nLock screen with swipe up\nControl Centre', at: Date.now() - 1.9e8 },
    { id: 4, text: 'Wi-Fi\nHome_5G — ask Yoav for the guest password', at: Date.now() - 6e8 },
  ];

  const load = () => UI.store('notes.all', SEED);
  const save = (n) => UI.save('notes.all', n);

  const title = (t) => (t.split('\n')[0] || 'New Note').slice(0, 40);
  const preview = (t) => (t.split('\n').slice(1).join(' ').trim() || 'No additional text').slice(0, 60);

  function when(ts) {
    const d = new Date(ts), now = new Date();
    if (d.toDateString() === now.toDateString())
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (now - ts < 6.048e8) return d.toLocaleDateString('en-US', { weekday: 'long' });
    return d.toLocaleDateString('en-GB');
  }

  function editor(nav, note, onSave) {
    nav.push({
      title: '', large: false, bodyClass: 'notes-edit',
      rightAction: (() => {
        const b = UI.el('button', 'nav-action', 'Done');
        b.type = 'button';
        b.addEventListener('click', () => nav.pop());
        return b;
      })(),
      build(body) {
        const stamp = UI.el('div', 'notes-stamp',
          new Date(note.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }));
        const area = UI.el('textarea', 'notes-area');
        area.value = note.text;
        area.spellcheck = false;
        body.append(stamp, area);

        let t;
        area.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => { note.text = area.value; note.at = Date.now(); onSave(); }, 300);
        });
        setTimeout(() => { area.focus(); area.setSelectionRange(area.value.length, area.value.length); }, 380);
      },
    });
  }

  SCREENS['Notes'] = {
    statusBar: 'auto',
    mount(nav) {
      let notes = load();

      nav.push({
        title: 'Notes',
        rightAction: (() => {
          const b = UI.el('button', 'nav-action');
          b.type = 'button';
          b.appendChild(UI.svg('<path d="M4 20h4L18.4 9.6a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6 4 20Z"/>'));
          b.querySelector('svg').style.cssText =
            'width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linejoin:round';
          return b;
        })(),
        build(body, nav) {
          const list = UI.el('div');
          body.appendChild(UI.searchField('Search'));
          body.appendChild(list);

          const paint = () => {
            list.innerHTML = '';
            const sorted = notes.slice().sort((a, b) => b.at - a.at);
            const rows = sorted.map((n) => UI.row({
              strong: true,
              label: title(n.text),
              sub: when(n.at) + '   ' + preview(n.text),
              chevron: false,
              onTap: () => editor(nav, n, () => { save(notes); paint(); }),
            }));
            list.appendChild(UI.group(rows, { note: notes.length + ' Notes' }));
          };
          paint();

          const compose = () => {
            const n = { id: Date.now(), text: '', at: Date.now() };
            notes.push(n);
            save(notes);
            paint();
            editor(nav, n, () => { save(notes); paint(); });
          };
          body.closest('.screen').querySelector('.nav-action')
              .addEventListener('click', compose);
        },
      });
    },
  };
})();
