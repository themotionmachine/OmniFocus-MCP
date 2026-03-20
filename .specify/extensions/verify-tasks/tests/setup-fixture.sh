#!/usr/bin/env bash

# Set up a test fixture in a separate test repository.
#
# This script creates a test branch, sets up the spec-kit feature directory
# with prerequisite files, copies the fixture's tasks.md and source files,
# and commits everything so all verification layers can see the files.
#
# Usage: ./setup-fixture.sh <fixture-name>
#
# FIXTURE NAMES:
#   phantom-tasks    10 tasks: 5 genuine + 5 planted phantoms
#   genuine-tasks    10 tasks: all genuinely implemented
#   edge-cases       Behavioral-only, malformed, glob, and multi-file tasks
#   scalability      50 tasks: session overflow stress test
#
# PREREQUISITES:
#   - Run from the root of a test repository (not the extension repo)
#   - Spec Kit installed with verify-tasks extension at .specify/extensions/verify-tasks/
#   - Clean git working tree
#
# EXAMPLE:
#   cd ~/git/my-test-repo
#   .specify/extensions/verify-tasks/tests/setup-fixture.sh phantom-tasks

set -e

# --- Resolve paths -----------------------------------------------------------

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

FIXTURE="${1:-}"
VALID_FIXTURES=("phantom-tasks" "genuine-tasks" "edge-cases" "scalability")

# --- Validate arguments -------------------------------------------------------

if [[ -z "$FIXTURE" ]]; then
    echo "ERROR: Missing fixture name." >&2
    echo "Usage: $0 <fixture-name>" >&2
    echo "Valid fixtures: ${VALID_FIXTURES[*]}" >&2
    exit 1
fi

FIXTURE_DIR="$EXT_DIR/tests/fixtures/$FIXTURE"
if [[ ! -d "$FIXTURE_DIR" ]]; then
    echo "ERROR: Fixture '$FIXTURE' not found at $FIXTURE_DIR" >&2
    echo "Valid fixtures: ${VALID_FIXTURES[*]}" >&2
    exit 1
fi

if [[ ! -f "$FIXTURE_DIR/tasks.md" ]]; then
    echo "ERROR: No tasks.md found in $FIXTURE_DIR" >&2
    exit 1
fi

# --- Check for clean working tree --------------------------------------------

if ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    echo "ERROR: Working tree is not clean. Commit or stash changes first." >&2
    exit 1
fi

# --- Set up test branch -------------------------------------------------------

BRANCH="001-test"
echo "Creating branch '$BRANCH'..."
git checkout -b "$BRANCH"

# --- Create feature directory with prerequisites -----------------------------

FEATURE_DIR="$REPO_ROOT/specs/001-verify-tasks-test"
echo "Setting up feature directory at specs/001-verify-tasks-test/..."
mkdir -p "$FEATURE_DIR"
touch "$FEATURE_DIR/spec.md" "$FEATURE_DIR/plan.md"

# --- Copy fixture tasks.md ---------------------------------------------------

echo "Copying $FIXTURE/tasks.md into feature directory..."
cp "$FIXTURE_DIR/tasks.md" "$FEATURE_DIR/tasks.md"

# --- Copy fixture source files ------------------------------------------------

# Fixture tasks reference repo-relative paths like tests/fixtures/<fixture>/src/...
# so the source files must exist at those exact paths from the repo root.
TARGET_DIR="$REPO_ROOT/tests/fixtures/$FIXTURE"

if [[ -d "$FIXTURE_DIR/src" ]]; then
    echo "Copying $FIXTURE/src/ to tests/fixtures/$FIXTURE/src/..."
    mkdir -p "$TARGET_DIR"
    cp -r "$FIXTURE_DIR/src" "$TARGET_DIR/"
fi

# Copy any other non-tasks.md fixture files (e.g., config.yml, migrations/, README.md)
for item in "$FIXTURE_DIR"/*; do
    local_name="$(basename "$item")"
    if [[ "$local_name" == "tasks.md" || "$local_name" == "src" ]]; then
        continue
    fi
    if [[ -d "$item" ]]; then
        echo "Copying $FIXTURE/$local_name/ to tests/fixtures/$FIXTURE/$local_name/..."
        cp -r "$item" "$TARGET_DIR/$local_name"
    elif [[ -f "$item" ]]; then
        echo "Copying $FIXTURE/$local_name to tests/fixtures/$FIXTURE/$local_name..."
        mkdir -p "$TARGET_DIR"
        cp "$item" "$TARGET_DIR/$local_name"
    fi
done

# --- Commit so git-based layers work -----------------------------------------

echo "Committing fixture files..."
git add -A
git commit -m "test: add $FIXTURE fixture for verification"

echo ""
echo "Setup complete. Run /speckit.verify-tasks in an agent chat session."
echo "When done, run: $(dirname "$0")/teardown-fixture.sh"
