/**
 * @file: storage-registry.ts
 * @description: 本地存储注册表 — 项目键边界、清理白名单、备份脱敏（落档 59）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-21
 * @updated: 2026-11-21
 * @status: active
 * @tags: [lib],[storage],[backup],[security]
 *
 * @details:
 * - 存储架构缺陷整改：备份/清空/脱敏共用同一份键边界，禁止 localStorage.clear()。
 * - 备份默认脱敏：apiKey / password / token / secret / authorization 等字段值替换为 [REDACTED]；
 *   导入时跳过占位值，避免用占位符覆盖真实凭据。
 * - 认证键（yyc3_session / yyc3_ghost）不参与备份、不允许从备份恢复。
 */

/** 项目自有的 localStorage 键前缀（备份/清理的唯一依据） */
export const PROJECT_STORAGE_PREFIXES = [
  "yyc3",
  "yyc3-",
  "network_config",
  "offline_snapshot",
  "offline_snapshot_time",
  "dashboard_state",
  "d-music",
  "pwa_",
  "vault:",
  "__yyc3",
] as const;

/** 认证/会话类键：不备份、不恢复（恢复会导致凭据注入） */
export const AUTH_STORAGE_KEYS = new Set(["yyc3_session", "yyc3_ghost"]);

/** 敏感字段名（对 JSON 递归脱敏） */
export const SENSITIVE_FIELD_RE =
  /^(api[-_]?key|apikey|password|passwd|pwd|token|secret|authorization|credential|credentials|cookie|wstoken|dbpassword|providerkeys)$/i;

/** 键名包含敏感词（用于非 JSON 存储值的整体判定；比字段名匹配更宽松） */
const SENSITIVE_KEY_SUBSTRING_RE =
  /(api[-_]?key|password|passwd|pwd|token|secret|authorization|credential|cookie)/i;

export function isSensitiveKeyName(key: string): boolean {
  return SENSITIVE_FIELD_RE.test(key) || SENSITIVE_KEY_SUBSTRING_RE.test(key);
}

export const REDACTED = "[REDACTED]";

export function isProjectStorageKey(key: string): boolean {
  return PROJECT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** 列出当前存储里属于本项目的键（可选包含 sessionStorage） */
export function listProjectStorageKeys(
  storage: Storage = localStorage,
): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isProjectStorageKey(key)) { keys.push(key); }
  }
  return keys;
}

export interface ClearOptions {
  local?: boolean;
  session?: boolean;
}

/**
 * 按注册表清理项目键——替代全局 clear()。
 * 只删本项目前缀键，不触碰同源其他应用数据，也不触碰认证键（由调用方显式处理）。
 */
export function clearProjectStorage(options: ClearOptions = {}): { localRemoved: string[]; sessionRemoved: string[] } {
  const { local = true, session = true } = options;
  const localRemoved: string[] = [];
  const sessionRemoved: string[] = [];

  if (local) {
    for (const key of listProjectStorageKeys(localStorage)) {
      localStorage.removeItem(key);
      localRemoved.push(key);
    }
  }
  if (session) {
    for (const key of listProjectStorageKeys(sessionStorage)) {
      sessionStorage.removeItem(key);
      sessionRemoved.push(key);
    }
  }
  return { localRemoved, sessionRemoved };
}

/** 递归脱敏 JSON 对象（保留结构，只替换敏感字段值） */
export function redactJson(value: unknown): unknown {
  if (Array.isArray(value)) { return value.map(redactJson); }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_FIELD_RE.test(k) && v !== null && v !== undefined && v !== ""
        ? REDACTED
        : redactJson(v);
    }
    return out;
  }
  return value;
}

/**
 * 对单个存储值脱敏：
 * - JSON 可解析 → 递归脱敏后重新序列化（结构不变）
 * - 非 JSON 且键名敏感 → 整体替换为 [REDACTED]
 * - 其他 → 原样返回
 */
export function redactStorageValue(key: string, raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(redactJson(parsed));
  } catch {
    return isSensitiveKeyName(key) ? REDACTED : raw;
  }
}

/** 导入时移除占位值，避免 [REDACTED] 覆盖真实凭据 */
export function stripRedactedJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripRedactedJson).filter((v) => v !== REDACTED);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === REDACTED) { continue; }
      out[k] = stripRedactedJson(v);
    }
    return out;
  }
  return value;
}

/** 判断导入值是否为整体脱敏占位 */
export function isFullyRedacted(raw: string): boolean {
  return raw.trim() === REDACTED;
}
