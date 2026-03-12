#!/usr/bin/env bash
# Roda o script de importação M3U
# Uso: bash scripts/run-import.sh
cd "$(dirname "$0")/.."
npx ts-node \
  --compiler-options '{"module":"CommonJS","esModuleInterop":true,"target":"ES2020","downlevelIteration":true}' \
  scripts/import-m3u.ts
