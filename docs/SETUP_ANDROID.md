# Android setup

## Create Android platform files

If the Flutter Android platform directory is not present yet:

```bash
cd apps/android
flutter create . --platforms=android
```

Then configure Firebase with FlutterFire CLI:

```bash
dart pub global activate flutterfire_cli
flutterfire configure --platforms=android
```

The command must generate `lib/firebase_options.dart`. Add the Android app in Firebase
using the exact application ID from `android/app/build.gradle` or
`android/app/build.gradle.kts`. Enable Google sign-in and register SHA-1/SHA-256
fingerprints for the debug and release signing certificates.

Then:

```bash
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=NEXORA_API_BASE_URL=http://10.0.2.2:3000
```

For a physical phone, replace `10.0.2.2` with the development computer's LAN IP.
Use HTTPS for non-local environments.

## Firebase configuration

`firebase_options.dart` is generated per Firebase project. It is intentionally not
included in the generic source archive. Do not put service-account private keys in
the Android app. Firebase client configuration is not a substitute for backend token
verification.

## Backend

```bash
cd backend
cp ../.env.example .env
npm install
npm run check
npm test
npm run dev
```

Set `DATABASE_URL` and server-side Firebase Admin credentials in the backend
environment. Never package backend credentials in the APK.


## Phase 4 database and reviewer setup

For a fresh database, apply `database/schema.sql`, then `database/migrations/004_memory_governance.sql`. For an upgraded Phase 1 database, apply 002, 003 and 004 in order. Back up the database before migration 004; it consolidates exact duplicate memories by normalized content hash.

Optionally set `NEXORA_KNOWLEDGE_REVIEWER_UIDS` on the backend to a comma-separated list of trusted Firebase UIDs. Do not expose this setting in the Android app. Without an allowlist, shared-knowledge review endpoints remain forbidden to all users.
