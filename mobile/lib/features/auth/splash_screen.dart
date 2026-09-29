import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import 'brand.dart';

/// Shown while the saved session is restored. Offers retry when offline.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    final theme = Theme.of(context);
    final error = auth.restoreError;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                const BrandMark(size: 88),
                const SizedBox(height: 32),
                if (error == null)
                  const SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 3))
                else ...<Widget>[
                  Icon(Icons.wifi_off_rounded, color: theme.colorScheme.error, size: 36),
                  const SizedBox(height: 12),
                  Text(error, textAlign: TextAlign.center, style: theme.textTheme.bodyLarge),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: auth.isRestoring ? null : auth.restore,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Try again'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: auth.isRestoring ? null : auth.discardSession,
                    child: const Text('Sign in again'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
