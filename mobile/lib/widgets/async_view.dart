import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'empty_state.dart';
import 'error_view.dart';

typedef AsyncWidgetBuilder<T> = Widget Function(BuildContext context, T data, Future<void> Function() reload);

/// Loads data once, then shows loading, error (with retry), empty or content.
/// Content is wrapped in pull-to-refresh, so [builder] should return a
/// scrollable (ListView etc.).
class AsyncView<T> extends StatefulWidget {
  const AsyncView({
    super.key,
    required this.load,
    required this.builder,
    this.isEmpty,
    this.emptyTitle = 'Nothing here yet',
    this.emptyMessage,
    this.emptyIcon = Icons.inbox_outlined,
    this.refreshable = true,
  });

  final Future<T> Function() load;
  final AsyncWidgetBuilder<T> builder;
  final bool Function(T data)? isEmpty;
  final String emptyTitle;
  final String? emptyMessage;
  final IconData emptyIcon;
  final bool refreshable;

  @override
  State<AsyncView<T>> createState() => AsyncViewState<T>();
}

class AsyncViewState<T> extends State<AsyncView<T>> {
  T? _data;
  bool _hasData = false;
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  /// Reloads the data; keeps showing old data while loading.
  Future<void> reload() => _fetch();

  Future<void> _fetch() async {
    // Only a retry from the error state needs a rebuild; the first load
    // already starts in the loading state (and must not setState in initState).
    if (mounted && !_hasData && _error != null) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final data = await widget.load();
      if (!mounted) return;
      setState(() {
        _data = data;
        _hasData = true;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e;
      });
      if (_hasData) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(errorMessage(e))));
      }
    }
  }

  Widget _scrollable(Widget child) {
    return LayoutBuilder(
      builder: (context, constraints) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: <Widget>[
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight.isFinite ? constraints.maxHeight : 0),
            child: Center(child: child),
          ),
        ],
      ),
    );
  }

  Widget _wrap(Widget child) {
    if (!widget.refreshable) return child;
    return RefreshIndicator(onRefresh: _fetch, child: child);
  }

  @override
  Widget build(BuildContext context) {
    if (!_hasData) {
      if (_loading) return const Center(child: CircularProgressIndicator());
      return _wrap(_scrollable(ErrorView(error: _error ?? 'Unknown error', onRetry: _fetch)));
    }
    final data = _data as T;
    final empty = widget.isEmpty?.call(data) ?? false;
    if (empty) {
      return _wrap(_scrollable(EmptyState(icon: widget.emptyIcon, title: widget.emptyTitle, message: widget.emptyMessage)));
    }
    return _wrap(widget.builder(context, data, _fetch));
  }
}
