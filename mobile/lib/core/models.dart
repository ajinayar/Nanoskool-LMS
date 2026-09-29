// Typed models for the Nanoskool API. Every fromJson tolerates missing fields
// and references that are either an id string or a populated object.

typedef Json = Map<String, dynamic>;

/* ------------------------------------------------------------ helpers */

Json? asMap(Object? v) {
  if (v is Map<String, dynamic>) return v;
  if (v is Map) return Map<String, dynamic>.from(v);
  return null;
}

List<Json> asMapList(Object? v) {
  if (v is! List) return const <Json>[];
  final out = <Json>[];
  for (final item in v) {
    final m = asMap(item);
    if (m != null) out.add(m);
  }
  return out;
}

String? asStr(Object? v) {
  if (v is String) return v;
  if (v is num || v is bool) return v.toString();
  return null;
}

int? asInt(Object? v) {
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}

double? asDouble(Object? v) {
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v);
  return null;
}

bool asBool(Object? v, {bool fallback = false}) {
  if (v is bool) return v;
  return fallback;
}

DateTime? asDate(Object? v) {
  if (v is String && v.isNotEmpty) return DateTime.tryParse(v)?.toLocal();
  return null;
}

List<String> asStrList(Object? v) {
  if (v is! List) return const <String>[];
  return v.map(asStr).whereType<String>().toList();
}

List<int> asIntList(Object? v) {
  if (v is! List) return const <int>[];
  return v.map(asInt).whereType<int>().toList();
}

/// Id of a reference that may be an id string or a populated `{_id: ...}` object.
String? refId(Object? v) {
  if (v is String) return v;
  final m = asMap(v);
  if (m != null) return asStr(m['_id']);
  return null;
}

/// Display name of a populated reference (`name` or `title`).
String? refName(Object? v) {
  final m = asMap(v);
  if (m == null) return null;
  return asStr(m['name']) ?? asStr(m['title']);
}

/// Formats a points value without a trailing ".0".
String fmtPoints(double? v) {
  if (v == null) return '-';
  if (v == v.roundToDouble()) return v.toInt().toString();
  return v.toStringAsFixed(1);
}

/* --------------------------------------------------------------- people */

class Ref {
  const Ref(this.id, this.name);

  final String id;
  final String? name;

  static Ref? from(Object? v) {
    final id = refId(v);
    if (id == null) return null;
    return Ref(id, refName(v));
  }
}

class Person {
  const Person({
    required this.id,
    required this.name,
    this.rollNo,
    this.email,
    this.username,
    this.avatarUrl,
    this.className,
    this.classId,
  });

  final String id;
  final String name;
  final String? rollNo;
  final String? email;
  final String? username;
  final String? avatarUrl;
  final String? className;
  final String? classId;

  factory Person.fromJson(Object? raw) {
    final j = asMap(raw) ?? const <String, dynamic>{};
    final cls = j['class'] ?? j['classId'];
    return Person(
      id: refId(raw) ?? '',
      name: asStr(j['name']) ?? 'Student',
      rollNo: asStr(j['rollNo']),
      email: asStr(j['email']),
      username: asStr(j['username']),
      avatarUrl: asStr(j['avatarUrl']),
      className: refName(cls),
      classId: refId(cls),
    );
  }
}

class AppUser {
  const AppUser({
    required this.id,
    required this.role,
    required this.name,
    this.email,
    this.username,
    this.phone,
    this.avatarUrl,
    this.mustChangePassword = false,
    this.schoolName,
    this.partnerName,
    this.classId,
    this.className,
    this.rollNo,
    this.relation,
    this.subjects = const <String>[],
    this.children = const <Person>[],
  });

  final String id;
  final String role;
  final String name;
  final String? email;
  final String? username;
  final String? phone;
  final String? avatarUrl;
  final bool mustChangePassword;
  final String? schoolName;
  final String? partnerName;
  final String? classId;
  final String? className;
  final String? rollNo;
  final String? relation;
  final List<String> subjects;
  final List<Person> children;

  String get firstName {
    final parts = name.trim().split(RegExp(r'\s+'));
    return parts.isEmpty || parts.first.isEmpty ? name : parts.first;
  }

  String get roleLabel => roleLabelOf(role);

  static String roleLabelOf(String role) {
    switch (role) {
      case 'student':
        return 'Student';
      case 'parent':
        return 'Parent';
      case 'teacher':
        return 'Teacher';
      case 'school_admin':
        return 'School admin';
      case 'partner':
        return 'Partner';
      case 'super_admin':
        return 'Nanoskool admin';
      default:
        return role;
    }
  }

  factory AppUser.fromJson(Json j) {
    final cls = j['class'] ?? j['classId'];
    return AppUser(
      id: refId(j['_id']) ?? '',
      role: asStr(j['role']) ?? '',
      name: asStr(j['name']) ?? '',
      email: asStr(j['email']),
      username: asStr(j['username']),
      phone: asStr(j['phone']),
      avatarUrl: asStr(j['avatarUrl']),
      mustChangePassword: asBool(j['mustChangePassword']),
      schoolName: refName(j['school']) ?? refName(j['schoolId']),
      partnerName: refName(j['partner']) ?? refName(j['partnerId']),
      classId: refId(cls),
      className: refName(cls),
      rollNo: asStr(j['rollNo']),
      relation: asStr(j['relation']),
      subjects: asStrList(j['subjects']),
      children: asMapList(j['children']).map(Person.fromJson).toList(),
    );
  }
}

/* ----------------------------------------------------------- curriculum */

class CourseProgress {
  const CourseProgress({
    required this.courseId,
    required this.title,
    this.category,
    this.thumbnailUrl,
    this.teacherName,
    this.unitCount = 0,
    this.completedUnits = 0,
    this.progress = 0,
  });

  final String courseId;
  final String title;
  final String? category;
  final String? thumbnailUrl;
  final String? teacherName;
  final int unitCount;
  final int completedUnits;
  final int progress;

  factory CourseProgress.fromJson(Json j) {
    final course = asMap(j['course']) ?? const <String, dynamic>{};
    return CourseProgress(
      courseId: refId(j['course']) ?? '',
      title: asStr(course['title']) ?? 'Course',
      category: asStr(course['category']),
      thumbnailUrl: asStr(course['thumbnailUrl']),
      teacherName: refName(j['teacher']),
      unitCount: asInt(j['unitCount']) ?? 0,
      completedUnits: asInt(j['completedUnits']) ?? 0,
      progress: asInt(j['progress']) ?? 0,
    );
  }
}

class Course {
  const Course({
    required this.id,
    required this.title,
    this.description,
    this.category,
    this.level,
    this.thumbnailUrl,
    this.grades = const <int>[],
    this.unitCount = 0,
    this.completedUnits,
    this.progress,
  });

  final String id;
  final String title;
  final String? description;
  final String? category;
  final String? level;
  final String? thumbnailUrl;
  final List<int> grades;
  final int unitCount;
  final int? completedUnits;
  final int? progress;

  factory Course.fromJson(Json j) => Course(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'Course',
        description: asStr(j['description']),
        category: asStr(j['category']),
        level: asStr(j['level']),
        thumbnailUrl: asStr(j['thumbnailUrl']),
        grades: asIntList(j['grades']),
        unitCount: asInt(j['unitCount']) ?? 0,
        completedUnits: asInt(j['completedUnits']),
        progress: asInt(j['progress']),
      );
}

class UnitSummary {
  const UnitSummary({
    required this.id,
    required this.title,
    this.summary,
    this.type = 'lesson',
    this.durationMin,
    this.completed = false,
  });

  final String id;
  final String title;
  final String? summary;
  final String type;
  final int? durationMin;
  final bool completed;

  factory UnitSummary.fromJson(Json j) => UnitSummary(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'Unit',
        summary: asStr(j['summary']),
        type: asStr(j['type']) ?? 'lesson',
        durationMin: asInt(j['durationMin']),
        completed: asBool(j['completed']),
      );
}

class Chapter {
  const Chapter({required this.id, required this.title, this.description, this.units = const <UnitSummary>[]});

  final String id;
  final String title;
  final String? description;
  final List<UnitSummary> units;

  int get completedCount => units.where((u) => u.completed).length;

  factory Chapter.fromJson(Json j) => Chapter(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'Chapter',
        description: asStr(j['description']),
        units: asMapList(j['units']).map(UnitSummary.fromJson).toList(),
      );
}

class CourseDetail {
  const CourseDetail({
    required this.course,
    this.chapters = const <Chapter>[],
    this.quizzes = const <QuizSummary>[],
    this.unitCount = 0,
    this.completedUnits = 0,
    this.progress = 0,
  });

  final Course course;
  final List<Chapter> chapters;
  final List<QuizSummary> quizzes;
  final int unitCount;
  final int completedUnits;
  final int progress;

  /// First unit not yet completed, for a "Continue" button.
  UnitSummary? get nextUnit {
    for (final ch in chapters) {
      for (final u in ch.units) {
        if (!u.completed) return u;
      }
    }
    return null;
  }

  factory CourseDetail.fromJson(Json j) => CourseDetail(
        course: Course.fromJson(j),
        chapters: asMapList(j['chapters']).map(Chapter.fromJson).toList(),
        quizzes: asMapList(j['quizzes']).map(QuizSummary.fromJson).toList(),
        unitCount: asInt(j['unitCount']) ?? 0,
        completedUnits: asInt(j['completedUnits']) ?? 0,
        progress: asInt(j['progress']) ?? 0,
      );
}

class Unit {
  const Unit({
    required this.id,
    required this.title,
    this.courseId,
    this.courseTitle,
    this.chapterTitle,
    this.summary,
    this.type = 'lesson',
    this.body,
    this.videoUrl,
    this.fileUrl,
    this.linkUrl,
    this.durationMin,
    this.completed = false,
    this.prev,
    this.next,
  });

  final String id;
  final String title;
  final String? courseId;
  final String? courseTitle;
  final String? chapterTitle;
  final String? summary;
  final String type;
  final String? body;
  final String? videoUrl;
  final String? fileUrl;
  final String? linkUrl;
  final int? durationMin;
  final bool completed;
  final Ref? prev;
  final Ref? next;

  factory Unit.fromJson(Json j) => Unit(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'Unit',
        courseId: refId(j['course']) ?? refId(j['courseId']),
        courseTitle: refName(j['course']),
        chapterTitle: refName(j['chapter']),
        summary: asStr(j['summary']),
        type: asStr(j['type']) ?? 'lesson',
        body: asStr(j['body']),
        videoUrl: asStr(j['videoUrl']),
        fileUrl: asStr(j['fileUrl']),
        linkUrl: asStr(j['linkUrl']),
        durationMin: asInt(j['durationMin']),
        completed: asBool(j['completed']),
        prev: Ref.from(j['prev']),
        next: Ref.from(j['next']),
      );
}

class RecentUnit {
  const RecentUnit({required this.unitId, required this.unitTitle, this.courseId, this.courseTitle, this.completedAt});

  final String unitId;
  final String unitTitle;
  final String? courseId;
  final String? courseTitle;
  final DateTime? completedAt;

  factory RecentUnit.fromJson(Json j) => RecentUnit(
        unitId: refId(j['unitId']) ?? '',
        unitTitle: refName(j['unitId']) ?? 'Unit',
        courseId: refId(j['courseId']),
        courseTitle: refName(j['courseId']),
        completedAt: asDate(j['completedAt']),
      );
}

/* ------------------------------------------------------------ quizzes */

class QuizSummary {
  const QuizSummary({
    required this.id,
    required this.title,
    this.courseTitle,
    this.className,
    this.timeLimitMin,
    this.maxAttempts = 1,
    this.dueDate,
    this.questionCount = 0,
    this.totalPoints,
    this.attemptsUsed,
    this.bestPercent,
  });

  final String id;
  final String title;
  final String? courseTitle;
  final String? className;
  final int? timeLimitMin;
  final int maxAttempts;
  final DateTime? dueDate;
  final int questionCount;
  final int? totalPoints;
  final int? attemptsUsed;
  final int? bestPercent;

  bool get isClosed => dueDate != null && dueDate!.isBefore(DateTime.now());
  int get attemptsLeft {
    final left = maxAttempts - (attemptsUsed ?? 0);
    return left < 0 ? 0 : left;
  }

  factory QuizSummary.fromJson(Json j) => QuizSummary(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'Quiz',
        courseTitle: refName(j['courseId']),
        className: refName(j['classId']),
        timeLimitMin: asInt(j['timeLimitMin']),
        maxAttempts: asInt(j['maxAttempts']) ?? 1,
        dueDate: asDate(j['dueDate']),
        questionCount: asInt(j['questionCount']) ?? 0,
        totalPoints: asInt(j['totalPoints']),
        attemptsUsed: asInt(j['attemptsUsed']),
        bestPercent: asInt(j['bestPercent']),
      );
}

class Question {
  const Question({required this.id, required this.text, this.type = 'single', this.options = const <String>[], this.points = 1});

  final String id;
  final String text;

  /// single, multiple or true_false
  final String type;
  final List<String> options;
  final double points;

  bool get isMultiple => type == 'multiple';

  factory Question.fromJson(Json j) => Question(
        id: refId(j['_id']) ?? '',
        text: asStr(j['text']) ?? '',
        type: asStr(j['type']) ?? 'single',
        options: asStrList(j['options']),
        points: asDouble(j['points']) ?? 1,
      );
}

class QuizAttempt {
  const QuizAttempt({required this.id, this.quizTitle, this.score, this.maxScore, this.percent, this.submittedAt});

  final String id;
  final String? quizTitle;
  final double? score;
  final double? maxScore;
  final int? percent;
  final DateTime? submittedAt;

  factory QuizAttempt.fromJson(Json j) => QuizAttempt(
        id: refId(j['_id']) ?? '',
        quizTitle: refName(j['quizId']),
        score: asDouble(j['score']),
        maxScore: asDouble(j['maxScore']),
        percent: asInt(j['percent']),
        submittedAt: asDate(j['submittedAt']),
      );
}

class Quiz {
  const Quiz({
    required this.id,
    required this.title,
    this.description,
    this.courseTitle,
    this.questions = const <Question>[],
    this.timeLimitMin,
    this.maxAttempts = 1,
    this.dueDate,
    this.attempts = const <QuizAttempt>[],
    this.attemptsLeft = 0,
  });

  final String id;
  final String title;
  final String? description;
  final String? courseTitle;
  final List<Question> questions;
  final int? timeLimitMin;
  final int maxAttempts;
  final DateTime? dueDate;
  final List<QuizAttempt> attempts;
  final int attemptsLeft;

  bool get isClosed => dueDate != null && dueDate!.isBefore(DateTime.now());

  factory Quiz.fromJson(Json j) => Quiz(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'Quiz',
        description: asStr(j['description']),
        courseTitle: refName(j['courseId']),
        questions: asMapList(j['questions']).map(Question.fromJson).toList(),
        timeLimitMin: asInt(j['timeLimitMin']),
        maxAttempts: asInt(j['maxAttempts']) ?? 1,
        dueDate: asDate(j['dueDate']),
        attempts: asMapList(j['attempts']).map(QuizAttempt.fromJson).toList(),
        attemptsLeft: asInt(j['attemptsLeft']) ?? 0,
      );
}

class ReviewItem {
  const ReviewItem({
    required this.questionId,
    required this.text,
    this.options = const <String>[],
    this.selected = const <int>[],
    this.correct = const <int>[],
    this.isCorrect = false,
    this.points = 0,
    this.explanation,
  });

  final String questionId;
  final String text;
  final List<String> options;
  final List<int> selected;
  final List<int> correct;
  final bool isCorrect;
  final double points;
  final String? explanation;

  factory ReviewItem.fromJson(Json j) => ReviewItem(
        questionId: refId(j['questionId']) ?? '',
        text: asStr(j['text']) ?? '',
        options: asStrList(j['options']),
        selected: asIntList(j['selected']),
        correct: asIntList(j['correct']),
        isCorrect: asBool(j['isCorrect']),
        points: asDouble(j['points']) ?? 0,
        explanation: asStr(j['explanation']),
      );
}

class AttemptResult {
  const AttemptResult({this.score = 0, this.maxScore = 0, this.percent = 0, this.attemptsLeft = 0, this.review = const <ReviewItem>[]});

  final double score;
  final double maxScore;
  final int percent;
  final int attemptsLeft;
  final List<ReviewItem> review;

  factory AttemptResult.fromJson(Json j) => AttemptResult(
        score: asDouble(j['score']) ?? 0,
        maxScore: asDouble(j['maxScore']) ?? 0,
        percent: asInt(j['percent']) ?? 0,
        attemptsLeft: asInt(j['attemptsLeft']) ?? 0,
        review: asMapList(j['review']).map(ReviewItem.fromJson).toList(),
      );
}

/* -------------------------------------------------------- assignments */

class Submission {
  const Submission({
    required this.id,
    this.studentId,
    this.text,
    this.fileUrl,
    this.linkUrl,
    this.submittedAt,
    this.status = 'submitted',
    this.points,
    this.feedback,
    this.gradedAt,
  });

  final String id;
  final String? studentId;
  final String? text;
  final String? fileUrl;
  final String? linkUrl;
  final DateTime? submittedAt;

  /// submitted, graded or returned
  final String status;
  final double? points;
  final String? feedback;
  final DateTime? gradedAt;

  bool get isGraded => status == 'graded';
  bool get isReturned => status == 'returned';

  static Submission? maybe(Object? raw) {
    final j = asMap(raw);
    if (j == null) return null;
    return Submission(
      id: refId(j['_id']) ?? '',
      studentId: refId(j['studentId']),
      text: asStr(j['text']),
      fileUrl: asStr(j['fileUrl']),
      linkUrl: asStr(j['linkUrl']),
      submittedAt: asDate(j['submittedAt']),
      status: asStr(j['status']) ?? 'submitted',
      points: asDouble(j['points']),
      feedback: asStr(j['feedback']),
      gradedAt: asDate(j['gradedAt']),
    );
  }
}

class RosterEntry {
  const RosterEntry({required this.student, this.submission});

  final Person student;
  final Submission? submission;

  factory RosterEntry.fromJson(Json j) => RosterEntry(
        student: Person.fromJson(j['student']),
        submission: Submission.maybe(j['submission']),
      );
}

class Assignment {
  const Assignment({
    required this.id,
    required this.title,
    this.instructions,
    this.kind = 'homework',
    this.dueDate,
    this.maxPoints = 10,
    this.status = 'published',
    this.classId,
    this.className,
    this.courseTitle,
    this.teacherName,
    this.attachmentUrl,
    this.submission,
    this.submissionCount,
    this.gradedCount,
    this.roster = const <RosterEntry>[],
  });

  final String id;
  final String title;
  final String? instructions;
  final String kind;
  final DateTime? dueDate;
  final double maxPoints;
  final String status;
  final String? classId;
  final String? className;
  final String? courseTitle;
  final String? teacherName;
  final String? attachmentUrl;

  /// The signed-in student's (or selected child's) submission.
  final Submission? submission;

  /// Teacher view counts.
  final int? submissionCount;
  final int? gradedCount;

  /// Teacher view: every student in the class with their submission.
  final List<RosterEntry> roster;

  bool get isOverdue => dueDate != null && dueDate!.isBefore(DateTime.now());
  bool get acceptsSubmissions => status == 'published';

  factory Assignment.fromJson(Json j) => Assignment(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'Assignment',
        instructions: asStr(j['instructions']),
        kind: asStr(j['kind']) ?? 'homework',
        dueDate: asDate(j['dueDate']),
        maxPoints: asDouble(j['maxPoints']) ?? 10,
        status: asStr(j['status']) ?? 'published',
        classId: refId(j['classId']),
        className: refName(j['classId']),
        courseTitle: refName(j['courseId']),
        teacherName: refName(j['createdBy']),
        attachmentUrl: asStr(j['attachmentUrl']),
        submission: Submission.maybe(j['submission']),
        submissionCount: asInt(j['submissionCount']),
        gradedCount: asInt(j['gradedCount']),
        roster: asMapList(j['roster']).map(RosterEntry.fromJson).toList(),
      );
}

class DueItem {
  const DueItem({required this.id, required this.title, this.dueDate, this.kind});

  final String id;
  final String title;
  final DateTime? dueDate;
  final String? kind;

  factory DueItem.fromJson(Json j) => DueItem(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'Assignment',
        dueDate: asDate(j['dueDate']),
        kind: asStr(j['kind']),
      );
}

/* -------------------------------------------------------- school life */

class Remark {
  const Remark({required this.id, required this.text, this.category = 'general', this.teacherName, this.studentName, this.createdAt});

  final String id;
  final String text;

  /// appreciation, improvement, behaviour or general
  final String category;
  final String? teacherName;
  final String? studentName;
  final DateTime? createdAt;

  factory Remark.fromJson(Json j) => Remark(
        id: refId(j['_id']) ?? '',
        text: asStr(j['text']) ?? '',
        category: asStr(j['category']) ?? 'general',
        teacherName: refName(j['teacherId']),
        studentName: refName(j['studentId']),
        createdAt: asDate(j['createdAt']),
      );
}

class EventItem {
  const EventItem({
    required this.id,
    required this.title,
    this.description,
    this.location,
    this.startsAt,
    this.endsAt,
    this.schoolName,
    this.className,
  });

  final String id;
  final String title;
  final String? description;
  final String? location;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final String? schoolName;
  final String? className;

  factory EventItem.fromJson(Json j) => EventItem(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'Event',
        description: asStr(j['description']),
        location: asStr(j['location']),
        startsAt: asDate(j['startsAt']),
        endsAt: asDate(j['endsAt']),
        schoolName: refName(j['schoolId']),
        className: refName(j['classId']),
      );
}

class Announcement {
  const Announcement({
    required this.id,
    required this.title,
    this.body,
    this.kind = 'announcement',
    this.scope = 'school',
    this.pinned = false,
    this.authorName,
    this.schoolName,
    this.className,
    this.createdAt,
  });

  final String id;
  final String title;
  final String? body;
  final String kind;
  final String scope;
  final bool pinned;
  final String? authorName;
  final String? schoolName;
  final String? className;
  final DateTime? createdAt;

  String get audienceLabel {
    if (className != null) return className!;
    if (schoolName != null) return schoolName!;
    if (scope == 'global') return 'Nanoskool';
    return 'Everyone';
  }

  factory Announcement.fromJson(Json j) => Announcement(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'Announcement',
        body: asStr(j['body']),
        kind: asStr(j['kind']) ?? 'announcement',
        scope: asStr(j['scope']) ?? 'school',
        pinned: asBool(j['pinned']),
        authorName: refName(j['createdBy']),
        schoolName: refName(j['schoolId']),
        className: refName(j['classId']),
        createdAt: asDate(j['createdAt']),
      );
}

class AttendanceDay {
  const AttendanceDay({required this.date, required this.status});

  /// YYYY-MM-DD
  final String date;

  /// present, absent, late or excused
  final String status;

  DateTime? get day => DateTime.tryParse(date);

  factory AttendanceDay.fromJson(Json j) => AttendanceDay(
        date: asStr(j['date']) ?? '',
        status: asStr(j['status']) ?? 'present',
      );
}

class StudentAttendance {
  const StudentAttendance({this.days = const <AttendanceDay>[], this.total = 0, this.present = 0, this.percent});

  final List<AttendanceDay> days;
  final int total;
  final int present;
  final int? percent;

  factory StudentAttendance.fromJson(Json j) {
    final s = asMap(j['summary']) ?? const <String, dynamic>{};
    return StudentAttendance(
      days: asMapList(j['days']).map(AttendanceDay.fromJson).toList(),
      total: asInt(s['total']) ?? 0,
      present: asInt(s['present']) ?? 0,
      percent: asInt(s['percent']),
    );
  }
}

/// One class's register for one date (teacher view).
class AttendanceSheet {
  const AttendanceSheet({required this.date, this.exists = false, this.records = const <String, String>{}, this.students = const <Person>[]});

  final String date;

  /// Whether attendance was already saved for this date.
  final bool exists;

  /// studentId -> status
  final Map<String, String> records;
  final List<Person> students;

  factory AttendanceSheet.fromJson(Json j) {
    final sheet = asMap(j['sheet']);
    final records = <String, String>{};
    if (sheet != null) {
      for (final r in asMapList(sheet['records'])) {
        final sid = refId(r['studentId']);
        if (sid != null) records[sid] = asStr(r['status']) ?? 'present';
      }
    }
    return AttendanceSheet(
      date: asStr(j['date']) ?? '',
      exists: sheet != null,
      records: records,
      students: asMapList(j['students']).map(Person.fromJson).toList(),
    );
  }
}

/* ------------------------------------------------------------ classes */

class ClassInfo {
  const ClassInfo({required this.id, required this.name, this.grade, this.section, this.studentCount});

  final String id;
  final String name;
  final int? grade;
  final String? section;
  final int? studentCount;

  factory ClassInfo.fromJson(Json j) {
    final grade = asInt(j['grade']);
    final section = asStr(j['section']);
    final fallback = grade != null ? 'Grade $grade${section != null ? ' - $section' : ''}' : 'Class';
    return ClassInfo(
      id: refId(j['_id']) ?? '',
      name: asStr(j['name']) ?? fallback,
      grade: grade,
      section: section,
      studentCount: asInt(j['studentCount']),
    );
  }
}

class ClassCourse {
  const ClassCourse({required this.courseId, required this.courseTitle, this.className, this.teacherName});

  final String courseId;
  final String courseTitle;
  final String? className;
  final String? teacherName;

  factory ClassCourse.fromJson(Json j) => ClassCourse(
        courseId: refId(j['courseId']) ?? '',
        courseTitle: refName(j['courseId']) ?? 'Course',
        className: refName(j['classId']),
        teacherName: refName(j['teacherId']),
      );
}

class ClassDetail {
  const ClassDetail({required this.info, this.classTeacherName, this.students = const <Person>[], this.courses = const <ClassCourse>[]});

  final ClassInfo info;
  final String? classTeacherName;
  final List<Person> students;
  final List<ClassCourse> courses;

  factory ClassDetail.fromJson(Json j) => ClassDetail(
        info: ClassInfo.fromJson(j),
        classTeacherName: refName(j['classTeacher']),
        students: asMapList(j['students']).map(Person.fromJson).toList(),
        courses: asMapList(j['courses']).map(ClassCourse.fromJson).toList(),
      );
}

/* ---------------------------------------------------------- dashboards */

/// The report the API builds for one student (student home and parent cards).
class StudentReport {
  const StudentReport({
    required this.student,
    this.courses = const <CourseProgress>[],
    this.overallProgress,
    this.quizCount = 0,
    this.quizAverage,
    this.recentAttempts = const <QuizAttempt>[],
    this.assignmentsTotal = 0,
    this.assignmentsSubmitted = 0,
    this.assignmentsGraded = 0,
    this.assignmentsAverage,
    this.pending = const <DueItem>[],
    this.overdue = const <DueItem>[],
    this.attendanceDays = 0,
    this.attendancePresent = 0,
    this.attendancePercent,
    this.remarks = const <Remark>[],
  });

  final Person student;
  final List<CourseProgress> courses;
  final int? overallProgress;
  final int quizCount;
  final int? quizAverage;
  final List<QuizAttempt> recentAttempts;
  final int assignmentsTotal;
  final int assignmentsSubmitted;
  final int assignmentsGraded;
  final int? assignmentsAverage;
  final List<DueItem> pending;
  final List<DueItem> overdue;
  final int attendanceDays;
  final int attendancePresent;
  final int? attendancePercent;
  final List<Remark> remarks;

  Remark? get latestRemark => remarks.isEmpty ? null : remarks.first;

  factory StudentReport.fromJson(Json j) {
    final q = asMap(j['quizzes']) ?? const <String, dynamic>{};
    final a = asMap(j['assignments']) ?? const <String, dynamic>{};
    final att = asMap(j['attendance']) ?? const <String, dynamic>{};
    return StudentReport(
      student: Person.fromJson(j['student']),
      courses: asMapList(j['courses']).map(CourseProgress.fromJson).toList(),
      overallProgress: asInt(j['overallProgress']),
      quizCount: asInt(q['count']) ?? 0,
      quizAverage: asInt(q['averagePercent']),
      recentAttempts: asMapList(q['recent']).map(QuizAttempt.fromJson).toList(),
      assignmentsTotal: asInt(a['total']) ?? 0,
      assignmentsSubmitted: asInt(a['submitted']) ?? 0,
      assignmentsGraded: asInt(a['graded']) ?? 0,
      assignmentsAverage: asInt(a['averagePercent']),
      pending: asMapList(a['pending']).map(DueItem.fromJson).toList(),
      overdue: asMapList(a['overdue']).map(DueItem.fromJson).toList(),
      attendanceDays: asInt(att['days']) ?? 0,
      attendancePresent: asInt(att['present']) ?? 0,
      attendancePercent: asInt(att['percent']),
      remarks: asMapList(j['remarks']).map(Remark.fromJson).toList(),
    );
  }
}

class StudentDashboard {
  const StudentDashboard({
    required this.report,
    this.openQuizzes = const <QuizSummary>[],
    this.recentUnits = const <RecentUnit>[],
    this.upcomingEvents = const <EventItem>[],
  });

  final StudentReport report;
  final List<QuizSummary> openQuizzes;
  final List<RecentUnit> recentUnits;
  final List<EventItem> upcomingEvents;

  factory StudentDashboard.fromJson(Json j) => StudentDashboard(
        report: StudentReport.fromJson(j),
        openQuizzes: asMapList(j['openQuizzes']).map(QuizSummary.fromJson).toList(),
        recentUnits: asMapList(j['recentUnits']).map(RecentUnit.fromJson).toList(),
        upcomingEvents: asMapList(j['upcomingEvents']).map(EventItem.fromJson).toList(),
      );
}

class TeacherDashboard {
  const TeacherDashboard({
    this.classCount = 0,
    this.studentCount = 0,
    this.courseCount = 0,
    this.toGrade = 0,
    this.classes = const <ClassInfo>[],
    this.courses = const <ClassCourse>[],
    this.assignments = const <Assignment>[],
    this.upcomingEvents = const <EventItem>[],
  });

  final int classCount;
  final int studentCount;
  final int courseCount;
  final int toGrade;
  final List<ClassInfo> classes;
  final List<ClassCourse> courses;
  final List<Assignment> assignments;
  final List<EventItem> upcomingEvents;

  factory TeacherDashboard.fromJson(Json j) {
    final s = asMap(j['stats']) ?? const <String, dynamic>{};
    return TeacherDashboard(
      classCount: asInt(s['classes']) ?? 0,
      studentCount: asInt(s['students']) ?? 0,
      courseCount: asInt(s['courses']) ?? 0,
      toGrade: asInt(s['toGrade']) ?? 0,
      classes: asMapList(j['classes']).map(ClassInfo.fromJson).toList(),
      courses: asMapList(j['courses']).map(ClassCourse.fromJson).toList(),
      assignments: asMapList(j['assignments']).map(Assignment.fromJson).toList(),
      upcomingEvents: asMapList(j['upcomingEvents']).map(EventItem.fromJson).toList(),
    );
  }
}

/* ------------------------------------------------------------ NanoBot */

class ChatSummary {
  const ChatSummary({required this.id, required this.title, this.courseTitle, this.unitTitle, this.updatedAt});

  final String id;
  final String title;
  final String? courseTitle;
  final String? unitTitle;
  final DateTime? updatedAt;

  factory ChatSummary.fromJson(Json j) => ChatSummary(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'New conversation',
        courseTitle: refName(j['courseId']),
        unitTitle: refName(j['unitId']),
        updatedAt: asDate(j['updatedAt']),
      );
}

class ChatMessage {
  const ChatMessage({required this.role, required this.content, this.at});

  /// user or assistant
  final String role;
  final String content;
  final DateTime? at;

  bool get isUser => role == 'user';

  factory ChatMessage.fromJson(Json j) => ChatMessage(
        role: asStr(j['role']) ?? 'assistant',
        content: asStr(j['content']) ?? '',
        at: asDate(j['at']),
      );
}

class Chat {
  const Chat({required this.id, required this.title, this.courseTitle, this.unitTitle, this.messages = const <ChatMessage>[]});

  final String id;
  final String title;
  final String? courseTitle;
  final String? unitTitle;
  final List<ChatMessage> messages;

  factory Chat.fromJson(Json j) => Chat(
        id: refId(j['_id']) ?? '',
        title: asStr(j['title']) ?? 'New conversation',
        courseTitle: refName(j['courseId']),
        unitTitle: refName(j['unitId']),
        messages: asMapList(j['messages']).map(ChatMessage.fromJson).toList(),
      );
}
