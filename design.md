# Matsuricon 2026 Schedule Android App — Design Notes

## Project Overview

This project is a native Android application for browsing the **MATSURICON 2026** convention schedule. The schedule was extracted from Eventeny and bundled into the app for offline use.

Source schedule URL:

```text
https://www.eventeny.com/share/?s=cvRwNvVY23176
```

Event:

- Name: **MATSURICON 2026**
- Dates: **September 3–6, 2026**
- Timezone: **America/New_York**
- Total extracted sessions: **439**

## Current App Type

The app is a simple native Android app written in Java using standard Android views. It does not currently use Jetpack Compose, Kotlin, or external UI libraries.

The app is designed to work offline by loading a bundled CSV file from Android assets.

## Current Features

### Schedule Browsing

- Displays all extracted schedule sessions.
- Sessions are grouped by date.
- Each session appears as a clean card.
- Cards currently show:
  - Start time
  - End time when available
  - Location / room
  - Session title
  - Track
  - Type / tags
  - Guests when available
  - Description when available

### Search

The search bar filters sessions live as the user types.

Search currently checks:

- Title
- Date
- Day
- Start/end time
- Location
- Track
- Type/tags
- Guests
- Description

### Day Filtering

The app has day chips for:

- All
- Thu 9/3
- Fri 9/4
- Sat 9/5
- Sun 9/6

Selecting a chip filters the visible schedule to that day.

### Offline Data

The app bundles this file:

```text
app/src/main/assets/matsuricon_2026_schedule.csv
```

No network connection is required after installation.

### Build Status

The project builds successfully with Gradle.

Generated debug APK:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Project Structure

```text
Matsuricon/
├── app/
│   ├── build.gradle
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── assets/
│       │   └── matsuricon_2026_schedule.csv
│       ├── java/com/matsuricon/schedule/
│       │   └── MainActivity.java
│       └── res/
│           ├── drawable/
│           │   ├── ic_launcher.xml
│           │   └── ic_launcher_round.xml
│           └── values/
│               ├── colors.xml
│               └── styles.xml
├── build.gradle
├── settings.gradle
├── gradlew
├── gradlew.bat
├── README.md
├── design.md
├── matsuricon_2026_schedule.csv
├── matsuricon_2026_schedule.md
├── matsuricon_2026_schedule_pretty.json
└── matsuricon_2026_schedule_raw.json
```

## Important Source Files

### `MainActivity.java`

Main app screen and all current app logic.

Responsibilities:

- Loads the bundled CSV schedule from assets.
- Parses CSV rows into `Session` objects.
- Builds the UI programmatically.
- Handles live search filtering.
- Handles day chip filtering.
- Renders grouped schedule cards.

### `matsuricon_2026_schedule.csv`

Cleaned schedule export used by the Android app.

Important columns include:

- `id`
- `title`
- `date`
- `day`
- `start_time`
- `end_time`
- `start_iso`
- `end_iso`
- `timezone`
- `location`
- `track`
- `types`
- `guests`
- `status`
- `description`
- `detail_url`

### `matsuricon_2026_schedule_pretty.json`

Readable JSON version of the extracted schedule. Useful for future app rewrites or richer features.

### `matsuricon_2026_schedule_raw.json`

Raw Eventeny response preserved for reference.

## UI Design

Current UI design is a single-screen schedule browser.

### Header

- Purple-to-pink gradient background.
- App title: `Matsuricon 2026`
- Subtitle: `Interactive convention schedule • Sept 3–6`
- Search input in a rounded white field.

### Filters

- Horizontal day chip selector below the header.
- Selected chip uses a purple filled style.
- Unselected chips use white background with purple text.

### Schedule Cards

- White rounded cards on a light background.
- Purple accent text for time and location.
- Bold title.
- Secondary metadata text for track, type, guests, and description.

## Build / Tooling

Gradle was installed locally at:

```text
C:\Users\bangf\.gradle\installs\gradle-8.10.2
```

Gradle wrapper is included, so the project can be built with:

```bash
./gradlew.bat :app:assembleDebug
```

Android SDK location is stored in:

```text
local.properties
```

Current SDK path:

```text
sdk.dir=C:/Users/bangf/AppData/Local/Android/Sdk
```

## Android Configuration

Application ID:

```text
com.matsuricon.schedule
```

App label:

```text
Matsuricon 2026
```

Minimum SDK:

```text
23
```

Target SDK:

```text
35
```

Compile SDK:

```text
36
```

Android Gradle Plugin:

```text
8.6.1
```

Gradle:

```text
8.10.2
```

## Current Limitations

- No favorite / saved-session feature yet.
- No notification reminders yet.
- No calendar export yet.
- No detailed session screen yet; descriptions are shown inline and capped visually.
- No room map.
- No automatic schedule refresh from Eventeny.
- No conflict detection for overlapping sessions.
- Data is static until the bundled CSV is updated and the app is rebuilt.
- UI is built programmatically in Java, not XML or Compose.

## Website Version

A mobile-first static website has been added in:

```text
web/
```

Website features:

- Phone-focused responsive schedule UI.
- Live search.
- Filters for day, location, track, type/tag, and bookmarked-only.
- Bookmarks stored in browser `localStorage`; no accounts or backend required.
- User dashboard showing saved session count, planned days, scheduled hours, and personal agenda.
- Bookmark export/import as JSON.
- Session detail modal with Eventeny source link.
- Docker/Nginx deployment setup.

Important website files:

```text
web/index.html
web/styles.css
web/app.js
web/assets/schedule.json
web/Dockerfile
web/nginx.conf
web/README.md
```

Docker usage:

```bash
cd web
docker build -t matsuricon-2026-web .
docker run --rm -p 8080:80 matsuricon-2026-web
```

Or use Docker Compose, which maps host port `8080` to container port `80`:

```bash
cd web
docker compose up -d --build
```

## Suggested Next Features

1. Add favorites / personal schedule.
2. Add session detail screen.
3. Add filters for location, track, type, and guest.
4. Add local notifications for favorited sessions.
5. Add calendar export.
6. Add schedule update/sync option.
7. Add room map or venue guide.
8. Add dark mode.
9. Convert UI to Jetpack Compose for easier long-term maintenance.
10. Add release signing configuration for Play Store or direct APK distribution.

## Data Refresh Process

To update the schedule in the future:

1. Re-fetch the Eventeny schedule data.
2. Regenerate `matsuricon_2026_schedule.csv`.
3. Copy the updated CSV into:

```text
app/src/main/assets/matsuricon_2026_schedule.csv
```

4. Rebuild the APK:

```bash
./gradlew.bat :app:assembleDebug
```
