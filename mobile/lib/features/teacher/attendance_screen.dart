import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';

/// Take or edit attendance for one class on one date.
class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key, required this.classId, required this.className});

  final String classId;
  final String className;

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  static const List<String> _statuses = <String>['present', 'absent', 'late', 'excused'];

  DateTime _date = DateTime.now();
  List<Person> _students = const <Person>[];
  final Map<String, String> _records = <String, String>{};
  bool _exists = false;
  bool _loading = true;
  bool _saving = false;
  bool _dirty = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final lms = context.lms;
    // The first load (from initState) already starts in the loading state.
    if (!_loading || _error != null) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final sheet = await lms.attendanceSheet(widget.classId, Fmt.ymd(_date));
      if (!mounted) return;
      setState(() {
        _students = sheet.students;
        _records
          ..clear()
          ..addAll(sheet.records);
        // Students without a saved status default to present.
        for (final s in _students) {
          _records.putIfAbsent(s.id, () => 'present');
        }
        _exists = sheet.exists;
        _dirty = false;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  Future<void> _pickDate() async {
    if (_dirty) {
      final discard = await confirmDialog(
        context,
        title: 'Discard changes?',
        message: 'You have unsaved attendance for ${Fmt.date(_date)}.',
        confirmLabel: 'Discard',
        destructive: true,
      );
      if (!discard || !mounted) return;
    }
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(now.year - 1, now.month, now.day),
      lastDate: now,
      helpText: 'Attendance date',
    );
    if (picked == null || !mounted) return;
    setState(() => _date = picked);
    await _load();
  }

  void _set(String studentId, String status) {
    setState(() {
      _records[studentId] = status;
      _dirty = true;
    });
  }

  void _markAllPresent() {
    setState(() {
      for (final s in _students) {
        _records[s.id] = 'present';
      }
      _dirty = true;
    });
  }

  Future<void> _save() async {
    if (_saving || _students.isEmpty) return;
    final lms = context.lms;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _saving = true);
    try {
      final records = <String, String>{for (final s in _students) s.id: _records[s.id] ?? 'present'};
      await lms.saveAttendance(widget.classId, Fmt.ymd(_date), records);
      if (!mounted) return;
      setState(() {
        _exists = true;
        _dirty = false;
      });
      messenger.showSnackBar(SnackBar(content: Text('Attendance saved for ${Fmt.date(_date)}')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(errorMessage(e))));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _confirmLeave() async {
    final navigator = Navigator.of(context);
    final leave = await confirmDialog(
      context,
      title: 'Leave without saving?',
      message: 'Your attendance changes have not been saved.',
      confirmLabel: 'Leave',
      destructive: true,
    );
    if (leave && mounted) {
      setState(() => _dirty = false);
      navigator.pop();
    }
  }

  int _count(String status) => _students.where((s) => _records[s.id] == status).length;

  String _short(String status) {
    switch (status) {
      case 'present':
        return 'P';
      case 'absent':
        return 'A';
      case 'late':
        return 'L';
      default:
        return 'E';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget body;
    if (_loading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_error != null) {
      body = Center(child: ErrorView(error: _error!, onRetry: _load));
    } else if (_students.isEmpty) {
      body = const Center(child: EmptyState(icon: Icons.groups_outlined, title: 'No students in this class'));
    } else {
      body = RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          children: <Widget>[
            SectionCard(
              margin: const EdgeInsets.fromLTRB(16, 12, 16, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          _exists ? 'Saved earlier. You can update it.' : 'Not taken yet for this date.',
                          style: theme.textTheme.bodyMedium,
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _saving ? null : _markAllPresent,
                        icon: const Icon(Icons.done_all_rounded),
                        label: const Text('All present'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: <Widget>[
                      for (final st in _statuses)
                        Pill('${Fmt.capitalize(st)} ${_count(st)}', color: statusColor(st)),
                    ],
                  ),
                ],
              ),
            ),
            for (final s in _students) _StudentRow(
              student: s,
              status: _records[s.id] ?? 'present',
              statuses: _statuses,
              shortLabel: _short,
              enabled: !_saving,
              onChanged: (st) => _set(s.id, st),
            ),
          ],
        ),
      );
    }
    return PopScope(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _confirmLeave();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Text('Attendance'),
              Text(widget.className, style: theme.textTheme.bodySmall),
            ],
          ),
          actions: <Widget>[
            TextButton.icon(
              onPressed: _saving ? null : _pickDate,
              icon: const Icon(Icons.calendar_today_rounded, size: 18),
              label: Text(Fmt.weekday(_date)),
            ),
          ],
        ),
        body: body,
        bottomNavigationBar: _students.isEmpty || _loading
            ? null
            : SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: SizedBox(
                    height: 50,
                    child: FilledButton.icon(
                      onPressed: _saving ? null : _save,
                      icon: _saving
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.save_outlined),
                      label: Text(_dirty || !_exists ? 'Save attendance' : 'Saved'),
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}

class _StudentRow extends StatelessWidget {
  const _StudentRow({
    required this.student,
    required this.status,
    required this.statuses,
    required this.shortLabel,
    required this.enabled,
    required this.onChanged,
  });

  final Person student;
  final String status;
  final List<String> statuses;
  final String Function(String) shortLabel;
  final bool enabled;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: <Widget>[
          InitialsAvatar(name: student.name, radius: 18, color: statusColor(status)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(student.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleSmall),
                if (student.rollNo != null) Text('Roll ${student.rollNo}', style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          for (final st in statuses)
            Padding(
              padding: const EdgeInsets.only(left: 4),
              child: _StatusButton(
                label: shortLabel(st),
                tooltip: Fmt.capitalize(st),
                color: statusColor(st),
                selected: status == st,
                onTap: enabled ? () => onChanged(st) : null,
              ),
            ),
        ],
      ),
    );
  }
}

class _StatusButton extends StatelessWidget {
  const _StatusButton({required this.label, required this.tooltip, required this.color, required this.selected, this.onTap});

  final String label;
  final String tooltip;
  final Color color;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: selected ? color : tint(color, 24),
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            width: 38,
            height: 38,
            child: Center(
              child: Text(
                label,
                style: TextStyle(color: selected ? Colors.white : color, fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
