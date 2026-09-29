import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/config.dart';
import '../../core/models.dart';
import '../../widgets/widgets.dart';
import '../auth/change_password_screen.dart';
import 'announcements_screen.dart';
import 'events_screen.dart';

/// "Me" tab: profile details, shortcuts, change password and sign out.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, this.showAnnouncements = true, this.showEvents = true});

  final bool showAnnouncements;
  final bool showEvents;

  Future<void> _signOut(BuildContext context) async {
    final auth = context.auth;
    final ok = await confirmDialog(context, title: 'Sign out?', message: 'You will need your password to sign in again.', confirmLabel: 'Sign out');
    if (ok) await auth.logout();
  }

  void _push(BuildContext context, Widget screen) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    final user = auth.user;
    final theme = Theme.of(context);
    if (user == null) return const SizedBox.shrink();
    final details = <_Detail>[
      if (user.schoolName != null) _Detail(Icons.school_outlined, 'School', user.schoolName!),
      if (user.className != null) _Detail(Icons.class_outlined, 'Class', user.className!),
      if (user.rollNo != null) _Detail(Icons.tag_rounded, 'Roll number', user.rollNo!),
      if (user.email != null) _Detail(Icons.email_outlined, 'Email', user.email!),
      if (user.username != null) _Detail(Icons.alternate_email_rounded, 'Username', user.username!),
      if (user.phone != null && user.phone!.isNotEmpty) _Detail(Icons.phone_outlined, 'Phone', user.phone!),
      if (user.subjects.isNotEmpty) _Detail(Icons.science_outlined, 'Subjects', user.subjects.join(', ')),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Me')),
      body: RefreshIndicator(
        onRefresh: () async {
          try {
            await auth.refreshUser();
          } catch (_) {
            // Keep showing the cached profile.
          }
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          children: <Widget>[
            const SizedBox(height: 16),
            Center(child: InitialsAvatar(name: user.name, radius: 40)),
            const SizedBox(height: 12),
            Text(
              user.name,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Center(
              child: Pill(user.relation != null && user.role == 'parent' ? '${user.roleLabel} · ${user.relation}' : user.roleLabel),
            ),
            const SizedBox(height: 16),
            if (details.isNotEmpty)
              SectionCard(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  children: details
                      .map((d) => ListTile(
                            leading: Icon(d.icon),
                            title: Text(d.value),
                            subtitle: Text(d.label),
                          ))
                      .toList(),
                ),
              ),
            if (user.children.isNotEmpty)
              SectionCard(
                title: 'My children',
                icon: Icons.family_restroom_rounded,
                child: Column(
                  children: user.children.map((Person c) {
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: InitialsAvatar(name: c.name),
                      title: Text(c.name),
                      subtitle: Text(c.className ?? 'Student'),
                    );
                  }).toList(),
                ),
              ),
            SectionCard(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Column(
                children: <Widget>[
                  if (showAnnouncements)
                    ListTile(
                      leading: const Icon(Icons.campaign_outlined),
                      title: const Text('Announcements'),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () => _push(context, const AnnouncementsScreen()),
                    ),
                  if (showEvents)
                    ListTile(
                      leading: const Icon(Icons.event_outlined),
                      title: const Text('Events'),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () => _push(context, const EventsScreen()),
                    ),
                  ListTile(
                    leading: const Icon(Icons.password_rounded),
                    title: const Text('Change password'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => _push(context, const ChangePasswordScreen()),
                  ),
                  ListTile(
                    leading: Icon(Icons.logout_rounded, color: theme.colorScheme.error),
                    title: Text('Sign out', style: TextStyle(color: theme.colorScheme.error)),
                    onTap: () => _signOut(context),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Nanoskool ${AppConfig.appVersion}',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

class _Detail {
  const _Detail(this.icon, this.label, this.value);

  final IconData icon;
  final String label;
  final String value;
}
