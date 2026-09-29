import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import '../shared/course_detail_screen.dart';
import '../student/assignment_detail_screen.dart';
import '../student/courses_tab.dart';
import '../student/student_home_tab.dart';

/// A parent's view of one child: progress, assignments, attendance, remarks.
class ChildDetailScreen extends StatelessWidget {
  const ChildDetailScreen({super.key, required this.report});

  final StudentReport report;

  @override
  Widget build(BuildContext context) {
    final student = report.student;
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text(student.name),
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: <Widget>[
              Tab(text: 'Progress'),
              Tab(text: 'Assignments'),
              Tab(text: 'Attendance'),
              Tab(text: 'Remarks'),
            ],
          ),
        ),
        body: TabBarView(
          children: <Widget>[
            _ProgressTab(initial: report),
            _AssignmentsTab(studentId: student.id, classId: student.classId),
            _AttendanceTab(studentId: student.id),
            _RemarksTab(studentId: student.id),
          ],
        ),
      ),
    );
  }
}

class _ProgressTab extends StatelessWidget {
  const _ProgressTab({required this.initial});

  final StudentReport initial;

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    final theme = Theme.of(context);
    return AsyncView<StudentReport>(
      load: () async {
        try {
          return await lms.studentReport(initial.student.id);
        } catch (_) {
          return initial;
        }
      },
      builder: (context, r, reload) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(top: 8, bottom: 24),
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: StatGrid(
              children: <Widget>[
                StatTile(icon: Icons.trending_up_rounded, value: Fmt.percent(r.overallProgress), label: 'Course progress'),
                StatTile(
                  icon: Icons.quiz_outlined,
                  value: Fmt.percent(r.quizAverage),
                  label: '${r.quizCount} quizzes taken',
                  color: AppColors.orange,
                ),
                StatTile(
                  icon: Icons.assignment_turned_in_outlined,
                  value: '${r.assignmentsSubmitted}/${r.assignmentsTotal}',
                  label: 'Assignments submitted',
                  color: AppColors.info,
                ),
                StatTile(
                  icon: Icons.grade_outlined,
                  value: Fmt.percent(r.assignmentsAverage),
                  label: 'Assignment grade',
                  color: AppColors.success,
                ),
              ],
            ),
          ),
          const SectionHeader('Courses'),
          if (r.courses.isEmpty) const SectionCard(child: Text('No courses in this class yet.')),
          for (final c in r.courses)
            CourseCard(
              title: c.title,
              category: c.category,
              progress: c.progress,
              subtitle: '${c.completedUnits}/${c.unitCount} units',
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => CourseDetailScreen(courseId: c.courseId, title: c.title, studentId: r.student.id),
                ),
              ),
            ),
          if (r.recentAttempts.isNotEmpty) ...<Widget>[
            const SectionHeader('Recent quiz results'),
            SectionCard(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Column(
                children: <Widget>[
                  for (final a in r.recentAttempts.take(5))
                    ListTile(
                      leading: const IconBadge(Icons.quiz_outlined, color: AppColors.orange),
                      title: Text(a.quizTitle ?? 'Quiz'),
                      subtitle: Text(Fmt.dateTime(a.submittedAt)),
                      trailing: Text(
                        Fmt.percent(a.percent),
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AssignmentsTab extends StatelessWidget {
  const _AssignmentsTab({required this.studentId, this.classId});

  final String studentId;

  /// Limits the list to this child's class (the API otherwise returns
  /// assignments for every linked child's class).
  final String? classId;

  void _showDetails(BuildContext context, Assignment a) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.95,
        builder: (ctx, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.only(bottom: 24),
          children: <Widget>[
            AssignmentHeader(assignment: a),
            if ((a.instructions ?? '').trim().isNotEmpty)
              SectionCard(title: 'Instructions', child: HtmlContent(a.instructions!)),
            if (a.submission != null)
              SubmissionCard(submission: a.submission!, maxPoints: a.maxPoints, title: 'Submission')
            else
              SectionCard(
                child: Text(a.isOverdue ? 'Not submitted, and the due date has passed.' : 'Not submitted yet.'),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return AsyncView<List<Assignment>>(
      load: () => lms.assignments(studentId: studentId, classId: classId),
      isEmpty: (items) => items.isEmpty,
      emptyIcon: Icons.assignment_outlined,
      emptyTitle: 'No assignments yet',
      builder: (context, items, reload) => ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: items.length,
        itemBuilder: (context, i) {
          final a = items[i];
          final s = a.submission;
          String status;
          Color color;
          if (s == null) {
            status = a.isOverdue ? 'Missing' : 'Pending';
            color = a.isOverdue ? AppColors.danger : AppColors.indigo;
          } else if (s.isGraded) {
            status = '${fmtPoints(s.points)}/${fmtPoints(a.maxPoints)}';
            color = AppColors.success;
          } else {
            status = 'Submitted';
            color = AppColors.info;
          }
          return SectionCard(
            padding: EdgeInsets.zero,
            onTap: () => _showDetails(context, a),
            child: ListTile(
              leading: IconBadge(Icons.assignment_outlined, color: color),
              title: Text(a.title),
              subtitle: Text(<String>[
                if (a.courseTitle != null) a.courseTitle!,
                a.dueDate == null ? 'No due date' : 'Due ${Fmt.dateTime(a.dueDate)}',
              ].join(' · ')),
              trailing: Pill(status, color: color),
            ),
          );
        },
      ),
    );
  }
}

class _AttendanceTab extends StatelessWidget {
  const _AttendanceTab({required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    final theme = Theme.of(context);
    return AsyncView<StudentAttendance>(
      load: () => lms.studentAttendance(studentId),
      isEmpty: (a) => a.days.isEmpty,
      emptyIcon: Icons.fact_check_outlined,
      emptyTitle: 'No attendance recorded yet',
      builder: (context, a, reload) {
        final counts = <String, int>{};
        for (final d in a.days) {
          counts[d.status] = (counts[d.status] ?? 0) + 1;
        }
        return ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(top: 8, bottom: 24),
          children: <Widget>[
            SectionCard(
              child: Row(
                children: <Widget>[
                  ProgressRing(percent: a.percent, size: 80, color: AppColors.success),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('${a.present} of ${a.total} days present', style: theme.textTheme.titleMedium),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: <Widget>[
                            for (final status in const <String>['present', 'late', 'absent', 'excused'])
                              if ((counts[status] ?? 0) > 0)
                                Pill('${Fmt.capitalize(status)} ${counts[status]}', color: statusColor(status)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SectionHeader('Recent days'),
            SectionCard(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Column(
                children: <Widget>[
                  for (final d in a.days)
                    ListTile(
                      dense: true,
                      leading: Icon(Icons.circle, size: 12, color: statusColor(d.status)),
                      title: Text(d.day == null ? d.date : Fmt.weekday(d.day)),
                      trailing: Pill(Fmt.capitalize(d.status), color: statusColor(d.status)),
                    ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _RemarksTab extends StatelessWidget {
  const _RemarksTab({required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return AsyncView<List<Remark>>(
      load: () => lms.remarks(studentId: studentId),
      isEmpty: (items) => items.isEmpty,
      emptyIcon: Icons.chat_bubble_outline_rounded,
      emptyTitle: 'No remarks yet',
      emptyMessage: 'Notes from teachers will appear here.',
      builder: (context, items, reload) => ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: items.length,
        itemBuilder: (context, i) => RemarkCard(remark: items[i]),
      ),
    );
  }
}
