import 'package:flutter/material.dart';

import '../core/theme.dart';

/// A small metric card: icon, big value, caption.
class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.icon, required this.value, required this.label, this.color, this.onTap});

  final IconData icon;
  final String value;
  final String label;
  final Color? color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final c = color ?? theme.colorScheme.primary;
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      color: theme.colorScheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: tint(c), borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, color: c, size: 20),
              ),
              const SizedBox(height: 10),
              Text(value, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Lays out stat tiles two (or more) per row.
class StatGrid extends StatelessWidget {
  const StatGrid({super.key, required this.children, this.columns = 2});

  final List<Widget> children;
  final int columns;

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < children.length; i += columns) {
      final cells = <Widget>[];
      for (var j = 0; j < columns; j++) {
        if (j > 0) cells.add(const SizedBox(width: 12));
        final index = i + j;
        cells.add(Expanded(child: index < children.length ? children[index] : const SizedBox.shrink()));
      }
      if (rows.isNotEmpty) rows.add(const SizedBox(height: 12));
      rows.add(IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: cells),
      ));
    }
    return Column(mainAxisSize: MainAxisSize.min, children: rows);
  }
}
