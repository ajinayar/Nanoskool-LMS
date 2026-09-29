import 'package:flutter/material.dart';

import '../shared/nanobot_screens.dart';
import '../shared/profile_screen.dart';
import '../shared/role_shell.dart';
import 'courses_tab.dart';
import 'student_home_tab.dart';
import 'tasks_tab.dart';

class StudentShell extends StatelessWidget {
  const StudentShell({super.key});

  static const int homeTab = 0;
  static const int coursesTab = 1;
  static const int tasksTab = 2;
  static const int nanoBotTab = 3;

  @override
  Widget build(BuildContext context) {
    return RoleShell(
      tabs: <ShellTab>[
        ShellTab(
          label: 'Home',
          icon: Icons.home_outlined,
          selectedIcon: Icons.home_rounded,
          builder: (_) => const StudentHomeTab(),
        ),
        ShellTab(
          label: 'Courses',
          icon: Icons.menu_book_outlined,
          selectedIcon: Icons.menu_book_rounded,
          builder: (_) => const CoursesTab(),
        ),
        ShellTab(
          label: 'Tasks',
          icon: Icons.assignment_outlined,
          selectedIcon: Icons.assignment_rounded,
          builder: (_) => const TasksTab(),
        ),
        ShellTab(
          label: 'NanoBot',
          icon: Icons.smart_toy_outlined,
          selectedIcon: Icons.smart_toy_rounded,
          builder: (_) => const NanoBotScreen(),
        ),
        ShellTab(
          label: 'Me',
          icon: Icons.person_outline_rounded,
          selectedIcon: Icons.person_rounded,
          builder: (_) => const ProfileScreen(),
        ),
      ],
    );
  }
}
