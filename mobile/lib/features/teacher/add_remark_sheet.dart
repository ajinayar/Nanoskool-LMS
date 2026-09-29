import 'package:flutter/material.dart';

import '../../core/auth_scope.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../widgets/widgets.dart';

/// Opens the "Add remark" bottom sheet. Returns true when a remark was saved.
Future<bool> showAddRemarkSheet(BuildContext context, Person student) async {
  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
      child: AddRemarkSheet(student: student),
    ),
  );
  if (saved == true && context.mounted) {
    showSnack(context, 'Remark saved for ${student.name}');
  }
  return saved ?? false;
}

class AddRemarkSheet extends StatefulWidget {
  const AddRemarkSheet({super.key, required this.student});

  final Person student;

  @override
  State<AddRemarkSheet> createState() => _AddRemarkSheetState();
}

class _AddRemarkSheetState extends State<AddRemarkSheet> {
  static const List<String> _categories = <String>['appreciation', 'improvement', 'behaviour', 'general'];

  final TextEditingController _text = TextEditingController();
  String _category = 'appreciation';
  bool _visibleToParent = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final text = _text.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Write a short remark first');
      return;
    }
    final lms = context.lms;
    final navigator = Navigator.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await lms.addRemark(
        studentId: widget.student.id,
        category: _category,
        text: text,
        visibleToParent: _visibleToParent,
      );
      if (!mounted) return;
      navigator.pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = errorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text('Remark for ${widget.student.name}', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: <Widget>[
                for (final c in _categories)
                  ChoiceChip(
                    avatar: Icon(remarkIcon(c), size: 18, color: statusColor(c)),
                    label: Text(Fmt.capitalize(c)),
                    selected: _category == c,
                    onSelected: _busy ? null : (_) => setState(() => _category = c),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _text,
              enabled: !_busy,
              autofocus: true,
              minLines: 3,
              maxLines: 6,
              maxLength: 2000,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                labelText: 'Remark',
                hintText: 'e.g. Built a great line-follower today!',
                alignLabelWithHint: true,
                border: const OutlineInputBorder(),
                errorText: _error,
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _visibleToParent,
              onChanged: _busy ? null : (v) => setState(() => _visibleToParent = v),
              title: const Text('Visible to parents'),
              subtitle: const Text('Parents see this remark in their app'),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: _busy ? null : _save,
              icon: _busy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.check_rounded),
              label: const Text('Save remark'),
            ),
          ],
        ),
      ),
    );
  }
}
