import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/config.dart';
import '../../widgets/widgets.dart';
import 'brand.dart';

/// School admins, partners and super admins use the web portal.
class WebOnlyScreen extends StatelessWidget {
  const WebOnlyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    final user = auth.user;
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  const BrandMark(size: 72),
                  const SizedBox(height: 28),
                  Icon(Icons.desktop_windows_outlined, size: 48, color: theme.colorScheme.primary),
                  const SizedBox(height: 16),
                  Text(
                    'Hi ${user?.firstName ?? 'there'}, please use the web portal',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'The mobile app is for students, parents and teachers. '
                    '${user == null ? 'Your account' : '${user.roleLabel} accounts'} can manage schools, classes and courses on the Nanoskool web portal from a computer or tablet browser.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 28),
                  FilledButton.icon(
                    onPressed: () => openExternalUrl(context, AppConfig.webPortalUrl),
                    icon: const Icon(Icons.open_in_new_rounded),
                    label: const Text('Open web portal'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: auth.logout,
                    icon: const Icon(Icons.logout_rounded),
                    label: const Text('Sign out'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
