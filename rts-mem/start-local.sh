#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -d dist ]]; then
  echo "[!] dist not found. Run: npm run build" >&2
  exit 1
fi
cd dist
PORT=${PORT:-8080}
echo "Serving on http://localhost:${PORT}"
python3 -m http.server "${PORT}" | cat