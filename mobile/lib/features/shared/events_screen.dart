import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../widgets/widgets.dart';

/// Upcoming school, class and Nanoskool events.
class EventsScreen extends StatelessWidget {
  const EventsScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    final now = DateTime.now();
    final startOfToday = DateTime(now.year, now.month, now.day);
    return Scaffold(
      appBar: AppBar(title: const Text('Events'), automaticallyImplyLeading: !embedded),
      body: AsyncView<List<EventItem>>(
        load: () => lms.events(from: startOfToday),
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.event_outlined,
        emptyTitle: 'No upcoming events',
        emptyMessage: 'Fairs, meetings and competitions will show up here.',
        builder: (context, items, reload) => ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: items.length,
          itemBuilder: (context, i) => EventTile(event: items[i]),
        ),
      ),
    );
  }
}

/// Date block + title + time/location. Used on home screens too.
class EventTile extends StatelessWidget {
  const EventTile({super.key, required this.event, this.dense = false});

  final EventItem event;
  final bool dense;

  void _showDetails(BuildContext context) {
    final theme = Theme.of(context);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(event.title, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              _row(ctx, Icons.schedule_rounded, _when()),
              if (event.location != null) _row(ctx, Icons.place_outlined, event.location!),
              _row(ctx, Icons.groups_outlined, event.className ?? event.schoolName ?? 'Everyone'),
              if ((event.description ?? '').trim().isNotEmpty) ...<Widget>[
                const SizedBox(height: 12),
                Text(Fmt.stripHtml(event.description), style: theme.textTheme.bodyLarge),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(BuildContext context, IconData icon, String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: <Widget>[
            Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 10),
            Expanded(child: Text(text)),
          ],
        ),
      );

  String _when() {
    final start = Fmt.dateTime(event.startsAt);
    final end = event.endsAt;
    if (end == null) return start;
    final s = event.startsAt;
    final sameDay = s != null && s.year == end.year && s.month == end.month && s.day == end.day;
    return sameDay ? '$start – ${Fmt.time(end)}' : '$start – ${Fmt.dateTime(end)}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final d = event.startsAt;
    final dateBlock = Container(
      width: 52,
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(color: scheme.primaryContainer, borderRadius: BorderRadius.circular(14)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            d == null ? '-' : '${d.day}',
            style: theme.textTheme.titleLarge?.copyWith(color: scheme.onPrimaryContainer, fontWeight: FontWeight.w800),
          ),
          Text(
            d == null ? '' : Fmt.shortDate(d).split(' ').last.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(color: scheme.onPrimaryContainer),
          ),
        ],
      ),
    );
    final subtitle = <String>[
      Fmt.time(d),
      if (event.location != null) event.location!,
      if (event.className != null) event.className!,
    ].join(' · ');
    return ListTile(
      contentPadding: EdgeInsets.symmetric(horizontal: dense ? 0 : 16, vertical: 2),
      leading: dateBlock,
      title: Text(event.title, maxLines: 2, overflow: TextOverflow.ellipsis),
      subtitle: Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
      onTap: () => _showDetails(context),
    );
  }
}
