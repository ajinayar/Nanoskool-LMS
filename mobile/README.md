# Nanoskool mobile (Flutter)

The Nanoskool LMS v2 app for **students, parents and teachers**. School admins,
partners and Nanoskool admins who sign in see a screen that points them to the
web portal, with a sign-out button.

It talks to the v2 API in `../server` (the source of truth for every endpoint).

## Requirements

- Flutter 3.24 or newer (Dart 3.4+)
- Android Studio / Xcode for emulators and devices

## First-time setup

The repository holds only `lib/`, `test/`, `pubspec.yaml` and
`analysis_options.yaml`. Generate the platform folders once:

```bash
cd mobile
flutter create . --platforms=android,ios --org com.nanoskool --project-name nanoskool
flutter pub get
```

`flutter create .` does not overwrite existing files in `lib/` or `test/`.

### Keep the old app's package id

The previous app was published as `com.nanoskool.nano_skool`. `flutter create`
generates `com.nanoskool.nanoskool`, so change it before the first release
build or Play Store updates will fail:

- **Android**: `android/app/build.gradle` (or `build.gradle.kts`): set
  `namespace` and `defaultConfig.applicationId` to `com.nanoskool.nano_skool`.
  Move `MainActivity.kt` to
  `android/app/src/main/kotlin/com/nanoskool/nano_skool/` and change its
  `package` line to `package com.nanoskool.nano_skool`.
- **iOS**: in Xcode, Runner target > Signing & Capabilities, set the bundle
  identifier to the one the old app used (for example `com.nanoskool.nanoSkool`).

### Android manifest

`flutter create` only adds the INTERNET permission to the debug and profile
manifests. Add it to `android/app/src/main/AndroidManifest.xml` too, above
`<application>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

Also set `android:label="Nanoskool"` on `<application>`.

To open video, PDF and web links on Android 11+, add this inside `<manifest>`
(url_launcher needs it to find a browser):

```xml
<queries>
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="https" />
  </intent>
</queries>
```

For a local API over plain HTTP (the emulator command below), add
`android:usesCleartextTraffic="true"` to `<application>` in
`android/app/src/debug/AndroidManifest.xml` only.

## Run

Start the API (`cd ../server && npm run dev`), then:

```bash
# Android emulator (10.0.2.2 is the host machine)
flutter run --dart-define=API_URL=http://10.0.2.2:4000/api

# iOS simulator
flutter run --dart-define=API_URL=http://localhost:4000/api

# Real device on the same Wi-Fi: use your computer's LAN IP
flutter run --dart-define=API_URL=http://192.168.1.20:4000/api
```

Without `API_URL` the app uses `https://api.nanoskool.in/api`.
`WEB_URL` (default `https://nanoskool.in`) sets the web portal link shown to
admin accounts.

Release build:

```bash
flutter build appbundle --dart-define=API_URL=https://api.nanoskool.in/api --dart-define=WEB_URL=https://<your web portal>
```

Demo accounts (seeded API): student `aarav.gvps`, parent
`parent@demo.nanoskool.in`, teacher `teacher@demo.nanoskool.in`, all with
password `Demo@1234`.

## Checks

```bash
flutter analyze
flutter test
python3 tool/check_dart.py   # bracket/import checks that work without the SDK
```

## Old app assets (optional)

The app draws its logo with Material icons, so it needs no image assets. To
reuse the old artwork, copy the folders from the old app's zip:

```bash
mkdir -p assets
cp -r /path/to/old_app/assets/images assets/images
cp -r /path/to/old_app/assets/icons assets/icons
```

Then uncomment the `assets:` block in `pubspec.yaml`, run `flutter pub get`, and
use them with `Image.asset('assets/images/<file>.png')`. For launcher icons,
replace the files under `android/app/src/main/res/mipmap-*` and
`ios/Runner/Assets.xcassets/AppIcon.appiconset`, or use the
`flutter_launcher_icons` package.

## How it is built

- **No state-management package.** `AuthService` (a `ChangeNotifier`) is exposed
  through `AuthScope` (an `InheritedNotifier`). Screens load data with
  `AsyncView`, which handles loading, error with retry, empty state and
  pull-to-refresh.
- **Auth.** `POST /auth/login` returns an access token (kept in memory) and a
  refresh token (kept in the keychain/keystore via `flutter_secure_storage`).
  On a 401 the client calls `POST /auth/refresh` once, stores the rotated
  refresh token and retries. If refresh fails the app returns to sign-in. If
  `user.mustChangePassword` is set, the change-password screen is shown first.
- **Routing.** `app.dart` picks the home screen from the auth state and role:
  student, parent and teacher shells with bottom navigation; other roles get the
  web-portal screen.

```
lib/
  main.dart, app.dart
  core/       api_client, auth_service, auth_scope, config, lms_api, models, format, theme
  widgets/    AsyncView, EmptyState, ErrorView, ProgressBar/Ring, StatTile, SectionCard, common
  features/
    auth/     splash, login (+ pure LoginForm), forgot password, change password, web-only
    student/  shell, home, courses, tasks (assignments + quizzes), assignment detail, quiz intro/taker/result
    parent/   shell, home (child cards), child detail (progress, assignments, attendance, remarks)
    teacher/  shell, home, classes, class detail, attendance, remarks, assignments, submissions + grading
    shared/   announcements, events, NanoBot chat, profile, course detail, unit viewer, role shell
```

## Known limitations

- Assignment submissions accept text and a link. File upload
  (`POST /uploads?folder=submissions`) needs a file picker plugin, which is not
  included; students can share a Google Drive or Scratch link instead.
- Lesson HTML is rendered with `flutter_widget_from_html_core`, which does not
  play embedded iframes. Videos open in the YouTube app or browser.
- Teachers grade and take attendance here. Creating assignments, quizzes,
  announcements and events is done on the web portal.
