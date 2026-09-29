import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import '../shared/announcements_screen.dart';
import '../shared/events_screen.dart';
import '../shared/role_shell.dart';
import 'attendance_screen.dart';
import 'class_detail_screen.dart';
import 'submissions_screen.dart';
import 'teacher_shell.dart';

class TeacherHomeTab extends StatefulWidget {
  const TeacherHomeTab({super.key});

  @override
  State<TeacherHomeTab> createState() => _TeacherHomeTabState();
}

class _TeacherHomeTabState extends State<TeacherHomeTab> {
  final GlobalKey<AsyncViewState<TeacherDashboard>> _key = GlobalKey<AsyncViewState<TeacherDashboard>>();

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
            tooltip: 'Announcements',
            icon: const Icon(Icons.campaign_outlined),
            onPressed: () => _push(const AnnouncementsScreen()),
          ),
        ],
      ),
      body: AsyncView<TeacherDashboard>(
        key: _key,
        load: lms.teacherDashboard,
        builder: (context, data, reload) => _content(context, data),
      ),
    );
  }

  Widget _content(BuildContext context, TeacherDashboard d) {
    final theme = Theme.of(context);
    final user = context.currentUser;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 2),
          child: Text(
            '${Fmt.greeting()}, ${user?.firstName ?? ''}',
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
          child: Text(
            '${Fmt.weekday(DateTime.now())}${user?.schoolName != null ? ' · ${user!.schoolName}' : ''}',
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: StatGrid(
            children: <Widget>[
              StatTile(
                icon: Icons.groups_outlined,
                value: '${d.classCount}',
                label: 'Classes',
                onTap: () => _goToTab(TeacherShell.classesTab),
              ),
              StatTile(icon: Icons.person_outline_rounded, value: '${d.studentCount}', label: 'Students', color: AppColors.info),
              StatTile(icon: Icons.menu_book_outlined, value: '${d.courseCount}', label: 'Courses taught', color: AppColors.success),
              StatTile(
                icon: Icons.rate_review_outlined,
                value: '${d.toGrade}',
                label: 'To grade',
                color: d.toGrade > 0 ? AppColors.orange : AppColors.success,
                onTap: () => _goToTab(TeacherShell.assignmentsTab),
              ),
            ],
          ),
        ),

        SectionHeader(
          'Your classes',
          trailing: TextButton(onPressed: () => _goToTab(TeacherShell.classesTab), child: const Text('All')),
        ),
        if (d.classes.isEmpty)
          const SectionCard(child: Text('You have not been assigned to any classes yet.'))
        else
          for (final c in d.classes)
            SectionCard(
              padding: const EdgeInsets.fromLTRB(4, 4, 8, 4),
              onTap: () => _push(ClassDetailScreen(classId: c.id, title: c.name)),
              child: ListTile(
                leading: const IconBadge(Icons.groups_outlined, color: AppColors.indigo),
                title: Text(c.name),
                subtitle: Text('${c.studentCount ?? 0} students'),
                trailing: FilledButton.tonalIcon(
                  onPressed: () => _push(AttendanceScreen(classId: c.id, className: c.name)),
                  icon: const Icon(Icons.fact_check_outlined, size: 18),
                  label: const Text('Attendance'),
                ),
              ),
            ),

        SectionHeader(
          'Assignments',
          trailing: TextButton(onPressed: () => _goToTab(TeacherShell.assignmentsTab), child: const Text('All')),
        ),
        if (d.assignments.isEmpty)
          const SectionCard(child: Text('No published assignments. Create them on the web portal.'))
        else
          SectionCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: <Widget>[
                for (final a in d.assignments.take(5))
                  ListTile(
                    leading: const IconBadge(Icons.assignment_outlined, color: AppColors.orange),
                    title: Text(a.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(<String>[if (a.className != null) a.className!, Fmt.due(a.dueDate)].join(' · ')),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => _push(SubmissionsScreen(assignmentId: a.id, title: a.title)),
                  ),
              ],
            ),
          ),

        const SectionHeader('Quick links'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: <Widget>[
              Expanded(
                child: StatTile(
                  icon: Icons.campaign_outlined,
                  value: 'News',
                  label: 'Announcements',
                  onTap: () => _push(const AnnouncementsScreen()),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatTile(
                  icon: Icons.event_outlined,
                  value: 'Events',
                  label: 'School calendar',
                  color: AppColors.orange,
                  onTap: () => _push(const EventsScreen()),
                ),
              ),
            ],
          ),
        ),

        if (d.upcomingEvents.isNotEmpty) ...<Widget>[
          const SectionHeader('Upcoming events'),
          SectionCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(children: <Widget>[for (final e in d.upcomingEvents) EventTile(event: e)]),
          ),
        ],
      ],
    );
  }
}
