#!/usr/bin/env bash
# First publication only. Does not overwrite any existing repository.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
REPO="${1:-peremena-plus}"
EXPECTED_OWNER="Maksimas-win"
[[ "$REPO" =~ ^[A-Za-z0-9_.-]+$ ]] || { echo 'Invalid repository name.' >&2; exit 1; }
for tool in git gh; do command -v "$tool" >/dev/null || { echo "Install $tool and retry." >&2; exit 1; }; done
[[ -f index.html && -f assets/app.js ]] || { echo 'Wrong project folder.' >&2; exit 1; }
if ! gh auth status --hostname github.com; then gh auth login --hostname github.com --git-protocol https --web; fi
OWNER="$(gh api user --jq .login)"
USER_ID="$(gh api user --jq .id)"
[[ "${OWNER,,}" == "${EXPECTED_OWNER,,}" ]] || { echo "Wrong GitHub account: $OWNER" >&2; exit 1; }
FULL="$OWNER/$REPO"
if gh repo view "$FULL" --json name >/dev/null 2>&1; then echo "Repository $FULL already exists. Nothing overwritten." >&2; exit 1; fi
[[ ! -d .git ]] || { echo 'Local .git already exists; inspect before continuing.' >&2; exit 1; }
printf 'Creating NEW PUBLIC repository: %s\n' "$FULL"
gh auth setup-git --hostname github.com
git init -b main
git config user.name "$OWNER"
git config user.email "${USER_ID}+${OWNER}@users.noreply.github.com"
git add -- index.html assets downloads .nojekyll .gitignore README.md AGENTS.md DEPLOY_CODEX.md publish-github.ps1 publish-github.sh tests
git commit -m 'Build PEREMENA+ interactive school project'
gh repo create "$FULL" --public --source . --remote origin --push --description 'PEREMENA+: interactive school project, corridor reveal, 3D pouf and budget calculator'
gh api --method POST "repos/$FULL/pages" -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'
URL="$(gh api "repos/$FULL/pages" --jq .html_url)"
printf 'Pages configured: %s\nWaiting for the build...\n' "$URL"
BUILT=false
for _ in $(seq 1 60); do
 sleep 5
 STATE="$(gh api "repos/$FULL/pages/builds/latest" --jq .status 2>/dev/null || true)"
 if [[ "$STATE" == built ]]; then BUILT=true; break; fi
 if [[ "$STATE" == errored ]]; then echo 'Pages build failed. Inspect Actions logs.' >&2; exit 1; fi
done
if [[ "$BUILT" != true ]]; then printf 'Upload completed, but build not confirmed yet: %s\n' "$URL"; exit 2; fi
if command -v curl >/dev/null; then
 if curl -fLsS --max-time 30 "$URL" | grep -q 'pouf-canvas'; then printf 'PUBLISHED AND HTTP-CHECKED: %s\n' "$URL"; else printf 'Build succeeded, HTTP verification pending: %s\n' "$URL"; exit 2; fi
else printf 'Build succeeded. Open and verify: %s\n' "$URL"; fi
