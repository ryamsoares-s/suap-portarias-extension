#!/usr/bin/env bash
# Empacota a extensao num .zip pronto para Chrome Web Store / Edge Add-ons.
# Uso: bash tools/package.sh
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(grep -o '"version"[^,]*' manifest.json | grep -o '[0-9][0-9.]*')
OUT="suap-portarias-extension-v${VERSION}.zip"
rm -f "$OUT"

# inclui apenas o necessario para rodar a extensao
zip -r "$OUT" \
  manifest.json \
  background.js \
  content.js \
  panel.css \
  icons \
  -x '*.DS_Store' >/dev/null

echo "Gerado: $OUT"
unzip -l "$OUT"
