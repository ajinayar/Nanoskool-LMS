import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import '../student/quiz_screens.dart';
import 'unit_viewer_screen.dart';

/// Chapters, units and quizzes of one course, with completion ticks.
/// Parents and teachers can pass [studentId] to see one student's progress.
class CourseDetailScreen extends StatefulWidget {
  const CourseDetailScreen({super.key, required this.courseId, this.title, this.studentId});

  final String courseId;
  final String? title;
  final String? studentId;

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  final GlobalKey<AsyncViewState<CourseDetail>> _key = GlobalKey<AsyncViewState<CourseDetail>>();

  bool get _isStudent => context.currentUser?.role == 'student';

  Future<void> _openUnit(String unitId) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => UnitViewerScreen(unitId: unitId)));
    if (!mounted) return;
    await _key.currentState?.reload();
  }

  Future<void> _openQuiz(QuizSummary quiz) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => QuizIntroScreen(quizId: quiz.id, title: quiz.title)));
    if (!mounted) return;
    await _key.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: Text(widget.title ?? 'Course')),
      body: AsyncView<CourseDetail>(
        key: _key,
        load: () => lms.course(widget.courseId, studentId: widget.studentId),
        builder: (context, data, reload) => _buildContent(context, data),
      ),
    );
  }

  Widget _buildContent(BuildContext context, CourseDetail data) {
    final theme = Theme.of(context);
    final c = data.course;
    final showProgress = _isStudent || widget.studentId != null;
    final next = data.nextUnit;
    final description = Fmt.stripHtml(c.description);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      children: <Widget>[
        SectionCard(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 6),
          color: theme.colorScheme.primaryContainer,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: <Widget>[
                  if (c.category != null) Pill(c.category!, color: AppColors.indigo),
                  if (c.level != null) Pill(Fmt.capitalize(c.level!), color: AppColors.orange),
                  Pill('${data.unitCount} units', color: AppColors.info),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                c.title,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
              if (description.isNotEmpty) ...<Widget>[
                const SizedBox(height: 6),
                Text(description, style: TextStyle(color: theme.colorScheme.onPrimaryContainer)),
              ],
              if (showProgress) ...<Widget>[
                const SizedBox(height: 14),
                ProgressBar(percent: data.progress, label: '${data.completedUnits} of ${data.unitCount} units done'),
              ],
              if (_isStudent && next != null) ...<Widget>[
                const SizedBox(height: 14),
                FilledButton.icon(
                  onPressed: () => _openUnit(next.id),
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: Text(data.completedUnits == 0 ? 'Start: ${next.title}' : 'Continue: ${next.title}', overflow: TextOverflow.ellipsis),
                ),
              ],
            ],
          ),
        ),
        if (data.chapters.isEmpty)
          const EmptyState(icon: Icons.menu_book_outlined, title: 'No lessons yet', message: 'Lessons will appear here once they are published.'),
        for (var i = 0; i < data.chapters.length; i++) _chapterCard(context, i, data.chapters[i], showProgress),
        if (data.quizzes.isNotEmpty) ...<Widget>[
          const SectionHeader('Quizzes'),
          for (final q in data.quizzes)
            SectionCard(
              padding: EdgeInsets.zero,
              child: ListTile(
                leading: const IconBadge(Icons.quiz_outlined, color: AppColors.orange),
                title: Text(q.title),
                subtitle: Text(<String>[
                  '${q.questionCount} questions',
                  if (q.timeLimitMin != null) '${q.timeLimitMin} min',
                ].join(' · ')),
                trailing: _isStudent ? const Icon(Icons.chevron_right_rounded) : null,
                onTap: _isStudent ? () => _openQuiz(q) : null,
              ),
            ),
        ],
      ],
    );
  }

  Widget _chapterCard(BuildContext context, int index, Chapter ch, bool showProgress) {
    final theme = Theme.of(context);
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(0, 12, 0, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    'Chapter ${index + 1}: ${ch.title}',
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                if (showProgress)
                  Text(
                    '${ch.completedCount}/${ch.units.length}',
                    style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          if (ch.units.isEmpty)
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Text('No units yet'),
            ),
          for (final u in ch.units)
            ListTile(
              leading: Icon(
                showProgress && u.completed ? Icons.check_circle_rounded : unitTypeIcon(u.type),
                color: showProgress && u.completed ? AppColors.success : theme.colorScheme.primary,
              ),
              title: Text(u.title),
              subtitle: Text(<String>[
                Fmt.capitalize(u.type),
                if (u.durationMin != null) '${u.durationMin} min',
              ].join(' · ')),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => _openUnit(u.id),
            ),
        ],
      ),
    );
  }
}
