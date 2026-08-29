# אמולטור אנדרואיד — מה מותקן ואיך משתמשים

## מה הותקן

| | |
|---|---|
| **Android Studio 2026.1.3.8** | `C:\Users\amitn\AndroidStudio\android-studio` — קיצור דרך על שולחן העבודה ובתפריט התחל |
| **Android SDK** | `%LOCALAPPDATA%\Android\Sdk` — 3.6GB |
| **מכשיר וירטואלי** | `Pixel8_API35` — Android 15, Google Play |
| **כלים** | `adb`, `emulator`, `platform-tools`, `build-tools 35.0.0`, `platforms;android-35` |
| **JDK** | Temurin 21 שכבר היה אצלך, ועוד JDK 25 מובנה ב-Studio |

`ANDROID_HOME` מוגדר, וה-SDK בנתיב. טרמינל חדש יכיר את `adb` ואת `emulator`.

## חשוב: בעיית המסך

המסך שלך **1536×864**. מסך הטלפון הוא **1080×2400** — כמעט פי 3 בגובה.
האופציה `-scale` הוסרה מהאמולטור, ולכן חלון עצמאי תמיד ייפתח גדול מהמסך.

**הפתרון:** להריץ את האמולטור **מוטמע בתוך Android Studio**, שם הוא מוקטן אוטומטית
לגודל החלונית.

```
Android Studio → Settings → Tools → Emulator
  ☑ Launch in the Running Devices tool window
```

ואז מפעילים את המכשיר מ-**Device Manager** בסרגל הימני. הוא ייפתח בחלונית
*Running Devices* ויתאים את עצמו למקום.

אם בכל זאת תפעיל חלון עצמאי — גרור את פינת החלון כדי להקטין. הגודל נשמר לפעם הבאה.

## הפעלה ראשונה

1. פתח **Android Studio** מקיצור הדרך.
2. באשף הפתיחה בחר **Do not import settings**.
3. כשיגיע לשלב ה-SDK הוא יזהה לבד את `%LOCALAPPDATA%\Android\Sdk` —
   **אל תוריד SDK נוסף**, הכול כבר שם.
4. `Device Manager` → תראה את `Pixel8_API35` → ▶.

## הפעלה משורת פקודה

```powershell
.\android.ps1            # מפעיל וממתין עד שהמכשיר מוכן
.\android.ps1 -Cold      # מתעלם מה-snapshot ומאתחל מאפס
.\android.ps1 -Wipe      # איפוס להגדרות יצרן
.\android.ps1 -Stop      # כיבוי
```

> החלון שנפתח כך יהיה גדול מהמסך. לפיתוח יומיומי עדיף דרך Studio.

## פקודות adb שימושיות

```powershell
adb devices                          # רשימת מכשירים מחוברים
adb install app.apk                  # התקנת אפליקציה
adb shell pm list packages           # מה מותקן
adb shell screencap -p /sdcard/s.png ; adb pull /sdcard/s.png   # צילום מסך
adb logcat                           # לוגים
adb reverse tcp:5173 tcp:5173        # לחשוף שרת מקומי לטלפון
```

השורה האחרונה שימושית: היא מאפשרת לפתוח `http://localhost:5173` ב-Chrome
שבתוך האמולטור, ולראות שרת פיתוח שרץ על המחשב.

## פיתוח

לאפליקציית אנדרואיד מקורית: `File → New → New Project` ב-Studio.
Gradle יורד לבד בבנייה הראשונה. ה-SDK, ה-build-tools וה-JDK כבר מוכנים.

## מה עוד לא נעשה

לא הוקם פרויקט אפליקציה לדוגמה, ולא הותקן Gradle בנפרד — Studio מביא אותו לבד
בבנייה הראשונה.

## הסרה

* Android Studio: מחיקת `C:\Users\amitn\AndroidStudio` + שני קיצורי הדרך
* SDK: מחיקת `%LOCALAPPDATA%\Android\Sdk`
* המכשיר הווירטואלי: מחיקת `%USERPROFILE%\.android\avd`
* משתני סביבה: `ANDROID_HOME`, `ANDROID_SDK_ROOT` ושלוש שורות ב-PATH של המשתמש
