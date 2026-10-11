#!/usr/bin/env python3
"""Copy the skill's engine into books, or check that their copies match.

    python3 sync_engine.py site/history            # one book
    python3 sync_engine.py site                    # every book in site/ (each folder with lib/engine.js)
    python3 sync_engine.py site --check            # report copies that differ; exit status 1 if any

Each book keeps a full copy of the engine in lib/, so it runs on its own. The copies are not edited by hand:
change assets/engine/ and sync. lib/book.css holds the book's own settings and overrides; it is created from
the default when missing and never overwritten.
"""
import argparse, filecmp, shutil, sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent / 'assets' / 'engine'
OWN = 'book.css'


def books(target: Path):
    if (target / 'lib' / 'engine.js').exists():
        return [target]
    found = sorted(p.parent.parent for p in target.glob('*/lib/engine.js'))
    if not found and (target / 'lib').is_dir():   # e.g. site/ with the bookshelf's lib/, before any book exists
        sys.exit(f'{target}/lib has no engine.js and no book folder below it has one: pass the book folder itself')
    return found or [target]   # or a new book


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('target', type=Path, help='a book folder, or a folder of books')
    ap.add_argument('--check', action='store_true', help='only report differing copies')
    a = ap.parse_args()
    shared = sorted(p for p in ENGINE.iterdir() if p.is_file() and p.name != OWN and not p.name.startswith('.'))
    stale = []
    for book in books(a.target):
        lib = book / 'lib'
        for src in shared:
            dst = lib / src.name
            if dst.exists() and filecmp.cmp(src, dst, shallow=False):
                continue
            stale.append(dst)
            if not a.check:
                lib.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, dst)
        if not (lib / OWN).exists():
            stale.append(lib / OWN)
            if not a.check:
                shutil.copyfile(ENGINE / OWN, lib / OWN)
    verb = 'differs' if a.check else 'updated'
    for p in stale:
        print(f'{verb}: {p}')
    if not stale:
        print('all engine copies match' if a.check else 'nothing to update')
    sys.exit(1 if a.check and stale else 0)


if __name__ == '__main__':
    main()
