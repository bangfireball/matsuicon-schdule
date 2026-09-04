# Matsuricon 2026 Android Schedule

Native Android app generated from the Eventeny schedule export.

## Features

- Offline schedule bundled in `app/src/main/assets/matsuricon_2026_schedule.csv`
- Search by session title, room, track, type, guest, or description
- Day chips for All / Thu / Fri / Sat / Sun
- Clean card-based layout with time, room, track, guests, and descriptions

## Build

Open this folder in Android Studio and run the `app` configuration, or build from a machine with Gradle + Android SDK:

```bash
gradle :app:assembleDebug
```

The debug APK will be created at:

```text
app/build/outputs/apk/debug/app-debug.apk
```
