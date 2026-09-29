import 'package:flutter/material.dart';

/// Rounded progress bar with an optional label and percentage.
class ProgressBar extends StatelessWidget {
  const ProgressBar({super.key, required this.percent, this.label, this.showPercent = true, this.color, this.height = 8});

  /// 0 to 100
  final int percent;
  final String? label;
  final bool showPercent;
  final Color? color;
  final double height;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final value = (percent < 0 ? 0 : (percent > 100 ? 100 : percent)) / 100.0;
    final bar = ClipRRect(
      borderRadius: BorderRadius.circular(height),
      child: LinearProgressIndicator(
        value: value,
        minHeight: height,
        backgroundColor: scheme.surfaceContainerHighest,
        color: color ?? scheme.primary,
      ),
    );
    if (label == null && !showPercent) return bar;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Row(
          children: <Widget>[
            if (label != null)
              Expanded(
                child: Text(label!, style: theme.textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
              )
            else
              const Spacer(),
            if (showPercent) Text('$percent%', style: theme.textTheme.labelMedium),
          ],
        ),
        const SizedBox(height: 6),
        bar,
      ],
    );
  }
}

/// Circular percentage ring used on dashboards.
class ProgressRing extends StatelessWidget {
  const ProgressRing({super.key, required this.percent, this.size = 64, this.color, this.strokeWidth = 7});

  final int? percent;
  final double size;
  final Color? color;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final p = percent ?? 0;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: <Widget>[
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              value: (p < 0 ? 0 : (p > 100 ? 100 : p)) / 100.0,
              strokeWidth: strokeWidth,
              backgroundColor: scheme.surfaceContainerHighest,
              color: color ?? scheme.primary,
            ),
          ),
          Text(
            percent == null ? '-' : '$p%',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
