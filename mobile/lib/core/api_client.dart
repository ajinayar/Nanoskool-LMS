import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'config.dart';

/// An error from the API (or from reaching it). [message] is safe to show to users.
class ApiException implements Exception {
  const ApiException(this.statusCode, this.message, {this.code});

  /// HTTP status, or 0 when the server could not be reached.
  final int statusCode;
  final String message;
  final String? code;

  bool get isNetwork => statusCode == 0;
  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() => message;
}

/// Friendly text for any error thrown while loading data.
String errorMessage(Object error) {
  if (error is ApiException) return error.message;
  return 'Something went wrong. Please try again.';
}

/// Keeps the refresh token in the device keychain / keystore.
class TokenStore {
  TokenStore({FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage();

  static const String _refreshKey = 'ns_refresh_token';
  final FlutterSecureStorage _storage;

  Future<String?> readRefreshToken() async {
    try {
      return await _storage.read(key: _refreshKey);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _refreshKey, value: token);
  }

  Future<void> clear() async {
    try {
      await _storage.delete(key: _refreshKey);
    } catch (_) {
      // Nothing useful to do if the keystore is unavailable.
    }
  }
}

/// Thin JSON client for the Nanoskool API.
///
/// The access token lives in memory only. On a 401 the client refreshes the
/// session once (rotating the stored refresh token) and retries the request.
class ApiClient {
  ApiClient({required this.tokens, String? baseUrl, http.Client? httpClient})
      : baseUrl = baseUrl ?? AppConfig.apiBase,
        _http = httpClient ?? http.Client();

  final String baseUrl;
  final TokenStore tokens;
  final http.Client _http;

  String? _accessToken;
  Future<bool>? _refreshing;

  /// Called when the session can no longer be refreshed (user must sign in again).
  void Function()? onSessionExpired;

  bool get hasAccessToken => _accessToken != null;

  /// Stores a fresh token pair from login, refresh or change-password responses.
  Future<void> saveTokens(Map<String, dynamic> json) async {
    final access = json['accessToken'];
    final refresh = json['refreshToken'];
    if (access is String) _accessToken = access;
    if (refresh is String) await tokens.saveRefreshToken(refresh);
  }

  Future<void> clearSession() async {
    _accessToken = null;
    await tokens.clear();
  }

  Future<Object?> get(String path, {Map<String, String?>? query}) =>
      _send('GET', path, query: query);

  Future<Object?> post(String path, {Object? body, bool auth = true}) =>
      _send('POST', path, body: body, auth: auth);

  Future<Object?> put(String path, {Object? body}) => _send('PUT', path, body: body);

  Future<Object?> patch(String path, {Object? body}) => _send('PATCH', path, body: body);

  Future<Object?> delete(String path) => _send('DELETE', path);

  /// Refreshes the access token. Concurrent callers share one request.
  /// Returns false when the refresh token is missing or rejected.
  /// Throws [ApiException] with statusCode 0 when offline.
  Future<bool> refreshSession() {
    final pending = _refreshing;
    if (pending != null) return pending;
    final future = _doRefresh().whenComplete(() {
      _refreshing = null;
    });
    _refreshing = future;
    return future;
  }

  Future<bool> _doRefresh() async {
    final token = await tokens.readRefreshToken();
    if (token == null || token.isEmpty) return false;
    try {
      final json = await _send(
        'POST',
        '/auth/refresh',
        body: <String, dynamic>{'refreshToken': token},
        auth: false,
        retry: false,
      );
      if (json is Map<String, dynamic> && json['accessToken'] is String) {
        await saveTokens(json);
        return true;
      }
      return false;
    } on ApiException catch (e) {
      if (e.isNetwork || e.statusCode >= 500) rethrow;
      await clearSession();
      return false;
    }
  }

  Uri _uri(String path, Map<String, String?>? query) {
    final p = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$baseUrl$p');
    if (query == null) return uri;
    final clean = <String, String>{};
    query.forEach((key, value) {
      if (value != null && value.isNotEmpty) clean[key] = value;
    });
    if (clean.isEmpty) return uri;
    return uri.replace(queryParameters: clean);
  }

  Future<Object?> _send(
    String method,
    String path, {
    Object? body,
    Map<String, String?>? query,
    bool auth = true,
    bool retry = true,
  }) async {
    final request = http.Request(method, _uri(path, query));
    request.headers['accept'] = 'application/json';
    final token = _accessToken;
    if (auth && token != null) request.headers['authorization'] = 'Bearer $token';
    if (body != null) {
      request.headers['content-type'] = 'application/json; charset=utf-8';
      request.body = jsonEncode(body);
    }

    http.Response res;
    try {
      final streamed = await _http.send(request).timeout(AppConfig.requestTimeout);
      res = await http.Response.fromStream(streamed).timeout(AppConfig.requestTimeout);
    } on TimeoutException {
      throw const ApiException(0, 'The server is taking too long to respond. Please try again.');
    } on Exception {
      throw const ApiException(0, "Can't reach Nanoskool. Check your internet connection and try again.");
    }

    if (res.statusCode == 401 && auth && retry) {
      final refreshed = await refreshSession();
      if (refreshed) {
        return _send(method, path, body: body, query: query, auth: auth, retry: false);
      }
      onSessionExpired?.call();
      throw const ApiException(401, 'Your session has expired. Please sign in again.', code: 'unauthorized');
    }

    final decoded = _decode(res);
    if (res.statusCode >= 200 && res.statusCode < 300) return decoded;
    throw _toException(res.statusCode, decoded);
  }

  Object? _decode(http.Response res) {
    if (res.bodyBytes.isEmpty) return null;
    try {
      return jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      return null;
    }
  }

  ApiException _toException(int status, Object? json) {
    String? message;
    String? code;
    if (json is Map<String, dynamic>) {
      final err = json['error'];
      if (err is Map<String, dynamic>) {
        final m = err['message'];
        final c = err['code'];
        if (m is String) message = m;
        if (c is String) code = c;
        final details = err['details'];
        final fieldText = _fieldErrors(details);
        if (fieldText != null && (message == null || message == 'Validation failed')) {
          message = fieldText;
        }
      }
    }
    message ??= switch (status) {
      400 => 'Please check the details and try again.',
      401 => 'Please sign in again.',
      403 => "You don't have access to this.",
      404 => 'Not found. It may have been removed.',
      429 => 'Too many attempts. Please wait a few minutes.',
      _ => 'Something went wrong on our side. Please try again.',
    };
    return ApiException(status, message, code: code);
  }

  /// Flattens zod `{fieldErrors: {field: [msg]}, formErrors: [msg]}` into one line.
  String? _fieldErrors(Object? details) {
    if (details is! Map<String, dynamic>) return null;
    final parts = <String>[];
    final form = details['formErrors'];
    if (form is List) parts.addAll(form.whereType<String>());
    final fields = details['fieldErrors'];
    if (fields is Map<String, dynamic>) {
      for (final v in fields.values) {
        if (v is List) parts.addAll(v.whereType<String>());
      }
    }
    if (parts.isEmpty) return null;
    return parts.toSet().join('. ');
  }
}
