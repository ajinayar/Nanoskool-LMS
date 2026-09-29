import 'package:flutter/material.dart';

import '../core/api_client.dart';

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final offline = error is ApiException && (error as ApiException).isNetwork;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(offline ? Icons.wifi_off_rounded : Icons.error_outline_rounded, size: 48, color: scheme.error),
          const SizedBox(height: 12),
          Text(
            offline ? 'You seem to be offline' : 'Could not load this',
            style: theme.textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            errorMessage(error),
            style: theme.textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
          if (onRetry != null) ...<Widget>[
            const SizedBox(height: 16),
            FilledButton.tonalIcon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try again'),
            ),
          ],
        ],
      ),
    );
  }
}
