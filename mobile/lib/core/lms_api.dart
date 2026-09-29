import 'api_client.dart';
import 'models.dart';

/// Typed wrappers for the endpoints the mobile app uses.
class LmsApi {
  LmsApi(this.client);

  final ApiClient client;

  Json _map(Object? v) => asMap(v) ?? <String, dynamic>{};

  /* ------------------------------------------------------ dashboards */

  Future<StudentDashboard> studentDashboard() async =>
      StudentDashboard.fromJson(_map(await client.get('/dashboard')));

  Future<List<StudentReport>> parentChildren() async {
    final j = _map(await client.get('/dashboard'));
    return asMapList(j['children']).map(StudentReport.fromJson).toList();
  }

  Future<TeacherDashboard> teacherDashboard() async =>
      TeacherDashboard.fromJson(_map(await client.get('/dashboard')));

  Future<StudentReport> studentReport(String studentId) async =>
      StudentReport.fromJson(_map(await client.get('/reports/students/$studentId')));

  /* ------------------------------------------------------ curriculum */

  Future<List<Course>> courses({String? studentId}) async {
    final j = _map(await client.get('/courses', query: <String, String?>{'studentId': studentId, 'limit': '200'}));
    return asMapList(j['items']).map(Course.fromJson).toList();
  }

  Future<CourseDetail> course(String id, {String? studentId}) async =>
      CourseDetail.fromJson(_map(await client.get('/courses/$id', query: <String, String?>{'studentId': studentId})));

  Future<Unit> unit(String id) async => Unit.fromJson(_map(await client.get('/units/$id')));

  Future<void> completeUnit(String id) async {
    await client.post('/units/$id/complete');
  }

  Future<void> uncompleteUnit(String id) async {
    await client.delete('/units/$id/complete');
  }

  /* ----------------------------------------------------- assessments */

  Future<List<Assignment>> assignments({String? studentId, String? classId}) async {
    final j = await client.get('/assignments', query: <String, String?>{'studentId': studentId, 'classId': classId});
    return asMapList(j).map(Assignment.fromJson).toList();
  }

  Future<Assignment> assignment(String id) async =>
      Assignment.fromJson(_map(await client.get('/assignments/$id')));

  Future<void> submitAssignment(String id, {String? text, String? linkUrl}) async {
    final body = <String, dynamic>{};
    if (text != null && text.trim().isNotEmpty) body['text'] = text.trim();
    if (linkUrl != null && linkUrl.trim().isNotEmpty) body['linkUrl'] = linkUrl.trim();
    await client.post('/assignments/$id/submit', body: body);
  }

  Future<void> gradeSubmission(String submissionId, {required double points, String? feedback}) async {
    final body = <String, dynamic>{'points': points};
    if (feedback != null && feedback.trim().isNotEmpty) body['feedback'] = feedback.trim();
    await client.post('/submissions/$submissionId/grade', body: body);
  }

  Future<List<QuizSummary>> quizzes() async {
    final j = await client.get('/quizzes');
    return asMapList(j).map(QuizSummary.fromJson).toList();
  }

  Future<Quiz> quiz(String id) async => Quiz.fromJson(_map(await client.get('/quizzes/$id')));

  /// [answers] maps questionId to the selected option indexes.
  Future<AttemptResult> submitQuiz(String id, Map<String, List<int>> answers, DateTime startedAt) async {
    final list = answers.entries
        .map((e) => <String, dynamic>{'questionId': e.key, 'selected': e.value})
        .toList();
    final j = await client.post('/quizzes/$id/attempts', body: <String, dynamic>{
      'answers': list,
      'startedAt': startedAt.toUtc().toIso8601String(),
    });
    return AttemptResult.fromJson(_map(j));
  }

  /* ----------------------------------------------------- school life */

  Future<List<Announcement>> announcements() async {
    final j = await client.get('/announcements');
    return asMapList(j).map(Announcement.fromJson).toList();
  }

  Future<List<EventItem>> events({DateTime? from}) async {
    final j = await client.get('/events', query: <String, String?>{'from': from?.toUtc().toIso8601String()});
    return asMapList(j).map(EventItem.fromJson).toList();
  }

  Future<List<ClassInfo>> classes() async {
    final j = await client.get('/classes');
    return asMapList(j).map(ClassInfo.fromJson).toList();
  }

  Future<ClassDetail> classDetail(String id) async =>
      ClassDetail.fromJson(_map(await client.get('/classes/$id')));

  Future<AttendanceSheet> attendanceSheet(String classId, String date) async =>
      AttendanceSheet.fromJson(_map(await client.get('/attendance', query: <String, String?>{'classId': classId, 'date': date})));

  Future<void> saveAttendance(String classId, String date, Map<String, String> records) async {
    await client.put('/attendance', body: <String, dynamic>{
      'classId': classId,
      'date': date,
      'records': records.entries.map((e) => <String, dynamic>{'studentId': e.key, 'status': e.value}).toList(),
    });
  }

  Future<StudentAttendance> studentAttendance(String studentId) async =>
      StudentAttendance.fromJson(_map(await client.get('/attendance', query: <String, String?>{'studentId': studentId})));

  Future<List<Remark>> remarks({String? studentId}) async {
    final j = await client.get('/remarks', query: <String, String?>{'studentId': studentId});
    return asMapList(j).map(Remark.fromJson).toList();
  }

  Future<void> addRemark({
    required String studentId,
    required String category,
    required String text,
    required bool visibleToParent,
  }) async {
    await client.post('/remarks', body: <String, dynamic>{
      'studentId': studentId,
      'category': category,
      'text': text.trim(),
      'visibleToParent': visibleToParent,
    });
  }

  /* --------------------------------------------------------- NanoBot */

  Future<List<ChatSummary>> chats() async {
    final j = await client.get('/ai/chats');
    return asMapList(j).map(ChatSummary.fromJson).toList();
  }

  /// Creates a conversation, optionally about one unit. Returns its id.
  Future<String> createChat({String? unitId, String? title}) async {
    final body = <String, dynamic>{};
    if (unitId != null) body['unitId'] = unitId;
    if (title != null) body['title'] = title;
    final j = _map(await client.post('/ai/chats', body: body));
    final id = refId(j['_id']);
    if (id == null) throw const ApiException(500, 'NanoBot could not start a conversation.');
    return id;
  }

  Future<Chat> chat(String id) async => Chat.fromJson(_map(await client.get('/ai/chats/$id')));

  Future<void> deleteChat(String id) async {
    await client.delete('/ai/chats/$id');
  }

  /// Sends a message and returns NanoBot's reply plus the (possibly new) chat title.
  Future<({ChatMessage reply, String? title})> sendMessage(String chatId, String content) async {
    final j = _map(await client.post('/ai/chats/$chatId/messages', body: <String, dynamic>{'content': content}));
    final msg = asMap(j['message']);
    return (
      reply: msg == null ? const ChatMessage(role: 'assistant', content: '') : ChatMessage.fromJson(msg),
      title: asStr(j['title']),
    );
  }
}
