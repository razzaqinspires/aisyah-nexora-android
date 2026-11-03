# Panduan Instalasi dan Menjalankan AISYAH / NEXORA — Phase 5

Panduan ini untuk source code, bukan APK siap instal. Jalankan backend dan database di komputer Linux/VPS atau lingkungan pengembangan yang mendukung Node.js dan PostgreSQL. Android/Termux saja bukan lingkungan build Android yang paling andal; untuk membuat APK gunakan komputer dengan Flutter SDK, Android SDK dan Java JDK yang sesuai.

## A. Siapkan alat

Pastikan tersedia:

- Node.js 20 atau lebih baru dan npm.
- PostgreSQL 15+ dengan ekstensi pgvector yang kompatibel.
- Flutter stable, Android SDK dan Java JDK (hanya diperlukan untuk build aplikasi Android).
- Firebase project dengan Google Authentication aktif.
- Ollama atau endpoint chat yang kompatibel dengan OpenAI API.
- Endpoint embedding yang menghasilkan 768 angka per embedding (contoh lokal: `nomic-embed-text` melalui Ollama).

Periksa versi:

```bash
node --version
npm --version
psql --version
flutter --version
java -version
```

Jika perintah `flutter` belum ditemukan, selesaikan instalasi Flutter dan Android SDK terlebih dahulu sebelum melanjutkan bagian Android.

## B. Ekstrak source

Ekstrak `AISYAH_NEXORA_Android_Phase5_v0.5.0.zip`. Masuk ke folder proyek yang berisi `README.md`, `backend/`, `database/`, dan `apps/`:

```bash
cd aisyah-nexora-android
```

Jangan menjalankan perintah dari dalam folder `apps/android` saat mengatur backend atau database.

## C. Siapkan PostgreSQL

Buat database menggunakan akun administrator PostgreSQL. Role runtime akan dibuat setelah migrasi melalui `database/ROLE_SETUP.md`.

```sql
CREATE DATABASE nexora OWNER postgres;
```

Aktifkan ekstensi dan buat schema dengan akun migrasi/admin:

```bash
psql "postgresql://postgres:ADMIN_PASSWORD@localhost:5432/nexora" \
  -v ON_ERROR_STOP=1 -f database/schema.sql
```

Untuk database baru, jalankan migrasi berurutan menggunakan koneksi administrator (bukan role runtime):

```bash
export MIGRATION_DATABASE_URL="postgresql://postgres:ADMIN_PASSWORD@localhost:5432/nexora"
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/002_identity_and_rls.sql
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/003_conversation_memory.sql
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/004_memory_governance.sql
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/005_knowledge_retrieval.sql
```

Catatan: `schema.sql` adalah baseline untuk database baru. Setelah migrasi 004 dan 005 selesai, jalankan blok SQL dari `database/ROLE_SETUP.md` sebagai administrator untuk membuat role `nexora_runtime` dan memberikan grants. Gunakan role tersebut pada backend. Jangan jadikan role runtime sebagai superuser, pemilik tabel yang dilindungi RLS, atau role `BYPASSRLS`. Jangan menjalankan baseline schema berulang kali sebagai pengganti migrasi.

## D. Konfigurasikan backend

```bash
cd backend
cp ../.env.example .env
```

Edit `backend/.env` dan isi sekurangnya:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://nexora_runtime:PASSWORD@127.0.0.1:5432/nexora
GOOGLE_APPLICATION_CREDENTIALS=/path/aman/firebase-service-account.json
LOCAL_LLM_BASE_URL=http://127.0.0.1:11434/v1
LOCAL_LLM_MODEL=llama4:scout
EMBEDDING_BASE_URL=http://127.0.0.1:11434/v1
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSIONS=768
NEXORA_KNOWLEDGE_REVIEWER_UIDS=FIREBASE_UID_REVIEWER
```

Letakkan Firebase service-account JSON di luar repository. Jangan kirim file tersebut ke Git, APK, atau chat. Untuk pengguna Ollama, unduh model chat dan embedding sesuai perangkat/server, misalnya:

```bash
ollama pull llama4:scout
ollama pull nomic-embed-text
```

Pastikan nama model chat yang tersedia benar-benar sesuai dengan `LOCAL_LLM_MODEL`. Jika perangkat tidak mampu menjalankan model tersebut, ganti dengan model yang kompatibel dan sudah diunduh. Jangan mengasumsikan semua perangkat Android mampu menjalankan model besar secara lokal.

Pasang dependensi dan lakukan pemeriksaan:

```bash
npm install
npm run check
node --test test/context-engine.test.js
npm test
```

Jalankan backend:

```bash
npm run dev
```

Di terminal lain, periksa health endpoint:

```bash
curl http://127.0.0.1:3000/health
```

Hasil yang diharapkan adalah JSON dengan `status` bernilai `ok` dan versi `0.5.0`.

## E. Konfigurasikan Firebase Android

Di Firebase Console:

1. Buat/pilih Firebase project.
2. Tambahkan Android app dengan application ID yang sama dengan `applicationId` pada Gradle Android.
3. Aktifkan Authentication → Sign-in method → Google.
4. Tambahkan SHA-1 dan SHA-256 dari signing key debug dan release.
5. Di komputer yang memiliki Flutter SDK, jalankan:

```bash
cd apps/android
flutter create . --platforms=android
dart pub global activate flutterfire_cli
flutterfire configure --platforms=android
flutter pub get
flutter analyze
flutter test
```

Perintah `flutterfire configure` menghasilkan `lib/firebase_options.dart` yang khusus untuk Firebase project milik operator. File itu memang tidak disertakan dalam arsip umum.

## F. Jalankan aplikasi Android

Jika backend dan emulator Android berjalan di komputer yang sama, gunakan alamat emulator Android:

```bash
cd apps/android
flutter run --dart-define=NEXORA_API_BASE_URL=http://10.0.2.2:3000
```

Untuk ponsel fisik, gunakan IP LAN komputer/server backend, misalnya `http://192.168.1.10:3000`, dan pastikan firewall mengizinkan koneksi. Jangan gunakan `127.0.0.1` dari ponsel untuk menunjuk ke komputer. Untuk deployment di internet, gunakan HTTPS dan domain backend.

Build APK debug:

```bash
flutter build apk --debug --dart-define=NEXORA_API_BASE_URL=https://DOMAIN-API-KAMU
```

APK hasil build biasanya berada di `build/app/outputs/flutter-apk/app-debug.apk`. Build release perlu signing key dan konfigurasi release yang benar; jangan membagikan keystore atau password signing.

## G. Checklist setelah aplikasi berjalan

1. Masuk dengan Google.
2. Pastikan `GET /v1/me` mengembalikan akun yang benar.
3. Kirim pesan, tutup aplikasi, buka lagi, dan pastikan riwayat masih ada.
4. Simpan satu memori privat di akun A.
5. Masuk dengan akun B dan pastikan memori akun A tidak terlihat atau digunakan.
6. Ajukan pengetahuan bersama dari akun pengguna biasa.
7. Pastikan status masih pending dan tidak ikut jawaban RAG.
8. Setujui melalui akun reviewer yang Firebase UID-nya masuk allowlist.
9. Cari informasi yang sesuai dan pastikan referensi yang sudah disetujui dapat dipakai.
10. Uji dua pernyataan yang bertentangan; sistem hanya memberi tanda potensi konflik, bukan menentukan fakta secara otomatis.

## H. Troubleshooting singkat

- `ECONNREFUSED` PostgreSQL: periksa service PostgreSQL, host, port, database dan firewall.
- `password authentication failed`: periksa kredensial role runtime di `DATABASE_URL`.
- `permission denied` atau RLS menolak query: ikuti `database/ROLE_SETUP.md`; jangan menyelesaikan dengan memberi `BYPASSRLS` ke role aplikasi.
- Firebase `invalid credential`: periksa service-account JSON dan `GOOGLE_APPLICATION_CREDENTIALS`.
- Google sign-in gagal: periksa application ID serta SHA-1/SHA-256 Firebase.
- Embedding dimension mismatch: model harus mengembalikan tepat 768 dimensi sesuai schema.
- Model tidak tersedia: periksa Ollama aktif dan model sudah di-pull.
- Android tidak bisa mencapai API: gunakan IP LAN komputer untuk ponsel fisik atau `10.0.2.2` untuk emulator.

Jangan lanjut ke fase berikutnya sebelum seluruh langkah penting, khususnya migrasi, autentikasi, chat, isolasi akun dan build Android, diuji di lingkungan nyata.
