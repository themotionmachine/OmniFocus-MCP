import { generateKeyPairSync } from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  canonicalJson,
  createDangerousGrantToken,
  createExactDangerousGrantClaims,
  dangerousArgsHash,
  inspectDangerousGrantPrivateKey,
  inspectDangerousGrantPublicKey,
  resetDangerousGrantReplayCache,
  validateDangerousGrant,
} from './dangerousGrant.js';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const { privateKey: ecPrivateKey, publicKey: ecPublicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});
const ecPrivateKeyPem = ecPrivateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const ecPublicKeyPem = ecPublicKey.export({ type: 'spki', format: 'pem' }).toString();
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
const openSshRsaPrivateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEA75N3vn4jNfYDldWPNzXke1Gy5QIo6J6wBBt5vIMgPbGvtI105nw7
YnqZVLVO95ApuUwtWMxJ/VOlsmRH+vJ3JfdEicqI0OsRjLlgV9eYgZ7SRWB2fSBckKnVxa
P7KtYoLantZEUI14EIm2W3W5TVB9PHoLcYeqOJbUi5ALUD+uepZW7FILD8KuF8mStNqhoc
Pw+xv2Mjv1+Wm96GjFUsspwFNfdJ27kz9BUl32ewhrD3Ln77iX9XcRcajXt8pX6ScyjCGk
uZYrYK/fWTDUjn8Tr/PmZbjbpjWTZxYlMlUeNm52fgDrh+KmRtT68KnNhttFldekYVTL1o
uq15EwTJ5QAAA9BDL9z4Qy/c+AAAAAdzc2gtcnNhAAABAQDvk3e+fiM19gOV1Y83NeR7Ub
LlAijonrAEG3m8gyA9sa+0jXTmfDtieplUtU73kCm5TC1YzEn9U6WyZEf68ncl90SJyojQ
6xGMuWBX15iBntJFYHZ9IFyQqdXFo/sq1igtqe1kRQjXgQibZbdblNUH08egtxh6o4ltSL
kAtQP656llbsUgsPwq4XyZK02qGhw/D7G/YyO/X5ab3oaMVSyynAU190nbuTP0FSXfZ7CG
sPcufvuJf1dxFxqNe3ylfpJzKMIaS5litgr99ZMNSOfxOv8+ZluNumNZNnFiUyVR42bnZ+
AOuH4qZG1Prwqc2G20WV16RhVMvWi6rXkTBMnlAAAAAwEAAQAAAQAbMaMC9XBrvJwVkuMp
wi1ILjLfOcqI9RJHtRKxajTrq9Kk7PWa//kBqabj7ZykDzIdPV9cV/wCDE+fmzBsdL8/iP
y3o0y6YiRg093yup8t/2ggxd1NQLIhHZYNVBq7dwmifUpb+lYRmCzw7q/Mbm1r8QcU4BOg
QBXmWL3fLazg+tiJzs6yns7j2vt5odXupHz3+MUzFaCaDAytrHMUV1N0257EW3+i/jzt8D
uW5vKmphrOWycB9MLLUgkzq3/TYSWlKkEEKANAi7mLvJSq07so/iU5yNoRi+KXb+MZ+HXd
N4IFu6zMH7nzN7M0DzldtEm8Z2sqLgNE6hx3n0H8fUsVAAAAgGfXHGKFVPfu8IugYbaaG/
wBhDBW4dCFYDxojo4tqMC/jQsKVu74zyRsQq2loWIGJXSm0QR4HiDm4e79Fg5DsZjXgxoI
PU6Xls7/j3DoUJG7A6ZKxqvD/zWOZTiQ+2IaR9/9ImjwSgZRK2q8gWFSYIVLwlCjry2U96
r3zpg4iOOPAAAAgQD+3RgBElCHR4hGaMZIqhYkzC1USRCnRWDi2QTS47QP+ciilNavNk1g
30Yqu9QAZGJBli/iyXZlYLfR3iM9z+GMITkwebGSHfMJpuTyYrhOA3PBe7OPVgZ0jgEfDo
SbKo3u44cdl6OhjuK+ayaiYqWONX6MYaPBtP0pNTKrsWI+UwAAAIEA8KTspwf1YSV+vsEF
0CjH3C17U3P0Is6Pa1SwcuZ0ueF/4JUkdWTmlEVk+FjLsZffF3NIIfgaIFjRYVW+Md1kRs
PqeC6OJEtNEWUrhlxLozraeIGezwaYxqgovgLhyEfXcHhpXKSyBj/XfsqSEAdZDnrtI7Oo
2X9FI415GFeTn+cAAAAab21uaWZvY3VzLW1jcC1yc2EtdGVzdC1rZXkB
-----END OPENSSH PRIVATE KEY-----`;
const openSshRsaPublicKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDvk3e+fiM19gOV1Y83NeR7UbLlAijonrAEG3m8gyA9sa+0jXTmfDtieplUtU73kCm5TC1YzEn9U6WyZEf68ncl90SJyojQ6xGMuWBX15iBntJFYHZ9IFyQqdXFo/sq1igtqe1kRQjXgQibZbdblNUH08egtxh6o4ltSLkAtQP656llbsUgsPwq4XyZK02qGhw/D7G/YyO/X5ab3oaMVSyynAU190nbuTP0FSXfZ7CGsPcufvuJf1dxFxqNe3ylfpJzKMIaS5litgr99ZMNSOfxOv8+ZluNumNZNnFiUyVR42bnZ+AOuH4qZG1Prwqc2G20WV16RhVMvWi6rXkTBMnl omnifocus-mcp-rsa-test-key';

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

  it('supports OpenSSH RSA private and public keys', () => {
    const args = { name: 'TEST: remove me', itemType: 'task' };
    const claims = createExactDangerousGrantClaims({
      toolName: 'remove_item',
      args,
      nowSeconds: 100,
      expiresInSeconds: 60,
      jti: 'openssh-rsa-grant-1',
    });
    const token = createDangerousGrantToken(claims, openSshRsaPrivateKey);

    const result = validateDangerousGrant(
      'remove_item',
      { ...args, dangerousGrant: token },
      { OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY: openSshRsaPublicKey },
      120
    );

    expect(token.startsWith('eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.')).toBe(true);
    expect(result.valid).toBe(true);
  });

  it('inspects supported private and public key algorithms', () => {
    expect(inspectDangerousGrantPrivateKey(openSshPrivateKey)).toMatchObject({
      supported: true,
      keyKind: 'private',
      keyType: 'ed25519',
      algorithm: 'EdDSA',
      format: 'openssh',
    });
    expect(inspectDangerousGrantPublicKey(openSshRsaPublicKey)).toMatchObject({
      supported: true,
      keyKind: 'public',
      keyType: 'rsa',
      algorithm: 'RS256',
      format: 'openssh',
    });
  });

  it('reports unsupported key material without exposing it', () => {
    expect(inspectDangerousGrantPrivateKey('not a key')).toMatchObject({
      supported: false,
      keyKind: 'private',
      reason: 'Unsupported private key format.',
    });
    expect(inspectDangerousGrantPublicKey('not a key')).toMatchObject({
      supported: false,
      keyKind: 'public',
      reason: 'Unsupported public key format.',
    });
  });

  it('reports unsupported PEM key algorithms', () => {
    expect(inspectDangerousGrantPrivateKey(ecPrivateKeyPem)).toMatchObject({
      supported: false,
      keyKind: 'private',
      format: 'pem',
      reason: 'Unsupported private key format.',
    });
    expect(inspectDangerousGrantPublicKey(ecPublicKeyPem)).toMatchObject({
      supported: false,
      keyKind: 'public',
      format: 'pem',
      reason: 'Unsupported public key format.',
    });
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
