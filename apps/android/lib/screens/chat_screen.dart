import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../models/chat_message.dart';
import '../services/auth_service.dart';
import '../services/nexora_api.dart';
import 'memory_screen.dart';

const apiBaseUrl = String.fromEnvironment(
  'NEXORA_API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.user});
  final User user;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _auth = AuthService();
  late final NexoraApi _api = NexoraApi(baseUrl: apiBaseUrl);

  final _messages = <ChatMessage>[];
  String? _conversationId;

  bool _sending = false;
  bool _loadingHistory = true;
  bool _signingOut = false;

  @override
  void initState() {
    super.initState();
    _loadLatestConversation();
  }

  Future<String> _token() => _auth.requireFreshIdToken();

  Future<void> _loadLatestConversation() async {
    try {
      final token = await _token();
      final items = await _api.getConversations(idToken: token);
      if (items.isNotEmpty) await _openConversation(items.first as Map<String, dynamic>);
    } catch (_) {
      // The first message can still start a new conversation if history is unavailable.
    } finally {
      if (mounted) setState(() => _loadingHistory = false);
    }
  }

  Future<void> _openConversation(Map<String, dynamic> item) async {
    final token = await _token();
    final data = await _api.getConversation(idToken: token, id: item['id'] as String);
    if (!mounted) return;
    final messages = (data['messages'] as List<dynamic>).map((entry) {
      final row = entry as Map<String, dynamic>;
      return ChatMessage(role: row['role'] as String, content: row['content'] as String,
        createdAt: DateTime.tryParse(row['created_at'].toString()) ?? DateTime.now());
    }).toList();
    setState(() { _conversationId = data['id'] as String; _messages
      ..clear()..addAll(messages); });
    _scrollToBottom();
  }

  Future<void> _showConversations() async {
    try {
      final token = await _token();
      final items = await _api.getConversations(idToken: token);
      if (!mounted) return;
      await showModalBottomSheet<void>(context: context, builder: (sheetContext) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(title: const Text('Riwayat percakapan'), trailing: IconButton(icon: const Icon(Icons.add), onPressed: () {
            setState(() { _conversationId = null; _messages.clear(); }); Navigator.pop(sheetContext);
          })),
          Flexible(child: ListView(shrinkWrap: true, children: items.map((entry) {
            final item = Map<String, dynamic>.from(entry as Map);
            return ListTile(title: Text(item['title']?.toString() ?? 'Percakapan'),
              subtitle: Text(item['updated_at']?.toString() ?? ''), onTap: () {
                Navigator.pop(sheetContext); _openConversation(item);
              }, trailing: IconButton(icon: const Icon(Icons.delete_outline), onPressed: () async {
                await _api.deleteConversation(idToken: token, id: item['id'] as String);
                if (_conversationId == item['id']) setState(() { _conversationId = null; _messages.clear(); });
                if (sheetContext.mounted) Navigator.pop(sheetContext);
              }));
          }).toList()))
        ])));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  Future<void> _openMemories() async {
    final token = await _token();
    if (!mounted) return;
    await Navigator.push(context, MaterialPageRoute(builder: (_) => MemoryScreen(api: _api, idToken: token)));
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() {
      _messages.add(ChatMessage(
        role: 'user',
        content: text,
        createdAt: DateTime.now(),
      ));
      _sending = true;
      _controller.clear();
    });
    _scrollToBottom();

    try {
      final token = await _auth.requireFreshIdToken();
      final result = await _api.sendMessage(
        idToken: token,
        message: text,
        conversationId: _conversationId,
      );
      final answer = result['answer'] as String;
      _conversationId = result['conversationId'] as String;
      if (!mounted) return;
      setState(() {
        _messages.add(ChatMessage(role: 'assistant', content: answer, createdAt: DateTime.now()));
      });
      final proposal = result['memoryProposal'];
      if (proposal is Map && proposal['id'] is String && mounted) {
        await _reviewMemorySuggestion(Map<String, dynamic>.from(proposal));
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _messages.add(ChatMessage(
          role: 'assistant',
          content: 'Permintaan belum berhasil: $error',
          createdAt: DateTime.now(),
        ));
      });
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _scrollToBottom();
      }
    }
  }

  Future<void> _reviewMemorySuggestion(Map<String, dynamic> proposal) async {
    final choice = await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(
      title: const Text('Simpan sebagai memori?'),
      content: Text('Kamu meminta Aisyah mengingat:\n\n“${proposal['content']}”\n\nInformasi ini belum disimpan. Setujui jika ingin menjadikannya memori pribadi.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Jangan simpan')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Setujui')),
      ],
    ));
    if (choice == null || !mounted) return;
    try {
      final token = await _token();
      await _api.decideMemoryProposal(idToken: token, id: proposal['id'] as String, approve: choice);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(choice ? 'Memori disimpan.' : 'Saran memori ditolak.')));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Keputusan memori gagal: $error')));
    }
  }

  Future<void> _signOut() async {
    setState(() => _signingOut = true);
    try {
      await _auth.signOut();
    } finally {
      if (mounted) setState(() => _signingOut = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final displayName = widget.user.displayName?.trim().isNotEmpty == true
        ? widget.user.displayName!.trim()
        : (widget.user.email ?? 'Pengguna');

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF8CB7E8).withOpacity(0.16),
                border: Border.all(color: const Color(0xFF8CB7E8)),
              ),
              child: const Icon(Icons.auto_awesome, color: Color(0xFFB8D8FA)),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Aisyah', style: TextStyle(fontSize: 17)),
                Text(
                  'Powered by Nexora',
                  style: TextStyle(fontSize: 11, color: Color(0xFFB8C8D8)),
                ),
              ],
            ),
          ],
        ),
        leading: IconButton(tooltip: 'Riwayat', onPressed: _showConversations, icon: const Icon(Icons.history)),
        actions: [
          IconButton(tooltip: 'Memori', onPressed: _openMemories, icon: const Icon(Icons.psychology_alt_outlined)),
          PopupMenuButton<String>(
            tooltip: 'Akun',
            onSelected: (value) {
              if (value == 'signout') _signOut();
              if (value == 'profile') {
                showDialog<void>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Identitas akun'),
                    content: SelectableText(
                      '$displayName\\n${widget.user.email ?? ''}\\nUID: ${widget.user.uid}',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Tutup'),
                      ),
                    ],
                  ),
                );
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'profile',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.account_circle_outlined),
                  title: Text(displayName, maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text(widget.user.email ?? 'Akun Google'),
                ),
              ),
              const PopupMenuItem(
                value: 'signout',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.logout),
                  title: Text('Keluar'),
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loadingHistory
              ? const Center(child: CircularProgressIndicator())
              : _messages.isEmpty
                ? const Center(child: Text('Mulai percakapan baru dengan Aisyah.'))
                : ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(14, 18, 14, 18),
              itemCount: _messages.length,
              itemBuilder: (context, index) => _MessageBubble(message: _messages[index]),
            ),
          ),
          if (_sending) const LinearProgressIndicator(minHeight: 2),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      minLines: 1,
                      maxLines: 5,
                      textCapitalization: TextCapitalization.sentences,
                      onSubmitted: (_) => _send(),
                      decoration: const InputDecoration(
                        hintText: 'Pesan untuk Aisyah...',
                        contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 13),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: (_sending || _signingOut) ? null : _send,
                    icon: const Icon(Icons.send_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFF8CB7E8),
                      foregroundColor: const Color(0xFF102033),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});
  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 330),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
        decoration: BoxDecoration(
          color: isUser ? const Color(0xFF294969) : const Color(0xFF182536),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isUser ? 18 : 5),
            bottomRight: Radius.circular(isUser ? 5 : 18),
          ),
        ),
        child: Text(message.content, style: const TextStyle(fontSize: 14, height: 1.45)),
      ),
    );
  }
}
