#!/usr/bin/env bash

# Builds Zovidoo and publishes only its static output to a GitHub Pages branch.
# Usage: ./scripts/publish-pages.sh [branch] [remote]

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLISH_BRANCH="${1:-gh-pages}"
REMOTE_NAME="${2:-origin}"
BASE_HREF="${BASE_HREF:-/}"
BUILD_DIR="$ROOT_DIR/www"
WORKTREE_DIR=""
WORKTREE_READY=false

fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }

cleanup() {
  if [[ "$WORKTREE_READY" == true ]]; then
    git -C "$ROOT_DIR" worktree remove --force "$WORKTREE_DIR" || true
  elif [[ -n "$WORKTREE_DIR" ]]; then
    rmdir "$WORKTREE_DIR" 2>/dev/null || true
  fi
}
trap cleanup EXIT

command -v bun >/dev/null || fail 'bun is required.'
command -v git >/dev/null || fail 'git is required.'
git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null || fail 'Run this from a Git repository.'
git -C "$ROOT_DIR" remote get-url "$REMOTE_NAME" >/dev/null || fail "Remote '$REMOTE_NAME' does not exist."

printf 'Building Zovidoo with base href %s\n' "$BASE_HREF"
(
  cd "$ROOT_DIR"
  bun run build -- --base-href "$BASE_HREF"
)
[[ -f "$BUILD_DIR/index.html" ]] || fail "Expected build output at $BUILD_DIR/index.html."

WORKTREE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/zovidoo-pages.XXXXXX")"

if git -C "$ROOT_DIR" ls-remote --exit-code --heads "$REMOTE_NAME" "$PUBLISH_BRANCH" >/dev/null 2>&1; then
  REMOTE_REF="refs/remotes/$REMOTE_NAME/$PUBLISH_BRANCH"
  git -C "$ROOT_DIR" fetch "$REMOTE_NAME" "refs/heads/$PUBLISH_BRANCH:$REMOTE_REF"
  git -C "$ROOT_DIR" worktree add --detach "$WORKTREE_DIR" "$REMOTE_REF"
elif git -C "$ROOT_DIR" show-ref --verify --quiet "refs/heads/$PUBLISH_BRANCH"; then
  git -C "$ROOT_DIR" worktree add --detach "$WORKTREE_DIR" "refs/heads/$PUBLISH_BRANCH"
else
  git -C "$ROOT_DIR" worktree add --detach "$WORKTREE_DIR"
  git -C "$WORKTREE_DIR" checkout --orphan "$PUBLISH_BRANCH"
fi
WORKTREE_READY=true

# This worktree contains only the deployment branch, never the working branch.
git -C "$WORKTREE_DIR" rm -r --force --ignore-unmatch -- .
git -C "$WORKTREE_DIR" clean -fdx
cp -R "$BUILD_DIR"/. "$WORKTREE_DIR"/

# GitHub Pages should serve the Angular bundle directly, and 404.html keeps SPA links usable.
touch "$WORKTREE_DIR/.nojekyll"
cp "$WORKTREE_DIR/index.html" "$WORKTREE_DIR/404.html"
if [[ -n "${PAGES_CNAME:-}" ]]; then
  printf '%s\n' "$PAGES_CNAME" > "$WORKTREE_DIR/CNAME"
fi

git -C "$WORKTREE_DIR" add --all
if git -C "$WORKTREE_DIR" diff --cached --quiet; then
  printf 'GitHub Pages is already up to date.\n'
  exit 0
fi

git -C "$WORKTREE_DIR" commit -m "Deploy Zovidoo Pages"
git -C "$WORKTREE_DIR" push "$REMOTE_NAME" "HEAD:refs/heads/$PUBLISH_BRANCH"
printf 'Published build to %s/%s.\n' "$REMOTE_NAME" "$PUBLISH_BRANCH"
