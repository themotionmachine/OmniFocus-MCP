#!/usr/bin/env bash
set -euo pipefail

MODEL_DIR="${OMNIFOCUS_MODEL_DIR:-$HOME/Library/Group Containers/34YW5XSRB7.com.omnigroup.OmniFocus/com.omnigroup.OmniFocus4/com.omnigroup.OmniFocusModel}"
BACKUP_ROOT="${OMNIFOCUS_MCP_BACKUP_ROOT:-$HOME/Workspace/OmniFocus-MCP-local-backups}"
QUIT_FIRST=0
REOPEN=0

usage() {
  cat <<'USAGE'
Usage: scripts/backup-omnifocus-db.sh [--quit] [--reopen] [--backup-root PATH]

Create a timestamped copy of OmniFocus's local model directory. By default the
script refuses to run while OmniFocus is open. Use --quit to ask OmniFocus to
quit cleanly first. Use --reopen with --quit to open OmniFocus after the copy.

Environment:
  OMNIFOCUS_MODEL_DIR       Override the OmniFocus model directory.
  OMNIFOCUS_MCP_BACKUP_ROOT Override the backup destination root.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quit)
      QUIT_FIRST=1
      shift
      ;;
    --reopen)
      REOPEN=1
      shift
      ;;
    --backup-root)
      if [[ $# -lt 2 ]]; then
        echo "--backup-root requires a path" >&2
        exit 2
      fi
      BACKUP_ROOT="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

is_omnifocus_running() {
  pgrep -x "OmniFocus" >/dev/null 2>&1
}

wait_for_omnifocus_to_exit() {
  local attempts=0
  while is_omnifocus_running; do
    attempts=$((attempts + 1))
    if [[ "$attempts" -gt 60 ]]; then
      echo "OmniFocus did not quit within 60 seconds." >&2
      exit 1
    fi
    sleep 1
  done
}

if [[ ! -d "$MODEL_DIR" ]]; then
  echo "OmniFocus model directory not found: $MODEL_DIR" >&2
  exit 1
fi

if is_omnifocus_running; then
  if [[ "$QUIT_FIRST" -ne 1 ]]; then
    echo "OmniFocus is running. Re-run with --quit to close it before backup." >&2
    exit 1
  fi

  osascript -e 'tell application "OmniFocus" to quit' >/dev/null
  wait_for_omnifocus_to_exit
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="$BACKUP_ROOT/$timestamp"
backup_model_dir="$backup_dir/OmniFocusModel"
manifest="$backup_dir/manifest.txt"

mkdir -p "$backup_dir"
ditto "$MODEL_DIR" "$backup_model_dir"

{
  echo "created_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "source=$MODEL_DIR"
  echo "backup=$backup_model_dir"
  echo "git_commit=$(git -C "$(dirname "$0")/.." rev-parse --short HEAD 2>/dev/null || true)"
  echo
  echo "files:"
  find "$backup_model_dir" -maxdepth 1 -type f -print0 \
    | sort -z \
    | while IFS= read -r -d '' file; do
        size="$(stat -f '%z' "$file")"
        checksum="$(shasum -a 256 "$file" | awk '{print $1}')"
        echo "  $(basename "$file") size=$size sha256=$checksum"
      done
} > "$manifest"

if [[ ! -s "$backup_model_dir/OmniFocusDatabase.db" ]]; then
  echo "Backup appears invalid: OmniFocusDatabase.db missing or empty." >&2
  exit 1
fi

echo "Backup created: $backup_dir"
echo "Manifest: $manifest"

if [[ "$REOPEN" -eq 1 ]]; then
  open -a "OmniFocus"
fi
