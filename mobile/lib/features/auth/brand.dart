import 'package:flutter/material.dart';

import '../../core/theme.dart';

/// Nanoskool logo mark drawn with Material widgets (no image assets needed).
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 64, this.showName = true});

  final double size;
  final bool showName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mark = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: <Color>[AppColors.indigo, Color(0xFF6C6AE0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: <Widget>[
          Icon(Icons.smart_toy_outlined, color: Colors.white, size: size * 0.55),
          Positioned(
            right: size * 0.12,
            top: size * 0.12,
            child: Container(
              width: size * 0.18,
              height: size * 0.18,
              decoration: const BoxDecoration(color: AppColors.orange, shape: BoxShape.circle),
            ),
          ),
        ],
      ),
    );
    if (!showName) return Center(child: mark);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        mark,
        const SizedBox(height: 12),
        RichText(
          text: TextSpan(
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.3),
            children: <TextSpan>[
              TextSpan(text: 'Nano', style: TextStyle(color: theme.colorScheme.primary)),
              const TextSpan(text: 'skool', style: TextStyle(color: AppColors.orange)),
            ],
          ),
        ),
      ],
    );
  }
}
