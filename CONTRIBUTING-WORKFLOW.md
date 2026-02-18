# Contributing Workflow

This fork maintains a test harness that the upstream repo doesn't have. Here's how to develop locally with tests while submitting clean PRs upstream.

## Setup (one-time)

```bash
# Track the original repo
git remote add upstream https://github.com/themotionmachine/omnifocus-mcp-server.git
```

You now have two remotes:
- `origin` — your fork (has tests)
- `upstream` — the original repo (no tests)

## Day-to-Day Development

Work on your fork's `main`. Tests are always available:

```bash
npm test          # run all tests once
npm run test:watch  # watch mode (re-runs on changes)
```

Keep commits atomic: **separate test commits from source commits**. This makes cherry-picking easy later.

## Submitting a PR Upstream

```bash
# 1. Fetch latest upstream
git fetch upstream

# 2. Create a clean branch off THEIR main
git checkout -b pr/fix-description upstream/main

# 3. Cherry-pick only your source changes (not test commits)
git cherry-pick <commit-hash-1> <commit-hash-2> ...

# 4. Verify it builds (no tests available on this branch)
npm run build

# 5. Push to your fork and create the PR
git push origin pr/fix-description
gh pr create --repo themotionmachine/omnifocus-mcp-server

# 6. Go back to your main for continued development
git checkout main
```

### Finding commit hashes

```bash
# See recent commits with short hashes
git log --oneline main

# Example output:
# a1b2c3d Add escapeForJSON tests        ← test commit, skip
# e4f5g6h Fix quote escaping in editItem ← source commit, cherry-pick this
# i7j8k9l Set up Vitest                  ← test commit, skip
```

## If the Upstream Owner Wants Tests Too

Cherry-pick the test commits as well, or submit a separate PR for the test harness:

```bash
git checkout -b pr/add-test-harness upstream/main
git cherry-pick <vitest-setup-hash> <test-file-hashes...>
git push origin pr/add-test-harness
gh pr create --repo themotionmachine/omnifocus-mcp-server
```

## Syncing Your Fork with Upstream

When the upstream repo gets new commits:

```bash
git fetch upstream
git checkout main
git rebase upstream/main
# Resolve any conflicts (usually in files you've modified)
npm test  # make sure tests still pass
git push origin main --force-with-lease
```
