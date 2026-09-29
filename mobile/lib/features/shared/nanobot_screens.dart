import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';

/// Starts a NanoBot conversation (optionally about a unit) and opens it.
Future<void> startNanoBotChat(BuildContext context, {String? unitId, String? title}) async {
  final lms = context.lms;
  final navigator = Navigator.of(context);
  final messenger = ScaffoldMessenger.of(context);
  try {
    final id = await lms.createChat(unitId: unitId, title: title);
    await navigator.push(MaterialPageRoute<void>(builder: (_) => ChatScreen(chatId: id)));
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
  }
}

/// List of the user's NanoBot conversations.
class NanoBotScreen extends StatefulWidget {
  const NanoBotScreen({super.key, this.embedded = true});

  final bool embedded;

  @override
  State<NanoBotScreen> createState() => _NanoBotScreenState();
}

class _NanoBotScreenState extends State<NanoBotScreen> {
  final GlobalKey<AsyncViewState<List<ChatSummary>>> _listKey = GlobalKey<AsyncViewState<List<ChatSummary>>>();
  bool _creating = false;

  Future<void> _newChat() async {
    if (_creating) return;
    setState(() => _creating = true);
    await startNanoBotChat(context);
    if (!mounted) return;
    setState(() => _creating = false);
    await _listKey.currentState?.reload();
  }

  Future<void> _open(ChatSummary chat) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ChatScreen(chatId: chat.id)));
    if (!mounted) return;
    await _listKey.currentState?.reload();
  }

  Future<bool> _confirmDelete(ChatSummary chat) async {
    final lms = context.lms;
    final ok = await confirmDialog(
      context,
      title: 'Delete conversation?',
      message: '"${chat.title}" will be removed.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!ok) return false;
    try {
      await lms.deleteChat(chat.id);
      return true;
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: const Text('NanoBot'), automaticallyImplyLeading: !widget.embedded),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'nanobot-new',
        onPressed: _creating ? null : _newChat,
        icon: _creating
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.add_comment_outlined),
        label: const Text('New chat'),
      ),
      body: AsyncView<List<ChatSummary>>(
        key: _listKey,
        load: lms.chats,
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.smart_toy_outlined,
        emptyTitle: 'Ask NanoBot anything',
        emptyMessage: 'Your STEM tutor can explain lessons, help with robotics and coding, and quiz you. Tap "New chat" to start.',
        builder: (context, items, reload) => ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(top: 8, bottom: 96),
          itemCount: items.length,
          separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
          itemBuilder: (context, i) {
            final chat = items[i];
            final about = chat.unitTitle ?? chat.courseTitle;
            return Dismissible(
              key: ValueKey<String>(chat.id),
              direction: DismissDirection.endToStart,
              background: Container(
                color: Theme.of(context).colorScheme.errorContainer,
                alignment: Alignment.centerRight,
                padding: const EdgeInsets.only(right: 24),
                child: Icon(Icons.delete_outline_rounded, color: Theme.of(context).colorScheme.onErrorContainer),
              ),
              confirmDismiss: (_) => _confirmDelete(chat),
              onDismissed: (_) {
                // Remove it right away so the dismissed tile leaves the tree.
                items.removeWhere((c) => c.id == chat.id);
                reload();
              },
              child: ListTile(
                leading: const IconBadge(Icons.smart_toy_outlined),
                title: Text(chat.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text(
                  <String>[if (about != null) about, Fmt.ago(chat.updatedAt)].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => _open(chat),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// One NanoBot conversation.
class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.chatId});

  final String chatId;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();
  final List<ChatMessage> _messages = <ChatMessage>[];
  String _title = 'NanoBot';
  String? _about;
  bool _loading = true;
  bool _sending = false;
  Object? _error;

  static const List<String> _starters = <String>[
    'Explain this in simple words',
    'Give me a real-life example',
    'Quiz me with 3 questions',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final lms = context.lms;
    try {
      final chat = await lms.chat(widget.chatId);
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(chat.messages);
        _title = chat.title;
        _about = chat.unitTitle ?? chat.courseTitle;
        _loading = false;
        _error = null;
      });
      _scrollToEnd();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _input.text).trim();
    if (text.isEmpty || _sending) return;
    final lms = context.lms;
    final messenger = ScaffoldMessenger.of(context);
    final pending = ChatMessage(role: 'user', content: text, at: DateTime.now());
    setState(() {
      _sending = true;
      _messages.add(pending);
      if (preset == null) _input.clear();
    });
    _scrollToEnd();
    try {
      final result = await lms.sendMessage(widget.chatId, text);
      if (!mounted) return;
      setState(() {
        if (result.reply.content.isNotEmpty) _messages.add(result.reply);
        final t = result.title;
        if (t != null && t.isNotEmpty) _title = t;
      });
      _scrollToEnd();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages.remove(pending);
        if (preset == null && _input.text.isEmpty) _input.text = text;
      });
      messenger.showSnackBar(SnackBar(content: Text(errorMessage(e))));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget body;
    if (_loading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_error != null) {
      body = Center(
        child: ErrorView(
          error: _error!,
          onRetry: () {
            setState(() {
              _loading = true;
              _error = null;
            });
            _load();
          },
        ),
      );
    } else {
      body = Column(
        children: <Widget>[
          Expanded(
            child: _messages.isEmpty
                ? _Welcome(about: _about, starters: _starters, onPick: _send)
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                    itemCount: _messages.length + (_sending ? 1 : 0),
                    itemBuilder: (context, i) {
                      if (i >= _messages.length) return const _TypingBubble();
                      return _Bubble(message: _messages[i]);
                    },
                  ),
          ),
          _Composer(controller: _input, sending: _sending, onSend: () => _send()),
        ],
      );
    }
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(_title, maxLines: 1, overflow: TextOverflow.ellipsis),
            if (_about != null)
              Text(
                _about!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
          ],
        ),
      ),
      body: SafeArea(top: false, child: body),
    );
  }
}

class _Welcome extends StatelessWidget {
  const _Welcome({required this.about, required this.starters, required this.onPick});

  final String? about;
  final List<String> starters;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(24),
      children: <Widget>[
        const SizedBox(height: 24),
        const Center(child: IconBadge(Icons.smart_toy_outlined, size: 72)),
        const SizedBox(height: 16),
        Text(
          "Hi! I'm NanoBot",
          textAlign: TextAlign.center,
          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Text(
          about == null
              ? 'Ask me about robotics, coding, electronics or science.'
              : 'Ask me anything about "$about".',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 24),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: starters
              .map((s) => ActionChip(label: Text(s), onPressed: () => onPick(s)))
              .toList(),
        ),
      ],
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final mine = message.isUser;
    final bg = mine ? scheme.primary : scheme.surfaceContainerHigh;
    final fg = mine ? scheme.onPrimary : scheme.onSurface;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.8),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(mine ? 18 : 4),
              bottomRight: Radius.circular(mine ? 4 : 18),
            ),
          ),
          child: SelectableText(message.content, style: TextStyle(color: fg, fontSize: 15, height: 1.35)),
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(color: scheme.surfaceContainerHigh, borderRadius: BorderRadius.circular(18)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
            const SizedBox(width: 10),
            Text('NanoBot is thinking…', style: TextStyle(color: scheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({required this.controller, required this.sending, required this.onSend});

  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surface,
      elevation: 3,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: <Widget>[
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 5,
                maxLength: 2000,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: 'Message NanoBot',
                  counterText: '',
                  filled: true,
                  fillColor: scheme.surfaceContainerHighest,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                ),
              ),
            ),
            const SizedBox(width: 6),
            IconButton.filled(
              tooltip: 'Send',
              onPressed: sending ? null : onSend,
              icon: const Icon(Icons.send_rounded),
              style: IconButton.styleFrom(backgroundColor: AppColors.indigo, foregroundColor: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
