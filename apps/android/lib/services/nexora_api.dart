import 'dart:convert';
import 'package:http/http.dart' as http;

class NexoraApi {
  NexoraApi({
    required this.baseUrl,
    required this.idToken,
  });

  final String baseUrl;
  final String? idToken;

  Future<String> sendMessage({
    required String message,
    required List<Map<String, String>> history,
  }) async {
    final token = idToken;
    if (token == null || token.isEmpty) {
      throw const NexoraApiException(
        'Login Google belum dikonfigurasi. Tahap autentikasi akan diaktifkan berikutnya.',
      );
    }

    final uri = Uri.parse('$baseUrl/v1/chat');
    final response = await http
        .post(
          uri,
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer $token',
          },
          body: jsonEncode({'message': message, 'history': history}),
        )
        .timeout(const Duration(seconds: 50));

    final decoded = jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map
          ? decoded['error']?['message']?.toString()
          : null;
      throw NexoraApiException(message ?? 'Permintaan ke Nexora gagal.');
    }

    if (decoded is! Map || decoded['answer'] is! String) {
      throw const NexoraApiException('Respons server tidak valid.');
    }
    return decoded['answer'] as String;
  }
}

class NexoraApiException implements Exception {
  const NexoraApiException(this.message);
  final String message;

  @override
  String toString() => message;
}
