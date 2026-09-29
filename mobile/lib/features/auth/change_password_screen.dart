import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/auth_scope.dart';
import '../../widgets/widgets.dart';

/// Change password. When [forced] (first sign-in with a temporary password)
/// it is shown instead of the home screen and offers sign out instead of back.
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key, this.forced = false});

  final bool forced;

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _obscure = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String? _validateNew(String? v) {
    final s = v ?? '';
    if (s.length < 8) return 'Use at least 8 characters';
    if (!RegExp(r'[A-Za-z]').hasMatch(s)) return 'Include at least one letter';
    if (!RegExp(r'[0-9]').hasMatch(s)) return 'Include at least one number';
    if (s == _current.text) return 'Choose a different password';
    return null;
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.auth;
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await auth.changePassword(_current.text, _next.text);
      if (!mounted) return;
      messenger.showSnackBar(const SnackBar(content: Text('Password changed')));
      if (!widget.forced && navigator.canPop()) navigator.pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _signOut() async {
    final auth = context.auth;
    await auth.logout();
  }

  InputDecoration _decoration(String label) => InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        prefixIcon: const Icon(Icons.lock_outline_rounded),
      );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Change password'),
        automaticallyImplyLeading: !widget.forced,
        actions: <Widget>[
          if (widget.forced)
            TextButton(onPressed: _busy ? null : _signOut, child: const Text('Sign out')),
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: <Widget>[
              if (widget.forced) ...<Widget>[
                SectionCard(
                  margin: EdgeInsets.zero,
                  color: theme.colorScheme.primaryContainer,
                  child: Row(
                    children: <Widget>[
                      Icon(Icons.shield_outlined, color: theme.colorScheme.onPrimaryContainer),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Please choose a new password before you continue. Use the temporary password from your school as the current password.',
                          style: TextStyle(color: theme.colorScheme.onPrimaryContainer),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],
              TextFormField(
                controller: _current,
                obscureText: _obscure,
                enabled: !_busy,
                autofillHints: const <String>[AutofillHints.password],
                decoration: _decoration('Current password'),
                validator: (v) => (v == null || v.isEmpty) ? 'Enter your current password' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _next,
                obscureText: _obscure,
                enabled: !_busy,
                autofillHints: const <String>[AutofillHints.newPassword],
                decoration: _decoration('New password').copyWith(
                  helperText: 'At least 8 characters with a letter and a number',
                ),
                validator: _validateNew,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _confirm,
                obscureText: _obscure,
                enabled: !_busy,
                decoration: _decoration('Confirm new password'),
                validator: (v) => v != _next.text ? 'Passwords do not match' : null,
                onFieldSubmitted: (_) => _submit(),
              ),
              const SizedBox(height: 8),
              CheckboxListTile(
                value: !_obscure,
                onChanged: (v) => setState(() => _obscure = !(v ?? false)),
                title: const Text('Show passwords'),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
              ),
              if (_error != null) ...<Widget>[
                const SizedBox(height: 8),
                Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                height: 50,
                child: FilledButton(
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                      : const Text('Save new password'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
