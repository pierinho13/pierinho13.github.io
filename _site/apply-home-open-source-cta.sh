#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
from pathlib import Path
import sys

changes = {
    Path("en/index.html"): (
        "Explore my work",
        "Explore my open-source work",
    ),
    Path("es/index.html"): (
        "Ver mi trabajo",
        "Explorar mis proyectos open source",
    ),
}

for path, (old, new) in changes.items():
    if not path.exists():
        print(f"ERROR: no existe {path}", file=sys.stderr)
        sys.exit(1)

    content = path.read_text(encoding="utf-8")
    count = content.count(old)

    if count == 0:
        if new in content:
            print(f"Ya estaba actualizado: {path}")
            continue
        print(f"ERROR: no se encontró '{old}' en {path}", file=sys.stderr)
        sys.exit(1)

    if count != 1:
        print(
            f"ERROR: se encontraron {count} coincidencias de '{old}' en {path}; "
            "no se modifica para evitar un reemplazo incorrecto.",
            file=sys.stderr,
        )
        sys.exit(1)

    path.write_text(content.replace(old, new, 1), encoding="utf-8")
    print(f"Actualizado: {path}")

print("\nDiff:")
PY

git diff -- en/index.html es/index.html
