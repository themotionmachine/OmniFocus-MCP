import { generateKeyPairSync } from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  canonicalJson,
  createDangerousGrantToken,
  createExactDangerousGrantClaims,
  dangerousArgsHash,
  resetDangerousGrantReplayCache,
  validateDangerousGrant,
} from './dangerousGrant.js';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const env = {
  OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY: publicKeyPem,
};
const openSshPrivateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBsUwngrKIL8LLOe5Z4s3IxgGEXCoMeDFh4Hyfsp8vQcwAAAKCcPGQ8nDxk
PAAAAAtzc2gtZWQyNTUxOQAAACBsUwngrKIL8LLOe5Z4s3IxgGEXCoMeDFh4Hyfsp8vQcw
AAAECUNj9uL/QwAt2inp9C3vTQqhbGwjV3sWFXVKuTyK63GWxTCeCsogvwss57lnizcjGA
YRcKgx4MWHgfJ+yny9BzAAAAFm9tbmlmb2N1cy1tY3AtdGVzdC1rZXkBAgMEBQYH
-----END OPENSSH PRIVATE KEY-----`;
const openSshPublicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGxTCeCsogvwss57lnizcjGAYRcKgx4MWHgfJ+yny9Bz omnifocus-mcp-test-key';

describe('dangerous grants', () => {
  beforeEach(() => {
    resetDangerousGrantReplayCache();
  });

  it('canonicalizes object keys before hashing args', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    expect(dangerousArgsHash({ b: 1, a: 2 })).toBe(dangerousArgsHash({ a: 2, b: 1 }));
  });

  it('excludes dangerousGrant from the args hash', () => {
    expect(dangerousArgsHash({ name: 'A', dangerousGrant: 'one' }))
      .toBe(dangerousArgsHash({ name: 'A', dangerousGrant: 'two' }));
  });

  it('validates a fresh exact grant for the matching tool and args', () => {
    const args = { name: 'TEST: remove me', itemType: 'task' };
    const claims = createExactDangerousGrantClaims({
      toolName: 'remove_item',
      args,
      nowSeconds: 100,
      expiresInSeconds: 60,
      jti: 'grant-1',
    });
    const token = createDangerousGrantToken(claims, privateKeyPem);

    const result = validateDangerousGrant(
      'remove_item',
      { ...args, dangerousGrant: token },
      env,
      120
    );

    expect(result.valid).toBe(true);
    expect(result.claims?.operation?.args_sha256).toBe(dangerousArgsHash(args));
  });

  it('supports OpenSSH Ed25519 private and public keys', () => {
    const args = { name: 'TEST: remove me', itemType: 'task' };
    const claims = createExactDangerousGrantClaims({
      toolName: 'remove_item',
      args,
      nowSeconds: 100,
      expiresInSeconds: 60,
      jti: 'openssh-grant-1',
    });
    const token = createDangerousGrantToken(claims, openSshPrivateKey);

    const result = validateDangerousGrant(
      'remove_item',
      { ...args, dangerousGrant: token },
      { OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY: openSshPublicKey },
      120
    );

    expect(result.valid).toBe(true);
  });

  it('rejects missing grants', () => {
    const result = validateDangerousGrant('remove_item', { name: 'A' }, env, 100);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Missing dangerousGrant');
  });

  it('rejects expired grants', () => {
    const args = { name: 'TEST: remove me', itemType: 'task' };
    const claims = createExactDangerousGrantClaims({
      toolName: 'remove_item',
      args,
      nowSeconds: 100,
      expiresInSeconds: 60,
      jti: 'grant-2',
    });
    const token = createDangerousGrantToken(claims, privateKeyPem);

    const result = validateDangerousGrant(
      'remove_item',
      { ...args, dangerousGrant: token },
      env,
      161
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('rejects grants for different args', () => {
    const args = { name: 'TEST: remove me', itemType: 'task' };
    const claims = createExactDangerousGrantClaims({
      toolName: 'remove_item',
      args,
      nowSeconds: 100,
      expiresInSeconds: 60,
      jti: 'grant-3',
    });
    const token = createDangerousGrantToken(claims, privateKeyPem);

    const result = validateDangerousGrant(
      'remove_item',
      { name: 'Different', itemType: 'task', dangerousGrant: token },
      env,
      120
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('args hash');
  });

  it('rejects replayed grants', () => {
    const args = { name: 'TEST: remove me', itemType: 'task' };
    const claims = createExactDangerousGrantClaims({
      toolName: 'remove_item',
      args,
      nowSeconds: 100,
      expiresInSeconds: 60,
      jti: 'grant-4',
    });
    const token = createDangerousGrantToken(claims, privateKeyPem);

    expect(validateDangerousGrant('remove_item', { ...args, dangerousGrant: token }, env, 120).valid)
      .toBe(true);
    const replay = validateDangerousGrant('remove_item', { ...args, dangerousGrant: token }, env, 120);

    expect(replay.valid).toBe(false);
    expect(replay.reason).toContain('already been used');
  });

  it('rejects grants when no public key is configured', () => {
    const args = { name: 'TEST: remove me', itemType: 'task' };
    const claims = createExactDangerousGrantClaims({
      toolName: 'remove_item',
      args,
      nowSeconds: 100,
      expiresInSeconds: 60,
      jti: 'grant-5',
    });
    const token = createDangerousGrantToken(claims, privateKeyPem);

    const result = validateDangerousGrant(
      'remove_item',
      { ...args, dangerousGrant: token },
      {},
      120
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Missing OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY');
  });
});
