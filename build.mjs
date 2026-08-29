/* ===========================================================
   build.mjs — bundles the whole simulator into one HTML file.

     node build.mjs          ->  dist/simulator.html

   The phone screen needs a real viewport of its own (the app uses
   position:fixed and 100% heights), so it stays inside an iframe —
   but the iframe is fed from srcdoc instead of a separate file.
   =========================================================== */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (...p) => readFileSync(join(root, ...p), 'utf8');

/* Inlined JS must not contain a script-closing sequence, or the HTML parser
   ends the block early. Assert rather than silently rewrite: escaping the
   phone's document is exactly what broke the first build. */
function assertInlinable(label, src) {
  if (/<\/script/i.test(src)) {
    throw new Error(label + ' contains a script-closing sequence and cannot be inlined');
  }
  return src;
}

/* ---------- the app that runs inside the phone ---------- */

const appCss = [
  read('app', 'style.css'),
  read('app', 'ui.css'),
  read('app', 'screens.css'),
].join('\n');

const appJs = [
  read('app', 'sim-bridge.js'),
  read('app', 'ui.js'),
  read('app', 'apps.js'),
  /* The Picovoice bundles stay on the CDN and are stripped from this build,
     so WALL·E falls back to push-to-talk inside the single-file version. */
  read('app', 'voice', 'stt.js'),
  read('app', 'voice', 'wake.js'),
  read('app', 'voice', 'phrase.js'),
  read('app', 'voice', 'engine.js'),
  read('app', 'voice', 'indicator.js'),
  read('app', 'screens', 'settings.js'),
  read('app', 'screens', 'messages.js'),
  read('app', 'screens', 'calculator.js'),
  read('app', 'screens', 'weather.js'),
  read('app', 'screens', 'photos.js'),
  read('app', 'screens', 'clock.js'),
  read('app', 'screens', 'notes.js'),
  read('app', 'screens', 'phone.js'),
  read('app', 'screens', 'mail.js'),
  read('app', 'screens', 'calendar.js'),
  read('app', 'screens', 'music.js'),
  read('app', 'screens', 'maps.js'),
  read('app', 'screens', 'social.js'),
  read('app', 'screens', 'walle.js'),
  read('app', 'main.js'),
].join('\n;\n');

/* the markup between <body> and </body>, without the tags we inline */
const appBody = read('app', 'index.html')
  .match(/<body>([\s\S]*?)<\/body>/i)[1]
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .trim();

const appDoc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>iPhone</title>
<style>
${appCss}
</style>
</head>
<body>
${appBody}
<script>
${assertInlinable('phone app script', appJs)}
</script>
</body>
</html>`;

/* Base64 keeps this document byte-exact: its own <script> block stays a real
   script tag, and the payload can never terminate the block that carries it. */
const appDocB64 = Buffer.from(appDoc, 'utf8').toString('base64');

/* ---------- the simulator shell ---------- */

let simJs = read('simulator', 'sim.js');

/* Every patch must match — a silently skipped one would leave the bundle
   referencing a toolbar control this build does not ship. */
function patch(src, label, re, to) {
  if (!re.test(src)) throw new Error(`build patch "${label}" matched nothing`);
  return src.replace(re, to);
}

// the path box: there is only one app here, nothing to load
simJs = patch(simJs, 'path box value', /  el\.url\.value = state\.url;\n/, '');
simJs = patch(simJs, 'path box handlers',
  /  function loadUrl\(\)[\s\S]*?el\.open\.addEventListener\([\s\S]*?\);\n/,
  '  /* single-file build: the app is embedded, there is nothing to load */\n');

// the Live toggle reloads from disk, which means nothing once bundled
simJs = patch(simJs, 'live handlers',
  /  el\.live\.addEventListener\('change'[\s\S]*?if \(state\.live\) reload\(\); \}\);\n/, '');
simJs = patch(simJs, 'live init', /  el\.live\.checked = state\.live;\n/, '');
simJs = patch(simJs, 'live class',
  /  el\.live\.parentElement\.classList\.toggle\('on', state\.live\);\n/, '');
simJs = patch(simJs, 'dropped element lookups',
  /    reload: \$\('reload'\), live: \$\('live'\), url: \$\('url'\), go: \$\('go'\), open: \$\('open'\),/,
  "    reload: $('reload'),");

// feed the phone from srcdoc, decoding the embedded document
const srcdocWiring = [
  '  el.frame.srcdoc = (function () {',
  "    var raw = atob(document.getElementById('appdoc').textContent.trim());",
  '    var bytes = new Uint8Array(raw.length);',
  '    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);',
  "    return new TextDecoder('utf-8').decode(bytes);",
  '  })();',
].join('\n');

simJs = patch(simJs, 'srcdoc wiring',
  /  if \(el\.frame\.getAttribute\('src'\) !== state\.url\) el\.frame\.src = state\.url;/,
  srcdocWiring);

for (const dead of ['el.url', 'el.go', 'el.open', 'el.live']) {
  if (simJs.includes(dead)) throw new Error(`bundle still references ${dead}`);
}

const shellJs = [read('simulator', 'devices.js'), simJs].join('\n;\n');

const page = `<title>iPhone Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap">
<style>
${read('simulator', 'frame.css')}
${read('simulator', 'bundle.css')}
</style>

<header class="toolbar">
  <div class="brand"><span class="dot"></span><span>iPhone Simulator</span></div>

  <div class="group">
    <label class="ctl"><span>מכשיר</span><select id="device"></select></label>
    <label class="ctl"><span>זום</span>
      <select id="zoom">
        <option value="fit">התאם</option>
        <option value="1">100%</option>
        <option value="0.85">85%</option>
        <option value="0.75">75%</option>
        <option value="0.6">60%</option>
        <option value="0.5">50%</option>
      </select>
    </label>
  </div>

  <div class="group">
    <button id="rotate" class="btn" title="סיבוב (Ctrl+←/→)">⟳ סיבוב</button>
    <button id="theme" class="btn" title="מצב כהה/בהיר">◐ ערכה</button>
    <button id="reload" class="btn" title="רענון (R)">↻ רענון</button>
  </div>

  <p class="hint">גרור עם העכבר כדי לגלול · לחץ על אייקון כדי לפתוח אפליקציה</p>
</header>

<main class="stage" id="stage">
  <div class="scaler" id="scaler">
    <div class="device" id="deviceEl">
      <div class="buttons">
        <i class="btn-silent"></i><i class="btn-vol-up"></i>
        <i class="btn-vol-dn"></i><i class="btn-power"></i>
      </div>
      <div class="screen" id="screen">
        <iframe id="frame" title="iPhone screen" allow="microphone"></iframe>
        <div class="chrome" id="chrome">
          <div class="cutout" id="cutout"></div>
          <div class="statusbar" id="statusbar">
            <span class="sb-time" id="clock">9:41</span>
            <span class="sb-icons" id="sbIcons"></span>
          </div>
          <div class="indicator" id="indicator"></div>
        </div>
      </div>
      <div class="homebutton" id="homebutton"></div>
    </div>
  </div>
  <div class="readout" id="readout"></div>
</main>

<script type="text/plain" id="appdoc">${appDocB64}</script>
<script>
${assertInlinable('shell script', shellJs)}
</script>`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'simulator.html'), page, 'utf8');

const kb = (Buffer.byteLength(page, 'utf8') / 1024).toFixed(0);
console.log(`dist/simulator.html  ${kb} KB`);
