import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/models.dart';
import '../../widgets/widgets.dart';
import '../student/student_home_tab.dart';
import 'add_remark_sheet.dart';

/// All remarks for one student (teacher view), with an add button.
class StudentRemarksScreen extends StatefulWidget {
  const StudentRemarksScreen({super.key, required this.student});

  final Person student;

  @override
  State<StudentRemarksScreen> createState() => _StudentRemarksScreenState();
}

class _StudentRemarksScreenState extends State<StudentRemarksScreen> {
  final GlobalKey<AsyncViewState<List<Remark>>> _key = GlobalKey<AsyncViewState<List<Remark>>>();

  Future<void> _add() async {
    final saved = await showAddRemarkSheet(context, widget.student);
    if (saved && mounted) await _key.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final lms = context.lms;
    return Scaffold(
      appBar: AppBar(title: Text(widget.student.name)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _add,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add remark'),
      ),
      body: AsyncView<List<Remark>>(
        key: _key,
        load: () => lms.remarks(studentId: widget.student.id),
        isEmpty: (items) => items.isEmpty,
        emptyIcon: Icons.chat_bubble_outline_rounded,
        emptyTitle: 'No remarks yet',
        builder: (context, items, reload) => ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(top: 8, bottom: 96),
          itemCount: items.length,
          itemBuilder: (context, i) => RemarkCard(remark: items[i]),
        ),
      ),
    );
  }
}
