import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/auth_scope.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _done;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.auth;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final msg = await auth.forgotPassword(_email.text);
      if (!mounted) return;
      setState(() => _done = msg);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: <Widget>[
            if (_done != null) ...<Widget>[
              Icon(Icons.mark_email_read_outlined, size: 56, color: theme.colorScheme.primary),
              const SizedBox(height: 16),
              Text(_done!, textAlign: TextAlign.center, style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(
                'Open the link in the email on this phone or a computer to choose a new password, then sign in here.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Back to sign in')),
            ] else
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Text(
                      "Enter the email address on your account and we'll send you a reset link.",
                      style: theme.textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Students who sign in with a username should ask their teacher or school to reset it.',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _email,
                      enabled: !_busy,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email_outlined),
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) {
                        final s = v?.trim() ?? '';
                        if (s.isEmpty) return 'Enter your email';
                        if (!s.contains('@') || !s.contains('.')) return 'Enter a valid email';
                        return null;
                      },
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    if (_error != null) ...<Widget>[
                      const SizedBox(height: 12),
                      Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      height: 50,
                      child: FilledButton(
                        onPressed: _busy ? null : _submit,
                        child: _busy
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                            : const Text('Send reset link'),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
