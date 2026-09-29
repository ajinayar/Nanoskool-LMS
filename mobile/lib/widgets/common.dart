import 'package:flutter/material.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/config.dart';
import '../core/format.dart';
import '../core/theme.dart';

/// Circle with a person's initials.
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar({super.key, required this.name, this.radius = 20, this.color});

  final String name;
  final double radius;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final c = color ?? scheme.primary;
    return CircleAvatar(
      radius: radius,
      backgroundColor: tint(c, 48),
      child: Text(
        Fmt.initials(name),
        style: TextStyle(color: c, fontWeight: FontWeight.w700, fontSize: radius * 0.75),
      ),
    );
  }
}

/// Small coloured pill label.
class Pill extends StatelessWidget {
  const Pill(this.label, {super.key, this.color, this.icon});

  final String label;
  final Color? color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: tint(c), borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (icon != null) ...<Widget>[
            Icon(icon, size: 14, color: c),
            const SizedBox(width: 4),
          ],
          Text(label, style: TextStyle(color: c, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Icon in a tinted rounded square, used as a ListTile leading.
class IconBadge extends StatelessWidget {
  const IconBadge(this.icon, {super.key, this.color, this.size = 40});

  final IconData icon;
  final Color? color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: tint(c), borderRadius: BorderRadius.circular(12)),
      child: Icon(icon, color: c, size: size * 0.55),
    );
  }
}

/// Opens a URL in the browser or the matching app; shows a message if it cannot.
Future<void> openExternalUrl(BuildContext context, String? url) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (url == null || url.trim().isEmpty) return;
  final uri = Uri.tryParse(AppConfig.resolveUrl(url));
  if (uri == null) {
    messenger?.showSnackBar(const SnackBar(content: Text('This link looks broken.')));
    return;
  }
  var ok = false;
  try {
    ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    ok = false;
  }
  if (!ok) {
    messenger?.showSnackBar(const SnackBar(content: Text('Could not open the link on this device.')));
  }
}

/// Renders sanitised HTML from the API (lessons, instructions, announcements).
class HtmlContent extends StatelessWidget {
  const HtmlContent(this.html, {super.key, this.textStyle});

  final String html;
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    final style = textStyle ?? Theme.of(context).textTheme.bodyLarge;
    return HtmlWidget(
      html,
      textStyle: style,
      onTapUrl: (url) async {
        await openExternalUrl(context, url);
        return true;
      },
    );
  }
}

/// Colour for a status keyword used across the app.
Color statusColor(String status) {
  switch (status) {
    case 'present':
    case 'graded':
    case 'completed':
    case 'appreciation':
      return AppColors.success;
    case 'late':
    case 'returned':
    case 'improvement':
      return AppColors.warning;
    case 'absent':
    case 'overdue':
    case 'behaviour':
      return AppColors.danger;
    case 'excused':
    case 'submitted':
      return AppColors.info;
    default:
      return AppColors.indigo;
  }
}

IconData unitTypeIcon(String type) {
  switch (type) {
    case 'video':
      return Icons.play_circle_outline_rounded;
    case 'pdf':
      return Icons.picture_as_pdf_outlined;
    case 'activity':
      return Icons.precision_manufacturing_outlined;
    case 'link':
      return Icons.link_rounded;
    default:
      return Icons.menu_book_outlined;
  }
}

IconData remarkIcon(String category) {
  switch (category) {
    case 'appreciation':
      return Icons.emoji_events_outlined;
    case 'improvement':
      return Icons.trending_up_rounded;
    case 'behaviour':
      return Icons.report_gmailerrorred_outlined;
    default:
      return Icons.chat_bubble_outline_rounded;
  }
}

/// Asks the user to confirm an action. Returns true when confirmed.
Future<bool> confirmDialog(
  BuildContext context, {
  required String title,
  String? message,
  String confirmLabel = 'OK',
  bool destructive = false,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: message == null ? null : Text(message),
      actions: <Widget>[
        TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
        FilledButton(
          style: destructive ? FilledButton.styleFrom(backgroundColor: Theme.of(ctx).colorScheme.error) : null,
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return result ?? false;
}

void showSnack(BuildContext context, String message) {
  ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(message)));
}
