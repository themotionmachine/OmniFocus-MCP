#!/bin/bash
# Universal hook runner - finds project root and executes the specified hook
# Usage: run-hook.sh <hook-name>

# Find project root by looking for .git directory
find_project_root() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.git" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

PROJECT_ROOT=$(find_project_root)
if [[ -z "$PROJECT_ROOT" ]]; then
    echo "Error: Could not find project root" >&2
    exit 1
fi

HOOK_NAME="$1"
shift

if [[ -z "$HOOK_NAME" ]]; then
    echo "Error: No hook name specified" >&2
    exit 1
fi

HOOK_PATH="$PROJECT_ROOT/.claude/hooks/$HOOK_NAME"

if [[ ! -x "$HOOK_PATH" ]]; then
    echo "Error: Hook not found or not executable: $HOOK_PATH" >&2
    exit 1
fi

exec "$HOOK_PATH" "$@"
