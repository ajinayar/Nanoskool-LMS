import 'package:flutter/material.dart';

import '../shared/announcements_screen.dart';
import '../shared/events_screen.dart';
import '../shared/nanobot_screens.dart';
import '../shared/profile_screen.dart';
import '../shared/role_shell.dart';
import 'parent_home_tab.dart';

class ParentShell extends StatelessWidget {
  const ParentShell({super.key});

  @override
  Widget build(BuildContext context) {
    return RoleShell(
      tabs: <ShellTab>[
        ShellTab(
          label: 'Home',
          icon: Icons.home_outlined,
          selectedIcon: Icons.home_rounded,
          builder: (_) => const ParentHomeTab(),
        ),
        ShellTab(
          label: 'News',
          icon: Icons.campaign_outlined,
          selectedIcon: Icons.campaign_rounded,
          builder: (_) => const AnnouncementsScreen(embedded: true),
        ),
        ShellTab(
          label: 'Events',
          icon: Icons.event_outlined,
          selectedIcon: Icons.event_rounded,
          builder: (_) => const EventsScreen(embedded: true),
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
          builder: (_) => const ProfileScreen(showAnnouncements: false, showEvents: false),
        ),
      ],
    );
  }
}
