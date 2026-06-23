import { JsonWebKey, KeyObject, createHash, createPrivateKey, createPublicKey, randomUUID, sign, verify } from 'crypto';
import { readFileSync } from 'fs';

export const DANGEROUS_GRANT_AUDIENCE = 'omnifocus-mcp-dangerous-grant';
export const DANGEROUS_GRANT_ISSUER = 'omnifocus-mcp';

export type DangerousGrantType = 'exact' | 'pattern';

export type DangerousGrantClaims = {
  iss: string;
  aud: string;
  sub?: string;
  iat: number;
  nbf?: number;
  exp: number;
  jti: string;
  grant_version: number;
  grant_type: DangerousGrantType;
  scope: 'dangerous' | 'write';
  allowed_tools: string[];
  operation?: {
    tool: string;
    args_sha256: string;
  };
  constraints?: {
    name_prefix?: string;
    max_operations?: number;
    allow_completed?: boolean;
  };
  reason?: string;
};

export type DangerousGrantValidationResult = {
  valid: boolean;
  reason?: string;
  claims?: DangerousGrantClaims;
};

type DangerousGrantHeader = {
  typ: 'JWT';
  alg: 'EdDSA' | 'RS256';
};

const usedGrantIds = new Set<string>();

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function dangerousArgsHash(args: Record<string, unknown>): string {
  const { dangerousGrant, ...grantlessArgs } = args;
  return createHash('sha256')
    .update(canonicalJson(grantlessArgs))
    .digest('hex');
}

export function resetDangerousGrantReplayCache(): void {
  usedGrantIds.clear();
}

export function createDangerousGrantToken(
  claims: DangerousGrantClaims,
  privateKeyPem: string
): string {
  const privateKey = createSigningPrivateKey(privateKeyPem);
  const header: DangerousGrantHeader = {
    typ: 'JWT',
    alg: privateKey.asymmetricKeyType === 'rsa' ? 'RS256' : 'EdDSA',
  };
  const signingInput = [
    base64UrlEncode(JSON.stringify(header)),
    base64UrlEncode(JSON.stringify(claims)),
  ].join('.');
  const signature = sign(signatureAlgorithmForHeader(header.alg), Buffer.from(signingInput), privateKey);

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export function createExactDangerousGrantClaims(params: {
  toolName: string;
  args: Record<string, unknown>;
  expiresInSeconds?: number;
  reason?: string;
  nowSeconds?: number;
  jti?: string;
}): DangerousGrantClaims {
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);

  return {
    iss: DANGEROUS_GRANT_ISSUER,
    aud: DANGEROUS_GRANT_AUDIENCE,
    sub: 'user-approved-operation',
    iat: now,
    nbf: now,
    exp: now + (params.expiresInSeconds ?? 300),
    jti: params.jti ?? randomUUID(),
    grant_version: 1,
    grant_type: 'exact',
    scope: 'dangerous',
    allowed_tools: [params.toolName],
    operation: {
      tool: params.toolName,
      args_sha256: dangerousArgsHash(params.args),
    },
    constraints: {
      max_operations: 1,
    },
    reason: params.reason,
  };
}

export function validateDangerousGrant(
  toolName: string,
  args: Record<string, unknown>,
  env = process.env,
  nowSeconds = Math.floor(Date.now() / 1000)
): DangerousGrantValidationResult {
  const token = args.dangerousGrant;
  if (typeof token !== 'string' || token.length === 0) {
    return { valid: false, reason: 'Missing dangerousGrant for destructive operation.' };
  }

  const publicKey = readDangerousGrantPublicKey(env);
  if (!publicKey) {
    return {
      valid: false,
      reason: 'Missing OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY or OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY_PATH.',
    };
  }

  const parsed = parseDangerousGrant(token);
  if (!parsed.valid || !parsed.header || !parsed.claims || !parsed.signature || !parsed.signingInput) {
    return { valid: false, reason: parsed.reason };
  }

  if (parsed.header.typ !== 'JWT' || !['EdDSA', 'RS256'].includes(parsed.header.alg)) {
    return { valid: false, reason: 'Unsupported dangerous grant header.' };
  }

  let signatureValid = false;
  try {
    signatureValid = verify(
      signatureAlgorithmForHeader(parsed.header.alg),
      Buffer.from(parsed.signingInput),
      createVerificationPublicKey(publicKey),
      parsed.signature
    );
  } catch {
    return { valid: false, reason: 'Dangerous grant public key is invalid.' };
  }

  if (!signatureValid) {
    return { valid: false, reason: 'Dangerous grant signature is invalid.' };
  }

  return validateDangerousGrantClaims(parsed.claims, toolName, args, nowSeconds);
}

function validateDangerousGrantClaims(
  claims: DangerousGrantClaims,
  toolName: string,
  args: Record<string, unknown>,
  nowSeconds: number
): DangerousGrantValidationResult {
  if (claims.iss !== DANGEROUS_GRANT_ISSUER) {
    return { valid: false, reason: 'Dangerous grant issuer is invalid.' };
  }
  if (claims.aud !== DANGEROUS_GRANT_AUDIENCE) {
    return { valid: false, reason: 'Dangerous grant audience is invalid.' };
  }
  if (claims.grant_version !== 1) {
    return { valid: false, reason: 'Dangerous grant version is unsupported.' };
  }
  if (claims.grant_type !== 'exact') {
    return { valid: false, reason: 'Only exact dangerous grants are supported.' };
  }
  if (claims.scope !== 'dangerous') {
    return { valid: false, reason: 'Dangerous grant scope is invalid.' };
  }
  if (!Array.isArray(claims.allowed_tools) || !claims.allowed_tools.includes(toolName)) {
    return { valid: false, reason: `Dangerous grant does not allow tool "${toolName}".` };
  }
  if (!claims.operation || claims.operation.tool !== toolName) {
    return { valid: false, reason: 'Dangerous grant operation tool does not match.' };
  }
  if (claims.operation.args_sha256 !== dangerousArgsHash(args)) {
    return { valid: false, reason: 'Dangerous grant args hash does not match.' };
  }
  if (claims.nbf !== undefined && nowSeconds < claims.nbf) {
    return { valid: false, reason: 'Dangerous grant is not active yet.' };
  }
  if (nowSeconds >= claims.exp) {
    return { valid: false, reason: 'Dangerous grant has expired.' };
  }
  if (claims.constraints?.max_operations !== undefined && claims.constraints.max_operations !== 1) {
    return { valid: false, reason: 'Exact dangerous grants must allow exactly one operation.' };
  }
  if (usedGrantIds.has(claims.jti)) {
    return { valid: false, reason: 'Dangerous grant has already been used.' };
  }

  usedGrantIds.add(claims.jti);
  return { valid: true, claims };
}

function parseDangerousGrant(token: string): {
  valid: boolean;
  reason?: string;
  header?: DangerousGrantHeader;
  claims?: DangerousGrantClaims;
  signature?: Buffer;
  signingInput?: string;
} {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Dangerous grant must have three JWT parts.' };
  }

  try {
    const [encodedHeader, encodedClaims, encodedSignature] = parts;
    return {
      valid: true,
      header: JSON.parse(base64UrlDecodeToString(encodedHeader)),
      claims: JSON.parse(base64UrlDecodeToString(encodedClaims)),
      signature: base64UrlDecode(encodedSignature),
      signingInput: `${encodedHeader}.${encodedClaims}`,
    };
  } catch {
    return { valid: false, reason: 'Dangerous grant is not valid JSON/base64url.' };
  }
}

function readDangerousGrantPublicKey(env: NodeJS.ProcessEnv): string | undefined {
  if (env.OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY) {
    return env.OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY;
  }

  if (env.OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY_PATH) {
    return readFileSync(env.OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY_PATH, 'utf-8');
  }

  return undefined;
}

function createSigningPrivateKey(key: string): KeyObject {
  try {
    return createPrivateKey(key);
  } catch {
    const jwk = parseOpenSshEd25519PrivateKey(key) ?? parseOpenSshRsaPrivateKey(key);
    if (!jwk) {
      throw new Error('Unsupported private key format.');
    }
    return createPrivateKey({ key: jwk, format: 'jwk' });
  }
}

function signatureAlgorithmForHeader(alg: DangerousGrantHeader['alg']): string | null {
  return alg === 'RS256' ? 'RSA-SHA256' : null;
}

function createVerificationPublicKey(key: string): KeyObject {
  try {
    return createPublicKey(key);
  } catch {
    const jwk = parseOpenSshEd25519PublicKey(key) ?? parseOpenSshRsaPublicKey(key);
    if (!jwk) {
      throw new Error('Unsupported public key format.');
    }
    return createPublicKey({ key: jwk, format: 'jwk' });
  }
}

function parseOpenSshEd25519PublicKey(key: string): JsonWebKey | undefined {
  const trimmed = key.trim();
  const parts = trimmed.split(/\s+/);
  if (parts[0] !== 'ssh-ed25519' || !parts[1]) {
    return undefined;
  }

  const reader = new SshBufferReader(Buffer.from(parts[1], 'base64'));
  const keyType = reader.readString().toString('utf-8');
  if (keyType !== 'ssh-ed25519') {
    return undefined;
  }

  const publicKey = reader.readString();
  if (publicKey.length !== 32) {
    return undefined;
  }

  return {
    kty: 'OKP',
    crv: 'Ed25519',
    x: base64UrlEncode(publicKey),
  };
}

function parseOpenSshRsaPublicKey(key: string): JsonWebKey | undefined {
  const trimmed = key.trim();
  const parts = trimmed.split(/\s+/);
  if (parts[0] !== 'ssh-rsa' || !parts[1]) {
    return undefined;
  }

  const reader = new SshBufferReader(Buffer.from(parts[1], 'base64'));
  const keyType = reader.readString().toString('utf-8');
  if (keyType !== 'ssh-rsa') {
    return undefined;
  }

  const e = readUnsignedMpint(reader);
  const n = readUnsignedMpint(reader);

  return {
    kty: 'RSA',
    n: base64UrlEncode(n),
    e: base64UrlEncode(e),
  };
}

function parseOpenSshEd25519PrivateKey(key: string): JsonWebKey | undefined {
  const match = key.match(/-----BEGIN OPENSSH PRIVATE KEY-----\s+([\s\S]+?)\s+-----END OPENSSH PRIVATE KEY-----/);
  if (!match) {
    return undefined;
  }

  const decoded = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
  const reader = new SshBufferReader(decoded);
  const magic = reader.readBytes('openssh-key-v1\0'.length).toString('utf-8');
  if (magic !== 'openssh-key-v1\0') {
    return undefined;
  }

  const cipherName = reader.readString().toString('utf-8');
  const kdfName = reader.readString().toString('utf-8');
  reader.readString(); // kdf options
  const keyCount = reader.readUInt32();
  if (cipherName !== 'none' || kdfName !== 'none' || keyCount !== 1) {
    return undefined;
  }

  reader.readString(); // public key blob
  const privateBlock = new SshBufferReader(reader.readString());
  const check1 = privateBlock.readUInt32();
  const check2 = privateBlock.readUInt32();
  if (check1 !== check2) {
    return undefined;
  }

  const keyType = privateBlock.readString().toString('utf-8');
  if (keyType !== 'ssh-ed25519') {
    return undefined;
  }

  const publicKey = privateBlock.readString();
  const privateKey = privateBlock.readString();
  if (publicKey.length !== 32 || privateKey.length !== 64) {
    return undefined;
  }

  return {
    kty: 'OKP',
    crv: 'Ed25519',
    x: base64UrlEncode(publicKey),
    d: base64UrlEncode(privateKey.subarray(0, 32)),
  };
}

function parseOpenSshRsaPrivateKey(key: string): JsonWebKey | undefined {
  const privateBlock = readOpenSshPrivateBlock(key);
  if (!privateBlock) {
    return undefined;
  }

  const keyType = privateBlock.readString().toString('utf-8');
  if (keyType !== 'ssh-rsa') {
    return undefined;
  }

  const n = readUnsignedMpint(privateBlock);
  const e = readUnsignedMpint(privateBlock);
  const d = readUnsignedMpint(privateBlock);
  const iqmp = readUnsignedMpint(privateBlock);
  const p = readUnsignedMpint(privateBlock);
  const q = readUnsignedMpint(privateBlock);

  const dValue = bufferToBigInt(d);
  const pValue = bufferToBigInt(p);
  const qValue = bufferToBigInt(q);
  const dp = bigIntToBuffer(dValue % (pValue - 1n));
  const dq = bigIntToBuffer(dValue % (qValue - 1n));

  return {
    kty: 'RSA',
    n: base64UrlEncode(n),
    e: base64UrlEncode(e),
    d: base64UrlEncode(d),
    p: base64UrlEncode(p),
    q: base64UrlEncode(q),
    dp: base64UrlEncode(dp),
    dq: base64UrlEncode(dq),
    qi: base64UrlEncode(iqmp),
  };
}

function readOpenSshPrivateBlock(key: string): SshBufferReader | undefined {
  const match = key.match(/-----BEGIN OPENSSH PRIVATE KEY-----\s+([\s\S]+?)\s+-----END OPENSSH PRIVATE KEY-----/);
  if (!match) {
    return undefined;
  }

  const decoded = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
  const reader = new SshBufferReader(decoded);
  const magic = reader.readBytes('openssh-key-v1\0'.length).toString('utf-8');
  if (magic !== 'openssh-key-v1\0') {
    return undefined;
  }

  const cipherName = reader.readString().toString('utf-8');
  const kdfName = reader.readString().toString('utf-8');
  reader.readString(); // kdf options
  const keyCount = reader.readUInt32();
  if (cipherName !== 'none' || kdfName !== 'none' || keyCount !== 1) {
    return undefined;
  }

  reader.readString(); // public key blob
  const privateBlock = new SshBufferReader(reader.readString());
  const check1 = privateBlock.readUInt32();
  const check2 = privateBlock.readUInt32();
  if (check1 !== check2) {
    return undefined;
  }

  return privateBlock;
}

function readUnsignedMpint(reader: SshBufferReader): Buffer {
  const value = reader.readString();
  let offset = 0;
  while (offset < value.length - 1 && value[offset] === 0) {
    offset += 1;
  }
  return value.subarray(offset);
}

function bufferToBigInt(value: Buffer): bigint {
  if (value.length === 0) {
    return 0n;
  }
  return BigInt(`0x${value.toString('hex')}`);
}

function bigIntToBuffer(value: bigint): Buffer {
  if (value === 0n) {
    return Buffer.from([0]);
  }
  const hex = value.toString(16);
  return Buffer.from(hex.length % 2 === 0 ? hex : `0${hex}`, 'hex');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const child = (value as Record<string, unknown>)[key];
        if (child !== undefined) {
          result[key] = canonicalize(child);
        }
        return result;
      }, {});
  }

  return value;
}

class SshBufferReader {
  private offset = 0;

  constructor(private readonly buffer: Buffer) {}

  readUInt32(): number {
    this.ensureAvailable(4);
    const value = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  readString(): Buffer {
    const length = this.readUInt32();
    return this.readBytes(length);
  }

  readBytes(length: number): Buffer {
    this.ensureAvailable(length);
    const value = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  private ensureAvailable(length: number): void {
    if (this.offset + length > this.buffer.length) {
      throw new Error('Unexpected end of SSH key data.');
    }
  }
}

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === 'string' ? Buffer.from(value) : value;

  return buffer
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function base64UrlDecode(value: string): Buffer {
  const padded = value + '='.repeat((4 - value.length % 4) % 4);
  return Buffer.from(padded.replaceAll('-', '+').replaceAll('_', '/'), 'base64');
}

function base64UrlDecodeToString(value: string): string {
  return base64UrlDecode(value).toString('utf-8');
}
