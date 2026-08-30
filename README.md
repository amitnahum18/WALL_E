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

**The home screen** — 34 apps across pages of 24, a dock, page dots, a Search
pill. Like the real thing it only pages sideways and never scrolls up and down,
so the catalog in `apps.js` is reflowed into pages of 24: add a 25th app to a
page and it starts a new one rather than being clipped below the fold.
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

Stage one of the voice assistant. On its own the pipeline stops at text on
screen — the agent that reads that text is a separate process, below.

```
"blah blah..."        → nothing. Porcupine listens only for the name,
                        on-device, in WebAssembly.
"Hi WALL·E"           → 🔴 a beep, and the microphone moves to transcription.
"what's on tomorrow?" → STT → the text lands in the transcript log.
```

Transcription is English (`en-US`) by default. Hebrew and British English are
available in Settings.

### Two ways to recognise the name

Settings → DETECTION picks between them, and they behave very differently.

| | **By sound** (default) | **By transcript** |
|---|---|---|
| How | Porcupine matches the acoustic shape of the word, on-device in WebAssembly | A recogniser runs continuously and the name is matched in the text it produces |
| Setup | A free AccessKey, and training for anything but the built-in words | Nothing. Type the phrase and go |
| The name | One of `Computer`, `Jarvis`, `Picovoice`, `Bumblebee`, `Terminator` — or a trained `.ppn` | Anything you can spell, in any supported language |
| Privacy | No audio leaves the machine until the name is heard | The microphone streams the whole time it is armed |
| Browsers | Anywhere WebAssembly and AudioWorklet run | Chrome only |

By transcript is the fastest way to see the pipeline work end to end, and the
wrong way to ship it — an assistant that uploads everything it hears while
waiting for its name is not really waiting.

Spaces inside a phrase are ignored, so `hi walle` also catches "hi wall e" and
"hiwalle". Recognisers are inconsistent about how they spell an invented name,
so several spellings are accepted by default (`hi walle, hi wally, hey walle,
hey wally`) and the main screen shows a **heard:** line with whatever the
recogniser actually produced — add the spellings you see to the list. If the
command arrives in the same breath ("hi walle, what's on tomorrow") it is taken
straight from that utterance, with no second turn.

**It has to be served.** `getUserMedia` is blocked on `file://`:

```powershell
.\serve.ps1        # http://localhost:5173
```

### Getting it running

1. Open the **WALL·E** app and tap the orb — that is push-to-talk, and it
   works immediately with no key at all. The transcript appears live and is
   then saved.
2. To hear the name with no setup: Settings → DETECTION → **By transcript**,
   then turn on the **Wake word** switch and say "hi walle".
3. For the on-device path, get a free **AccessKey** from
   `console.picovoice.ai` and paste it into Settings (it is kept in
   localStorage only, never in the source). The default word is the built-in
   `Computer`. For a real "Hi WALL·E": train the word in the Picovoice console
   for the **Web (WASM)** platform — its field takes letters and spaces, so
   type `hi wall e` — drop the `.ppn` at `app/voice/models/hi-walle.ppn`, and
   pick **Custom** in the KEYWORD list.

The language model `porcupine_params.pv` is pulled from jsDelivr automatically.
Put a local copy in `app/voice/models/` and it will be preferred.

### What was on the screen when you spoke

Turning on SCREEN → **Capture on wake** opens a screen share once and holds it.
A frame is pulled the instant the name is heard — before the screen has reacted
to anything — and then again during the command, but only when the screen
actually changes. Someone asking a long question may scroll to the thing they
are asking about halfway through. Tap a transcript to see the frames it was
said against.

This is deliberately not a recording, and deliberately not a frame rate. Three
frames a second across a ten second question is thirty images, which is thirty
to forty thousand tokens to a vision model, and almost all of them are the same
picture because a screen rarely moves while someone is talking to it. So the
screen is *sampled* about three times a second — that part is only a canvas
draw — and a frame is *kept* only when a 32×20 grayscale signature says the
scene actually moved. A long question about a still screen costs one image; a
question asked while scrolling costs a handful, capped under FRAMES PER COMMAND.

A rolling video buffer is a small change on top of this if it ever earns its
place.

Frames are held in memory only and the log records that one existed. A
screenshot is far too big for localStorage — a handful would blow the quota and
take the transcripts down with it — so old frames read as "frame expired" after
a reload.

### It keeps listening outside the app

Arming the wake word arms the system, not the screen. Close WALL·E and it is
still listening, so a pill sits under the status bar saying so. It reads at a
glance, and it only ever says three things:

| | |
|---|---|
| **blue dot, no text** | nothing is happening — armed, waiting for its name |
| **red, with text** | listening to you, showing the words as they arrive |
| **blue, with text** | the agent talking back |

Waiting never carries text. If there are words in the pill something is
happening, and the colour says which of the two it is. An answer stays up long
enough to read — longer for a longer answer — and is cleared the moment the
next command starts, because it is no longer the newest thing that happened.

Tapping it opens WALL·E. It disappears the moment you turn the switch off,
which is the only way to stop it.

### A command lasts as long as you talk

The command turn is not on a stopwatch. The recogniser stays continuous and the
turn ends after a stretch of silence — 2 seconds by default, adjustable under
END THE COMMAND AFTER — so a long sentence is never cut in half. A 60 second
ceiling sits behind that as a backstop, and the orb can be tapped to end the
turn early.

A continuous session does not stay healthy indefinitely — after a while it
quietly stops returning results while still looking alive, microphone light and
all, which reads as "listening and doing nothing". So the session is recycled
every 25 seconds while waiting, and never mid-command. If it ever looks deaf
again, the LISTENER panel in the app says when it last heard anything, how many
sessions have been started, and what the last error was.

"Silence" means nothing new was said, not that no events arrived: the recogniser
keeps re-emitting the same interim result while it refines it, and counting
those as speech would hold the turn open forever. Only changed text pushes the
finish line back, and the recogniser's own end-of-speech signal pushes it in
the other direction.

In phrase mode the command is captured by the same session that heard the name,
never by a second recogniser. The name is matched on an interim result, in the
middle of the sentence being spoken, so tearing that session down at the match
would drop the rest of the sentence and lose whatever is said while a
replacement starts. Instead the command is read as "everything after the name",
re-read from the full transcript on every update, which is what makes a long
sentence survive intact.

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
    wake.js           the wake word by sound (Porcupine, on-device)
    phrase.js         the wake word by transcript (no key, always streaming)
    stt.js            speech to text (Web Speech)
    screen.js         one frame of the screen, taken at the wake
    engine.js         the state machine and microphone ownership
    indicator.js      the listening pill, shown system-wide while armed
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

## The agent

Stage one stopped at text on screen. The agent is what reads it.

```powershell
copy agent\.env.example agent\.env     # then put your OpenRouter key in it
.\agent\run.ps1                        # http://127.0.0.1:8077
```

Then in WALL·E → Settings → AGENT, turn on **Send commands to the agent**. The
row above the switch says whether the graph is reachable and which model it is
using. Finished commands are posted to it with their frames, and the answer
appears under the transcript.

### Why a server

The model key lives in the Python process and never reaches the page. That is
the only reason this is a server rather than a `fetch` from the browser: a key
in front-end code is a key you have given away. The bridge is deliberately
one-way and best-effort — the agent being unreachable is a normal state, not an
error state, and the transcript is kept either way.

CORS is restricted to `localhost` and `127.0.0.1`. A process holding an API key
should not be reachable from a page on the internet.

### The graph

```
START → OBSERVE → REASON ─┬→ ANSWER    → END
                          ├→ ASK_USER  → END
                          ├→ DELEGATE  → END
                          └→ EXECUTE → AFTER_ACTION ─┬→ OBSERVE (loop)
                                                     └→ ANSWER → END
```

The loop is the point. A chatbot answers once; an agent looks, decides, acts,
and looks again at what its action did. Keeping that shape from the start means
the automation, research and verification agents drop in later as sub-graphs
behind `delegate` without the core changing.

`execute_action` is mock on purpose: it records what the model asked for and
hands it back. Nothing in the graph can touch a device. Real device control is
a separate layer with its own permission model, and wiring it in before the
loop is trustworthy would be the wrong order.

### Tests

```powershell
python agent\test_agent.py     # the graph, against a stubbed model
python agent\test_server.py    # the HTTP surface the phone calls
```

Both run with no key and no network. They cover the routing, the action loop,
the iteration ceiling, the JSON parsing that decides whether any of it happens,
and the CORS rules.
