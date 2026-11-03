import 'package:flutter/material.dart';
import '../models/chat_message.dart';
import '../services/nexora_api.dart';

const apiBaseUrl = String.fromEnvironment(
  'NEXORA_API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _messages = <ChatMessage>[
    ChatMessage(
      role: 'assistant',
      content:
          'Halo, Arifi. Aku Aisyah, asisten yang menggunakan Nexora sebagai mesin AI. '
          'Fondasi Android kita sedang disiapkan. Kamu bisa mulai dari sini setelah '
          'backend dan login dikonfigurasi.',
      createdAt: DateTime.now(),
    ),
  ];

  bool _sending = false;

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
      // Authentication token is intentionally not fabricated. Google/Firebase
      // sign-in will supply this token in the authentication implementation step.
      final api = NexoraApi(baseUrl: apiBaseUrl, idToken: null);
      final history = _messages
          .where((m) => m.role == 'user' || m.role == 'assistant')
          .toList()
          .reversed
          .skip(1)
          .take(12)
          .toList()
          .reversed
          .map((m) => {'role': m.role, 'content': m.content})
          .toList();

      final answer = await api.sendMessage(message: text, history: history);
      if (!mounted) return;
      setState(() {
        _messages.add(ChatMessage(
          role: 'assistant',
          content: answer,
          createdAt: DateTime.now(),
        ));
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _messages.add(ChatMessage(
          role: 'assistant',
          content: 'Koneksi belum aktif: $error',
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
        actions: [
          IconButton(
            tooltip: 'Pengaturan',
            onPressed: () => showAboutDialog(
              context: context,
              applicationName: 'AISYAH',
              applicationVersion: '0.1.0',
              children: const [
                Text('Persona: Aisyah'),
                Text('AI system: Nexora'),
                Text('Android-first prototype.'),
              ],
            ),
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(14, 18, 14, 18),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return _MessageBubble(message: message);
              },
            ),
          ),
          if (_sending)
            const LinearProgressIndicator(minHeight: 2),
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
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 13,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
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
          color: isUser
              ? const Color(0xFF294969)
              : const Color(0xFF182536),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isUser ? 18 : 5),
            bottomRight: Radius.circular(isUser ? 5 : 18),
          ),
        ),
        child: Text(
          message.content,
          style: const TextStyle(fontSize: 14, height: 1.45),
        ),
      ),
    );
  }
}
