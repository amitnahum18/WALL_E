/* ===========================================================
   apps.js — the app catalog.

   To add an app, drop an object into a page array (or DOCK):

     { name: 'Notes',
       bg:   'linear-gradient(#ffd85e,#ffb800)',   // icon background
       mode: 'stroke' | 'fill',                    // how the glyph is drawn
       fg:   '#fff',                               // glyph colour
       icon: '<path d="..."/>',                    // inner SVG, viewBox 0 0 24 24
       rows: ['Row one', 'Row two'] }              // the screen it opens

   `custom` renders a hand-drawn icon instead:
   calendar / photos / clock / reminders.
   =========================================================== */

const GEAR_OUT = 'M13.9 2.6h-3.8l-.4 2.5a7.4 7.4 0 0 0-1.8 1.1L5.5 5.1 3.6 8.4l2 1.6a7.4 7.4 0 0 0 0 2.1l-2 1.6 1.9 3.3 2.4-1.1c.5.4 1.1.8 1.8 1.1l.4 2.5h3.8l.4-2.5c.7-.3 1.3-.7 1.8-1.1l2.4 1.1 1.9-3.3-2-1.6a7.4 7.4 0 0 0 0-2.1l2-1.6-1.9-3.3-2.4 1.1a7.4 7.4 0 0 0-1.8-1.1l-.4-2.5Z';
const GEAR_IN  = 'M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z';

const ICON = {
  facetime : '<path d="M4 6.6A2.6 2.6 0 0 1 6.6 4h5A2.6 2.6 0 0 1 14.2 6.6v10.8A2.6 2.6 0 0 1 11.6 20h-5A2.6 2.6 0 0 1 4 17.4V6.6Z"/><path d="m15.8 10.3 4.2-2.8v9l-4.2-2.8z"/>',
  camera   : '<path d="M3 8.8A2.8 2.8 0 0 1 5.8 6h1.5l1-1.9h7.4l1 1.9h1.5A2.8 2.8 0 0 1 21 8.8v8.4A2.8 2.8 0 0 1 18.2 20H5.8A2.8 2.8 0 0 1 3 17.2Z"/><circle cx="12" cy="13.2" r="4"/>',
  mail     : '<rect x="2.5" y="5" width="19" height="14" rx="3.2"/><path d="m3.6 7.2 8.4 5.9 8.4-5.9"/>',
  maps     : '<path d="M9 3.4 3.6 5.6v15l5.4-2.2 6 2.2 5.4-2.2v-15L15 5.6 9 3.4Z"/><path d="M9 3.4v15M15 5.6v15"/>',
  weather  : '<circle cx="9.2" cy="8.4" r="3"/><path d="M9.2 2.4v1.5M9.2 12.9v1.5M15.2 8.4h-1.5M4.7 8.4H3.2M13.5 4.1l-1.1 1.1M6 11.6 4.9 12.7M13.5 12.7l-1.1-1.1M6 5.2 4.9 4.1"/><path d="M9.4 20.4h8.2a3.1 3.1 0 0 0 .3-6.2 4.2 4.2 0 0 0-8-.9 3.5 3.5 0 0 0-.5 7.1Z"/>',
  notes    : '<rect x="4.2" y="3" width="15.6" height="18" rx="2.6"/><path d="M7.8 8.6h8.4M7.8 12.4h8.4M7.8 16.2h5"/>',
  stocks   : '<path d="M3 16.8 8.2 11l3.4 3.4L21 5"/><path d="M15.4 5H21v5.6"/>',
  appstore : '<path d="M5.4 17.6 11 6.6"/><path d="M18.6 17.6 13 6.6"/><path d="M8.6 12.6h6.8"/><path d="M4 17.6h4M16 17.6h4"/>',
  settings : '<path fill-rule="evenodd" d="' + GEAR_OUT + GEAR_IN + '"/>',
  health   : '<path d="M12 20.4S3.8 15.6 3.8 9.9a4.4 4.4 0 0 1 8.2-2.3A4.4 4.4 0 0 1 20.2 9.9c0 5.7-8.2 10.5-8.2 10.5Z"/>',
  wallet   : '<rect x="2.6" y="6.4" width="18.8" height="12.4" rx="3"/><path d="M2.6 10.6h18.8"/><path d="M6.2 6.4 8 3.6h8l1.8 2.8"/>',
  podcasts : '<circle cx="12" cy="9.2" r="2.4"/><path d="M8.3 13.4a5.2 5.2 0 1 1 7.4 0"/><path d="M5.6 16.6a9 9 0 1 1 12.8 0"/><path d="M10.4 14.6h3.2l-.9 6.2h-1.4l-.9-6.2Z"/>',
  tv       : '<rect x="2.6" y="4.6" width="18.8" height="13" rx="2.8"/><path d="M8.4 20.6h7.2"/>',
  files    : '<path d="M3 7.4A2.4 2.4 0 0 1 5.4 5h3.4l2 2.4h7.8A2.4 2.4 0 0 1 21 9.8v7.8A2.4 2.4 0 0 1 18.6 20H5.4A2.4 2.4 0 0 1 3 17.6V7.4Z"/>',
  calc     : '<rect x="4.4" y="2.8" width="15.2" height="18.4" rx="2.6"/><path d="M7.8 7.4h8.4"/><path d="M8.4 12.4h1.2M11.4 12.4h1.2M14.4 12.4h1.2M8.4 16.6h1.2M11.4 16.6h1.2M14.4 16.6h1.2"/>',
  books    : '<path d="M12 6.4C10.2 4.9 7.6 4.4 4.4 4.6v13c3.2-.2 5.8.3 7.6 1.8 1.8-1.5 4.4-2 7.6-1.8v-13c-3.2-.2-5.8.3-7.6 1.8Z"/><path d="M12 6.4v13"/>',
  fitness  : '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="2.4"/>',
  home     : '<path d="M3.4 10.6 12 3.6l8.6 7"/><path d="M5.8 9.2V20h12.4V9.2"/><path d="M10 20v-5.4h4V20"/>',
  shortcut : '<path d="M4 8.4h7.6a4 4 0 0 1 4 4V17"/><path d="m12.6 13.6 3 3.4 3-3.4"/><path d="M20 15.6h-7.6a4 4 0 0 1-4-4V7"/><path d="m11.4 10.4-3-3.4-3 3.4"/>',
  translate: '<path d="M3.4 6.2h8.4M7.6 4.2v2M9.8 6.2c-.6 4.4-3.2 7.6-6.4 9M6 10.6c1 2.4 3 4.2 5.6 5"/><path d="m12.8 20 4-10 4 10M14.2 17h5.2"/>',
  loop     : '<path d="M8.4 15.8a3.8 3.8 0 1 1 0-7.6c2.5 0 3.5 1.9 3.6 3.8.1 1.9 1.1 3.8 3.6 3.8a3.8 3.8 0 1 0 0-7.6c-2.5 0-3.5 1.9-3.6 3.8"/>',
  voice    : '<rect x="9" y="2.8" width="6" height="10.8" rx="3"/><path d="M5.6 12a6.4 6.4 0 0 0 12.8 0"/><path d="M12 18.4v2.8"/>',
  walle    : '<circle cx="12" cy="12" r="8.6"/><path d="M7.4 10.2v3.6M9.7 7.8v8.4M12 9.6v4.8M14.3 7.2v9.6M16.6 10.6v2.8"/>',
  contacts : '<rect x="3.4" y="4" width="17.2" height="16" rx="3"/><circle cx="11" cy="10.6" r="2.7"/><path d="M6.6 17.4a4.7 4.7 0 0 1 8.8 0"/>',
  compass  : '<circle cx="12" cy="12" r="8.6"/><path d="m15.8 8.2-5.4 2.2-2.2 5.4 5.4-2.2 2.2-5.4Z"/>',
  measure  : '<rect x="2.6" y="7.6" width="18.8" height="8.8" rx="2.2"/><path d="M6.8 7.6v3.4M10.4 7.6v4.8M14 7.6v3.4M17.6 7.6v4.8"/>',
  freeform : '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.8"/><path d="M7.4 15.6c1.4-4.6 4-6.6 5.8-4s3.4 1 3.4-1.8"/>',
  journal  : '<path d="M6.6 3.4h10.8a1.8 1.8 0 0 1 1.8 1.8v13.6a1.8 1.8 0 0 1-1.8 1.8H6.6a1.8 1.8 0 0 1-1.8-1.8V5.2a1.8 1.8 0 0 1 1.8-1.8Z"/><path d="M9.2 3.4v17.2"/>',
  tips     : '<path d="M12 3.4a5.6 5.6 0 0 0-3.2 10.2c.7.5 1.1 1.3 1.1 2.1v.7h4.2v-.7c0-.8.4-1.6 1.1-2.1A5.6 5.6 0 0 0 12 3.4Z"/><path d="M10 19h4M10.8 21h2.4"/>',
  news     : '<path d="M6.8 18.6V5.4l10.4 13.2V5.4"/>',
  phone    : '<path d="M6.6 3.4c1 0 1.6.5 2 1.4l1.2 2.8c.4.9.2 1.7-.5 2.3l-1 .8a12 12 0 0 0 4.9 4.9l.8-1c.6-.7 1.4-.9 2.3-.5l2.8 1.2c.9.4 1.4 1 1.4 2v2.2c0 1.4-1 2.3-2.5 2.2C9.4 21.1 2.9 14.6 2.4 5c-.1-1.5.8-2.5 2.2-2.5h2Z"/>',
  safari   : '<circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-5.6 2-2 5.6 5.6-2 2-5.6Z"/>',
  messages : '<path d="M12 3.6c5 0 9 3.4 9 7.7 0 4.2-4 7.6-9 7.6-.9 0-1.8-.1-2.6-.3l-4.6 1.8 1.3-3.6C4 15.4 3 13.4 3 11.3c0-4.3 4-7.7 9-7.7Z"/>',
  music    : '<path d="M9.4 17.4V6.6l9.2-2v10.2"/><ellipse cx="7" cy="17.6" rx="2.6" ry="2.2"/><ellipse cx="16.2" cy="15.2" rx="2.6" ry="2.2"/>',
};

/* ---------- Page 1 ---------- */
const PAGE_1 = [
  { name: 'WALL·E', bg: 'linear-gradient(140deg,#7ae0ff,#0a6bf5 55%,#5b2ff7)', icon: ICON.walle,
    rows: ['Wake word', 'Push to talk', 'Transcripts', 'Settings'] },
  { name: 'FaceTime', bg: 'linear-gradient(#5df07a,#0fbf3f)', mode: 'fill', icon: ICON.facetime,
    rows: ['Amit Nahum', 'Dana Levi', 'Yoav Cohen', 'Family group'] },
  { name: 'Calendar', custom: 'calendar',
    rows: ['09:00  Standup', '11:30  Design review', '14:00  1:1 with Dana', '17:00  Deploy window'] },
  { name: 'Photos', custom: 'photos',
    rows: ['Recents  ·  2,481', 'Favourites  ·  96', 'Screenshots  ·  310', 'Selfies  ·  74'] },
  { name: 'Camera', bg: 'linear-gradient(#6f6f76,#3a3a40)', icon: ICON.camera,
    rows: ['Photo', 'Video', 'Portrait', 'Panorama'] },

  { name: 'Mail', bg: 'linear-gradient(#4cc3ff,#0a6bf5)', icon: ICON.mail,
    rows: ['Inbox  ·  12', 'VIP', 'Flagged  ·  3', 'Drafts  ·  1'] },
  { name: 'Notes', bg: 'linear-gradient(#fff3c4,#ffd426)', fg: '#8a6a00', icon: ICON.notes,
    rows: ['Shopping list', 'Meeting notes', 'Ideas', 'Passwords hint'] },
  { name: 'Reminders', custom: 'reminders',
    rows: ['Today  ·  4', 'Scheduled  ·  9', 'Flagged  ·  1', 'All  ·  27'] },
  { name: 'Clock', custom: 'clock',
    rows: ['World Clock', 'Alarm  ·  07:00', 'Stopwatch', 'Timer'] },

  { name: 'Maps', bg: 'linear-gradient(#8fe3a0,#3fb2f0)', icon: ICON.maps,
    rows: ['Home  ·  18 min', 'Work  ·  32 min', 'Recents', 'Guides'] },
  { name: 'Weather', bg: 'linear-gradient(#4aa8ff,#0a58c8)', icon: ICON.weather,
    rows: ['Tel Aviv  ·  27°', 'London  ·  16°', 'New York  ·  21°', 'Tokyo  ·  29°'] },
  { name: 'Stocks', bg: 'linear-gradient(#3a3a3c,#111114)', icon: ICON.stocks,
    rows: ['AAPL  +1.24%', 'MSFT  +0.68%', 'NVDA  −0.42%', 'TSLA  +2.11%'] },
  { name: 'App Store', bg: 'linear-gradient(#3ec6ff,#0a67f0)', icon: ICON.appstore,
    rows: ['Today', 'Games', 'Apps', 'Updates  ·  6'] },

  { name: 'Health', bg: 'linear-gradient(#ffffff,#f0f0f2)', fg: '#ff2d55', mode: 'fill', icon: ICON.health,
    rows: ['Steps  ·  8,412', 'Sleep  ·  7h 12m', 'Heart rate  ·  62 bpm', 'Workouts  ·  3'] },
  { name: 'Wallet', bg: 'linear-gradient(#3a3a3c,#0d0d10)', icon: ICON.wallet,
    rows: ['Visa  ···· 4417', 'Transit card', 'Boarding pass', 'Loyalty  ·  4'] },
  { name: 'Settings', bg: 'linear-gradient(#c2c6cd,#7d8794)', mode: 'fill', icon: ICON.settings,
    rows: ['Wi-Fi  ·  Home_5G', 'Bluetooth  ·  On', 'Display & Brightness', 'General'] },
  { name: 'Podcasts', bg: 'linear-gradient(#c76bff,#7b2ff7)', icon: ICON.podcasts,
    rows: ['Listen Now', 'Library  ·  18', 'Downloaded  ·  5', 'Browse'] },

  { name: 'TV', bg: 'linear-gradient(#2c2c2e,#000000)', icon: ICON.tv,
    rows: ['Watch Now', 'Up Next  ·  4', 'Library', 'Store'] },
  { name: 'Files', bg: 'linear-gradient(#5ec2ff,#1878f0)', icon: ICON.files,
    rows: ['iCloud Drive', 'On My iPhone', 'Recents', 'Shared'] },
  { name: 'Calculator', bg: 'linear-gradient(#4a4a4e,#141417)', icon: ICON.calc,
    rows: ['Standard', 'Scientific', 'History', 'Unit conversion'] },
  { name: 'Books', bg: 'linear-gradient(#ffb15c,#f26a1b)', icon: ICON.books,
    rows: ['Reading Now', 'Library  ·  42', 'Want to Read  ·  11', 'Audiobooks'] },

  { name: 'Fitness', bg: 'linear-gradient(#2c2c2e,#000000)', fg: '#c8ff4d', icon: ICON.fitness,
    rows: ['Move  ·  420 / 600 kcal', 'Exercise  ·  24 / 30 min', 'Stand  ·  9 / 12 h', 'Trends'] },
  { name: 'Home', bg: 'linear-gradient(#ffd08a,#f0932b)', icon: ICON.home,
    rows: ['Living room  ·  2 lights on', 'Thermostat  ·  22°', 'Front door  ·  Locked', 'Cameras  ·  3'] },
  { name: 'Shortcuts', bg: 'linear-gradient(#ff7ab8,#8b5cf6)', icon: ICON.shortcut,
    rows: ['Morning routine', 'Drive home', 'Low power mode', 'Scan document'] },
  { name: 'Loop', bg: 'linear-gradient(140deg,#f9d423 0%,#ff4e8b 45%,#7b2ff7 100%)', icon: ICON.loop,
    rows: ['Feed', 'Explore', 'Activity', 'Profile'] },
];

/* ---------- Page 2 ---------- */
const PAGE_2 = [
  { name: 'Voice Memos', bg: 'linear-gradient(#3a3a3c,#131316)', fg: '#ff453a', icon: ICON.voice,
    rows: ['New Recording 4', 'Interview', 'Song idea', 'All Recordings  ·  23'] },
  { name: 'Contacts', bg: 'linear-gradient(#ffffff,#eceef1)', fg: '#7a8290', icon: ICON.contacts,
    rows: ['All Contacts  ·  214', 'Groups  ·  6', 'Recently added', 'My Card'] },
  { name: 'Compass', bg: 'linear-gradient(#2c2c2e,#000000)', icon: ICON.compass,
    rows: ['Heading  ·  312° NW', 'Elevation  ·  54 m', 'Coordinates', 'Level'] },
  { name: 'Measure', bg: 'linear-gradient(#4a4a4e,#141417)', icon: ICON.measure,
    rows: ['Measure', 'Level', 'History', 'Units  ·  Metric'] },

  { name: 'Freeform', bg: 'linear-gradient(#ffffff,#eef1f5)', fg: '#2a8cf0', icon: ICON.freeform,
    rows: ['Roadmap board', 'Sprint 14', 'Sketches', 'Shared with me  ·  2'] },
  { name: 'Journal', bg: 'linear-gradient(#ffffff,#f2eef7)', fg: '#b06ae0', icon: ICON.journal,
    rows: ['Today', 'This week  ·  4 entries', 'Bookmarked', 'Reflections'] },
  { name: 'Tips', bg: 'linear-gradient(#ffdf6b,#ffab00)', icon: ICON.tips,
    rows: ['Get started', 'Camera tricks', 'Battery life', 'What is new'] },
  { name: 'News', bg: 'linear-gradient(#ffffff,#f6eef0)', fg: '#fa2d48', icon: ICON.news,
    rows: ['Today', 'News+', 'Sports', 'Following  ·  12'] },
  { name: 'Translate', bg: 'linear-gradient(#4fb3ff,#1160e0)', icon: ICON.translate,
    rows: ['English → Hebrew', 'Conversation', 'Favourites  ·  7', 'Downloaded languages'] },
];

/* ---------- Dock ---------- */
const DOCK = [
  { name: 'Phone', bg: 'linear-gradient(#5df07a,#0fbf3f)', mode: 'fill', icon: ICON.phone,
    rows: ['Favourites', 'Recents  ·  8', 'Contacts  ·  214', 'Keypad'] },
  { name: 'Safari', bg: 'linear-gradient(#f2f6fa,#cfe3f5)', fg: '#1a7ef0', icon: ICON.safari,
    rows: ['Favourites', 'Reading List  ·  6', 'Bookmarks', 'Private  ·  2 tabs'] },
  { name: 'Messages', bg: 'linear-gradient(#68ef7d,#12c93c)', mode: 'fill', icon: ICON.messages,
    rows: ['Dana Levi  ·  2', 'Yoav Cohen', 'Work group  ·  5', 'Noa Barak'] },
  { name: 'Music', bg: 'linear-gradient(#ff5f7a,#f5195b)', mode: 'fill', icon: ICON.music,
    rows: ['Listen Now', 'Radio', 'Library  ·  1,204', 'Search'] },
];

window.APP_PAGES = [PAGE_1, PAGE_2];
window.APP_DOCK  = DOCK;
