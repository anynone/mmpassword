#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# mmpassword GitHub Release Script
#
# Usage:
#   export GITHUB_TOKEN="ghp_xxxx"
#   ./release.sh [version]
#
# If version is omitted, reads from src-tauri/tauri.conf.json
# ============================================================

REPO="anynone/mmpassword"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# --- Version ---
if [ -n "${1:-}" ]; then
  VERSION="$1"
else
  VERSION=$(grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*: *"//;s/".*//')
fi

TAG="v${VERSION}"
echo "==> Version: $VERSION  Tag: $TAG"

# --- Token check ---
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: GITHUB_TOKEN not set"
  echo "  export GITHUB_TOKEN=\"ghp_xxxx\""
  exit 1
fi

# --- Build ---
echo "==> Building packages (AppImage, deb, rpm)..."
npm run tauri:build -- --bundles appimage,deb,rpm

# --- Check if release already exists ---
EXISTING=$(curl -sf \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/releases/tags/$TAG" || echo "")

if [ -n "$EXISTING" ]; then
  RELEASE_ID=$(echo "$EXISTING" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  echo "==> Release $TAG already exists (id: $RELEASE_ID), deleting..."
  curl -sf -X DELETE \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/$REPO/releases/$RELEASE_ID" > /dev/null
fi

# --- Create tag if not exists ---
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "==> Tag $TAG already exists"
else
  echo "==> Creating tag $TAG..."
  git tag "$TAG"
fi
git push origin "$TAG" 2>/dev/null || echo "==> Tag already on remote"

# --- Create release ---
echo "==> Creating release $TAG..."
RESPONSE=$(curl -sf -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/releases" \
  -d "{
    \"tag_name\": \"$TAG\",
    \"target_commitish\": \"master\",
    \"name\": \"$TAG\",
    \"body\": \"## Downloads\\n\\n| File | Description |\\n|------|-------------|\\n| mmpassword_${VERSION}_amd64.AppImage | AppImage (Linux) |\\n| mmpassword_${VERSION}_amd64.deb | Debian/Ubuntu |\\n| mmpassword-${VERSION}-1.x86_64.rpm | Fedora/RHEL |\\n\",
    \"draft\": false,
    \"prerelease\": false
  }")

RELEASE_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
UPLOAD_URL="https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets"
echo "==> Release created (id: $RELEASE_ID)"

# --- Upload assets ---
FILES=(
  "src-tauri/target/release/bundle/appimage/mmpassword_${VERSION}_amd64.AppImage"
  "src-tauri/target/release/bundle/deb/mmpassword_${VERSION}_amd64.deb"
  "src-tauri/target/release/bundle/rpm/mmpassword-${VERSION}-1.x86_64.rpm"
)

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  WARNING: $f not found, skipping"
    continue
  fi
  BASENAME=$(basename "$f")
  echo "  Uploading $BASENAME..."
  curl -sf -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Content-Type: application/octet-stream" \
    "${UPLOAD_URL}?name=${BASENAME}" \
    --data-binary @"$f" | python3 -c "import sys,json; d=json.load(sys.stdin); print('    ' + d.get('state','') + ' ' + d.get('name',''))" || echo "    FAILED"
done

echo "==> Done! https://github.com/$REPO/releases/tag/$TAG"
