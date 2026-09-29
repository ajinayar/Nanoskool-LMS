import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:nanoskool/core/config.dart';
import 'package:nanoskool/core/format.dart';
import 'package:nanoskool/core/models.dart';
import 'package:nanoskool/features/auth/login_form.dart';

Widget _host(Widget child) => MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: child,
        ),
      ),
    );

void main() {
  testWidgets('login form validates, submits and shows the API error', (tester) async {
    String? gotIdentifier;
    String? gotPassword;
    await tester.pumpWidget(_host(LoginForm(
      onSubmit: (identifier, password) async {
        gotIdentifier = identifier;
        gotPassword = password;
        return 'Incorrect sign-in details';
      },
    )));

    // Empty form shows validation messages and does not submit.
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pump();
    expect(find.text('Enter your email or username'), findsOneWidget);
    expect(find.text('Enter your password'), findsOneWidget);
    expect(gotIdentifier, isNull);

    await tester.enterText(find.byKey(const Key('login-identifier')), '  aarav.gvps ');
    await tester.enterText(find.byKey(const Key('login-password')), 'Demo@1234');
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pumpAndSettle();

    expect(gotIdentifier, 'aarav.gvps');
    expect(gotPassword, 'Demo@1234');
    expect(find.text('Incorrect sign-in details'), findsOneWidget);
  });

  testWidgets('password visibility toggles', (tester) async {
    await tester.pumpWidget(_host(LoginForm(onSubmit: (_, __) async => null)));

    EditableText passwordField() => tester.widget<EditableText>(
          find.descendant(of: find.byKey(const Key('login-password')), matching: find.byType(EditableText)),
        );

    expect(passwordField().obscureText, isTrue);
    await tester.tap(find.byKey(const Key('login-toggle-password')));
    await tester.pump();
    expect(passwordField().obscureText, isFalse);
  });

  test('models tolerate id strings and populated refs', () {
    final populated = Assignment.fromJson(<String, dynamic>{
      '_id': 'a1',
      'title': 'Sketch your dream robot',
      'classId': <String, dynamic>{'_id': 'c1', 'name': 'Grade 6 - A'},
      'courseId': 'course1',
      'maxPoints': 20,
      'dueDate': '2026-10-03T07:31:36.137Z',
      'submission': <String, dynamic>{'_id': 's1', 'status': 'graded', 'points': 18.5},
    });
    expect(populated.classId, 'c1');
    expect(populated.className, 'Grade 6 - A');
    expect(populated.courseTitle, isNull);
    expect(populated.maxPoints, 20);
    expect(populated.submission?.isGraded, isTrue);
    expect(fmtPoints(populated.submission?.points), '18.5');

    final plain = Assignment.fromJson(<String, dynamic>{'_id': 'a2', 'classId': 'c2', 'submission': null});
    expect(plain.classId, 'c2');
    expect(plain.className, isNull);
    expect(plain.submission, isNull);
    expect(plain.title, 'Assignment');
  });

  test('formatting helpers', () {
    expect(Fmt.dateTime(DateTime(DateTime.now().year, 10, 12, 15)), '12 Oct, 3:00 PM');
    expect(Fmt.ymd(DateTime(2026, 3, 7)), '2026-03-07');
    expect(Fmt.initials('Aarav Nair'), 'AN');
    expect(Fmt.stripHtml('<p>Hello&nbsp;<b>world</b></p>'), 'Hello world');
    expect(AppConfig.resolveUrl('https://www.youtube.com/embed/8wHJKFe2Z-s'), 'https://www.youtube.com/watch?v=8wHJKFe2Z-s');
  });
}
