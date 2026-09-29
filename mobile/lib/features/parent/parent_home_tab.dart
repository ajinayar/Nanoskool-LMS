import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import 'child_detail_screen.dart';

class ParentHomeTab extends StatelessWidget {
  const ParentHomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    final user = AuthScope.of(context).user;
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Nanoskool')),
      body: AsyncView<List<StudentReport>>(
        load: lms.parentChildren,
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.family_restroom_rounded,
        emptyTitle: 'No children linked yet',
        emptyMessage: "Ask your child's school to link their student account to yours.",
        builder: (context, children, reload) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
              child: Text(
                '${Fmt.greeting()}, ${user?.firstName ?? ''}',
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                children.length == 1 ? "Here's how your child is doing." : "Here's how your children are doing.",
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ),
            for (final r in children) ChildCard(report: r),
          ],
        ),
      ),
    );
  }
}

class ChildCard extends StatelessWidget {
  const ChildCard({super.key, required this.report});

  final StudentReport report;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final r = report;
    final remark = r.latestRemark;
    final dueCount = r.pending.length + r.overdue.length;
    return SectionCard(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => ChildDetailScreen(report: r)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              InitialsAvatar(name: r.student.name, radius: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(r.student.name, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    Text(
                      <String>[
                        if (r.student.className != null) r.student.className!,
                        if (r.student.rollNo != null) 'Roll ${r.student.rollNo}',
                      ].join(' · '),
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
          const SizedBox(height: 14),
          ProgressBar(percent: r.overallProgress ?? 0, label: 'Course progress'),
          const SizedBox(height: 14),
          Row(
            children: <Widget>[
              _MiniStat(icon: Icons.fact_check_outlined, value: Fmt.percent(r.attendancePercent), label: 'Attendance', color: AppColors.success),
              _MiniStat(icon: Icons.quiz_outlined, value: Fmt.percent(r.quizAverage), label: 'Quizzes', color: AppColors.orange),
              _MiniStat(
                icon: Icons.assignment_outlined,
                value: '$dueCount',
                label: r.overdue.isNotEmpty ? '${r.overdue.length} overdue' : 'Due',
                color: r.overdue.isNotEmpty ? AppColors.danger : AppColors.indigo,
              ),
            ],
          ),
          if (remark != null) ...<Widget>[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: tint(statusColor(remark.category), 28), borderRadius: BorderRadius.circular(14)),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Icon(remarkIcon(remark.category), size: 20, color: statusColor(remark.category)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('"${remark.text}"', maxLines: 3, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Text(
                          '${remark.teacherName ?? 'Teacher'} · ${Fmt.shortDate(remark.createdAt)}',
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.icon, required this.value, required this.label, required this.color});

  final IconData icon;
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Column(
        children: <Widget>[
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 4),
          Text(value, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}
