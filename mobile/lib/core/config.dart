/// Build-time configuration. Override with --dart-define, for example:
/// flutter run --dart-define=API_URL=http://10.0.2.2:4000/api
class AppConfig {
  AppConfig._();

  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://api.nanoskool.in/api',
  );

  /// Where school admins, partners and super admins should sign in.
  static const String webPortalUrl = String.fromEnvironment(
    'WEB_URL',
    defaultValue: 'https://nanoskool.in',
  );

  static const String appVersion = '2.0.0';

  static const Duration requestTimeout = Duration(seconds: 30);

  /// Roles that have a mobile experience.
  static const List<String> mobileRoles = <String>['student', 'parent', 'teacher'];

  /// API base without a trailing slash, e.g. https://api.nanoskool.in/api
  static String get apiBase =>
      apiUrl.endsWith('/') ? apiUrl.substring(0, apiUrl.length - 1) : apiUrl;

  /// Scheme + host (+ port) of the API, used for relative file URLs.
  static String get apiOrigin {
    final uri = Uri.tryParse(apiBase);
    if (uri == null || !uri.hasScheme) return apiBase;
    return uri.hasPort ? '${uri.scheme}://${uri.host}:${uri.port}' : '${uri.scheme}://${uri.host}';
  }

  /// Turns stored URLs into something the device can open:
  /// relative paths get the API origin, YouTube embed links open the watch page.
  static String resolveUrl(String url) {
    var u = url.trim();
    if (u.isEmpty) return u;
    if (u.startsWith('//')) u = 'https:$u';
    if (u.startsWith('/')) u = '$apiOrigin$u';
    if (!u.contains('://')) u = 'https://$u';
    final embed = RegExp(r'youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]+)').firstMatch(u);
    if (embed != null) {
      return 'https://www.youtube.com/watch?v=${embed.group(1)}';
    }
    return u;
  }
}
