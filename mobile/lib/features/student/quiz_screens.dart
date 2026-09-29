import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';

/// Quiz overview: questions, time limit, attempts, then "Start quiz".
class QuizIntroScreen extends StatefulWidget {
  const QuizIntroScreen({super.key, required this.quizId, this.title});

  final String quizId;
  final String? title;

  @override
  State<QuizIntroScreen> createState() => _QuizIntroScreenState();
}

class _QuizIntroScreenState extends State<QuizIntroScreen> {
  final GlobalKey<AsyncViewState<Quiz>> _key = GlobalKey<AsyncViewState<Quiz>>();

  Future<void> _start(Quiz quiz) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => QuizTakerScreen(quiz: quiz)));
    if (!mounted) return;
    await _key.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: Text(widget.title ?? 'Quiz')),
      body: AsyncView<Quiz>(
        key: _key,
        load: () => lms.quiz(widget.quizId),
        builder: (context, quiz, reload) => _content(context, quiz),
      ),
    );
  }

  Widget _content(BuildContext context, Quiz quiz) {
    final theme = Theme.of(context);
    final canStart = quiz.attemptsLeft > 0 && !quiz.isClosed && quiz.questions.isNotEmpty;
    String? blocked;
    if (quiz.questions.isEmpty) {
      blocked = 'This quiz has no questions yet.';
    } else if (quiz.isClosed) {
      blocked = 'This quiz closed on ${Fmt.dateTime(quiz.dueDate)}.';
    } else if (quiz.attemptsLeft <= 0) {
      blocked = 'You have used all your attempts.';
    }
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
              if (quiz.courseTitle != null)
                Text(quiz.courseTitle!, style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.onPrimaryContainer)),
              const SizedBox(height: 4),
              Text(
                quiz.title,
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700, color: theme.colorScheme.onPrimaryContainer),
              ),
              if ((quiz.description ?? '').trim().isNotEmpty) ...<Widget>[
                const SizedBox(height: 6),
                Text(Fmt.stripHtml(quiz.description), style: TextStyle(color: theme.colorScheme.onPrimaryContainer)),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: StatGrid(
            columns: 3,
            children: <Widget>[
              StatTile(icon: Icons.help_outline_rounded, value: '${quiz.questions.length}', label: 'Questions'),
              StatTile(
                icon: Icons.timer_outlined,
                value: quiz.timeLimitMin == null ? 'None' : '${quiz.timeLimitMin}m',
                label: 'Time limit',
                color: AppColors.orange,
              ),
              StatTile(
                icon: Icons.replay_rounded,
                value: '${quiz.attemptsLeft}',
                label: 'Attempts left',
                color: AppColors.success,
              ),
            ],
          ),
        ),
        if (quiz.dueDate != null)
          ListTile(
            leading: const Icon(Icons.event_outlined),
            title: Text(quiz.isClosed ? 'Closed' : 'Open until ${Fmt.dateTime(quiz.dueDate)}'),
          ),
        if (quiz.attempts.isNotEmpty) ...<Widget>[
          const SectionHeader('Your attempts'),
          for (final a in quiz.attempts)
            ListTile(
              leading: IconBadge(Icons.assignment_turned_in_outlined, color: _scoreColor(a.percent)),
              title: Text('${fmtPoints(a.score)} / ${fmtPoints(a.maxScore)}  ·  ${Fmt.percent(a.percent)}'),
              subtitle: Text(Fmt.dateTime(a.submittedAt)),
            ),
        ],
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              if (blocked != null) ...<Widget>[
                Text(blocked, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
                const SizedBox(height: 12),
              ] else if (quiz.timeLimitMin != null) ...<Widget>[
                Text(
                  'The timer starts when you tap Start. Your answers are submitted automatically when time runs out.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 12),
              ],
              SizedBox(
                height: 52,
                child: FilledButton.icon(
                  onPressed: canStart ? () => _start(quiz) : null,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: Text(quiz.attempts.isEmpty ? 'Start quiz' : 'Try again'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

Color _scoreColor(int? percent) {
  final p = percent ?? 0;
  if (p >= 80) return AppColors.success;
  if (p >= 50) return AppColors.warning;
  return AppColors.danger;
}

/// One question per page, optional countdown, then submit.
class QuizTakerScreen extends StatefulWidget {
  const QuizTakerScreen({super.key, required this.quiz});

  final Quiz quiz;

  @override
  State<QuizTakerScreen> createState() => _QuizTakerScreenState();
}

class _QuizTakerScreenState extends State<QuizTakerScreen> {
  final Map<String, Set<int>> _answers = <String, Set<int>>{};
  late final DateTime _startedAt;
  int _index = 0;
  Timer? _timer;
  int? _secondsLeft;
  bool _submitting = false;
  bool _finished = false;

  List<Question> get _questions => widget.quiz.questions;

  @override
  void initState() {
    super.initState();
    _startedAt = DateTime.now();
    final limit = widget.quiz.timeLimitMin;
    if (limit != null && limit > 0) {
      _secondsLeft = limit * 60;
      _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _tick() {
    final left = _secondsLeft;
    if (left == null || !mounted) return;
    if (left <= 1) {
      _timer?.cancel();
      setState(() => _secondsLeft = 0);
      _submit(auto: true);
      return;
    }
    setState(() => _secondsLeft = left - 1);
  }

  void _select(Question q, int option) {
    setState(() {
      final current = _answers[q.id] ?? <int>{};
      if (q.isMultiple) {
        if (current.contains(option)) {
          current.remove(option);
        } else {
          current.add(option);
        }
        _answers[q.id] = current;
      } else {
        _answers[q.id] = <int>{option};
      }
    });
  }

  int get _answeredCount => _questions.where((q) => (_answers[q.id] ?? const <int>{}).isNotEmpty).length;

  Future<void> _submit({bool auto = false}) async {
    if (_submitting || _finished) return;
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final lms = context.lms;
    if (!auto) {
      final unanswered = _questions.length - _answeredCount;
      final ok = await confirmDialog(
        context,
        title: 'Submit quiz?',
        message: unanswered > 0
            ? 'You have $unanswered unanswered question${unanswered == 1 ? '' : 's'}. You cannot change answers after submitting.'
            : 'You cannot change your answers after submitting.',
        confirmLabel: 'Submit',
      );
      if (!ok || !mounted) return;
    }
    setState(() => _submitting = true);
    final payload = <String, List<int>>{
      for (final q in _questions) q.id: ((_answers[q.id] ?? <int>{}).toList()..sort()),
    };
    try {
      final result = await lms.submitQuiz(widget.quiz.id, payload, _startedAt);
      _timer?.cancel();
      _finished = true;
      if (!mounted) return;
      if (auto) messenger.showSnackBar(const SnackBar(content: Text("Time's up! Your answers were submitted.")));
      await navigator.pushReplacement(
        MaterialPageRoute<void>(builder: (_) => QuizResultScreen(quizTitle: widget.quiz.title, result: result)),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      messenger.showSnackBar(SnackBar(content: Text(errorMessage(e))));
    }
  }

  Future<void> _confirmLeave() async {
    final navigator = Navigator.of(context);
    final ok = await confirmDialog(
      context,
      title: 'Leave the quiz?',
      message: 'Your answers will not be saved and this attempt will not count.',
      confirmLabel: 'Leave',
      destructive: true,
    );
    if (ok) {
      _finished = true;
      _timer?.cancel();
      navigator.pop();
    }
  }

  String _clock(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final q = _questions[_index];
    final selected = _answers[q.id] ?? const <int>{};
    final isLast = _index == _questions.length - 1;
    final left = _secondsLeft;
    return PopScope(
      canPop: _finished,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _confirmLeave();
      },
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.close_rounded), tooltip: 'Leave quiz', onPressed: _confirmLeave),
          title: Text('Question ${_index + 1} of ${_questions.length}'),
          actions: <Widget>[
            if (left != null)
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Center(
                  child: Pill(
                    _clock(left),
                    icon: Icons.timer_outlined,
                    color: left <= 60 ? AppColors.danger : AppColors.indigo,
                  ),
                ),
              ),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(4),
            child: LinearProgressIndicator(value: (_index + 1) / _questions.length, minHeight: 4),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          children: <Widget>[
            Text(q.text, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(
              q.isMultiple ? 'Select all that apply' : 'Select one answer',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            for (var i = 0; i < q.options.length; i++)
              _OptionTile(
                label: q.options[i],
                selected: selected.contains(i),
                multiple: q.isMultiple,
                onTap: _submitting ? null : () => _select(q, i),
              ),
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Row(
              children: <Widget>[
                OutlinedButton.icon(
                  onPressed: _index == 0 || _submitting ? null : () => setState(() => _index--),
                  icon: const Icon(Icons.chevron_left_rounded),
                  label: const Text('Back'),
                ),
                const Spacer(),
                if (isLast)
                  FilledButton.icon(
                    onPressed: _submitting ? null : () => _submit(),
                    icon: _submitting
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.send_rounded),
                    label: const Text('Submit'),
                  )
                else
                  FilledButton.icon(
                    onPressed: _submitting ? null : () => setState(() => _index++),
                    icon: const Icon(Icons.chevron_right_rounded),
                    label: const Text('Next'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({required this.label, required this.selected, required this.multiple, this.onTap});

  final String label;
  final bool selected;
  final bool multiple;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final IconData icon = multiple
        ? (selected ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded)
        : (selected ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Material(
        color: selected ? scheme.primaryContainer : scheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: selected ? scheme.primary : scheme.outlineVariant),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: <Widget>[
                Icon(icon, color: selected ? scheme.primary : scheme.onSurfaceVariant),
                const SizedBox(width: 12),
                Expanded(child: Text(label, style: const TextStyle(fontSize: 16))),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Score and question-by-question review after submitting.
class QuizResultScreen extends StatelessWidget {
  const QuizResultScreen({super.key, required this.quizTitle, required this.result});

  final String quizTitle;
  final AttemptResult result;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _scoreColor(result.percent);
    final correctCount = result.review.where((r) => r.isCorrect).length;
    return Scaffold(
      appBar: AppBar(title: const Text('Your result')),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: <Widget>[
          const SizedBox(height: 16),
          Center(child: ProgressRing(percent: result.percent, size: 120, strokeWidth: 10, color: color)),
          const SizedBox(height: 16),
          Text(quizTitle, textAlign: TextAlign.center, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(
            'You scored ${fmtPoints(result.score)} out of ${fmtPoints(result.maxScore)} · $correctCount of ${result.review.length} correct',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 4),
          Text(
            result.percent >= 80
                ? 'Brilliant work!'
                : result.percent >= 50
                    ? 'Good effort. Review the answers below.'
                    : 'Keep practising. You can ask NanoBot to explain tricky questions.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          if (result.attemptsLeft > 0)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '${result.attemptsLeft} attempt${result.attemptsLeft == 1 ? '' : 's'} left',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall,
              ),
            ),
          const SectionHeader('Review'),
          for (var i = 0; i < result.review.length; i++) _ReviewCard(index: i, item: result.review[i]),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Done')),
          ),
        ],
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.index, required this.item});

  final int index;
  final ReviewItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(
                item.isCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                color: item.isCorrect ? AppColors.success : AppColors.danger,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text('${index + 1}. ${item.text}', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (var i = 0; i < item.options.length; i++) _optionRow(context, i),
          if ((item.explanation ?? '').trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: tint(AppColors.info, 28), borderRadius: BorderRadius.circular(12)),
              child: Text(item.explanation!, style: theme.textTheme.bodySmall),
            ),
          ],
        ],
      ),
    );
  }

  Widget _optionRow(BuildContext context, int i) {
    final isCorrect = item.correct.contains(i);
    final picked = item.selected.contains(i);
    Color? color;
    IconData icon = Icons.circle_outlined;
    if (isCorrect) {
      color = AppColors.success;
      icon = Icons.check_rounded;
    } else if (picked) {
      color = AppColors.danger;
      icon = Icons.close_rounded;
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: <Widget>[
          Icon(icon, size: 18, color: color ?? Theme.of(context).colorScheme.outline),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              item.options[i] + (picked ? '  (your answer)' : ''),
              style: TextStyle(
                color: color,
                fontWeight: isCorrect || picked ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
