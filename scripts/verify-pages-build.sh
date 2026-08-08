#!/usr/bin/env bash

set -Eeuo pipefail

BUILD_DIR="${1:?Usage: verify-pages-build.sh <build-dir> [base-href>}"
BASE_HREF="${2:-/zovidoo/}"

[[ -f "$BUILD_DIR/index.html" ]] || { echo 'Missing index.html' >&2; exit 1; }
[[ -f "$BUILD_DIR/404.html" ]] || { echo 'Missing 404.html SPA fallback' >&2; exit 1; }
[[ -f "$BUILD_DIR/ngsw-worker.js" && -f "$BUILD_DIR/ngsw.json" ]] || { echo 'Missing service worker output' >&2; exit 1; }
[[ -f "$BUILD_DIR/assets/manifest.webmanifest" ]] || { echo 'Missing web manifest' >&2; exit 1; }
grep -Fq "<base href=\"$BASE_HREF\"" "$BUILD_DIR/index.html" || { echo "Expected base href $BASE_HREF" >&2; exit 1; }
cmp -s "$BUILD_DIR/index.html" "$BUILD_DIR/404.html" || { echo '404.html must mirror index.html for Angular routes' >&2; exit 1; }
node -e "const fs=require('fs'); const manifest=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); if(manifest.start_url !== '../' || manifest.scope !== '../') process.exit(1);" "$BUILD_DIR/assets/manifest.webmanifest" || { echo 'Manifest start URL or scope is invalid' >&2; exit 1; }
echo "GitHub Pages build verified for $BASE_HREF"
