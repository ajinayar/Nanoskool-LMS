import 'package:intl/intl.dart';

/// Date and text formatting helpers. Uses the default (en_US) intl data,
/// which needs no initialisation, with Indian-style day-month ordering.
class Fmt {
  Fmt._();

  static final DateFormat _dateTime = DateFormat('d MMM, h:mm a');
  static final DateFormat _dateTimeYear = DateFormat('d MMM yyyy, h:mm a');
  static final DateFormat _date = DateFormat('d MMM yyyy');
  static final DateFormat _shortDate = DateFormat('d MMM');
  static final DateFormat _weekday = DateFormat('EEE, d MMM');
  static final DateFormat _time = DateFormat('h:mm a');
  static final DateFormat _ymd = DateFormat('yyyy-MM-dd');

  /// "12 Oct, 3:00 PM" (adds the year when it is not the current year).
  static String dateTime(DateTime? d) {
    if (d == null) return '-';
    final local = d.toLocal();
    return local.year == DateTime.now().year ? _dateTime.format(local) : _dateTimeYear.format(local);
  }

  /// "12 Oct 2026"
  static String date(DateTime? d) => d == null ? '-' : _date.format(d.toLocal());

  /// "12 Oct"
  static String shortDate(DateTime? d) => d == null ? '-' : _shortDate.format(d.toLocal());

  /// "Mon, 12 Oct"
  static String weekday(DateTime? d) => d == null ? '-' : _weekday.format(d.toLocal());

  /// "3:00 PM"
  static String time(DateTime? d) => d == null ? '-' : _time.format(d.toLocal());

  /// "2026-10-12" in local time, as the attendance API expects.
  static String ymd(DateTime d) => _ymd.format(d);

  /// "Due today", "Due in 3 days", "Overdue by 2 days", ...
  static String due(DateTime? d) {
    if (d == null) return 'No due date';
    final now = DateTime.now();
    final local = d.toLocal();
    final days = _dayDiff(now, local);
    if (local.isBefore(now)) {
      if (days == 0) return 'Was due ${time(local)} today';
      final n = -days;
      return 'Overdue by $n day${n == 1 ? '' : 's'}';
    }
    if (days == 0) return 'Due today, ${time(local)}';
    if (days == 1) return 'Due tomorrow, ${time(local)}';
    if (days < 7) return 'Due in $days days';
    return 'Due ${shortDate(local)}';
  }

  /// "Just now", "5 min ago", "3 h ago", "Yesterday", or a date.
  static String ago(DateTime? d) {
    if (d == null) return '';
    final diff = DateTime.now().difference(d.toLocal());
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) return '${diff.inHours} h ago';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    return date(d);
  }

  static int _dayDiff(DateTime from, DateTime to) {
    final a = DateTime(from.year, from.month, from.day);
    final b = DateTime(to.year, to.month, to.day);
    return (b.difference(a).inHours / 24).round();
  }

  static String greeting([DateTime? now]) {
    final h = (now ?? DateTime.now()).hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  static String capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1).replaceAll('_', ' ');
  }

  static String initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }

  static String percent(int? p) => p == null ? '-' : '$p%';

  /// Plain text from simple HTML, for previews.
  static String stripHtml(String? html) {
    if (html == null) return '';
    return html
        .replaceAll(RegExp(r'<[^>]*>'), ' ')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }
}
