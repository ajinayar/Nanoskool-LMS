import 'package:flutter/material.dart';

/// Returns an error message to show, or null on success.
typedef LoginSubmit = Future<String?> Function(String identifier, String password);

/// Email/username + password form. Pure widget (no network) so it can be tested.
class LoginForm extends StatefulWidget {
  const LoginForm({super.key, required this.onSubmit, this.initialIdentifier});

  final LoginSubmit onSubmit;
  final String? initialIdentifier;

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _identifier;
  final TextEditingController _password = TextEditingController();
  bool _obscure = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _identifier = TextEditingController(text: widget.initialIdentifier ?? '');
  }

  @override
  void didUpdateWidget(covariant LoginForm oldWidget) {
    super.didUpdateWidget(oldWidget);
    final initial = widget.initialIdentifier;
    if (initial != null && initial != oldWidget.initialIdentifier && _identifier.text.isEmpty) {
      _identifier.text = initial;
    }
  }

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    FocusScope.of(context).unfocus();
    final valid = _formKey.currentState?.validate() ?? false;
    if (!valid) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    String? error;
    try {
      error = await widget.onSubmit(_identifier.text.trim(), _password.text);
    } catch (e) {
      error = e.toString();
    }
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = error;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Form(
      key: _formKey,
      child: AutofillGroup(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            TextFormField(
              key: const Key('login-identifier'),
              controller: _identifier,
              enabled: !_busy,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              autocorrect: false,
              autofillHints: const <String>[AutofillHints.username, AutofillHints.email],
              decoration: const InputDecoration(
                labelText: 'Email or username',
                prefixIcon: Icon(Icons.person_outline_rounded),
                border: OutlineInputBorder(),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your email or username' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('login-password'),
              controller: _password,
              enabled: !_busy,
              obscureText: _obscure,
              textInputAction: TextInputAction.done,
              autofillHints: const <String>[AutofillHints.password],
              onFieldSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  key: const Key('login-toggle-password'),
                  tooltip: _obscure ? 'Show password' : 'Hide password',
                  icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
              validator: (v) => (v == null || v.isEmpty) ? 'Enter your password' : null,
            ),
            if (_error != null) ...<Widget>[
              const SizedBox(height: 16),
              Container(
                key: const Key('login-error'),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.errorContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: <Widget>[
                    Icon(Icons.error_outline_rounded, color: scheme.onErrorContainer),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(_error!, style: TextStyle(color: scheme.onErrorContainer)),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              height: 52,
              child: FilledButton(
                key: const Key('login-submit'),
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: scheme.onPrimary),
                      )
                    : const Text('Sign in', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
