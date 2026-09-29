import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api_client.dart';
import '../../core/auth_scope.dart';
import 'brand.dart';
import 'forgot_password_screen.dart';
import 'login_form.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  static const String _lastIdKey = 'last_identifier';
  String? _lastIdentifier;

  @override
  void initState() {
    super.initState();
    _loadLastIdentifier();
  }

  Future<void> _loadLastIdentifier() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final v = prefs.getString(_lastIdKey);
      if (mounted && v != null) setState(() => _lastIdentifier = v);
    } catch (_) {
      // Preferences are a convenience only.
    }
  }

  Future<String?> _login(String identifier, String password) async {
    final auth = context.auth;
    try {
      await auth.login(identifier, password);
    } on ApiException catch (e) {
      return e.message;
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_lastIdKey, identifier);
    } catch (_) {
      // Ignore.
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  const BrandMark(size: 72),
                  const SizedBox(height: 20),
                  Text(
                    'Welcome to Nanoskool',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Sign in with the details your school gave you.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 32),
                  LoginForm(onSubmit: _login, initialIdentifier: _lastIdentifier),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => const ForgotPasswordScreen()),
                    ),
                    child: const Text('Forgot password?'),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Students without an email can sign in with their username.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
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
