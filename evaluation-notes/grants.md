# Dangerous Grant Evaluation Notes

These notes record the dangerous-operation grant design in this fork.

## Goal

MCP/client approval prompts are useful UX, but they are not the final safety boundary. The server should require a fresh user-mediated capability before destructive operations reach the OmniFocus mutation primitives.

The implemented v1 design requires both:

- `OMNIFOCUS_MCP_MODE=dangerous`
- a valid `dangerousGrant` argument on the destructive tool call

## V1 Grant Semantics

V1 implements exact-operation grants only:

- one tool name
- one canonicalized argument hash
- one short expiry
- one `jti`, accepted once per server process
- one EdDSA signature from a configured public key

The grant verifier rejects missing, expired, replayed, wrong-tool, wrong-args, wrong-audience, wrong-issuer, unsupported-version, and unsupported-grant-type tokens.

The tool gate strips `dangerousGrant` before calling the underlying tool handler so mutation primitives do not receive authorization metadata.

For testing, `OMNIFOCUS_MCP_DANGEROUS_DRY_RUN=1` verifies a valid grant and then stops before calling the destructive handler. This makes MCP-level positive grant tests possible without touching OmniFocus mutation primitives.

Dangerous responses include a machine-checkable `dangerousAction` JSON object. Dry-run sets `executed: false`; normal dangerous execution appends the same object with `executed: true`.

```json
{
  "dangerousAction": {
    "dryRun": true,
    "tool": "remove_item",
    "accessLevel": "dangerous",
    "argsHash": "sha256-of-canonical-args",
    "args": {
      "name": "TEST: item",
      "itemType": "task"
    },
    "grant": {
      "jti": "grant-id",
      "grantVersion": 1,
      "grantType": "exact",
      "scope": "dangerous",
      "allowedTools": ["remove_item"],
      "expiresAt": 1782196900,
      "reason": "cleanup test data"
    },
    "executed": false,
    "message": "Grant verified; OmniFocus mutation was not executed because dangerous dry-run mode is enabled."
  }
}
```

## V2-Ready Payload Shape

The claims schema intentionally leaves room for a future umbrella grant:

```json
{
  "iss": "omnifocus-mcp",
  "aud": "omnifocus-mcp-dangerous-grant",
  "sub": "user-approved-operation",
  "iat": 1782196600,
  "nbf": 1782196600,
  "exp": 1782196900,
  "jti": "random-id",
  "grant_version": 1,
  "grant_type": "exact",
  "scope": "dangerous",
  "allowed_tools": ["remove_item"],
  "operation": {
    "tool": "remove_item",
    "args_sha256": "sha256-of-canonical-args"
  },
  "constraints": {
    "max_operations": 1
  },
  "reason": "cleanup test data"
}
```

Future `grant_type: "pattern"` grants can reuse `allowed_tools` and `constraints` for short-lived cleanup sessions, for example deleting up to 20 `TEST:` items.

## Signing Path

The current helper signs compact EdDSA JWT-style grants and accepts PEM or unencrypted OpenSSH Ed25519 private keys:

```sh
omnifocus-mcp-grant \
  --tool remove_item \
  --args-json '{"name":"TEST: item","itemType":"task"}' \
  --private-key-ref 'op://Private/SSH Key - MacBook Pro R9JG4390L4/private key?ssh-format=openssh' \
  --reason 'cleanup test data'
```

The `--private-key-ref` mode uses `op read --no-newline` and keeps the private key in process memory only. This is a pragmatic v1 path for standard JWT-style signatures. The verifier accepts PEM or OpenSSH `ssh-ed25519` public keys.

The preferred no-export path is still worth investigating: use the 1Password SSH agent with `ssh-keygen -Y sign` so the private key never leaves 1Password. That produces an SSH signature envelope rather than a normal JOSE/JWT signature, so it should be treated as a separate signer/verifier backend.

## Verified Locally

- Unit tests cover canonical hashing, grant creation, signature verification, expiry, args mismatch, replay rejection, missing public-key config, policy blocking without grants, and policy allowance with valid exact grants.
- Unit tests cover dangerous audit output for both dry-run and real handler execution.
- Unit tests cover dangerous dry-run behavior: valid grants are verified, but the destructive handler is not called.
- Build passes with the grant helper compiled to `dist/grantDangerous.js`.
- The grant helper was smoke-tested with a temporary generated PEM Ed25519 keypair and produced a three-part compact token.
- The grant helper and verifier were smoke-tested end-to-end with a temporary `ssh-keygen -t ed25519` OpenSSH private/public keypair.
- The full dangerous dry-run MCP matrix passed with a temporary OpenSSH keypair. Each case returned `dangerousAction.executed: false`, `dangerousAction.dryRun: true`, and matching sanitized args:
  - `remove_item`
  - `batch_remove_items`
  - `edit_item` with task `newStatus: completed`
  - `edit_item` with task `newStatus: dropped`
  - `edit_item` with task `newStatus: skipped`
  - `edit_item` with project `newProjectStatus: completed`
  - `edit_item` with project `newProjectStatus: dropped`
  - `batch_add_items` with 11 items

## Live Cleanup Test

After creating a full local OmniFocus model backup, one live destructive cleanup was performed through MCP with a valid exact grant.

Removed project:

```text
TEST: OmniFocus MCP write smoke 2026-06-23T06-29-58-260Z
```

Removed project ID:

```text
iqF4214Wvsw
```

The `remove_item` call returned `dangerousAction.executed: true`, `dangerousAction.dryRun: false`, and reason:

```text
cleanup write-smoke TEST project after backup 20260623-005401
```

Post-cleanup query for tasks in the project returned:

```text
No tasks found matching the specified criteria.
```

The write-smoke tag remains because the MCP server does not currently expose tag deletion:

```text
TEST-write-smoke-2026-06-23T06-29-58-260Z
```
