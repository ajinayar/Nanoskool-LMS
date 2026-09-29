import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import '../student/assignment_detail_screen.dart';

enum _RosterFilter { all, toGrade, graded, missing }

/// Every student in the class with their submission; tap to grade.
class SubmissionsScreen extends StatefulWidget {
  const SubmissionsScreen({super.key, required this.assignmentId, this.title});

  final String assignmentId;
  final String? title;

  @override
  State<SubmissionsScreen> createState() => _SubmissionsScreenState();
}

class _SubmissionsScreenState extends State<SubmissionsScreen> {
  final GlobalKey<AsyncViewState<Assignment>> _key = GlobalKey<AsyncViewState<Assignment>>();
  _RosterFilter _filter = _RosterFilter.all;

  Future<void> _grade(Assignment a, RosterEntry entry) async {
    final sub = entry.submission;
    if (sub == null) return;
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
        child: GradeSheet(assignment: a, student: entry.student, submission: sub),
      ),
    );
    if (saved == true && mounted) {
      showSnack(context, 'Grade saved for ${entry.student.name}');
      await _key.currentState?.reload();
    }
  }

  bool _matches(RosterEntry e) {
    final s = e.submission;
    switch (_filter) {
      case _RosterFilter.all:
        return true;
      case _RosterFilter.toGrade:
        return s != null && !s.isGraded;
      case _RosterFilter.graded:
        return s != null && s.isGraded;
      case _RosterFilter.missing:
        return s == null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: Text(widget.title ?? 'Submissions')),
      body: AsyncView<Assignment>(
        key: _key,
        load: () => lms.assignment(widget.assignmentId),
        builder: (context, a, reload) {
          final roster = a.roster;
          final toGrade = roster.where((e) => e.submission != null && !e.submission!.isGraded).length;
          final graded = roster.where((e) => e.submission?.isGraded ?? false).length;
          final missing = roster.where((e) => e.submission == null).length;
          final visible = roster.where(_matches).toList();
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 24),
            children: <Widget>[
              AssignmentHeader(assignment: a),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    _filterChip('All ${roster.length}', _RosterFilter.all),
                    _filterChip('To grade $toGrade', _RosterFilter.toGrade),
                    _filterChip('Graded $graded', _RosterFilter.graded),
                    _filterChip('Missing $missing', _RosterFilter.missing),
                  ],
                ),
              ),
              if (visible.isEmpty)
                const EmptyState(icon: Icons.filter_alt_off_outlined, title: 'No students in this filter')
              else
                SectionCard(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    children: <Widget>[
                      for (final e in visible) _rosterTile(context, a, e),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _filterChip(String label, _RosterFilter f) => FilterChip(
        label: Text(label),
        selected: _filter == f,
        onSelected: (_) => setState(() => _filter = f),
      );

  Widget _rosterTile(BuildContext context, Assignment a, RosterEntry e) {
    final s = e.submission;
    Widget trailing;
    String subtitle;
    if (s == null) {
      trailing = Pill(a.isOverdue ? 'Missing' : 'Not yet', color: a.isOverdue ? AppColors.danger : AppColors.indigo);
      subtitle = e.student.rollNo == null ? 'No submission' : 'Roll ${e.student.rollNo} · No submission';
    } else if (s.isGraded) {
      trailing = Pill('${fmtPoints(s.points)}/${fmtPoints(a.maxPoints)}', color: AppColors.success);
      subtitle = 'Graded · submitted ${Fmt.shortDate(s.submittedAt)}';
    } else {
      final late = a.dueDate != null && s.submittedAt != null && s.submittedAt!.isAfter(a.dueDate!);
      trailing = Pill(late ? 'Late · grade' : 'Grade', color: AppColors.orange, icon: Icons.rate_review_outlined);
      subtitle = 'Submitted ${Fmt.dateTime(s.submittedAt)}';
    }
    return ListTile(
      leading: InitialsAvatar(name: e.student.name),
      title: Text(e.student.name),
      subtitle: Text(subtitle),
      trailing: trailing,
      onTap: s == null ? null : () => _grade(a, e),
    );
  }
}

/// Shows a submission and lets the teacher set points and feedback.
class GradeSheet extends StatefulWidget {
  const GradeSheet({super.key, required this.assignment, required this.student, required this.submission});

  final Assignment assignment;
  final Person student;
  final Submission submission;

  @override
  State<GradeSheet> createState() => _GradeSheetState();
}

class _GradeSheetState extends State<GradeSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _points;
  late final TextEditingController _feedback;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final p = widget.submission.points;
    _points = TextEditingController(text: p == null ? '' : fmtPoints(p));
    _feedback = TextEditingController(text: widget.submission.feedback ?? '');
  }

  @override
  void dispose() {
    _points.dispose();
    _feedback.dispose();
    super.dispose();
  }

  String? _validatePoints(String? v) {
    final value = double.tryParse((v ?? '').trim());
    if (value == null) return 'Enter the points';
    if (value < 0) return 'Points cannot be negative';
    if (value > widget.assignment.maxPoints) return 'Maximum is ${fmtPoints(widget.assignment.maxPoints)}';
    return null;
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final lms = context.lms;
    final navigator = Navigator.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await lms.gradeSubmission(
        widget.submission.id,
        points: double.parse(_points.text.trim()),
        feedback: _feedback.text,
      );
      if (!mounted) return;
      navigator.pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = errorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final s = widget.submission;
    final max = widget.assignment.maxPoints;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Row(
                children: <Widget>[
                  InitialsAvatar(name: widget.student.name),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(widget.student.name, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                        Text('Submitted ${Fmt.dateTime(s.submittedAt)}', style: theme.textTheme.bodySmall),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    if ((s.text ?? '').isNotEmpty) SelectableText(s.text!) else const Text('No written answer.'),
                    if ((s.linkUrl ?? '').isNotEmpty)
                      TextButton.icon(
                        onPressed: () => openExternalUrl(context, s.linkUrl),
                        icon: const Icon(Icons.link_rounded),
                        label: Text(s.linkUrl!, maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                    if ((s.fileUrl ?? '').isNotEmpty)
                      TextButton.icon(
                        onPressed: () => openExternalUrl(context, s.fileUrl),
                        icon: const Icon(Icons.attach_file_rounded),
                        label: const Text('Open attached file'),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _points,
                enabled: !_busy,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Points',
                  suffixText: '/ ${fmtPoints(max)}',
                  border: const OutlineInputBorder(),
                ),
                validator: _validatePoints,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _feedback,
                enabled: !_busy,
                minLines: 2,
                maxLines: 5,
                maxLength: 5000,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Feedback (optional)',
                  alignLabelWithHint: true,
                  border: OutlineInputBorder(),
                  counterText: '',
                ),
              ),
              if (_error != null) ...<Widget>[
                const SizedBox(height: 8),
                Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
              ],
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _busy ? null : _save,
                icon: _busy
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.check_rounded),
                label: Text(s.isGraded ? 'Update grade' : 'Save grade'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
