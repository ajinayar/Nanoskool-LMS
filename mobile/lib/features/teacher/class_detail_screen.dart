import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import '../shared/course_detail_screen.dart';
import 'add_remark_sheet.dart';
import 'attendance_screen.dart';
import 'student_remarks_screen.dart';

/// Class roster with attendance and remark actions.
class ClassDetailScreen extends StatelessWidget {
  const ClassDetailScreen({super.key, required this.classId, this.title});

  final String classId;
  final String? title;

  void _studentActions(BuildContext context, Person s) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            ListTile(
              leading: InitialsAvatar(name: s.name),
              title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(<String>[
                if (s.rollNo != null) 'Roll ${s.rollNo}',
                if (s.username != null) '@${s.username}',
              ].join(' · ')),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.rate_review_outlined),
              title: const Text('Add a remark'),
              subtitle: const Text('Appreciation, improvement, behaviour or a general note'),
              onTap: () {
                Navigator.of(ctx).pop();
                showAddRemarkSheet(context, s);
              },
            ),
            ListTile(
              leading: const Icon(Icons.history_rounded),
              title: const Text('View remarks'),
              onTap: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => StudentRemarksScreen(student: s)));
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: Text(title ?? 'Class')),
      body: AsyncView<ClassDetail>(
        load: () => lms.classDetail(classId),
        builder: (context, d, reload) {
          final theme = Theme.of(context);
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 24),
            children: <Widget>[
              SectionCard(
                margin: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                color: theme.colorScheme.primaryContainer,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Text(
                      d.info.name,
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700, color: theme.colorScheme.onPrimaryContainer),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      <String>[
                        '${d.students.length} students',
                        if (d.classTeacherName != null) 'Class teacher: ${d.classTeacherName}',
                      ].join(' · '),
                      style: TextStyle(color: theme.colorScheme.onPrimaryContainer),
                    ),
                    const SizedBox(height: 14),
                    FilledButton.icon(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => AttendanceScreen(classId: d.info.id, className: d.info.name)),
                      ),
                      icon: const Icon(Icons.fact_check_outlined),
                      label: const Text('Take attendance'),
                    ),
                  ],
                ),
              ),
              if (d.courses.isNotEmpty) ...<Widget>[
                const SectionHeader('Courses'),
                SectionCard(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    children: <Widget>[
                      for (final c in d.courses)
                        ListTile(
                          leading: const IconBadge(Icons.menu_book_outlined, color: AppColors.orange),
                          title: Text(c.courseTitle),
                          subtitle: c.teacherName == null ? null : Text(c.teacherName!),
                          trailing: const Icon(Icons.chevron_right_rounded),
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(builder: (_) => CourseDetailScreen(courseId: c.courseId, title: c.courseTitle)),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
              SectionHeader('Students (${d.students.length})'),
              if (d.students.isEmpty)
                const SectionCard(child: Text('No students in this class yet.'))
              else
                SectionCard(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    children: <Widget>[
                      for (final s in d.students)
                        ListTile(
                          leading: InitialsAvatar(name: s.name),
                          title: Text(s.name),
                          subtitle: Text(s.rollNo == null ? (s.username ?? '') : 'Roll ${s.rollNo}'),
                          trailing: IconButton(
                            tooltip: 'Add remark',
                            icon: const Icon(Icons.rate_review_outlined),
                            onPressed: () => showAddRemarkSheet(context, s),
                          ),
                          onTap: () => _studentActions(context, s),
                        ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
