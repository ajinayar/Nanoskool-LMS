import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import 'submissions_screen.dart';

class TeacherAssignmentsTab extends StatefulWidget {
  const TeacherAssignmentsTab({super.key});

  @override
  State<TeacherAssignmentsTab> createState() => _TeacherAssignmentsTabState();
}

class _TeacherAssignmentsTabState extends State<TeacherAssignmentsTab> {
  final GlobalKey<AsyncViewState<List<Assignment>>> _key = GlobalKey<AsyncViewState<List<Assignment>>>();

  Future<void> _open(Assignment a) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => SubmissionsScreen(assignmentId: a.id, title: a.title)),
    );
    if (!mounted) return;
    await _key.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: const Text('Assignments')),
      body: AsyncView<List<Assignment>>(
        key: _key,
        load: () => lms.assignments(),
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.assignment_outlined,
        emptyTitle: 'No assignments yet',
        emptyMessage: 'Create assignments on the web portal. You can grade them here.',
        builder: (context, items, reload) {
          final open = items.where((a) => !a.isOverdue).toList();
          final past = items.where((a) => a.isOverdue).toList();
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 24),
            children: <Widget>[
              if (open.isNotEmpty) ...<Widget>[
                const SectionHeader('Open'),
                for (final a in open) _TeacherAssignmentCard(assignment: a, onTap: () => _open(a)),
              ],
              if (past.isNotEmpty) ...<Widget>[
                const SectionHeader('Past due date'),
                for (final a in past.reversed) _TeacherAssignmentCard(assignment: a, onTap: () => _open(a)),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _TeacherAssignmentCard extends StatelessWidget {
  const _TeacherAssignmentCard({required this.assignment, required this.onTap});

  final Assignment assignment;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final a = assignment;
    final submitted = a.submissionCount ?? 0;
    final graded = a.gradedCount ?? 0;
    final toGrade = submitted - graded;
    return SectionCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(a.title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              ),
              if (a.status != 'published') Pill(Fmt.capitalize(a.status), color: AppColors.warning),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            <String>[
              if (a.className != null) a.className!,
              if (a.courseTitle != null) a.courseTitle!,
              Fmt.due(a.dueDate),
            ].join(' · '),
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: <Widget>[
              Pill('$submitted submitted', color: AppColors.info, icon: Icons.upload_file_outlined),
              Pill('$graded graded', color: AppColors.success, icon: Icons.check_rounded),
              if (toGrade > 0) Pill('$toGrade to grade', color: AppColors.orange, icon: Icons.rate_review_outlined),
            ],
          ),
        ],
      ),
    );
  }
}
