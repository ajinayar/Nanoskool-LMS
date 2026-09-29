import 'package:flutter/material.dart';

import 'app.dart';
import 'core/auth_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(NanoskoolApp(auth: AuthService()));
}
