#!/usr/bin/env bash
# Build Cloudroom GUI (upstream v120) for Inari: app + server first (browser mode).
set -euo pipefail
cd "$HOME/Work/inari-app/gui"
echo "== install $(date +%T)"
pnpm install --frozen-lockfile
echo "== build $(date +%T)"
pnpm exec turbo run build --filter=@cloudroom/app --filter=@cloudroom/server --concurrency=2
echo "== done $(date +%T)"
