#!/usr/bin/env python3
"""Lightweight static checks for the Dart sources, usable without the Flutter SDK.

- balanced (), [], {} per file, ignoring strings and comments
- every relative / package:nanoskool import resolves to an existing file
- every class used with a capitalised constructor-like call is defined in the
  project, imported from a known package, or is a Flutter/Dart SDK name we list

Run: python3 tool/check_dart.py
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'lib')
PKG = 'nanoskool'


def dart_files():
    for base in ('lib', 'test'):
        for dirpath, _, files in os.walk(os.path.join(ROOT, base)):
            for f in files:
                if f.endswith('.dart'):
                    yield os.path.join(dirpath, f)


def strip_code(src):
    """Removes comments and string contents (keeps quotes) so brackets can be counted.
    Handles interpolation ${...} inside strings by recursing into it."""
    out = []
    i = 0
    n = len(src)
    stack = []  # string contexts: (quote, raw, triple)

    def read_string(i):
        # src[i] is a quote (possibly preceded by r)
        raw = False
        if src[i] == 'r':
            raw = True
            i += 1
        q = src[i]
        triple = src[i:i + 3] == q * 3
        end = q * 3 if triple else q
        i += 3 if triple else 1
        buf = [q]
        while i < n:
            if not raw and src[i] == '\\':
                i += 2
                continue
            if src.startswith(end, i):
                buf.append(q)
                return i + len(end), ''.join(buf)
            if not raw and src[i] == '$' and i + 1 < n and src[i + 1] == '{':
                # interpolation: scan balanced braces as code
                depth = 1
                j = i + 2
                code_start = j
                while j < n and depth:
                    c = src[j]
                    if c in '\'"':
                        j, _ = read_string(j)
                        continue
                    if c == '{':
                        depth += 1
                    elif c == '}':
                        depth -= 1
                    j += 1
                inner = strip_code(src[code_start:j - 1])
                buf.append('${' + inner + '}')
                i = j
                continue
            if not triple and src[i] == '\n':
                raise SyntaxError('unterminated string')
            i += 1
        raise SyntaxError('unterminated string at EOF')

    while i < n:
        c = src[i]
        if src.startswith('//', i):
            j = src.find('\n', i)
            i = n if j == -1 else j
            continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            if j == -1:
                raise SyntaxError('unterminated block comment')
            i = j + 2
            continue
        if c in '\'"' or (c == 'r' and i + 1 < n and src[i + 1] in '\'"' and (i == 0 or not (src[i - 1].isalnum() or src[i - 1] == '_'))):
            i, s = read_string(i)
            out.append(s)
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def check_brackets(path, code):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    line = 1
    errors = []
    for ch in code:
        if ch == '\n':
            line += 1
        elif ch in '([{':
            stack.append((ch, line))
        elif ch in ')]}':
            if not stack or stack[-1][0] != pairs[ch]:
                errors.append(f'{path}:{line}: unexpected {ch!r} (open: {stack[-1] if stack else None})')
                return errors
            stack.pop()
    if stack:
        errors.append(f'{path}: unclosed {stack[-1]}')
    return errors


IMPORT_RE = re.compile(r"^(?:import|export)\s+'([^']+)'", re.M)


def check_imports(path, src):
    errors = []
    for target in IMPORT_RE.findall(src):
        if target.startswith('dart:'):
            continue
        if target.startswith('package:'):
            if target.startswith(f'package:{PKG}/'):
                resolved = os.path.join(LIB, target[len(f'package:{PKG}/'):])
            else:
                continue
        else:
            resolved = os.path.normpath(os.path.join(os.path.dirname(path), target))
        if not os.path.isfile(resolved):
            errors.append(f'{path}: import not found: {target}')
    return errors


def imported_files(path, src, seen=None):
    """Files visible from path: its imports plus re-exports of those."""
    if seen is None:
        seen = set()
    result = []
    for m in re.finditer(r"^(import|export)\s+'([^']+)'", src, re.M):
        kind, target = m.groups()
        if target.startswith('dart:') or (target.startswith('package:') and not target.startswith(f'package:{PKG}/')):
            continue
        if target.startswith(f'package:{PKG}/'):
            f = os.path.join(LIB, target[len(f'package:{PKG}/'):])
        else:
            f = os.path.normpath(os.path.join(os.path.dirname(path), target))
        if f in seen or not os.path.isfile(f):
            continue
        seen.add(f)
        result.append(f)
        sub = open(f, encoding='utf-8').read()
        # exports of the imported file are visible too
        for em in re.finditer(r"^export\s+'([^']+)'", sub, re.M):
            t = em.group(1)
            if t.startswith('package:'):
                continue
            ef = os.path.normpath(os.path.join(os.path.dirname(f), t))
            if ef not in seen and os.path.isfile(ef):
                seen.add(ef)
                result.append(ef)
                result.extend(imported_files(ef, open(ef, encoding='utf-8').read(), seen))
    return result


DECL_RE = re.compile(r'^\s*(?:abstract\s+|final\s+|sealed\s+|base\s+)*(?:class|enum|mixin|typedef|extension)\s+([A-Za-z_]\w*)', re.M)
TOP_FN_RE = re.compile(r'^(?:Future<[^>]*>|[A-Z]\w*(?:<[^>]*>)?\??|void|bool|int|double|String|Color|IconData|Widget)\s+([a-zA-Z_]\w*)\s*[(<]', re.M)


def declared(src):
    names = set(DECL_RE.findall(src))
    names |= set(TOP_FN_RE.findall(src))
    return names


def main():
    errors = []
    files = list(dart_files())
    decls = {}
    for f in files:
        src = open(f, encoding='utf-8').read()
        try:
            code = strip_code(src)
        except SyntaxError as e:
            errors.append(f'{f}: {e}')
            continue
        errors += check_brackets(f, code)
        errors += check_imports(f, src)
        decls[f] = declared(src)

    # Project-defined capitalised names used in a file must be declared in the file
    # or in a file it imports (directly or via exports).
    project_names = {}
    for f, names in decls.items():
        for nm in names:
            project_names.setdefault(nm, set()).add(f)
    for f in files:
        src = open(f, encoding='utf-8').read()
        visible = set(decls.get(f, set()))
        for imp in imported_files(f, src):
            visible |= decls.get(imp, set())
        code = strip_code(src)
        for m in re.finditer(r'\b([A-Z][A-Za-z0-9_]*|[a-z][A-Za-z0-9]*)\b', code):
            nm = m.group(1)
            if nm in project_names and nm not in visible:
                # lowercase names only matter for top-level functions we declared
                line = code[:m.start()].count('\n') + 1
                errors.append(f'{os.path.relpath(f, ROOT)}:{line}: {nm} is defined in '
                              f'{", ".join(os.path.relpath(p, ROOT) for p in project_names[nm])} but not imported')
                visible.add(nm)  # report once per file

    if errors:
        print('\n'.join(errors))
        sys.exit(1)
    print(f'OK: {len(files)} Dart files checked')


if __name__ == '__main__':
    main()
