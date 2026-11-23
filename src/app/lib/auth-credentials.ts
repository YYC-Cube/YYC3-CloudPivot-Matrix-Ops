/**
 * @file: auth-credentials.ts
 * @description: 本地账号凭据 — PBKDF2-SHA256 口令哈希（零后端、数据不出本地）（落档 68 / C-2）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-23
 * @updated: 2026-11-23
 * @status: active
 * @tags: [lib],[auth],[crypto],[credentials]
 *
 * @brief: 本地账号口令的 PBKDF2 哈希与校验。只存盐+派生值，永不存明文；
 *         与 credentialVault（设备绑定密钥）解耦——清空 vault 不影响登录，
 *         备份导出经 storage-registry 按 passwordHash/credential 键名自动脱敏。
 *
 * @details:
 * - PBKDF2-SHA256，默认 120_000 次迭代（本地单机场景的暴力破解成本与
 *   登录延迟的平衡点，实测 <200ms）。
 * - 盐 16 字节随机（crypto.getRandomValues）；派生值 32 字节。
 * - 记录形态 { saltB64, hashB64, iterations } 持久化于 user-mgmt-slice；
 *   校验按记录内 iterations 重算恒等时间比较。
 * - 环境降级：无 crypto.subtle（非安全上下文）时抛出明确错误——认证宁可
 *   不可用也不降级为明文（落档 64 降级原则同样适用于认证域）。
 */

export interface PasswordHashRecord {
  saltB64: string;
  hashB64: string;
  iterations: number;
}

const DEFAULT_ITERATIONS = 120_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function subtle(): SubtleCrypto {
  if (typeof crypto === "undefined" || typeof crypto.subtle === "undefined") {
    throw new Error("[auth-credentials] crypto.subtle 不可用（需 HTTPS/localhost 安全上下文），认证已拒止");
  }
  return crypto.subtle;
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) { s += String.fromCharCode(b); }
  return btoa(s);
}

function fromB64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function derive(password: string, saltB64: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await subtle().importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = fromB64(saltB64);
  const bits = await subtle().deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations, hash: "SHA-256" },
    keyMaterial,
    HASH_BYTES * 8,
  );
  return toB64(bits);
}

/** 生成口令哈希记录（每次调用产生新盐，绝不复用） */
export async function hashPassword(password: string): Promise<PasswordHashRecord> {
  if (!password) { throw new Error("口令不能为空"); }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const saltB64 = toB64(salt);
  const hashB64 = await derive(password, saltB64, DEFAULT_ITERATIONS);
  return { saltB64, hashB64, iterations: DEFAULT_ITERATIONS };
}

/** 校验口令：按记录参数重算派生值并恒等时间比较 */
export async function verifyPassword(password: string, record: PasswordHashRecord): Promise<boolean> {
  if (!password || !record?.saltB64 || !record?.hashB64 || !record?.iterations) { return false; }
  let computed: string;
  try {
    computed = await derive(password, record.saltB64, record.iterations);
  } catch {
    return false;
  }
  // 恒等时间比较（防时序侧信）
  const a = fromB64(computed);
  const b = fromB64(record.hashB64);
  if (a.length !== b.length) { return false; }
  let diff = 0;
  for (let i = 0; i < a.length; i++) { diff |= a[i]! ^ b[i]!; }
  return diff === 0;
}

/** 口令强度：本地自用最低门槛（≥6 位），返回 null 表示合格，否则返回原因 */
export function passwordIssue(password: string): string | null {
  if (!password || password.length < 6) { return "口令至少 6 位"; }
  return null;
}
