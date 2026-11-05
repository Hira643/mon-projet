#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$PROJECT_DIR"
if ! command -v npm >/dev/null 2>&1 && [ -s "${HOME}/.nvm/nvm.sh" ]; then
  . "${HOME}/.nvm/nvm.sh"
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js et npm sont nécessaires pour lancer ce projet." >&2
  exit 1
fi
exec npm run dev
