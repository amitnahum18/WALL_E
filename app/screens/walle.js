/* WALL·E — wake word, microphone, transcript. Stage one of the assistant:
   the pipeline stops at text on screen, nothing is sent to an agent. */
(() => {
  const E = () => window.WalleEngine;

  const BUILTINS = ['Computer', 'Jarvis', 'Picovoice', 'Bumblebee', 'Terminator'];
  const LANGS = [
    { id: 'en-US', label: 'English (US)' },
    { id: 'en-GB', label: 'English (UK)' },
    { id: 'he-IL', label: 'עברית' },
  ];

  const keywordLabel = (c) => (
    c.wakeMode === 'phrase' ? (String(c.phrases).split(',')[0] || '').trim()
      : c.keyword === 'custom' ? c.customLabel : c.keyword
  );

  const STATUS = {
    idle:     { text: 'Not listening',        hint: 'Tap the orb to talk, or arm the wake word below.' },
    starting: { text: 'Loading the model…',   hint: 'First run downloads Porcupine once.' },
    wake:     { text: 'Waiting for its name', hint: '' },
    listen:   { text: 'Listening',            hint: 'Speak the command. Tap to stop early.' },
    error:    { text: 'Stopped',              hint: '' },
  };

  const WAKE_HINT = {
    porcupine: 'Matched by sound, on-device. Nothing leaves this machine until the name is heard.',
    phrase:    'Matched in the transcript, so the microphone streams the whole time it is armed.',
  };

  function when(ts) {
    const d = new Date(ts), now = new Date();
    const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return d.toDateString() === now.toDateString() ? hm : d.toLocaleDateString('en-GB') + ' ' + hm;
  }

  /* ---------- settings ---------- */
  function settings(nav) {
    nav.push({
      title: 'Settings',
      build(body, nav, screen) {
        const paint = () => {
          const c = E().config;
          body.innerHTML = '';

          /* how the name is recognised at all */
          body.appendChild(UI.group([
            UI.row({
              label: 'By sound', sub: 'Porcupine, on-device. Needs a free key.',
              value: c.wakeMode === 'porcupine' ? '✓' : '', chevron: false,
              onTap: () => { E().setConfig({ wakeMode: 'porcupine' }); paint(); },
            }),
            UI.row({
              label: 'By transcript', sub: 'No key. Any phrase. Always streaming.',
              value: c.wakeMode === 'phrase' ? '✓' : '', chevron: false,
              onTap: () => { E().setConfig({ wakeMode: 'phrase' }); paint(); },
            }),
          ], { title: 'DETECTION', note: WAKE_HINT[c.wakeMode] }));

          if (c.wakeMode === 'phrase') {
            const ph = UI.el('input', 'walle-input walle-input-wide');
            ph.type = 'text';
            ph.placeholder = 'hi walle, hey wally';
            ph.value = c.phrases;
            ph.addEventListener('change', () => E().setConfig({ phrases: ph.value }));
            const phRow = UI.el('div', 'row walle-slider-row');
            phRow.appendChild(ph);
            body.appendChild(UI.group([phRow], {
              title: 'WAKE PHRASES',
              note: 'Comma separated, and any of them fires. Spaces inside a phrase are ignored, ' +
                    'so "hi walle" also catches "hi wall e". Watch the Heard line on the main screen ' +
                    'and add whatever the recogniser actually produces.',
            }));
          } else {
            /* AccessKey — kept in localStorage, never in the source */
            const key = UI.el('input', 'walle-input');
            key.type = 'password';
            key.placeholder = 'Paste AccessKey';
            key.value = c.accessKey;
            key.addEventListener('change', () => E().setConfig({ accessKey: key.value.trim() }));
            body.appendChild(UI.group([UI.row({ label: 'Picovoice AccessKey', right: key })], {
              title: 'ACCESS',
              note: 'Free key from console.picovoice.ai. Porcupine needs one even for the built-in words.',
            }));

            /* which word */
            const pick = (id) => E().setConfig({ keyword: id });
            body.appendChild(UI.group(
              [{ id: 'custom', label: c.customLabel + ' (custom .ppn)' }]
                .concat(BUILTINS.map((b) => ({ id: b, label: b })))
                .map((k) => UI.row({
                  label: k.label,
                  value: c.keyword === k.id ? '✓' : '',
                  chevron: false,
                  onTap: () => { pick(k.id); paint(); },
                })),
              { title: 'KEYWORD', note: 'Train "Hi WALL-E" for the Web (WASM) platform in the Picovoice console and drop the .ppn at app/' + c.customPath + '.' },
            ));

            /* sensitivity */
            const sens = UI.el('input', 'walle-slider');
            sens.type = 'range';
            sens.min = '0.1'; sens.max = '0.9'; sens.step = '0.05';
            sens.value = String(c.sensitivity);
            const sensVal = UI.el('span', 'row-value', c.sensitivity.toFixed(2));
            sens.addEventListener('input', () => { sensVal.textContent = Number(sens.value).toFixed(2); });
            sens.addEventListener('change', () => E().setConfig({ sensitivity: Number(sens.value) }));
            const sliderRow = UI.el('div', 'row walle-slider-row');
            sliderRow.appendChild(sens);
            body.appendChild(UI.group([UI.row({ label: 'Sensitivity', right: sensVal }), sliderRow], {
              note: 'Higher catches more, and misfires more. Re-arm the wake word to apply.',
            }));
          }

          /* language + cap */
          body.appendChild(UI.group(LANGS.map((l) => UI.row({
            label: l.label,
            value: c.lang === l.id ? '✓' : '',
            chevron: false,
            onTap: () => { E().setConfig({ lang: l.id }); paint(); },
          })), { title: 'TRANSCRIPTION' }));

          body.appendChild(UI.group([1000, 2000, 3000].map((ms) => UI.row({
            label: (ms / 1000).toFixed(1) + ' seconds',
            value: c.silenceMs === ms ? '✓' : '',
            chevron: false,
            onTap: () => { E().setConfig({ silenceMs: ms }); paint(); },
          })), {
            title: 'END THE COMMAND AFTER',
            note: 'A command runs as long as you keep talking and ends after this much silence. ' +
                  'A ' + (c.maxMs / 1000) + ' second ceiling sits behind it as a backstop.',
          }));

          body.appendChild(UI.group([
            UI.row({ label: 'Beep on wake', right: UI.switchEl(c.beep, (on) => E().setConfig({ beep: on })) }),
          ]));

          /* what the browser actually gives us */
          const diag = [
            UI.row({ label: 'Secure context', value: window.isSecureContext ? 'yes' : 'no — use serve.ps1' }),
            UI.row({ label: 'Speech recognition', value: STT.supported ? 'available' : 'Chrome only' }),
            UI.row({ label: 'Porcupine', value: WAKE.available ? 'loaded' : 'not loaded' }),
          ];
          body.appendChild(UI.group(diag, { title: 'DIAGNOSTICS' }));

          body.appendChild(UI.group([
            UI.row({ label: 'Reset counters', labelColor: 'var(--ios-blue)', chevron: false,
                     onTap: () => { E().resetMetrics(); } }),
            UI.row({ label: 'Clear transcripts', labelColor: 'var(--ios-red)', chevron: false,
                     onTap: () => { E().clearLog(); } }),
          ]));
        };

        paint();
        /* Nav.pop() drops the screen without a teardown event, so stop
           repainting once this one is off the stack. */
        const off = E().on((ev) => {
          if (!screen.isConnected) { off(); return; }
          if (ev.type === 'metrics') paint();
        });
        screen.addEventListener('screen:teardown', off);
      },
    });
  }

  /* ---------- main screen ---------- */
  SCREENS['WALL·E'] = {
    statusBar: 'auto',
    mount(nav, ctx) {
      const engine = E();

      nav.push({
        title: 'WALL·E',
        bodyClass: 'walle',
        rightAction: (() => {
          const b = UI.el('button', 'nav-action');
          b.type = 'button';
          const s = UI.svg('<path d="M12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z"/><path d="M19.4 12a7.4 7.4 0 0 0-.1-1.1l2-1.6-1.9-3.3-2.4 1.1a7.4 7.4 0 0 0-1.8-1.1l-.4-2.5h-3.8l-.4 2.5a7.4 7.4 0 0 0-1.8 1.1L6.4 6l-1.9 3.3 2 1.6a7.4 7.4 0 0 0 0 2.1l-2 1.6L6.4 18l2.4-1.1c.5.4 1.1.8 1.8 1.1l.4 2.5h3.8l.4-2.5c.7-.3 1.3-.7 1.8-1.1l2.4 1.1 1.9-3.3-2-1.6c.1-.4.1-.7.1-1.1Z"/>');
          s.style.cssText = 'width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linejoin:round';
          b.appendChild(s);
          return b;
        })(),

        build(body, nav, screen) {
          screen.querySelector('.nav-action').addEventListener('click', () => settings(nav));

          /* --- the orb --- */
          const orb = UI.el('button', 'walle-orb');
          orb.type = 'button';
          orb.innerHTML = '<span class="walle-ring"></span><span class="walle-ring two"></span>';
          const mic = UI.svg('<rect x="9" y="2.8" width="6" height="10.8" rx="3"/>' +
                             '<path d="M5.6 12a6.4 6.4 0 0 0 12.8 0"/><path d="M12 18.4v2.8"/>');
          mic.setAttribute('class', 'walle-mic');
          orb.appendChild(mic);
          orb.addEventListener('click', () => {
            if (engine.state === 'listen') engine.stopListening();
            else engine.talk();
          });

          const status = UI.el('div', 'walle-status');
          const hint = UI.el('div', 'walle-hint');
          const live = UI.el('div', 'walle-live');
          /* what the recogniser is making out right now — the only way to know
             which spelling to add to the phrase list */
          const heard = UI.el('div', 'walle-heard');

          const stage = UI.el('div', 'walle-stage');
          stage.append(orb, status, hint, live, heard);
          body.appendChild(stage);

          /* --- arm / disarm --- */
          const armSwitch = UI.switchEl(false, (on) => { on ? engine.start() : engine.stop(); });
          const armRow = UI.row({ label: 'Wake word', sub: '—', right: armSwitch });
          const armGroup = UI.el('div');
          armGroup.appendChild(UI.group([armRow]));
          body.appendChild(armGroup);

          /* --- counters, for tuning sensitivity --- */
          const metricsBox = UI.el('div');
          body.appendChild(metricsBox);

          /* --- is the recogniser actually alive? --- */
          const listenerBox = UI.el('div');
          body.appendChild(listenerBox);

          /* --- transcripts --- */
          const logBox = UI.el('div');
          body.appendChild(logBox);

          const paintMetrics = () => {
            const m = engine.metrics;
            metricsBox.innerHTML = '';
            metricsBox.appendChild(UI.group([
              UI.row({ label: 'Detections', value: String(m.detections) }),
              UI.row({ label: 'False positives', value: String(m.falsePositives) }),
              UI.row({ label: 'Wake → listening', value: m.wakeMs ? m.wakeMs + ' ms' : '—' }),
              UI.row({ label: 'Transcription', value: m.sttMs ? m.sttMs + ' ms' : '—' }),
              UI.row({ label: 'Mark last as false positive', labelColor: 'var(--ios-blue)', chevron: false,
                       onTap: () => engine.markFalsePositive() }),
            ], { title: 'ACCURACY' }));
          };

          /* "listening and doing nothing" and "stopped listening" look
             identical from outside. These numbers tell them apart.
             Built once and updated in place — a panel that rebuilt itself
             every second would swap the tap targets out from under a finger. */
          let listener = null;
          const tailOfHeard = () => String(engine.heard || '').split(' ').slice(-3).join(' ').trim();

          const buildListener = () => {
            listenerBox.innerHTML = '';
            listener = null;
            if (engine.config.wakeMode !== 'phrase') return;

            const val = {};
            const row = (label, key) => {
              const el = UI.el('span', 'row-value', '—');
              val[key] = el;
              return UI.row({ label, right: el });
            };

            const addRow = UI.row({
              label: 'Add what it heard as a wake phrase',
              labelColor: 'var(--ios-blue)', chevron: false,
              onTap: () => {
                const tail = tailOfHeard();
                if (!tail) return;
                const list = engine.phraseList();
                if (list.indexOf(tail) < 0) list.push(tail);
                engine.setConfig({ phrases: list.join(', ') });
              },
            });

            listenerBox.appendChild(UI.group([
              row('Recogniser', 'run'),
              row('Last heard anything', 'last'),
              row('This session started', 'started'),
              row('Sessions / restarts', 'sessions'),
              row('Last error', 'error'),
              addRow,
            ], {
              title: 'LISTENER',
              note: '"Last heard anything" is the honest one: if it keeps climbing while you are ' +
                    'talking, the recogniser has gone deaf and the session needs recycling.',
            }));

            listener = { val, addLabel: addRow.querySelector('b') };
          };

          const paintListener = () => {
            if (!listener) return;
            const st = PHRASE.stats;
            const ago = (ts) => (ts ? Math.round((Date.now() - ts) / 1000) + 's ago' : 'never');
            listener.val.run.textContent = PHRASE.running ? 'running' : 'stopped';
            listener.val.last.textContent = ago(st.lastResultAt);
            listener.val.started.textContent = ago(st.startedAt);
            listener.val.sessions.textContent = st.sessions + ' / ' + st.restarts;
            listener.val.error.textContent = st.lastError || 'none';
            const tail = tailOfHeard();
            listener.addLabel.textContent = tail
              ? 'Add “' + tail + '” as a wake phrase'
              : 'Add what it heard as a wake phrase';
          };

          const paintLog = () => {
            logBox.innerHTML = '';
            if (!engine.log.length) {
              logBox.appendChild(UI.group([UI.row({ label: 'Nothing yet', sub: 'Transcripts land here.' })],
                                          { title: 'TRANSCRIPTS' }));
              return;
            }
            logBox.appendChild(UI.group(engine.log.map((e) => UI.row({
              strong: true,
              label: e.text,
              sub: when(e.at) + '  ·  ' + (e.via === 'wake' ? 'wake word' : 'push to talk') +
                   (e.sttMs ? '  ·  ' + e.sttMs + ' ms' : ''),
            })), { title: 'TRANSCRIPTS', note: engine.log.length + ' transcripts, newest first' }));
          };

          const paintState = () => {
            const s = engine.state;
            const c = engine.config;
            stage.dataset.state = s;
            orb.dataset.state = s;

            const base = STATUS[s] || STATUS.idle;
            status.textContent = s === 'wake' ? '“' + keywordLabel(c) + '”' : base.text;
            hint.textContent = engine.error ? engine.error.message
                             : s === 'wake' ? WAKE_HINT[c.wakeMode]
                             : base.hint;
            hint.classList.toggle('bad', !!engine.error);

            armSwitch.setAttribute('aria-checked', String(s === 'wake' || s === 'listen' || s === 'starting'));
            armRow.querySelector('small').textContent =
              keywordLabel(c) + (c.wakeMode === 'phrase' ? '  ·  by transcript' : '  ·  by sound');

            live.textContent = engine.interim;
            live.classList.toggle('on', s === 'listen');

            const showHeard = c.wakeMode === 'phrase' && s === 'wake' && engine.heard;
            heard.textContent = showHeard ? 'heard: ' + engine.heard : '';
            heard.classList.toggle('on', !!showHeard);
          };

          paintState(); paintMetrics(); buildListener(); paintListener(); paintLog();

          const off = engine.on((ev) => {
            if (ev.type === 'interim') { live.textContent = ev.text; return; }
            if (ev.type === 'heard') {
              heard.textContent = 'heard: ' + ev.text.split(' ').slice(-9).join(' ');
              heard.classList.add('on');
              return;
            }
            if (ev.type === 'final') { paintLog(); paintMetrics(); paintState(); return; }
            if (ev.type === 'metrics') { paintMetrics(); paintLog(); return; }
            paintState();
            if (ev.type === 'config') { paintMetrics(); buildListener(); paintListener(); }
          });

          /* the counters only mean anything if they keep counting */
          const tick = setInterval(paintListener, 1000);
          screen.addEventListener('screen:teardown', () => clearInterval(tick));

          /* Closing the app stops the screen, not the listening: an armed
             wake word keeps running system-wide and says so through the
             pill. Only a half-finished push-to-talk turn is abandoned. */
          screen.addEventListener('screen:teardown', () => {
            off();
            if (engine.state === 'listen' && !engine.armed) engine.stop();
          });
        },
      });
    },
  };
})();
