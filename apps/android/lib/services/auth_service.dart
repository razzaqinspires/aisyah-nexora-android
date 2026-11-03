import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AuthService {
  AuthService({
    FirebaseAuth? firebaseAuth,
    GoogleSignIn? googleSignIn,
  })  : _firebaseAuth = firebaseAuth ?? FirebaseAuth.instance,
        _googleSignIn = googleSignIn ?? GoogleSignIn(scopes: const ['email']);

  final FirebaseAuth _firebaseAuth;
  final GoogleSignIn _googleSignIn;

  Stream<User?> authStateChanges() => _firebaseAuth.authStateChanges();

  User? get currentUser => _firebaseAuth.currentUser;

  Future<UserCredential> signInWithGoogle() async {
    final googleUser = await _googleSignIn.signIn();
    if (googleUser == null) {
      throw const AuthFlowException('Login dibatalkan.');
    }

    final googleAuth = await googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );

    return _firebaseAuth.signInWithCredential(credential);
  }

  Future<String> requireFreshIdToken() async {
    final user = _firebaseAuth.currentUser;
    if (user == null) {
      throw const AuthFlowException('Silakan login terlebih dahulu.');
    }

    final token = await user.getIdToken(true);
    if (token == null || token.isEmpty) {
      throw const AuthFlowException('Firebase tidak menghasilkan ID token.');
    }
    return token;
  }

  Future<void> signOut() async {
    await _firebaseAuth.signOut();
    await _googleSignIn.signOut();
  }
}

class AuthFlowException implements Exception {
  const AuthFlowException(this.message);
  final String message;

  @override
  String toString() => message;
}
