import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'firebase_options.dart';
import 'screens/auth_gate.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    runApp(const AisyahApp());
  } catch (error) {
    runApp(FirebaseSetupErrorApp(error: error));
  }
}

class AisyahApp extends StatelessWidget {
  const AisyahApp({super.key});

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFF8CB7E8);

    return MaterialApp(
      title: 'AISYAH',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: accent,
          brightness: Brightness.dark,
          surface: const Color(0xFF101923),
        ),
        scaffoldBackgroundColor: const Color(0xFF0B121C),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF142238),
          foregroundColor: Colors.white,
          centerTitle: false,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF182536),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(24),
            borderSide: BorderSide.none,
          ),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class FirebaseSetupErrorApp extends StatelessWidget {
  const FirebaseSetupErrorApp({super.key, required this.error});
  final Object error;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(),
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.cloud_off_outlined, size: 52),
                  const SizedBox(height: 16),
                  const Text(
                    'Firebase belum dikonfigurasi',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Jalankan FlutterFire CLI dan buat firebase_options.dart '
                    'untuk project Firebase milikmu.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  SelectableText(
                    error.toString(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 11, color: Colors.white54),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
