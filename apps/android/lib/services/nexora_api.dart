import 'dart:convert';
import 'package:http/http.dart' as http;

class NexoraApi {
  NexoraApi({required this.baseUrl});
  final String baseUrl;

  Map<String, String> _headers(String token) => {
    'authorization': 'Bearer $token',
    'content-type': 'application/json',
  };

  Future<Map<String, dynamic>> getMe({required String idToken}) async {
    final response = await http.get(Uri.parse('$baseUrl/v1/me'), headers: _headers(idToken)).timeout(const Duration(seconds: 20));
    return _decode(response) as Map<String, dynamic>;
  }

  Future<List<dynamic>> getConversations({required String idToken}) async {
    final response = await http.get(Uri.parse('$baseUrl/v1/conversations'), headers: _headers(idToken)).timeout(const Duration(seconds: 20));
    return (_decode(response) as Map<String, dynamic>)['conversations'] as List<dynamic>;
  }

  Future<Map<String, dynamic>> getConversation({required String idToken, required String id}) async {
    final response = await http.get(Uri.parse('$baseUrl/v1/conversations/$id'), headers: _headers(idToken)).timeout(const Duration(seconds: 20));
    return (_decode(response) as Map<String, dynamic>)['conversation'] as Map<String, dynamic>;
  }

  Future<void> deleteConversation({required String idToken, required String id}) async {
    final response = await http.delete(Uri.parse('$baseUrl/v1/conversations/$id'), headers: _headers(idToken)).timeout(const Duration(seconds: 20));
    if (response.statusCode != 204) _decode(response);
  }

  Future<Map<String, dynamic>> sendMessage({required String idToken, required String message, String? conversationId}) async {
    final response = await http.post(Uri.parse('$baseUrl/v1/chat'), headers: _headers(idToken),
      body: jsonEncode({'message': message, if (conversationId != null) 'conversationId': conversationId}),
    ).timeout(const Duration(seconds: 60));
    final decoded = _decode(response);
    if (decoded is! Map || decoded['answer'] is! String || decoded['conversationId'] is! String) {
      throw const NexoraApiException('Respons server tidak valid.');
    }
    return Map<String, dynamic>.from(decoded);
  }

  Future<List<dynamic>> getMemoryProposals({required String idToken}) async {
    final response = await http.get(Uri.parse('$baseUrl/v1/memory-proposals'), headers: _headers(idToken)).timeout(const Duration(seconds: 20));
    return (_decode(response) as Map<String, dynamic>)['proposals'] as List<dynamic>;
  }

  Future<void> decideMemoryProposal({required String idToken, required String id, required bool approve}) async {
    final response = await http.post(Uri.parse('$baseUrl/v1/memory-proposals/$id/decision'), headers: _headers(idToken),
      body: jsonEncode({'decision': approve ? 'approve' : 'reject'})).timeout(const Duration(seconds: 30));
    _decode(response);
  }

  Future<void> submitSharedKnowledge({required String idToken, required String content}) async {
    final response = await http.post(Uri.parse('$baseUrl/v1/knowledge-submissions'), headers: _headers(idToken),
      body: jsonEncode({'content': content})).timeout(const Duration(seconds: 20));
    _decode(response);
  }

  Future<List<dynamic>> getMemories({required String idToken}) async {
    final response = await http.get(Uri.parse('$baseUrl/v1/memories'), headers: _headers(idToken)).timeout(const Duration(seconds: 20));
    return (_decode(response) as Map<String, dynamic>)['memories'] as List<dynamic>;
  }

  Future<void> saveMemory({required String idToken, required String content, int? expiresInDays}) async {
    final response = await http.post(Uri.parse('$baseUrl/v1/memories'), headers: _headers(idToken), body: jsonEncode({'content': content, 'expiresInDays': expiresInDays})).timeout(const Duration(seconds: 30));
    _decode(response);
  }

  Future<void> updateMemory({required String idToken, required String id, required String content, int? expiresInDays}) async {
    final response = await http.patch(Uri.parse('$baseUrl/v1/memories/$id'), headers: _headers(idToken), body: jsonEncode({'content': content, 'expiresInDays': expiresInDays})).timeout(const Duration(seconds: 30));
    _decode(response);
  }

  Future<void> deleteMemory({required String idToken, required String id}) async {
    final response = await http.delete(Uri.parse('$baseUrl/v1/memories/$id'), headers: _headers(idToken)).timeout(const Duration(seconds: 20));
    if (response.statusCode != 204) _decode(response);
  }

  dynamic _decode(http.Response response) {
    dynamic decoded;
    try { decoded = response.body.isEmpty ? null : jsonDecode(response.body); }
    catch (_) { throw const NexoraApiException('Server mengirim respons yang tidak valid.'); }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map ? decoded['error']?['message']?.toString() : null;
      throw NexoraApiException(message ?? 'Permintaan ke Nexora gagal (${response.statusCode}).');
    }
    return decoded;
  }
}

class NexoraApiException implements Exception {
  const NexoraApiException(this.message);
  final String message;
  @override
  String toString() => message;
}
