#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BRANCH_NAME=${1:-"chore/$(date +%Y%m%d-%H%M%S)"}
PR_TITLE=${2:-"chore: automated workspace updates"}
BASE_BRANCH=${BASE_BRANCH:-main}

if [[ -n "$(git status --short --porcelain=v1)" ]]; then
  echo "Working tree is not clean. Commit or stash your changes before running this flow." >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required but not installed." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required for PR creation." >&2
  exit 1
fi

run_in() {
  local dir=$1
  shift

  if [[ ! -d "$dir" ]]; then
    echo "Directory not found: $dir" >&2
    exit 1
  fi

  (cd "$dir" && "$@")
}

run_lint() {
  local dir=$1

  if ! run_in "$dir" bun run lint; then
    echo "Lint failed in $dir, running --fix and retrying"
    run_in "$dir" bun run lint -- --fix
    run_in "$dir" bun run lint
  fi
}

run_tests() {
  local dir=$1
  local package=$2

  if [[ "$package" == "web" ]]; then
    run_in "$dir" bun run test -- \
      --coverage \
      --coverage.enabled \
      --coverage.provider=v8 \
      --coverage.include="src/**/*.ts,src/**/*.tsx" \
      --coverage.thresholds.lines=100 \
      --coverage.thresholds.perFile=true
    return
  fi

  run_in "$dir" bun run test -- --coverage --coverage-reporter=lcov --coverage-dir=coverage
}

collect_changed_files() {
  CHANGED_FILES=()
  while IFS= read -r -d '' entry; do
    CHANGED_FILES+=("${entry:3}")
  done < <(git status --short --porcelain=v1 --untracked-files=all -z)
}

commit_if_changed() {
  local pattern=$1
  local message=$2
  local files=()

  for file in "${CHANGED_FILES[@]}"; do
    if [[ "$file" == "$pattern" || "$file" == "$pattern"/* ]]; then
      files+=("$file")
    fi
  done

  if (( ${#files[@]} == 0 )); then
    return 0
  fi

  git add -- "${files[@]}"
  git commit -m "$message"

  collect_changed_files
}

collect_packages_with_changes() {
  CHANGED_PACKAGES=()
  declare -A seen_packages=()

  while IFS= read -r -d '' entry; do
    local path=${entry:3}
    if [[ "$path" == packages/* ]]; then
      local package=${path#packages/}
      package=${package%%/*}
      if [[ -d "packages/$package" && -f "packages/$package/package.json" ]]; then
        if [[ -n "${seen_packages[$package]:-}" ]]; then
          continue
        fi

        seen_packages[$package]=1
        CHANGED_PACKAGES+=("$package")
      fi
    fi
  done < <(git status --short --porcelain=v1 --untracked-files=all -z)
}

ensure_changeset() {
  if (( ${#CHANGED_PACKAGES[@]} == 0 )); then
    return
  fi

  if (( ${#CHANGED_FILES[@]} > 0 )); then
    for file in "${CHANGED_FILES[@]}"; do
      if [[ "$file" == ".changeset"/* && "$file" == *.md ]]; then
        return
      fi
    done
  fi

  mkdir -p .changeset

  local slug
  slug="auto-$(date +%Y%m%d%H%M%S)-$RANDOM"
  local file=".changeset/${slug}.md"

  {
    printf '%s\n' "---"
    for package in "${CHANGED_PACKAGES[@]}"; do
      pkg_name=$(node -p "JSON.parse(require('fs').readFileSync('packages/$package/package.json','utf8')).name")
      printf '"%s": patch\n' "$pkg_name"
    done
    printf '%s\n' "---"
    printf '\n'
    printf 'chore: automated package changes after quality gate\n'
  } > "$file"
}

echo "Switching to branch: $BRANCH_NAME"
git fetch origin "$BASE_BRANCH" --quiet
git switch -c "$BRANCH_NAME" "origin/$BASE_BRANCH"

workspaces=(
  "packages/config"
  "packages/db"
  "packages/auth"
  "packages/auth-web"
  "packages/auth-react"
  "packages/email"
  "apps/web"
)

echo "Running lint + auto-fix"
for ws in "${workspaces[@]}"; do
  run_lint "$ws"
done

echo "Running unit tests with coverage"
for ws in "${workspaces[@]}"; do
  run_tests "$ws" "$(basename "$ws")"
done

node ./scripts/check-full-line-coverage.mjs

collect_changed_files

collect_packages_with_changes
ensure_changeset
collect_changed_files

commit_if_changed "packages/config" "chore(@alesha-nov/config): update package"
commit_if_changed "packages/db" "chore(@alesha-nov/db): update package"
commit_if_changed "packages/email" "chore(@alesha-nov/email): update package"
commit_if_changed "packages/auth" "chore(@alesha-nov/auth): update package"
commit_if_changed "packages/auth-web" "chore(@alesha-nov/auth-web): update package"
commit_if_changed "packages/auth-react" "chore(@alesha-nov/auth-react): update package"
commit_if_changed "apps/web" "chore(web): update app"
commit_if_changed ".changeset" "chore(changeset): add release notes"

if (( ${#CHANGED_FILES[@]} > 0 )); then
  git add -- "${CHANGED_FILES[@]}"
  git commit -m "chore: miscellaneous workspace updates"
fi

if [[ -z "$(git log --oneline "origin/$BASE_BRANCH..HEAD" 2>/dev/null)" ]]; then
  echo "No commits were created, nothing to push/PR." >&2
  exit 1
fi

git push -u origin "$BRANCH_NAME"

PR_BODY="## Summary\n\n- Run lint with auto-fix\n- Run unit tests with coverage checks\n- Generate changeset for package changes\n\n## Checks\n\n- lint\n- test with line coverage assertion\n"

gh pr create \
  --base "$BASE_BRANCH" \
  --head "$BRANCH_NAME" \
  --title "$PR_TITLE" \
  --body "$PR_BODY"
