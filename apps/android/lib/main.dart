import 'package:flutter/material.dart';
import 'screens/chat_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AisyahApp());
}

class AisyahApp extends StatelessWidget {
  const AisyahApp({super.key});

  @override
  Widget build(BuildContext context) {
    const navy = Color(0xFF142238);
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
          backgroundColor: navy,
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
      home: const ChatScreen(),
    );
  }
}
