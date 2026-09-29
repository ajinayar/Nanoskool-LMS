import 'package:flutter/material.dart';

/// Rounded card with an optional title row and trailing action.
class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    this.title,
    this.icon,
    this.trailing,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    this.onTap,
    this.color,
  });

  final String? title;
  final IconData? icon;
  final Widget? trailing;
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final VoidCallback? onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: margin,
      elevation: 0,
      color: color ?? theme.colorScheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: padding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (title != null) ...<Widget>[
                Row(
                  children: <Widget>[
                    if (icon != null) ...<Widget>[
                      Icon(icon, size: 20, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                    ],
                    Expanded(
                      child: Text(title!, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                    ),
                    if (trailing != null) trailing!,
                  ],
                ),
                const SizedBox(height: 12),
              ],
              child,
            ],
          ),
        ),
      ),
    );
  }
}

/// A heading between list sections.
class SectionHeader extends StatelessWidget {
  const SectionHeader(this.text, {super.key, this.trailing});

  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 12, 6),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Text(
              text,
              style: theme.textTheme.titleSmall?.copyWith(color: theme.colorScheme.primary, fontWeight: FontWeight.w700),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
