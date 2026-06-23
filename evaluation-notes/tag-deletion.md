# Tag Deletion Notes

These notes track issue #1: adding a guarded way to remove OmniFocus tags.

## Goal

The write-mode smoke test left one test tag behind:

```text
TEST-write-smoke-2026-06-23T06-29-58-260Z
```

The server already supports `create_tag` and `list_tags`, but did not expose a tag deletion tool. Removing tags should use the same destructive-operation boundary as task/project removal.

## Implemented Behavior

Added `remove_tag`:

- accepts `id` or exact `name`
- prefers `id` when both are provided
- falls back to `name` if ID lookup fails
- is classified as `dangerous`
- requires `OMNIFOCUS_MCP_MODE=dangerous`
- requires a valid exact `dangerousGrant`
- supports `OMNIFOCUS_MCP_DANGEROUS_DRY_RUN=1`
- appends the standard `dangerousAction` audit payload on dry-run and real execution
- supports cleanup grants signed by the user's existing 1Password OpenSSH RSA key

## Local Verification

Unit tests cover:

- AppleScript generation for remove-by-ID and remove-by-name
- name fallback when both ID and name are provided
- missing identifier validation
- AppleScript string escaping
- policy classification as dangerous
- blocked write-mode access
- missing-grant blocking in dangerous mode
- dry-run grant verification that skips the handler and returns `dangerousAction.executed: false`
- OpenSSH RSA private/public grant signing and verification

Commands run:

```sh
npm test -- src/tools/primitives/removeTag.test.ts src/tools/policy.test.ts
npm test -- src/tools/dangerousGrant.test.ts
npm test
npm run build
```

Results:

```text
15 test files passed
261 tests passed
build passed
```

## Live Cleanup

Completed on 2026-06-23 after backup `20260623-025106`.

Confirmed tag before removal:

```json
{
  "id": "iGIsJzqYKQO",
  "name": "TEST-write-smoke-2026-06-23T06-29-58-260Z",
  "parentTagID": null,
  "parentName": null,
  "active": true,
  "allowsNextAction": true,
  "taskCount": 0
}
```

The first signing attempt failed safely because the user's 1Password key is `ssh-rsa` and the grant layer initially only supported Ed25519. No mutation occurred; the guarded tool returned a missing-grant error.

After adding RSA/`RS256` support, the grant helper signed an exact `remove_tag` grant through:

```text
op://Private/SSH Key - MacBook Pro R9JG4390L4/private key?ssh-format=openssh
```

The live `remove_tag` call returned:

```text
Tag "TEST-write-smoke-2026-06-23T06-29-58-260Z" removed successfully.
dangerousAction.executed: true
dangerousAction.dryRun: false
dangerousAction.tool: remove_tag
dangerousAction.grant.reason: cleanup leftover write-smoke TEST tag after backup 20260623-025106
```

Post-cleanup `list_tags` verification returned:

```text
null
```
