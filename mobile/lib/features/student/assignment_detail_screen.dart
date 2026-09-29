import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';

/// Assignment instructions, the student's submission, grade and feedback.
///
/// Submissions are text and/or a link (e.g. Google Drive or Scratch project URL).
/// File upload needs a file picker package, which this app does not include.
class AssignmentDetailScreen extends StatefulWidget {
  const AssignmentDetailScreen({super.key, required this.assignmentId, this.title});

  final String assignmentId;
  final String? title;

  @override
  State<AssignmentDetailScreen> createState() => _AssignmentDetailScreenState();
}

class _AssignmentDetailScreenState extends State<AssignmentDetailScreen> {
  final GlobalKey<AsyncViewState<Assignment>> _key = GlobalKey<AsyncViewState<Assignment>>();

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: Text(widget.title ?? 'Assignment')),
      body: AsyncView<Assignment>(
        key: _key,
        load: () => lms.assignment(widget.assignmentId),
        builder: (context, a, reload) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 32),
          children: <Widget>[
            AssignmentHeader(assignment: a),
            if ((a.instructions ?? '').trim().isNotEmpty)
              SectionCard(
                title: 'Instructions',
                icon: Icons.description_outlined,
                child: HtmlContent(a.instructions!),
              ),
            if ((a.attachmentUrl ?? '').isNotEmpty)
              SectionCard(
                padding: EdgeInsets.zero,
                child: ListTile(
                  leading: const Icon(Icons.attach_file_rounded),
                  title: const Text('Attachment from teacher'),
                  trailing: const Icon(Icons.open_in_new_rounded),
                  onTap: () => openExternalUrl(context, a.attachmentUrl),
                ),
              ),
            if (a.submission != null) SubmissionCard(submission: a.submission!, maxPoints: a.maxPoints),
            if (a.submission?.isGraded ?? false)
              const SizedBox.shrink()
            else if (!a.acceptsSubmissions)
              const SectionCard(
                child: Text('This assignment is closed and no longer accepts submissions.'),
              )
            else
              _SubmitForm(
                assignment: a,
                onSubmitted: () => _key.currentState?.reload() ?? Future<void>.value(),
              ),
          ],
        ),
      ),
    );
  }
}

/// Title, course, due date and points.
class AssignmentHeader extends StatelessWidget {
  const AssignmentHeader({super.key, required this.assignment});

  final Assignment assignment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final a = assignment;
    final overdue = a.isOverdue && a.submission == null;
    return SectionCard(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      color: theme.colorScheme.primaryContainer,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: <Widget>[
              Pill(Fmt.capitalize(a.kind), color: AppColors.indigo),
              Pill('${fmtPoints(a.maxPoints)} points', color: AppColors.orange),
              if (overdue) const Pill('Overdue', color: AppColors.danger),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            a.title,
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700, color: theme.colorScheme.onPrimaryContainer),
          ),
          const SizedBox(height: 6),
          Text(
            <String>[
              if (a.courseTitle != null) a.courseTitle!,
              if (a.className != null) a.className!,
              if (a.teacherName != null) a.teacherName!,
            ].join(' · '),
            style: TextStyle(color: theme.colorScheme.onPrimaryContainer),
          ),
          const SizedBox(height: 10),
          Row(
            children: <Widget>[
              Icon(Icons.event_outlined, size: 18, color: overdue ? AppColors.danger : theme.colorScheme.onPrimaryContainer),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  a.dueDate == null ? 'No due date' : '${Fmt.due(a.dueDate)} (${Fmt.dateTime(a.dueDate)})',
                  style: TextStyle(color: overdue ? AppColors.danger : theme.colorScheme.onPrimaryContainer),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Shows what was submitted, and the grade and feedback when graded.
class SubmissionCard extends StatelessWidget {
  const SubmissionCard({super.key, required this.submission, required this.maxPoints, this.title = 'Your submission'});

  final Submission submission;
  final double maxPoints;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final s = submission;
    final statusLabel = s.isGraded ? 'Graded' : (s.isReturned ? 'Returned for changes' : 'Submitted');
    return SectionCard(
      title: title,
      icon: Icons.upload_file_outlined,
      trailing: Pill(statusLabel, color: statusColor(s.status)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          if (s.isGraded || s.points != null) ...<Widget>[
            Row(
              children: <Widget>[
                Text(
                  '${fmtPoints(s.points)} / ${fmtPoints(maxPoints)}',
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800, color: AppColors.success),
                ),
                const SizedBox(width: 8),
                const Text('points'),
              ],
            ),
            const SizedBox(height: 8),
          ],
          if ((s.feedback ?? '').isNotEmpty) ...<Widget>[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: tint(AppColors.success, 28), borderRadius: BorderRadius.circular(12)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Teacher feedback', style: theme.textTheme.labelMedium),
                  const SizedBox(height: 4),
                  Text(s.feedback!),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],
          if ((s.text ?? '').isNotEmpty) ...<Widget>[
            Text(s.text!, style: theme.textTheme.bodyMedium),
            const SizedBox(height: 8),
          ],
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
          Text(
            'Submitted ${Fmt.dateTime(s.submittedAt)}',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _SubmitForm extends StatefulWidget {
  const _SubmitForm({required this.assignment, required this.onSubmitted});

  final Assignment assignment;
  final Future<void> Function() onSubmitted;

  @override
  State<_SubmitForm> createState() => _SubmitFormState();
}

class _SubmitFormState extends State<_SubmitForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _text;
  late final TextEditingController _link;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final s = widget.assignment.submission;
    _text = TextEditingController(text: s?.text ?? '');
    _link = TextEditingController(text: s?.linkUrl ?? '');
  }

  @override
  void dispose() {
    _text.dispose();
    _link.dispose();
    super.dispose();
  }

  String? _validateLink(String? v) {
    final s = (v ?? '').trim();
    if (s.isEmpty) return null;
    final uri = Uri.tryParse(s);
    if (uri == null || !(uri.scheme == 'http' || uri.scheme == 'https') || uri.host.isEmpty) {
      return 'Enter a full link starting with https://';
    }
    return null;
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_text.text.trim().isEmpty && _link.text.trim().isEmpty) {
      showSnack(context, 'Write an answer or add a link first.');
      return;
    }
    final lms = context.lms;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      await lms.submitAssignment(widget.assignment.id, text: _text.text, linkUrl: _link.text);
      messenger.showSnackBar(SnackBar(
        content: Text(widget.assignment.isOverdue ? 'Submitted after the due date.' : 'Submitted! Your teacher will review it.'),
      ));
      await widget.onSubmitted();
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(errorMessage(e))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final resubmit = widget.assignment.submission != null;
    return SectionCard(
      title: resubmit ? 'Update your submission' : 'Submit your work',
      icon: Icons.edit_note_rounded,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            TextFormField(
              controller: _text,
              enabled: !_busy,
              minLines: 4,
              maxLines: 10,
              maxLength: 20000,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Your answer',
                alignLabelWithHint: true,
                border: OutlineInputBorder(),
                counterText: '',
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _link,
              enabled: !_busy,
              keyboardType: TextInputType.url,
              autocorrect: false,
              decoration: const InputDecoration(
                labelText: 'Link (optional)',
                hintText: 'https://scratch.mit.edu/projects/...',
                prefixIcon: Icon(Icons.link_rounded),
                border: OutlineInputBorder(),
              ),
              validator: _validateLink,
            ),
            const SizedBox(height: 6),
            Text(
              'To hand in a file, upload it to Google Drive or Scratch and paste the share link.',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _busy ? null : _submit,
              icon: _busy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.send_rounded),
              label: Text(resubmit ? 'Resubmit' : 'Submit'),
            ),
          ],
        ),
      ),
    );
  }
}
