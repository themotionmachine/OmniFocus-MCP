# Backup Notes

These notes describe the local backup plan for destructive OmniFocus testing in this fork.

## What Counts As A Backup

`dump_database` is useful as a readable audit snapshot, but it is not a proven restorable backup.

For rollback safety, copy OmniFocus's local model directory only after OmniFocus has quit cleanly:

```text
~/Library/Group Containers/34YW5XSRB7.com.omnigroup.OmniFocus/com.omnigroup.OmniFocus4/com.omnigroup.OmniFocusModel/
```

This directory contains the active and archive SQLite databases plus their WAL/SHM files.

## Script

Use:

```sh
scripts/backup-omnifocus-db.sh --quit --reopen
```

Behavior:

- Refuses to run while OmniFocus is open unless `--quit` is passed.
- With `--quit`, asks OmniFocus to quit through AppleScript and waits for the process to exit.
- Copies the full model directory with `ditto`.
- Writes a manifest containing source path, backup path, current git commit, file sizes, and SHA-256 checksums.
- With `--reopen`, starts OmniFocus again after the copy.

Default destination:

```text
~/Workspace/OmniFocus-MCP-local-backups/<timestamp>/
```

This destination is ignored by git.

## Pre-Destructive Checklist

Before live destructive MCP cleanup:

1. Run `scripts/backup-omnifocus-db.sh --quit --reopen`.
2. Confirm the script reports a backup path.
3. Confirm the manifest exists.
4. Confirm `OmniFocusDatabase.db` in the backup is non-empty.
5. Optionally run a read-only `dump_database` snapshot for human-readable audit context.

## Verified Backup

The backup script was run successfully on 2026-06-23 before live destructive cleanup.

Backup path:

```text
~/Workspace/OmniFocus-MCP-local-backups/20260623-005401/
```

Verified files:

```text
ArchiveDatabase.db
ArchiveDatabase.db-shm
ArchiveDatabase.db-wal
OmniFocusDatabase.db
OmniFocusDatabase.db-shm
OmniFocusDatabase.db-wal
manifest.txt
```

Key size checks:

```text
ArchiveDatabase.db size=3997696
OmniFocusDatabase.db size=1630208
```

`OmniFocusDatabase.db-wal` was `0B`, which is expected after a clean quit/checkpoint.

## Tag Cleanup Backup

The backup script was run again on 2026-06-23 before live `remove_tag` cleanup.

Backup path:

```text
~/Workspace/OmniFocus-MCP-local-backups/20260623-025106/
```

The script reported:

```text
Backup created: /Users/xh/Workspace/OmniFocus-MCP-local-backups/20260623-025106
Manifest: /Users/xh/Workspace/OmniFocus-MCP-local-backups/20260623-025106/manifest.txt
```
