import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'config.dart';
import 'lms_api.dart';
import 'models.dart';

enum AuthStatus { unknown, unauthenticated, authenticated }

/// Owns the session: restore on launch, login, password changes and logout.
class AuthService extends ChangeNotifier {
  AuthService({ApiClient? client}) : api = client ?? ApiClient(tokens: TokenStore()) {
    lms = LmsApi(api);
    api.onSessionExpired = _handleExpired;
  }

  final ApiClient api;
  late final LmsApi lms;

  AuthStatus _status = AuthStatus.unknown;
  AppUser? _user;
  String? _restoreError;
  bool _restoring = false;

  AuthStatus get status => _status;
  AppUser? get user => _user;

  /// Set when the saved session could not be checked (usually offline).
  String? get restoreError => _restoreError;
  bool get isRestoring => _restoring;

  bool get isMobileRole => _user != null && AppConfig.mobileRoles.contains(_user!.role);

  /// Restores a saved session using the refresh token from secure storage.
  Future<void> restore() async {
    if (_restoring) return;
    _restoring = true;
    _restoreError = null;
    notifyListeners();
    try {
      final saved = await api.tokens.readRefreshToken();
      if (saved == null || saved.isEmpty) {
        _setSignedOut();
        return;
      }
      final ok = await api.refreshSession();
      if (!ok) {
        _setSignedOut();
        return;
      }
      await _loadMe();
      _status = AuthStatus.authenticated;
    } on ApiException catch (e) {
      if (e.isNetwork || e.statusCode >= 500) {
        // Keep the saved session; the splash screen offers a retry.
        _restoreError = e.message;
      } else {
        await api.clearSession();
        _setSignedOut();
      }
    } catch (_) {
      _restoreError = 'Something went wrong while opening Nanoskool.';
    } finally {
      _restoring = false;
      notifyListeners();
    }
  }

  /// Throws [ApiException] with a user-facing message on failure.
  Future<void> login(String identifier, String password) async {
    final json = await api.post(
      '/auth/login',
      body: <String, dynamic>{'identifier': identifier.trim(), 'password': password},
      auth: false,
    );
    final map = asMap(json);
    if (map == null) throw const ApiException(500, 'Unexpected response from the server.');
    await api.saveTokens(map);
    final userJson = asMap(map['user']);
    if (userJson != null) {
      _user = AppUser.fromJson(userJson);
    } else {
      await _loadMe();
    }
    _restoreError = null;
    _status = AuthStatus.authenticated;
    notifyListeners();
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    final json = await api.post('/auth/change-password', body: <String, dynamic>{
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
    final map = asMap(json);
    if (map != null) await api.saveTokens(map);
    await _loadMe();
    notifyListeners();
  }

  /// Returns the server's confirmation message.
  Future<String> forgotPassword(String email) async {
    final json = await api.post('/auth/forgot-password', body: <String, dynamic>{'email': email.trim()}, auth: false);
    return asStr(asMap(json)?['message']) ?? 'If that email is registered, a reset link has been sent.';
  }

  Future<void> refreshUser() async {
    await _loadMe();
    notifyListeners();
  }

  Future<void> logout() async {
    final token = await api.tokens.readRefreshToken();
    if (token != null) {
      try {
        await api.post('/auth/logout', body: <String, dynamic>{'refreshToken': token}, auth: false);
      } catch (_) {
        // Signing out locally is what matters.
      }
    }
    await api.clearSession();
    _setSignedOut();
    notifyListeners();
  }

  /// Gives up on a saved session that cannot be restored and shows login.
  Future<void> discardSession() async {
    await api.clearSession();
    _restoreError = null;
    _setSignedOut();
    notifyListeners();
  }

  Future<void> _loadMe() async {
    final json = await api.get('/auth/me');
    final map = asMap(json);
    if (map == null) throw const ApiException(500, 'Unexpected response from the server.');
    _user = AppUser.fromJson(map);
  }

  void _setSignedOut() {
    _user = null;
    _status = AuthStatus.unauthenticated;
  }

  void _handleExpired() {
    if (_status != AuthStatus.authenticated) return;
    api.clearSession();
    _setSignedOut();
    notifyListeners();
  }
}
