# iPhone Simulator

An iPhone home screen that runs in the browser inside a device frame.
No Node, no npm, no build step.

## Running it

Double-click `index.html`.

If you later add `fetch`, ES modules or a Service Worker, the browser blocks
them on `file://` — then run a local server instead:

```powershell
.\serve.ps1          # http://localhost:5173
```

## What works on the device

**The home screen** — two pages, 32 apps, a dock, page dots, a Search pill.
Swipe between pages by dragging with the mouse, with snapping. Tapping an icon
opens the app with the iOS zoom animation. To go back: swipe from the bottom
edge, press `Esc`, or use the Home button. The Clock icon has live hands and
the Calendar icon shows today's date.

### Working apps

| App | What works |
|---|---|
| **Calculator** | A full calculator — chained operations, `%`, `+/−`, AC/C, operator highlighting, and the physical keyboard too |
| **Messages** | Conversation list → a thread with bubbles, real sending, typing dots and a reply coming back. Survives refreshes |
| **Settings** | Grouped lists, working switches, navigation in depth (Wi-Fi, General, About). Display & Brightness really does change the theme |
| **Weather** | Current conditions, a horizontal hourly strip, a 10-day forecast with temperature bars, detail tiles |
| **Photos** | A 3-column grid library, a full viewer with a filmstrip, For You, albums, search |
| **Clock** | Four tabs. World clock with real times, a working stopwatch with laps, a counting-down timer |
| **Notes** | List → a real editor. Everything you type is kept in localStorage |
| **Phone** | Favourites, recents, contacts, and a working keypad |
| **Mail** | A mailbox with read/unread marks → a message screen with the full body and an action bar |
| **Calendar** | Month view with event dots, navigation between months, and the schedule for the selected day |
| **Music** | Library, mini player, and a Now Playing screen with a progress bar that actually runs |
| **Maps** | A procedurally generated street map, a route, a destination pin, and a bottom sheet with an ETA |
| **Loop** | A social network — stories, feed, likes and saves that persist |
| **WALL·E** | An on-device wake word, the microphone, and transcription. It has its own section below |

14 working apps. The rest open a placeholder screen until you write them a file
in `screens/`.

**Navigation:** screens push and pop with the iOS slide animation, including
dragging from the left edge to go back.

## WALL·E — wake word, microphone, transcript

Stage one of the voice assistant. The pipeline stops at text on screen: no
screen capture, no agent, no LLM.

```
"blah blah..."        → nothing. Porcupine listens only for the name,
                        on-device, in WebAssembly.
"Hi WALL·E"           → 🔴 a beep, and the microphone moves to transcription.
"what's on tomorrow?" → STT → the text lands in the transcript log.
```

Transcription is English (`en-US`) by default. Hebrew and British English are
available in Settings.

**It has to be served.** `getUserMedia` is blocked on `file://`:

```powershell
.\serve.ps1        # http://localhost:5173
```

### Getting it running

1. Open the **WALL·E** app and tap the orb — that is push-to-talk, and it
   works immediately with no key at all. The transcript appears live and is
   then saved.
2. The wake word needs a free **AccessKey** from `console.picovoice.ai`. Paste
   it into Settings inside the app (it is kept in localStorage only, never in
   the source) and turn on the **Wake word** switch.
3. The default is the built-in word `Computer`. For a real "Hi WALL·E": train
   the word in the Picovoice console for the **Web (WASM)** platform, drop the
   `.ppn` at `app/voice/models/hi-walle.ppn`, and pick **Custom** in the
   KEYWORD list.

The language model `porcupine_params.pv` is pulled from jsDelivr automatically.
Put a local copy in `app/voice/models/` and it will be preferred.

### Tuning

The app screen counts detections, false positives, the wake→listening delay and
the transcription time. The Sensitivity slider in Settings takes effect the next
time you turn the switch on. How to measure: ten utterances of the wake word
against five minutes of ordinary conversation in the background.

### Limits

* Transcription is the Web Speech API — **Chrome only**, and the audio after
  the wake word passes through Google's servers. Before the wake word, no
  audio leaves the machine.
* In the bundled build (`dist/simulator.html`) the Picovoice CDN scripts are
  stripped, so only push-to-talk survives there.
* To swap the transcription engine (for Whisper, say) only
  `app/voice/stt.js` has to change.

## A version to share

```bash
node build.mjs        # -> dist/simulator.html, a single file
```

Bundles every file into one HTML file you can upload anywhere. The phone screen
stays in an iframe (it needs a viewport of its own) but is fed from `srcdoc`.

## The toolbar

| Control | What it does |
|---|---|
| **Device** | iPhone 15 Pro / Pro Max / 13 mini / SE, Pixel 8, Galaxy S24 / A54, iPad mini |
| **Zoom** | Fit to the window height, or a fixed percentage |
| **Rotate** | Switch to landscape. Shortcut: `Ctrl+←` / `Ctrl+→` |
| **Theme** | Dark/light — it reaches the app too |
| **Reload** | Load again. Shortcut: `R` |
| **Live** | Auto-reload every time you come back to the browser window, keeping the scroll position |
| **Path box** | Loads any file or URL inside the device |

## Layout

```
index.html            the simulator shell
simulator/
  devices.js          the device list
  frame.css           the frame styling
  sim.js              the logic
app/                  ★ this is where you write
  index.html          the home screen skeleton
  apps.js             ★ the app catalog and the icons
  main.js             springboard: building, swiping, opening an app
  style.css           the home screen
  ui.js / ui.css      ★ the iOS UI kit + the navigation stack
  screens.css         per-app styling
  screens/            ★ one file per app
    calculator.js  messages.js  settings.js  weather.js
    photos.js      clock.js     notes.js     phone.js
  voice/              the WALL·E voice pipeline
    wake.js           the wake word (Porcupine, on-device)
    stt.js            speech to text (Web Speech)
    engine.js         the state machine and microphone ownership
    models/           porcupine_params.pv, hi-walle.ppn
  sim-bridge.js       the bridge to the simulator — do not delete
```

## Writing a new app

Create `app/screens/mail.js`, add it to `index.html`, and register a screen
under exactly the `name` from the catalog:

```js
SCREENS['Mail'] = {
  statusBar: 'auto',                 // 'light' | 'dark' | 'auto'
  mount(nav, ctx) {
    nav.push({
      title: 'Inbox',
      build(body, nav, screen) {
        body.appendChild(UI.group([
          UI.row({ label: 'Primary', value: '12', onTap: () => nav.push({
            title: 'Primary',
            build: (b) => b.appendChild(UI.group([UI.row({ label: 'Hello' })])),
          })}),
          UI.row({ label: 'Notifications', right: UI.switchEl(true, (on) => {}) }),
        ]));
      },
    });
  },
};
```

What `ui.js` gives you:

| | |
|---|---|
| `UI.row({...})` | A list row: `label`, `sub`, `value`, `icon`, `iconBg`, `right`, `strong`, `onTap` |
| `UI.group(rows, {title, note})` | A group of rows in the inset grouped style |
| `UI.switchEl(on, cb)` | An iOS switch |
| `UI.tabs(items, active, cb)` | A bottom tab bar |
| `UI.searchField(text)` | A search field |
| `UI.store(k, def)` / `UI.save(k, v)` | Persistence in localStorage |
| `nav.push(view)` / `nav.pop()` | Navigation with the animation |
| `ctx.setStatusBar(s)` / `ctx.close()` | Control the status bar and close the app |

A `view` supports `title`, `large: false`, `transparent: true`, `bodyClass`,
`rightAction`, `leftAction`, and `build(body, nav, screen)`.
If a screen starts timers, clear them in
`screen.addEventListener('screen:teardown', ...)`.

## Adding an app

In [app/apps.js](app/apps.js), drop an object into `PAGE_1`, `PAGE_2` or `DOCK`:

```js
{ name: 'My App',
  bg:   'linear-gradient(#7ad3ff,#0a6bf5)',   // icon background
  mode: 'stroke',                             // 'stroke' or 'fill'
  fg:   '#fff',                               // glyph colour
  icon: '<path d="M4 6h16M4 12h16"/>',        // inner SVG, viewBox 0 0 24 24
  rows: ['First row', 'Second row'] }         // the screen it opens
```

## Deep links

```
app/index.html#app=Mail                    opens Mail straight away
index.html?device=pixel-8                  loads with a different device
index.html?url=app%2Findex.html%23app=Maps a specific screen inside the frame
```

## What the bridge gives your code

CSS variables for the safe areas:

```css
.appbar { padding-top:    var(--sat); }   /* dynamic island / notch */
.tabbar { padding-bottom: var(--sab); }   /* home indicator */
.content{ padding-inline: var(--sal) var(--sar); }
```

Attributes on `<html>`: `data-platform` (`ios`/`android`), `data-theme`,
`data-orientation`.

And in JS:

```js
window.sim.setStatusBar('light');   // or 'dark'

window.addEventListener('sim:config', (e) => {
  const { platform, deviceName, theme, orientation, safe } = e.detail;
});
```

## Adding a device

In [simulator/devices.js](simulator/devices.js):

```js
{ id: 'my-phone', name: 'My Phone', platform: 'android',
  width: 400, height: 880, bezel: 11, radius: 36,
  notch: 'hole',                 // 'island' | 'notch' | 'hole' | 'none'
  safe: { top: 32, bottom: 24 },
  homeIndicator: true }
```
