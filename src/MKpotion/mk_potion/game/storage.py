from __future__ import annotations

import os
import sys
from pathlib import Path

IS_WEB = sys.platform == "emscripten"
_PREFIX = "mk_potion:"


def _local_storage():
    import platform

    return platform.window.localStorage


def read_text(path: Path) -> str:
    if IS_WEB:
        value = _local_storage().getItem(_PREFIX + Path(path).name)
        if value is None:
            raise FileNotFoundError(path)
        return str(value)
    return Path(path).read_text(encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path = Path(path)
    if IS_WEB:
        try:
            _local_storage().setItem(_PREFIX + path.name, text)
        except Exception as exc:
            raise OSError(str(exc)) from exc
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)
