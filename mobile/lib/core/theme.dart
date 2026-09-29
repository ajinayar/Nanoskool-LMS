import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const Color indigo = Color(0xFF3F3DBF);
  static const Color orange = Color(0xFFF28B30);
  static const Color success = Color(0xFF2E9E5B);
  static const Color warning = Color(0xFFE0A100);
  static const Color danger = Color(0xFFD64545);
  static const Color info = Color(0xFF2F80ED);
}

class AppTheme {
  AppTheme._();

  static ThemeData light() => _build(Brightness.light);

  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final scheme = ColorScheme.fromSeed(seedColor: AppColors.indigo, brightness: brightness);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      visualDensity: VisualDensity.standard,
    );
  }
}

/// Soft background tint for a colour, e.g. for chips and icon circles.
Color tint(Color c, [int alpha = 36]) => c.withAlpha(alpha);
