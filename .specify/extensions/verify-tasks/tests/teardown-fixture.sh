#!/usr/bin/env bash

# Tear down a test fixture by deleting the test branch.
#
# This script switches back to the main branch and deletes the test branch
# created by setup-fixture.sh, removing all fixture files from the repo.
#
# Usage: ./teardown-fixture.sh [main-branch]
#
# ARGUMENTS:
#   main-branch    Branch to return to (default: main)
#
# EXAMPLE:
#   .specify/extensions/verify-tasks/tests/teardown-fixture.sh

set -e

MAIN_BRANCH="${1:-main}"
TEST_BRANCH="001-test"

# --- Validate state -----------------------------------------------------------

CURRENT="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"

if [[ "$CURRENT" != "$TEST_BRANCH" ]]; then
    echo "ERROR: Not on branch '$TEST_BRANCH' (currently on '$CURRENT')." >&2
    echo "Switch to '$TEST_BRANCH' first, or this is already cleaned up." >&2
    exit 1
fi

if ! git rev-parse --verify "$MAIN_BRANCH" >/dev/null 2>&1; then
    echo "ERROR: Branch '$MAIN_BRANCH' does not exist." >&2
    echo "Usage: $0 [main-branch]" >&2
    exit 1
fi

# --- Clean up -----------------------------------------------------------------

echo "Discarding all changes on '$TEST_BRANCH'..."
git checkout -- .
git clean -fd

echo "Switching to '$MAIN_BRANCH' and deleting '$TEST_BRANCH'..."
git checkout "$MAIN_BRANCH"
git branch -D "$TEST_BRANCH"

echo "Teardown complete."
