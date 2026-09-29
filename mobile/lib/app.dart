import 'package:flutter/material.dart';

import 'core/auth_scope.dart';
import 'core/auth_service.dart';
import 'core/theme.dart';
import 'features/auth/change_password_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/splash_screen.dart';
import 'features/auth/web_only_screen.dart';
import 'features/parent/parent_shell.dart';
import 'features/student/student_shell.dart';
import 'features/teacher/teacher_shell.dart';

class NanoskoolApp extends StatefulWidget {
  const NanoskoolApp({super.key, required this.auth});

  final AuthService auth;

  @override
  State<NanoskoolApp> createState() => _NanoskoolAppState();
}

class _NanoskoolAppState extends State<NanoskoolApp> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  AuthStatus _lastStatus = AuthStatus.unknown;
  String? _lastUserId;

  @override
  void initState() {
    super.initState();
    widget.auth.addListener(_onAuthChanged);
    widget.auth.restore();
  }

  @override
  void dispose() {
    widget.auth.removeListener(_onAuthChanged);
    super.dispose();
  }

  /// When the user signs out (or the session expires) or a different user
  /// signs in, drop any screens pushed on top of the home screen.
  void _onAuthChanged() {
    final status = widget.auth.status;
    final userId = widget.auth.user?.id;
    final signedOut = _lastStatus == AuthStatus.authenticated && status != AuthStatus.authenticated;
    final switchedUser = _lastUserId != null && userId != null && userId != _lastUserId;
    _lastStatus = status;
    _lastUserId = userId;
    if (signedOut || switchedUser) {
      _navigatorKey.currentState?.popUntil((route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScope(
      auth: widget.auth,
      child: MaterialApp(
        title: 'Nanoskool',
        debugShowCheckedModeBanner: false,
        navigatorKey: _navigatorKey,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: ThemeMode.system,
        home: const _RootRouter(),
      ),
    );
  }
}

/// Picks the home screen from the auth state and the user's role.
class _RootRouter extends StatelessWidget {
  const _RootRouter();

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    final user = auth.user;
    switch (auth.status) {
      case AuthStatus.unknown:
        return const SplashScreen();
      case AuthStatus.unauthenticated:
        return const LoginScreen();
      case AuthStatus.authenticated:
        if (user == null) return const SplashScreen();
        if (user.mustChangePassword) {
          return ChangePasswordScreen(key: ValueKey<String>('force-${user.id}'), forced: true);
        }
        switch (user.role) {
          case 'student':
            return StudentShell(key: ValueKey<String>('student-${user.id}'));
          case 'parent':
            return ParentShell(key: ValueKey<String>('parent-${user.id}'));
          case 'teacher':
            return TeacherShell(key: ValueKey<String>('teacher-${user.id}'));
          default:
            return const WebOnlyScreen();
        }
    }
  }
}
