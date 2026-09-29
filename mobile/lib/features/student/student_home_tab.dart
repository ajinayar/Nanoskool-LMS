import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import '../shared/course_detail_screen.dart';
import '../shared/events_screen.dart';
import '../shared/role_shell.dart';
import 'assignment_detail_screen.dart';
import 'courses_tab.dart';
import 'quiz_screens.dart';
import 'student_shell.dart';

class StudentHomeTab extends StatefulWidget {
  const StudentHomeTab({super.key});

  @override
  State<StudentHomeTab> createState() => _StudentHomeTabState();
}

class _StudentHomeTabState extends State<StudentHomeTab> {
  final GlobalKey<AsyncViewState<StudentDashboard>> _key = GlobalKey<AsyncViewState<StudentDashboard>>();

  Future<void> _push(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
    if (!mounted) return;
    await _key.currentState?.reload();
  }

  void _goToTab(int index) {
    context.findAncestorStateOfType<RoleShellState>()?.select(index);
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nanoskool'),
        actions: <Widget>[
          IconButton(
            tooltip: 'Events',
            icon: const Icon(Icons.event_outlined),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const EventsScreen())),
          ),
        ],
      ),
      body: AsyncView<StudentDashboard>(
        key: _key,
        load: lms.studentDashboard,
        builder: (context, data, reload) => _content(context, data),
      ),
    );
  }

  Widget _content(BuildContext context, StudentDashboard data) {
    final theme = Theme.of(context);
    final user = context.currentUser;
    final r = data.report;
    final due = <DueItem>[...r.overdue, ...r.pending];
    final remark = r.latestRemark;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      children: <Widget>[
        // Greeting + overall progress
        SectionCard(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 6),
          color: theme.colorScheme.primaryContainer,
          child: Row(
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      '${Fmt.greeting()}, ${user?.firstName ?? r.student.name}!',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      <String>[
                        if (r.student.className != null) r.student.className!,
                        if (user?.schoolName != null) user!.schoolName!,
                      ].join(' · '),
                      style: TextStyle(color: theme.colorScheme.onPrimaryContainer),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Overall course progress',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onPrimaryContainer),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              ProgressRing(percent: r.overallProgress, size: 76),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
          child: StatGrid(
            children: <Widget>[
              StatTile(
                icon: Icons.fact_check_outlined,
                value: Fmt.percent(r.attendancePercent),
                label: 'Attendance',
                color: AppColors.success,
              ),
              StatTile(
                icon: Icons.quiz_outlined,
                value: Fmt.percent(r.quizAverage),
                label: 'Quiz average (${r.quizCount})',
                color: AppColors.orange,
                onTap: () => _goToTab(StudentShell.tasksTab),
              ),
              StatTile(
                icon: Icons.assignment_turned_in_outlined,
                value: '${r.assignmentsSubmitted}/${r.assignmentsTotal}',
                label: 'Assignments done',
                onTap: () => _goToTab(StudentShell.tasksTab),
              ),
              StatTile(
                icon: Icons.grade_outlined,
                value: Fmt.percent(r.assignmentsAverage),
                label: 'Assignment grade',
                color: AppColors.info,
              ),
            ],
          ),
        ),

        // Continue learning
        SectionHeader(
          'Continue learning',
          trailing: TextButton(onPressed: () => _goToTab(StudentShell.coursesTab), child: const Text('All courses')),
        ),
        if (r.courses.isEmpty)
          const SectionCard(child: Text('No courses in your class yet.'))
        else
          for (final c in r.courses.take(4))
            CourseCard(
              title: c.title,
              category: c.category,
              progress: c.progress,
              subtitle: c.teacherName != null
                  ? '${c.completedUnits}/${c.unitCount} units · ${c.teacherName}'
                  : '${c.completedUnits}/${c.unitCount} units',
              onTap: () => _push(CourseDetailScreen(courseId: c.courseId, title: c.title)),
            ),

        // Assignments due
        SectionHeader(
          'Due soon',
          trailing: TextButton(onPressed: () => _goToTab(StudentShell.tasksTab), child: const Text('See all')),
        ),
        if (due.isEmpty)
          const SectionCard(
            child: Row(
              children: <Widget>[
                Icon(Icons.celebration_outlined, color: AppColors.success),
                SizedBox(width: 12),
                Expanded(child: Text("You're all caught up. No assignments due.")),
              ],
            ),
          )
        else
          SectionCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: <Widget>[
                for (final a in due.take(5))
                  ListTile(
                    leading: IconBadge(
                      Icons.assignment_outlined,
                      color: r.overdue.contains(a) ? AppColors.danger : AppColors.indigo,
                    ),
                    title: Text(a.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(
                      Fmt.due(a.dueDate),
                      style: TextStyle(color: r.overdue.contains(a) ? AppColors.danger : null),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => _push(AssignmentDetailScreen(assignmentId: a.id, title: a.title)),
                  ),
              ],
            ),
          ),

        // Open quizzes
        if (data.openQuizzes.isNotEmpty) ...<Widget>[
          const SectionHeader('Quizzes to take'),
          SectionCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: <Widget>[
                for (final q in data.openQuizzes)
                  ListTile(
                    leading: const IconBadge(Icons.quiz_outlined, color: AppColors.orange),
                    title: Text(q.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(q.dueDate == null ? 'Open now' : 'Closes ${Fmt.dateTime(q.dueDate)}'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => _push(QuizIntroScreen(quizId: q.id, title: q.title)),
                  ),
              ],
            ),
          ),
        ],

        // Latest remark
        if (remark != null) ...<Widget>[
          const SectionHeader('From your teacher'),
          RemarkCard(remark: remark),
        ],

        // Events
        if (data.upcomingEvents.isNotEmpty) ...<Widget>[
          SectionHeader(
            'Upcoming events',
            trailing: TextButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const EventsScreen())),
              child: const Text('See all'),
            ),
          ),
          SectionCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: <Widget>[for (final e in data.upcomingEvents) EventTile(event: e)],
            ),
          ),
        ],
      ],
    );
  }
}

/// A teacher's remark about a student.
class RemarkCard extends StatelessWidget {
  const RemarkCard({super.key, required this.remark, this.showStudent = false});

  final Remark remark;
  final bool showStudent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = statusColor(remark.category);
    return SectionCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          IconBadge(remarkIcon(remark.category), color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Pill(Fmt.capitalize(remark.category), color: color),
                    const Spacer(),
                    Text(Fmt.shortDate(remark.createdAt), style: theme.textTheme.bodySmall),
                  ],
                ),
                const SizedBox(height: 8),
                Text(remark.text, style: theme.textTheme.bodyMedium),
                const SizedBox(height: 6),
                Text(
                  <String>[
                    if (showStudent && remark.studentName != null) 'About ${remark.studentName}',
                    if (remark.teacherName != null) remark.teacherName!,
                  ].join(' · '),
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
