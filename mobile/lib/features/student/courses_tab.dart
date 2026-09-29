import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import '../shared/course_detail_screen.dart';

class CoursesTab extends StatefulWidget {
  const CoursesTab({super.key});

  @override
  State<CoursesTab> createState() => _CoursesTabState();
}

class _CoursesTabState extends State<CoursesTab> {
  final GlobalKey<AsyncViewState<List<Course>>> _key = GlobalKey<AsyncViewState<List<Course>>>();

  Future<void> _open(Course c) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => CourseDetailScreen(courseId: c.id, title: c.title)),
    );
    if (!mounted) return;
    await _key.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: const Text('My courses')),
      body: AsyncView<List<Course>>(
        key: _key,
        load: () => lms.courses(),
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.menu_book_outlined,
        emptyTitle: 'No courses yet',
        emptyMessage: 'Your teacher will add courses to your class soon.',
        builder: (context, items, reload) => ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: items.length,
          itemBuilder: (context, i) {
            final c = items[i];
            return CourseCard(
              title: c.title,
              category: c.category,
              progress: c.progress ?? 0,
              subtitle: '${c.completedUnits ?? 0} of ${c.unitCount} units',
              onTap: () => _open(c),
            );
          },
        ),
      ),
    );
  }
}

/// Course card with category colour band and progress bar.
class CourseCard extends StatelessWidget {
  const CourseCard({
    super.key,
    required this.title,
    required this.progress,
    this.category,
    this.subtitle,
    this.onTap,
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    this.width,
  });

  final String title;
  final String? category;
  final int progress;
  final String? subtitle;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry margin;
  final double? width;

  static Color colorFor(String? category) {
    switch ((category ?? '').toLowerCase()) {
      case 'robotics':
        return AppColors.indigo;
      case 'coding':
        return AppColors.orange;
      case 'ai':
        return const Color(0xFF8E44AD);
      case 'electronics':
        return AppColors.info;
      default:
        return AppColors.success;
    }
  }

  static IconData iconFor(String? category) {
    switch ((category ?? '').toLowerCase()) {
      case 'robotics':
        return Icons.smart_toy_outlined;
      case 'coding':
        return Icons.code_rounded;
      case 'ai':
        return Icons.psychology_outlined;
      case 'electronics':
        return Icons.memory_rounded;
      default:
        return Icons.science_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = colorFor(category);
    final card = SectionCard(
      margin: margin,
      onTap: onTap,
      child: Row(
        children: <Widget>[
          IconBadge(iconFor(category), color: color, size: 52),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                if (category != null)
                  Text(category!, style: theme.textTheme.labelSmall?.copyWith(color: color, fontWeight: FontWeight.w700)),
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                ProgressBar(percent: progress, label: subtitle, color: color),
              ],
            ),
          ),
        ],
      ),
    );
    if (width == null) return card;
    return SizedBox(width: width, child: card);
  }
}
