import 'package:flutter/material.dart';
import '../services/nexora_api.dart';

class MemoryScreen extends StatefulWidget {
  const MemoryScreen({super.key, required this.api, required this.idToken});
  final NexoraApi api;
  final String idToken;
  @override
  State<MemoryScreen> createState() => _MemoryScreenState();
}

class _MemoryScreenState extends State<MemoryScreen> {
  List<dynamic> _items = [];
  List<dynamic> _proposals = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    if (mounted) setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        widget.api.getMemories(idToken: widget.idToken),
        widget.api.getMemoryProposals(idToken: widget.idToken),
      ]);
      _items = results[0];
      _proposals = results[1];
    } catch (error) { _error = error.toString(); }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _edit({Map<String, dynamic>? item}) async {
    final controller = TextEditingController(text: item?['content']?.toString() ?? '');
    int? expiryDays;
    final result = await showDialog<Map<String, dynamic>>(context: context, builder: (context) => StatefulBuilder(
      builder: (context, setDialogState) => AlertDialog(
        title: Text(item == null ? 'Tambah memori' : 'Ubah memori'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: controller, autofocus: true, minLines: 2, maxLines: 5,
            maxLength: 2000, decoration: const InputDecoration(hintText: 'Informasi yang boleh Aisyah ingat...')),
          const SizedBox(height: 12),
          DropdownButtonFormField<int?>(value: expiryDays, decoration: const InputDecoration(labelText: 'Masa simpan'),
            items: const [
              DropdownMenuItem<int?>(value: null, child: Text('Tanpa kedaluwarsa')),
              DropdownMenuItem<int?>(value: 30, child: Text('30 hari')),
              DropdownMenuItem<int?>(value: 90, child: Text('90 hari')),
              DropdownMenuItem<int?>(value: 365, child: Text('1 tahun')),
            ], onChanged: (value) => setDialogState(() => expiryDays = value)),
        ]),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, {'content': controller.text.trim(), 'expiresInDays': expiryDays}), child: const Text('Simpan'))],
      ),
    ));
    controller.dispose();
    final content = result?['content'] as String?;
    if (content == null || content.isEmpty) return;
    try {
      if (item == null) {
        await widget.api.saveMemory(idToken: widget.idToken, content: content, expiresInDays: result?['expiresInDays'] as int?);
      } else {
        await widget.api.updateMemory(idToken: widget.idToken, id: item['id'] as String, content: content, expiresInDays: result?['expiresInDays'] as int?);
      }
      await _load();
    } catch (error) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString()))); }
  }

  Future<void> _decideProposal(Map<String, dynamic> proposal, bool approve) async {
    try {
      await widget.api.decideMemoryProposal(idToken: widget.idToken, id: proposal['id'] as String, approve: approve);
      await _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(approve ? 'Memori disimpan.' : 'Saran memori ditolak.')));
    } catch (error) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString()))); }
  }

  Future<void> _delete(Map<String, dynamic> item) async {
    final yes = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Hapus memori?'),
      content: Text('Aisyah tidak akan menggunakan informasi ini lagi: “${item['content']}”'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hapus'))],
    ));
    if (yes != true) return;
    try { await widget.api.deleteMemory(idToken: widget.idToken, id: item['id'] as String); await _load(); }
    catch (error) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString()))); }
  }

  Future<void> _submitSharedKnowledge() async {
    final controller = TextEditingController();
    final content = await showDialog<String>(context: context, builder: (context) => AlertDialog(
      title: const Text('Ajukan pengetahuan bersama'),
      content: TextField(controller: controller, autofocus: true, minLines: 3, maxLines: 7,
        maxLength: 5000, decoration: const InputDecoration(hintText: 'Informasi umum yang layak ditinjau untuk pengetahuan bersama...')),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
        FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Ajukan untuk ditinjau'))],
    ));
    controller.dispose();
    if (content == null || content.length < 8) return;
    try {
      await widget.api.submitSharedKnowledge(idToken: widget.idToken, content: content);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Dikirim untuk peninjauan. Belum menjadi pengetahuan bersama.')));
    } catch (error) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString()))); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Memori Aisyah'), actions: [
      IconButton(tooltip: 'Ajukan pengetahuan bersama', onPressed: _submitSharedKnowledge, icon: const Icon(Icons.public_outlined)),
      IconButton(tooltip: 'Tambah memori', onPressed: () => _edit(), icon: const Icon(Icons.add)),
    ]),
    body: _loading ? const Center(child: CircularProgressIndicator()) : _error != null
      ? Center(child: Text(_error!))
      : RefreshIndicator(onRefresh: _load, child: ListView(padding: const EdgeInsets.only(bottom: 24), children: [
          if (_proposals.isNotEmpty) ...[
            const ListTile(title: Text('Menunggu persetujuan'), subtitle: Text('Saran belum disimpan sampai kamu menyetujuinya.')),
            ..._proposals.map((entry) {
              final proposal = Map<String, dynamic>.from(entry as Map);
              return Card(child: ListTile(title: Text(proposal['content'] as String), subtitle: const Text('Saran dari percakapan'),
                trailing: Wrap(mainAxisSize: MainAxisSize.min, children: [
                  IconButton(tooltip: 'Tolak', onPressed: () => _decideProposal(proposal, false), icon: const Icon(Icons.close)),
                  IconButton(tooltip: 'Setujui', onPressed: () => _decideProposal(proposal, true), icon: const Icon(Icons.check)),
                ])));
            }),
            const Divider(),
          ],
          const ListTile(title: Text('Memori tersimpan')),
          if (_items.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Text('Belum ada memori tersimpan.')),
          ..._items.map((entry) {
            final item = Map<String, dynamic>.from(entry as Map);
            final expiry = item['expires_at'] == null ? 'Tidak kedaluwarsa' : 'Berakhir: ${item['expires_at']}';
            return ListTile(title: Text(item['content'] as String),
              subtitle: Text('Sumber: ${item['source']} · Kepentingan: ${item['importance_score'] ?? '—'} · $expiry'),
              trailing: PopupMenuButton<String>(onSelected: (value) {
                if (value == 'edit') _edit(item: item);
                if (value == 'delete') _delete(item);
              }, itemBuilder: (_) => const [
                PopupMenuItem(value: 'edit', child: Text('Ubah')),
                PopupMenuItem(value: 'delete', child: Text('Hapus')),
              ]));
          }),
        ])),
    floatingActionButton: FloatingActionButton(onPressed: () => _edit(), child: const Icon(Icons.add)),
  );
}
