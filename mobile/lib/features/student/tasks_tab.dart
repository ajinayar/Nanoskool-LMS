import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import 'assignment_detail_screen.dart';
import 'quiz_screens.dart';

enum _TaskView { assignments, quizzes }

class TasksTab extends StatefulWidget {
  const TasksTab({super.key});

  @override
  State<TasksTab> createState() => _TasksTabState();
}

class _TasksTabState extends State<TasksTab> {
  _TaskView _view = _TaskView.assignments;
  final GlobalKey<AsyncViewState<List<Assignment>>> _assignmentsKey = GlobalKey<AsyncViewState<List<Assignment>>>();
  final GlobalKey<AsyncViewState<List<QuizSummary>>> _quizzesKey = GlobalKey<AsyncViewState<List<QuizSummary>>>();

  Future<void> _openAssignment(Assignment a) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => AssignmentDetailScreen(assignmentId: a.id, title: a.title)),
    );
    if (!mounted) return;
    await _assignmentsKey.currentState?.reload();
  }

  Future<void> _openQuiz(QuizSummary q) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => QuizIntroScreen(quizId: q.id, title: q.title)),
    );
    if (!mounted) return;
    await _quizzesKey.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: const Text('Tasks')),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<_TaskView>(
                segments: const <ButtonSegment<_TaskView>>[
                  ButtonSegment<_TaskView>(
                    value: _TaskView.assignments,
                    icon: Icon(Icons.assignment_outlined),
                    label: Text('Assignments'),
                  ),
                  ButtonSegment<_TaskView>(
                    value: _TaskView.quizzes,
                    icon: Icon(Icons.quiz_outlined),
                    label: Text('Quizzes'),
                  ),
                ],
                selected: <_TaskView>{_view},
                onSelectionChanged: (s) => setState(() => _view = s.first),
              ),
            ),
          ),
          Expanded(
            child: IndexedStack(
              index: _view == _TaskView.assignments ? 0 : 1,
              children: <Widget>[
                AsyncView<List<Assignment>>(
                  key: _assignmentsKey,
                  load: () => lms.assignments(),
                  isEmpty: (items) => items.isEmpty,
                  emptyIcon: Icons.assignment_outlined,
                  emptyTitle: 'No assignments yet',
                  emptyMessage: 'Homework and projects from your teachers will appear here.',
                  builder: (context, items, reload) => _assignmentList(context, items),
                ),
                AsyncView<List<QuizSummary>>(
                  key: _quizzesKey,
                  load: lms.quizzes,
                  isEmpty: (items) => items.isEmpty,
                  emptyIcon: Icons.quiz_outlined,
                  emptyTitle: 'No quizzes yet',
                  emptyMessage: 'Quizzes for your courses will appear here.',
                  builder: (context, items, reload) => _quizList(context, items),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _assignmentList(BuildContext context, List<Assignment> items) {
    final todo = items.where((a) => a.submission == null && !a.isOverdue && a.acceptsSubmissions).toList();
    final overdue = items.where((a) => a.submission == null && (a.isOverdue || !a.acceptsSubmissions)).toList();
    final done = items.where((a) => a.submission != null).toList();
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      children: <Widget>[
        if (overdue.isNotEmpty) ...<Widget>[
          const SectionHeader('Overdue or closed'),
          for (final a in overdue) _AssignmentTile(assignment: a, onTap: () => _openAssignment(a)),
        ],
        if (todo.isNotEmpty) ...<Widget>[
          const SectionHeader('To do'),
          for (final a in todo) _AssignmentTile(assignment: a, onTap: () => _openAssignment(a)),
        ],
        if (done.isNotEmpty) ...<Widget>[
          const SectionHeader('Submitted'),
          for (final a in done) _AssignmentTile(assignment: a, onTap: () => _openAssignment(a)),
        ],
      ],
    );
  }

  Widget _quizList(BuildContext context, List<QuizSummary> items) {
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(top: 4, bottom: 24),
      itemCount: items.length,
      itemBuilder: (context, i) {
        final q = items[i];
        final attempted = (q.attemptsUsed ?? 0) > 0;
        final open = !q.isClosed && q.attemptsLeft > 0;
        return SectionCard(
          padding: EdgeInsets.zero,
          onTap: () => _openQuiz(q),
          child: ListTile(
            leading: IconBadge(Icons.quiz_outlined, color: open ? AppColors.orange : AppColors.success),
            title: Text(q.title),
            subtitle: Text(<String>[
              if (q.courseTitle != null) q.courseTitle!,
              '${q.questionCount} questions',
              if (q.timeLimitMin != null) '${q.timeLimitMin} min',
              if (q.dueDate != null) (q.isClosed ? 'Closed' : 'Closes ${Fmt.shortDate(q.dueDate)}'),
            ].join(' · ')),
            trailing: attempted
                ? Pill('Best ${Fmt.percent(q.bestPercent)}', color: AppColors.success)
                : (open ? const Pill('New', color: AppColors.orange) : null),
          ),
        );
      },
    );
  }
}

class _AssignmentTile extends StatelessWidget {
  const _AssignmentTile({required this.assignment, required this.onTap});

  final Assignment assignment;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final a = assignment;
    final s = a.submission;
    Widget trailing;
    if (s == null) {
      trailing = a.isOverdue ? const Pill('Missing', color: AppColors.danger) : const Pill('To do', color: AppColors.indigo);
    } else if (s.isGraded) {
      trailing = Pill('${fmtPoints(s.points)}/${fmtPoints(a.maxPoints)}', color: AppColors.success);
    } else if (s.isReturned) {
      trailing = const Pill('Returned', color: AppColors.warning);
    } else {
      trailing = const Pill('Submitted', color: AppColors.info);
    }
    return SectionCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: ListTile(
        leading: IconBadge(
          a.kind == 'project' ? Icons.construction_rounded : Icons.assignment_outlined,
          color: s == null && a.isOverdue ? AppColors.danger : AppColors.indigo,
        ),
        title: Text(a.title),
        subtitle: Text(<String>[
          if (a.courseTitle != null) a.courseTitle!,
          Fmt.due(a.dueDate),
        ].join(' · ')),
        trailing: trailing,
      ),
    );
  }
}
