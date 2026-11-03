# Android setup

1. Install Flutter stable and Android Studio/Android SDK.
2. From `apps/android`, generate the platform folder once: `flutter create --platforms=android --project-name aisyah_android .`.
3. Run `flutter pub get`.
4. Add the Android Firebase configuration file from your own Firebase project.
   Do not commit this file to public repositories.
5. Configure Google sign-in and SHA-1/SHA-256 fingerprints in Firebase.
6. Start the backend on the development computer.
7. For Android Emulator, use `http://10.0.2.2:3000`.
8. For a physical phone, use the computer's LAN IP and ensure firewall rules allow
   the development port only on the trusted local network.
9. Run:
   `flutter run --dart-define=NEXORA_API_BASE_URL=http://10.0.2.2:3000`

The current chat UI is a shell. It intentionally does not fabricate an identity token.
Google sign-in must be implemented and configured before authenticated chat can work.
