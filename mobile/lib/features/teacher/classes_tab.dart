import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/widgets.dart';
import 'attendance_screen.dart';
import 'class_detail_screen.dart';

class ClassesTab extends StatelessWidget {
  const ClassesTab({super.key});

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: const Text('My classes')),
      body: AsyncView<List<ClassInfo>>(
        load: lms.classes,
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.groups_outlined,
        emptyTitle: 'No classes yet',
        emptyMessage: 'Your school admin assigns classes and courses to you.',
        builder: (context, items, reload) => ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: items.length,
          itemBuilder: (context, i) {
            final c = items[i];
            return SectionCard(
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => ClassDetailScreen(classId: c.id, title: c.name)),
              ),
              child: Row(
                children: <Widget>[
                  IconBadge(Icons.groups_outlined, color: i.isEven ? AppColors.indigo : AppColors.orange, size: 48),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(c.name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                        Text('${c.studentCount ?? 0} students'),
                      ],
                    ),
                  ),
                  IconButton.filledTonal(
                    tooltip: 'Take attendance',
                    icon: const Icon(Icons.fact_check_outlined),
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => AttendanceScreen(classId: c.id, className: c.name)),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
