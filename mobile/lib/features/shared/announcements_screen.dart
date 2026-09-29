import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';

/// Announcements, news and newsletters visible to the signed-in user.
/// Use [embedded] inside a bottom-navigation tab (no back button).
class AnnouncementsScreen extends StatelessWidget {
  const AnnouncementsScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: const Text('Announcements'), automaticallyImplyLeading: !embedded),
      body: AsyncView<List<Announcement>>(
        load: lms.announcements,
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.campaign_outlined,
        emptyTitle: 'No announcements yet',
        emptyMessage: 'News from your school and Nanoskool will appear here.',
        builder: (context, items, reload) => ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: items.length,
          itemBuilder: (context, i) => AnnouncementCard(item: items[i]),
        ),
      ),
    );
  }
}

class AnnouncementCard extends StatelessWidget {
  const AnnouncementCard({super.key, required this.item, this.compact = false});

  final Announcement item;
  final bool compact;

  void _open(BuildContext context) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => AnnouncementDetailScreen(item: item)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final preview = Fmt.stripHtml(item.body);
    return SectionCard(
      onTap: () => _open(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              if (item.pinned) const Pill('Pinned', icon: Icons.push_pin_outlined, color: AppColors.orange),
              Pill(Fmt.capitalize(item.kind)),
              Text(
                item.audienceLabel,
                style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(item.title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          if (preview.isNotEmpty) ...<Widget>[
            const SizedBox(height: 6),
            Text(
              preview,
              maxLines: compact ? 2 : 3,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
          const SizedBox(height: 10),
          Text(
            <String>[
              if (item.authorName != null) item.authorName!,
              Fmt.ago(item.createdAt),
            ].join(' · '),
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class AnnouncementDetailScreen extends StatelessWidget {
  const AnnouncementDetailScreen({super.key, required this.item});

  final Announcement item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(Fmt.capitalize(item.kind))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: <Widget>[
          Text(item.title, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(
            <String>[
              if (item.authorName != null) item.authorName!,
              item.audienceLabel,
              Fmt.dateTime(item.createdAt),
            ].join(' · '),
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const Divider(height: 32),
          if ((item.body ?? '').trim().isEmpty)
            const Text('No further details.')
          else
            HtmlContent(item.body!),
        ],
      ),
    );
  }
}
