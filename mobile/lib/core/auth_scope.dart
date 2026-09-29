import 'package:flutter/widgets.dart';

import 'auth_service.dart';
import 'lms_api.dart';
import 'models.dart';

/// Makes the [AuthService] available to the whole widget tree.
class AuthScope extends InheritedNotifier<AuthService> {
  const AuthScope({super.key, required AuthService auth, required super.child}) : super(notifier: auth);

  /// Subscribes the caller to auth changes.
  static AuthService of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AuthScope>();
    assert(scope != null, 'No AuthScope above this widget');
    return scope!.notifier!;
  }

  /// Reads the service without subscribing (safe in callbacks).
  static AuthService read(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<AuthScope>();
    assert(scope != null, 'No AuthScope above this widget');
    return scope!.notifier!;
  }
}

extension AuthContext on BuildContext {
  AuthService get auth => AuthScope.read(this);
  LmsApi get lms => AuthScope.read(this).lms;
  AppUser? get currentUser => AuthScope.read(this).user;
}
