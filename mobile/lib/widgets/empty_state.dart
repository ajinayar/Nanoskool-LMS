import 'package:flutter/material.dart';

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.message, this.icon = Icons.inbox_outlined, this.action});

  final String title;
  final String? message;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: scheme.primaryContainer, shape: BoxShape.circle),
            child: Icon(icon, size: 40, color: scheme.onPrimaryContainer),
          ),
          const SizedBox(height: 16),
          Text(title, style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
          if (message != null) ...<Widget>[
            const SizedBox(height: 6),
            Text(
              message!,
              style: theme.textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
          ],
          if (action != null) ...<Widget>[
            const SizedBox(height: 16),
            action!,
          ],
        ],
      ),
    );
  }
}
