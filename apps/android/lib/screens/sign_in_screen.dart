import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _auth = AuthService();
  bool _loading = false;
  String? _error;

  Future<void> _signIn() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await _auth.signInWithGoogle();
      // AuthGate reacts to Firebase authStateChanges.
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 104,
                    height: 104,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF8CB7E8).withOpacity(0.14),
                      border: Border.all(
                        color: const Color(0xFF8CB7E8),
                        width: 1.5,
                      ),
                    ),
                    child: const Icon(
                      Icons.auto_awesome,
                      size: 52,
                      color: Color(0xFFB8D8FA),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'AISYAH',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Powered by NEXORA',
                    style: TextStyle(color: Color(0xFFB8C8D8)),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Masuk untuk mengakses percakapan dan ruang memori pribadimu.',
                    textAlign: TextAlign.center,
                    style: TextStyle(height: 1.5, color: Colors.white70),
                  ),
                  const SizedBox(height: 30),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton.icon(
                      onPressed: _loading ? null : _signIn,
                      icon: _loading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.login),
                      label: Text(_loading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF8CB7E8),
                        foregroundColor: const Color(0xFF102033),
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.orangeAccent),
                    ),
                  ],
                  const SizedBox(height: 28),
                  const Text(
                    'Akunmu digunakan untuk memisahkan data pribadi dari pengguna lain.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: Colors.white38),
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
