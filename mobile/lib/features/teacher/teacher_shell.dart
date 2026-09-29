import 'package:flutter/material.dart';

import '../shared/nanobot_screens.dart';
import '../shared/profile_screen.dart';
import '../shared/role_shell.dart';
import 'classes_tab.dart';
import 'teacher_assignments_tab.dart';
import 'teacher_home_tab.dart';

class TeacherShell extends StatelessWidget {
  const TeacherShell({super.key});

  static const int homeTab = 0;
  static const int classesTab = 1;
  static const int assignmentsTab = 2;

  @override
  Widget build(BuildContext context) {
    return RoleShell(
      tabs: <ShellTab>[
        ShellTab(
          label: 'Home',
          icon: Icons.home_outlined,
          selectedIcon: Icons.home_rounded,
          builder: (_) => const TeacherHomeTab(),
        ),
        ShellTab(
          label: 'Classes',
          icon: Icons.groups_outlined,
          selectedIcon: Icons.groups_rounded,
          builder: (_) => const ClassesTab(),
        ),
        ShellTab(
          label: 'Grading',
          icon: Icons.assignment_outlined,
          selectedIcon: Icons.assignment_rounded,
          builder: (_) => const TeacherAssignmentsTab(),
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
