import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import 'nanobot_screens.dart';

/// Shows one unit: HTML body, media links, mark complete, prev/next and NanoBot.
class UnitViewerScreen extends StatefulWidget {
  const UnitViewerScreen({super.key, required this.unitId});

  final String unitId;

  @override
  State<UnitViewerScreen> createState() => _UnitViewerScreenState();
}

class _UnitViewerScreenState extends State<UnitViewerScreen> {
  Unit? _unit;
  Object? _error;
  bool _loading = true;
  bool _saving = false;
  bool _askingBot = false;
  late String _unitId;

  bool get _isStudent => context.currentUser?.role == 'student';

  @override
  void initState() {
    super.initState();
    _unitId = widget.unitId;
    _load();
  }

  Future<void> _load() async {
    final lms = context.lms;
    final id = _unitId;
    try {
      final unit = await lms.unit(id);
      if (!mounted || id != _unitId) return;
      setState(() {
        _unit = unit;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted || id != _unitId) return;
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  Future<void> _toggleComplete() async {
    final unit = _unit;
    if (unit == null || _saving) return;
    final lms = context.lms;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _saving = true);
    try {
      if (unit.completed) {
        await lms.uncompleteUnit(unit.id);
      } else {
        await lms.completeUnit(unit.id);
      }
      if (!mounted) return;
      await _load();
      if (!mounted) return;
      final nowDone = _unit?.completed ?? false;
      messenger.showSnackBar(SnackBar(content: Text(nowDone ? 'Marked as complete. Well done!' : 'Marked as not complete')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(errorMessage(e))));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  /// Moves to another unit in place, so the course screen reloads once on return.
  void _goTo(Ref target) {
    setState(() {
      _unitId = target.id;
      _unit = null;
      _error = null;
      _loading = true;
    });
    _load();
  }

  Future<void> _askNanoBot() async {
    final unit = _unit;
    if (unit == null || _askingBot) return;
    setState(() => _askingBot = true);
    await startNanoBotChat(context, unitId: unit.id);
    if (mounted) setState(() => _askingBot = false);
  }

  @override
  Widget build(BuildContext context) {
    final unit = _unit;
    Widget body;
    if (_loading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (unit == null) {
      body = Center(
        child: ErrorView(
          error: _error ?? 'Could not load this unit',
          onRetry: () {
            setState(() => _loading = true);
            _load();
          },
        ),
      );
    } else {
      body = RefreshIndicator(onRefresh: _load, child: _content(context, unit));
    }
    return Scaffold(
      appBar: AppBar(title: Text(unit?.courseTitle ?? 'Lesson', overflow: TextOverflow.ellipsis)),
      body: body,
      bottomNavigationBar: unit == null ? null : _bottomBar(context, unit),
    );
  }

  Widget _content(BuildContext context, Unit unit) {
    final theme = Theme.of(context);
    final media = <Widget>[
      if ((unit.videoUrl ?? '').isNotEmpty)
        _MediaButton(icon: Icons.play_circle_fill_rounded, label: 'Watch video', url: unit.videoUrl!),
      if ((unit.fileUrl ?? '').isNotEmpty)
        _MediaButton(
          icon: unit.type == 'pdf' ? Icons.picture_as_pdf_rounded : Icons.attach_file_rounded,
          label: unit.type == 'pdf' ? 'Open PDF' : 'Open file',
          url: unit.fileUrl!,
        ),
      if ((unit.linkUrl ?? '').isNotEmpty)
        _MediaButton(icon: Icons.open_in_new_rounded, label: 'Open link', url: unit.linkUrl!),
    ];
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: <Widget>[
        if (unit.chapterTitle != null)
          Text(
            unit.chapterTitle!,
            style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.primary),
          ),
        const SizedBox(height: 4),
        Text(unit.title, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: <Widget>[
            Pill(Fmt.capitalize(unit.type), icon: unitTypeIcon(unit.type)),
            if (unit.durationMin != null) Pill('${unit.durationMin} min', icon: Icons.timer_outlined, color: AppColors.orange),
            if (_isStudent && unit.completed) const Pill('Completed', icon: Icons.check_rounded, color: AppColors.success),
          ],
        ),
        if ((unit.summary ?? '').isNotEmpty) ...<Widget>[
          const SizedBox(height: 12),
          Text(unit.summary!, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
        if (media.isNotEmpty) ...<Widget>[
          const SizedBox(height: 16),
          Wrap(spacing: 8, runSpacing: 8, children: media),
        ],
        const Divider(height: 32),
        if ((unit.body ?? '').trim().isNotEmpty)
          HtmlContent(unit.body!)
        else if (media.isEmpty)
          const Text('This unit has no written content.'),
        const SizedBox(height: 24),
        SectionCard(
          margin: EdgeInsets.zero,
          color: theme.colorScheme.secondaryContainer,
          onTap: _askingBot ? null : _askNanoBot,
          child: Row(
            children: <Widget>[
              const IconBadge(Icons.smart_toy_outlined),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('Ask NanoBot about this unit', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(
                      'Stuck? Get a simple explanation or a practice question.',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              if (_askingBot)
                const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              else
                const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ],
    );
  }

  Widget _bottomBar(BuildContext context, Unit unit) {
    final prev = unit.prev;
    final next = unit.next;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Row(
          children: <Widget>[
            IconButton.outlined(
              tooltip: prev == null ? 'No previous unit' : 'Previous: ${prev.name ?? 'unit'}',
              onPressed: prev == null ? null : () => _goTo(prev),
              icon: const Icon(Icons.chevron_left_rounded),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _isStudent
                  ? (unit.completed
                      ? FilledButton.tonalIcon(
                          onPressed: _saving ? null : _toggleComplete,
                          icon: const Icon(Icons.check_circle_rounded),
                          label: const Text('Completed'),
                        )
                      : FilledButton.icon(
                          onPressed: _saving ? null : _toggleComplete,
                          icon: _saving
                              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.done_rounded),
                          label: const Text('Mark complete'),
                        ))
                  : const SizedBox.shrink(),
            ),
            const SizedBox(width: 8),
            IconButton.outlined(
              tooltip: next == null ? 'No next unit' : 'Next: ${next.name ?? 'unit'}',
              onPressed: next == null ? null : () => _goTo(next),
              icon: const Icon(Icons.chevron_right_rounded),
            ),
          ],
        ),
      ),
    );
  }
}

class _MediaButton extends StatelessWidget {
  const _MediaButton({required this.icon, required this.label, required this.url});

  final IconData icon;
  final String label;
  final String url;

  @override
  Widget build(BuildContext context) {
    return FilledButton.tonalIcon(
      onPressed: () => openExternalUrl(context, url),
      icon: Icon(icon),
      label: Text(label),
    );
  }
}
