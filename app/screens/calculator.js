/* Calculator — the real thing: chained operations, %, +/-, AC/C. */
(() => {
  const KEYS = [
    ['AC', 'fn'], ['+/−', 'fn'], ['%', 'fn'], ['÷', 'op'],
    ['7', 'num'], ['8', 'num'], ['9', 'num'], ['×', 'op'],
    ['4', 'num'], ['5', 'num'], ['6', 'num'], ['−', 'op'],
    ['1', 'num'], ['2', 'num'], ['3', 'num'], ['+', 'op'],
    ['0', 'num zero'], ['.', 'num'], ['=', 'op'],
  ];

  const fmt = (n) => {
    if (!isFinite(n)) return 'Error';
    const s = Math.abs(n) >= 1e9 || (n !== 0 && Math.abs(n) < 1e-6)
      ? n.toExponential(5)
      : String(Math.round(n * 1e9) / 1e9);
    return s.length > 9 && s.indexOf('e') < 0
      ? Number(n.toPrecision(9)).toString()
      : s;
  };

  const group = (s) => {
    if (s === 'Error' || s.indexOf('e') >= 0) return s;
    const neg = s.startsWith('-');
    if (neg) s = s.slice(1);
    const [i, d] = s.split('.');
    const gi = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + gi + (d != null ? '.' + d : '');
  };

  SCREENS['Calculator'] = {
    statusBar: 'light',
    mount(nav) {
      nav.push({
        title: '', large: false, transparent: true, bodyClass: 'no-pad',
        build(body, _nav, screen) {
          screen.classList.add('calc-screen');
          screen.querySelector('.navbar').classList.add('calc-bar');

          const out = UI.el('div', 'calc-out', '0');
          const pad = UI.el('div', 'calc-pad');
          body.classList.add('calc-body');
          body.append(out, pad);

          /* ---- state ---- */
          let cur = '0';        // what is on screen
          let acc = null;       // stored value
          let op = null;        // pending operator
          let fresh = true;     // next digit starts a new number

          const buttons = new Map();
          const show = () => {
            out.textContent = group(cur);
            out.style.fontSize = cur.length > 8 ? (cur.length > 10 ? '52px' : '66px') : '82px';
          };
          const highlight = (key) => buttons.forEach((b, k) => b.classList.toggle('active', k === key));

          const apply = (a, b, o) => o === '+' ? a + b : o === '−' ? a - b
                                  : o === '×' ? a * b : o === '÷' ? a / b : b;

          function digit(d) {
            if (fresh) { cur = d === '.' ? '0.' : d; fresh = false; }
            else if (d === '.') { if (cur.indexOf('.') < 0) cur += '.'; }
            else if (cur === '0') cur = d;
            else if (cur.replace(/[-.]/g, '').length < 9) cur += d;
            highlight(null);
            acButton.textContent = 'C';
            show();
          }

          function operator(o) {
            const val = parseFloat(cur);
            if (o === '=') {
              if (op != null && acc != null) cur = fmt(apply(acc, val, op));
              acc = null; op = null; fresh = true;
              highlight(null); show(); return;
            }
            if (op != null && acc != null && !fresh) {
              acc = apply(acc, val, op);
              cur = fmt(acc);
            } else {
              acc = val;
            }
            op = o; fresh = true;
            highlight(o); show();
          }

          function fn(label) {
            if (label === 'AC') {
              cur = '0'; acc = null; op = null; fresh = true;
              acButton.textContent = 'AC';
            } else if (label === '+/−') {
              cur = cur.startsWith('-') ? cur.slice(1) : (cur === '0' ? cur : '-' + cur);
            } else if (label === '%') {
              cur = fmt(parseFloat(cur) / 100); fresh = true;
            }
            highlight(null); show();
          }

          let acButton;
          KEYS.forEach(([label, kind]) => {
            const b = UI.el('button', 'calc-key ' + kind, label);
            b.type = 'button';
            if (label === 'AC') acButton = b;
            if (kind === 'op') buttons.set(label, b);
            b.addEventListener('click', () => {
              if (kind === 'op') operator(label);
              else if (kind === 'fn') fn(label);
              else digit(label);
            });
            pad.appendChild(b);
          });

          /* physical keyboard works too */
          const onKey = (e) => {
            const k = e.key;
            if (/^[0-9]$/.test(k)) digit(k);
            else if (k === '.') digit('.');
            else if (k === '+') operator('+');
            else if (k === '-') operator('−');
            else if (k === '*') operator('×');
            else if (k === '/') { e.preventDefault(); operator('÷'); }
            else if (k === 'Enter' || k === '=') operator('=');
            else if (k === '%') fn('%');
            else if (k === 'Backspace') {
              cur = cur.length > 1 ? cur.slice(0, -1) : '0';
              if (cur === '-') cur = '0';
              show();
            } else return;
          };
          document.addEventListener('keydown', onKey);
          screen.addEventListener('screen:teardown', () =>
            document.removeEventListener('keydown', onKey));

          show();
        },
      });
    },
  };
})();
