import 'package:flutter/material.dart';

/// One bottom-navigation destination.
class ShellTab {
  const ShellTab({required this.label, required this.icon, required this.selectedIcon, required this.builder});

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final WidgetBuilder builder;
}

/// Bottom navigation that builds each tab the first time it is opened and
/// keeps it alive afterwards.
class RoleShell extends StatefulWidget {
  const RoleShell({super.key, required this.tabs});

  final List<ShellTab> tabs;

  @override
  State<RoleShell> createState() => RoleShellState();
}

class RoleShellState extends State<RoleShell> {
  int _index = 0;
  late List<bool> _visited;

  @override
  void initState() {
    super.initState();
    _visited = List<bool>.generate(widget.tabs.length, (i) => i == 0);
  }

  /// Switches tab programmatically (e.g. "See all" on the home tab).
  void select(int index) {
    if (index < 0 || index >= widget.tabs.length) return;
    setState(() {
      _index = index;
      _visited[index] = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _index == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) select(0);
      },
      child: Scaffold(
        body: IndexedStack(
          index: _index,
          children: <Widget>[
            for (var i = 0; i < widget.tabs.length; i++)
              _visited[i] ? widget.tabs[i].builder(context) : const SizedBox.shrink(),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: select,
          destinations: <Widget>[
            for (final t in widget.tabs)
              NavigationDestination(icon: Icon(t.icon), selectedIcon: Icon(t.selectedIcon), label: t.label),
          ],
        ),
      ),
    );
  }
}
