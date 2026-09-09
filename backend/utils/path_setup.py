"""Ensure project root is on sys.path for legacy model modules."""

from __future__ import annotations

import sys
from pathlib import Path

from backend.config import PROJECT_ROOT


def ensure_project_root_on_path() -> Path:
    root = str(PROJECT_ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)
    return PROJECT_ROOT
