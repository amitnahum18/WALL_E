# סימולטור אייפון

מסך בית של אייפון שרץ בדפדפן בתוך מסגרת מכשיר. בלי Node, בלי npm, בלי build.

## הפעלה

לחיצה כפולה על `index.html`.

אם תוסיף בהמשך `fetch`, ES modules או Service Worker — הדפדפן חוסם אותם ב-`file://`,
ואז תריץ שרת מקומי:

```powershell
.\serve.ps1          # http://localhost:5173
```

## מה עובד במכשיר

**מסך הבית** — שני עמודים, 32 אפליקציות, דוק, נקודות עמוד, פס Search.
החלקה בין עמודים בגרירת עכבר עם snap. לחיצה על אייקון פותחת את האפליקציה
באנימציית הזום של iOS. חזרה: החלקה מהקצה התחתון, `Esc`, או כפתור Home.
אייקון Clock עם מחוגים חיים ואייקון Calendar עם התאריך של היום.

### אפליקציות עובדות

| אפליקציה | מה עובד |
|---|---|
| **Calculator** | מחשבון מלא — שרשור פעולות, `%`, `+/−`, AC/C, הדגשת אופרטור, וגם מקלדת פיזית |
| **Messages** | רשימת שיחות → שיחה עם בועות, שליחה אמיתית, נקודות הקלדה ותשובה חוזרת. נשמר בין רענונים |
| **Settings** | רשימות מקובצות, מתגים עובדים, ניווט לעומק (Wi-Fi, General, About). Display & Brightness מחליף ערכה באמת |
| **Weather** | מזג אוויר נוכחי, רצועת שעות אופקית, תחזית 10 ימים עם פסי טמפרטורה, אריחי פירוט |
| **Photos** | ספרייה בגריד 3 טורים, מציג תמונה מלא עם רצועת תצוגה מקדימה, For You, אלבומים, חיפוש |
| **Clock** | ארבע לשוניות. שעון עולמי עם זמנים אמיתיים, סטופר עובד עם הקפות, טיימר עם ספירה לאחור |
| **Notes** | רשימה → עורך אמיתי. כל מה שתכתוב נשמר ב-localStorage |
| **Phone** | מועדפים, שיחות אחרונות, אנשי קשר, ומקלדת חיוג עובדת |
| **Mail** | תיבת דואר עם סימוני נקרא/לא-נקרא → מסך הודעה עם גוף מלא וסרגל פעולות |
| **Calendar** | תצוגת חודש עם נקודות אירועים, ניווט בין חודשים, ולוח הזמנים של היום הנבחר |
| **Music** | ספרייה, מיני-נגן, ומסך Now Playing עם סרגל התקדמות שבאמת רץ |
| **Maps** | מפת רחובות שנוצרת פרוצדורלית, מסלול, סיכת יעד, וגיליון תחתון עם ETA |
| **Loop** | רשת חברתית — סטוריז, פיד, לייקים ושמירות שנשמרים |
| **WALL·E** | מילת זימון שרצה on-device, מיקרופון, ותמלול. ראה סעיף משלו למטה |

14 אפליקציות עובדות. השאר נפתחות למסך ממלא-מקום עד שתכתוב להן קובץ ב-`screens/`.

**ניווט:** מסכים נדחפים ונשלפים עם אנימציית ה-slide של iOS, כולל גרירה
מהקצה השמאלי כדי לחזור אחורה.

## WALL·E — מילת זימון, מיקרופון, תמלול

השלב הראשון של העוזר הקולי. הצינור נעצר בטקסט על המסך: אין Screen Capture,
אין Agent ואין LLM.

```
"בלה בלה..."        → שום דבר. Porcupine מחפש רק את השם, on-device, ב-WebAssembly.
"Hi WALL·E"         → 🔴 ביפ, והמיקרופון עובר לתמלול.
"what's on tomorrow?" → STT → הטקסט נכנס ליומן התמלולים.
```

התמלול באנגלית (`en-US`) כברירת מחדל. עברית ואנגלית בריטית זמינות ב-Settings.

**חובה להריץ דרך שרת.** `getUserMedia` חסום ב-`file://`:

```powershell
.\serve.ps1        # http://localhost:5173
```

### הפעלה

1. פתח את אפליקציית **WALL·E** ולחץ על הכדור — זה מצב Push-to-talk, שעובד מיד
   בלי שום מפתח. התמלול מופיע חי ואז נשמר.
2. למילת זימון צריך **AccessKey** חינמי מ-`console.picovoice.ai`. הדבק אותו
   ב-Settings שבתוך האפליקציה (נשמר ב-localStorage בלבד, לא בקוד), והדלק את
   המתג **Wake word**.
3. ברירת המחדל היא המילה המובנית `Computer`. ל-"Hi WALL·E" אמיתי: אמן את המילה
   בקונסולה של Picovoice בפלטפורמת **Web (WASM)**, שים את ה-`.ppn` ב-
   `app/voice/models/hi-walle.ppn`, ובחר **Custom** ברשימת ה-KEYWORD.

מודל השפה `porcupine_params.pv` נמשך אוטומטית מ-jsDelivr. אם תשים עותק מקומי ב-
`app/voice/models/` — הוא יועדף.

### כוונון

מסך האפליקציה סופר זיהויים, false-positives, זמן זימון→הקלטה וזמן תמלול.
מחוון ה-Sensitivity ב-Settings נכנס לתוקף בהדלקה הבאה של המתג. הדרך למדוד:
עשר אמירות של מילת הזימון מול חמש דקות של שיחה רגילה ברקע.

### מגבלות

* התמלול הוא Web Speech API — **Chrome בלבד**, והאודיו שאחרי הזימון עובר בשרתי
  Google. לפני הזימון שום אודיו לא יוצא מהמכשיר.
* בגרסה המאוגדת (`dist/simulator.html`) סקריפטי ה-CDN של Picovoice מושמטים,
  ולכן שם נשאר רק Push-to-talk.
* להחלפת מנוע התמלול (למשל Whisper) יש לגעת רק ב-`app/voice/stt.js`.

## גרסה לשיתוף

```bash
node build.mjs        # -> dist/simulator.html, קובץ יחיד
```

מאגד את כל הקבצים לקובץ HTML אחד שאפשר להעלות לכל מקום.
מסך הטלפון נשאר ב-iframe (הוא צריך viewport משלו), אבל נטען מ-`srcdoc`.

## סרגל הכלים

| פקד | מה הוא עושה |
|---|---|
| **מכשיר** | iPhone 15 Pro / Pro Max / 13 mini / SE, Pixel 8, Galaxy S24 / A54, iPad mini |
| **זום** | התאמה אוטומטית לגובה החלון, או אחוז קבוע |
| **סיבוב** | מעבר לרוחב. קיצור: `Ctrl+←` / `Ctrl+→` |
| **ערכה** | מצב כהה/בהיר — עובר גם לאפליקציה |
| **רענון** | טעינה מחדש. קיצור: `R` |
| **Live** | רענון אוטומטי בכל חזרה לחלון הדפדפן, עם שמירת מיקום הגלילה |
| **שורת הנתיב** | טוען כל קובץ או כתובת בתוך המכשיר |

## מבנה

```
index.html            מעטפת הסימולטור
simulator/
  devices.js          רשימת המכשירים
  frame.css           עיצוב המסגרת
  sim.js              הלוגיקה
app/                  ★ כאן אתה כותב
  index.html          שלד מסך הבית
  apps.js             ★ קטלוג האפליקציות והאייקונים
  main.js             springboard: בנייה, החלקה, פתיחת אפליקציה
  style.css           מסך הבית
  ui.js / ui.css      ★ ערכת ה-UI של iOS + מחסנית הניווט
  screens.css         עיצוב פרטני לכל אפליקציה
  screens/            ★ קובץ אחד לכל אפליקציה
    calculator.js  messages.js  settings.js  weather.js
    photos.js      clock.js     notes.js     phone.js
  voice/              צינור הקול של WALL·E
    wake.js           מילת הזימון (Porcupine, on-device)
    stt.js            דיבור לטקסט (Web Speech)
    engine.js         מכונת המצבים ובעלות על המיקרופון
    models/           porcupine_params.pv, hi-walle.ppn
  sim-bridge.js       הגשר לסימולטור — אל תמחק
```

## כתיבת אפליקציה חדשה

צור `app/screens/mail.js`, הוסף אותו ל-`index.html`, ורשום מסך בשם
שזהה ל-`name` שבקטלוג:

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

הכלים שעומדים לרשותך ב-`ui.js`:

| | |
|---|---|
| `UI.row({...})` | שורת רשימה: `label`, `sub`, `value`, `icon`, `iconBg`, `right`, `strong`, `onTap` |
| `UI.group(rows, {title, note})` | קבוצת שורות בסגנון inset grouped |
| `UI.switchEl(on, cb)` | מתג iOS |
| `UI.tabs(items, active, cb)` | סרגל לשוניות תחתון |
| `UI.searchField(text)` | שדה חיפוש |
| `UI.store(k, def)` / `UI.save(k, v)` | שמירה מתמשכת ב-localStorage |
| `nav.push(view)` / `nav.pop()` | ניווט עם אנימציה |
| `ctx.setStatusBar(s)` / `ctx.close()` | שליטה בשורת הסטטוס וסגירת האפליקציה |

`view` תומך ב-`title`, `large: false`, `transparent: true`, `bodyClass`,
`rightAction`, `leftAction`, ו-`build(body, nav, screen)`.
אם המסך פותח טיימרים, נקה אותם ב-`screen.addEventListener('screen:teardown', ...)`.

## הוספת אפליקציה

ב-[app/apps.js](app/apps.js), הוסף אובייקט ל-`PAGE_1`, `PAGE_2` או `DOCK`:

```js
{ name: 'My App',
  bg:   'linear-gradient(#7ad3ff,#0a6bf5)',   // רקע האייקון
  mode: 'stroke',                             // 'stroke' או 'fill'
  fg:   '#fff',                               // צבע הסמל
  icon: '<path d="M4 6h16M4 12h16"/>',        // SVG פנימי, viewBox 0 0 24 24
  rows: ['First row', 'Second row'] }         // המסך שנפתח בלחיצה
```

## קישורים ישירים

```
app/index.html#app=Mail                    פותח את Mail מיד
index.html?device=pixel-8                  נטען עם מכשיר אחר
index.html?url=app%2Findex.html%23app=Maps מסך מסוים בתוך המסגרת
```

## מה הגשר נותן לקוד שלך

משתני CSS של האזורים הבטוחים:

```css
.appbar { padding-top:    var(--sat); }   /* דיינמיק איילנד / נאטש */
.tabbar { padding-bottom: var(--sab); }   /* פס הבית */
.content{ padding-inline: var(--sal) var(--sar); }
```

מאפיינים על `<html>`: `data-platform` (`ios`/`android`), `data-theme`, `data-orientation`.

וב-JS:

```js
window.sim.setStatusBar('light');   // או 'dark'

window.addEventListener('sim:config', (e) => {
  const { platform, deviceName, theme, orientation, safe } = e.detail;
});
```

## הוספת מכשיר

ב-[simulator/devices.js](simulator/devices.js):

```js
{ id: 'my-phone', name: 'My Phone', platform: 'android',
  width: 400, height: 880, bezel: 11, radius: 36,
  notch: 'hole',                 // 'island' | 'notch' | 'hole' | 'none'
  safe: { top: 32, bottom: 24 },
  homeIndicator: true }
```
