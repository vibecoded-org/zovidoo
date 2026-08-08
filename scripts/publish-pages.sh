#!/usr/bin/env bash

# Builds Zovidoo and publishes only its static output to a GitHub Pages branch.
# Usage: ./scripts/publish-pages.sh [branch] [remote]

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLISH_BRANCH="${1:-gh-pages}"
REMOTE_NAME="${2:-origin}"
BASE_HREF="${BASE_HREF:-/zovidoo/}"
BUILD_DIR="$ROOT_DIR/www"
PUBLISH_DIR=""

fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }

cleanup() {
  if [[ -n "$PUBLISH_DIR" && -d "$PUBLISH_DIR" && "$(basename "$PUBLISH_DIR")" == zovidoo-pages.* ]]; then
    rm -rf -- "$PUBLISH_DIR"
  fi
}
trap cleanup EXIT

command -v bun >/dev/null || fail 'bun is required.'
command -v git >/dev/null || fail 'git is required.'
git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null || fail 'Run this from a Git repository.'
git -C "$ROOT_DIR" remote get-url "$REMOTE_NAME" >/dev/null || fail "Remote '$REMOTE_NAME' does not exist."
REMOTE_URL="$(git -C "$ROOT_DIR" remote get-url "$REMOTE_NAME")"

printf 'Building Zovidoo with base href %s\n' "$BASE_HREF"
(
  cd "$ROOT_DIR"
  bun run build -- --base-href "$BASE_HREF"
)
[[ -f "$BUILD_DIR/index.html" ]] || fail "Expected build output at $BUILD_DIR/index.html."

PUBLISH_DIR="$(mktemp -d "${TMPDIR:-/tmp}/zovidoo-pages.XXXXXX")"

if git -C "$ROOT_DIR" ls-remote --exit-code --heads "$REMOTE_NAME" "$PUBLISH_BRANCH" >/dev/null 2>&1; then
  git clone --depth 1 --branch "$PUBLISH_BRANCH" "$REMOTE_URL" "$PUBLISH_DIR"
else
  git clone --no-checkout "$REMOTE_URL" "$PUBLISH_DIR"
  git -C "$PUBLISH_DIR" checkout --orphan "$PUBLISH_BRANCH"
fi

# This isolated clone contains only deployment files; the source worktree is untouched.
git -C "$PUBLISH_DIR" rm -r --force --ignore-unmatch -- .
git -C "$PUBLISH_DIR" clean -fdx
cp -R "$BUILD_DIR"/. "$PUBLISH_DIR"/

# GitHub Pages should serve the Angular bundle directly, and 404.html keeps SPA links usable.
touch "$PUBLISH_DIR/.nojekyll"
cp "$PUBLISH_DIR/index.html" "$PUBLISH_DIR/404.html"
if [[ -n "${PAGES_CNAME:-}" ]]; then
  printf '%s\n' "$PAGES_CNAME" > "$PUBLISH_DIR/CNAME"
fi

"$ROOT_DIR/scripts/verify-pages-build.sh" "$PUBLISH_DIR" "$BASE_HREF"

git -C "$PUBLISH_DIR" add --all
if git -C "$PUBLISH_DIR" diff --cached --quiet; then
  printf 'GitHub Pages is already up to date.\n'
  exit 0
fi

git -C "$PUBLISH_DIR" commit -m "Deploy Zovidoo Pages"
git -C "$PUBLISH_DIR" push origin "HEAD:refs/heads/$PUBLISH_BRANCH"
printf 'Published build to %s/%s.\n' "$REMOTE_NAME" "$PUBLISH_BRANCH"
