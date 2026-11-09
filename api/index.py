"""
TRACEHAWK — Vercel Serverless Function ASGI Adapter
Entry point bridging Vercel Python runtime to the production FastAPI application.
Preserves all six approved production routes without modifying core backend modules.
"""

import sys
from pathlib import Path

# Resolve repository root: api/index.py -> parent of api/ is repository root
REPO_ROOT = Path(__file__).resolve().parent.parent

# Ensure backend directory and repository root are on sys.path
backend_path = str(REPO_ROOT / "backend")
repo_root_path = str(REPO_ROOT)

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if repo_root_path not in sys.path:
    sys.path.insert(0, repo_root_path)

# Import and export the existing production FastAPI application instance
from app.main import app  # noqa: E402

# Mount conditional runtime diagnostic routes (Phase 5, Step 2A.1)
# Positively mounted strictly in Vercel Preview (VERCEL_ENV == "preview") or verified non-Vercel local dev
from .diagnostic import mount_diagnostic_routes  # noqa: E402

mount_diagnostic_routes(app)
