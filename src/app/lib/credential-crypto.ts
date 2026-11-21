/**
 * @file: credential-crypto.ts
 * @description: 设备绑定凭据加密 — 非导出 AES-GCM 密钥存 IndexedDB（落档 64）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-21
 * @updated: 2026-11-21
 * @status: active
 * @tags: [lib],[crypto],[credentials],[storage]
 *
 * @brief: 本地凭据（API Key / WS 令牌 / 数据库密码）的设备绑定加密。
 *
 * @details:
 * - 密钥策略（主控 2026-11-21 批复）：**设备绑定** —— `crypto.subtle.generateKey`
 *   生成 `extractable: false` 的 AES-GCM-256 `CryptoKey`，经结构化克隆存入
 *   IndexedDB `yyc3_matrix/credentialVault`。密钥永不出库（不可导出/不可写进备份）。
 * - 「清空数据 / 全量恢复」会清掉 credentialVault（clearAllStorage 遍历 ALL_STORES）：
 *   旧密文不可解 → 凭据字段回空，用户需重新录入 —— 与「备份不含密钥」的脱敏策略闭环一致。
 * - 密文格式 `yyc3enc1:<base64(iv||ciphertext)>`；无前缀视为历史明文（解密直通，
 *   下一次写入自动升级为密文）。
 * - 环境降级：`crypto.subtle` 或 IndexedDB 不可用（非安全上下文 / 测试环境异常）时
 *   回退内存密钥或明文直通 —— 功能不中断，但安全性回落，已在落档 64 登记。
 * - 用法：配合 `createCredentialAwareStorage` 作为 zustand persist 的异步 storage，
 *   在 setItem 时加密指定字段、getItem 时解密 —— 内存态始终是明文（模型调用需要），
 *   磁盘态始终是密文。
 */

const ENVELOPE_PREFIX = "yyc3enc1:";
const VAULT_STORE = "credentialVault";
const VAULT_KEY_ID = "device";

let memoryKey: CryptoKey | null = null;
let keyPromise: Promise<CryptoKey | null> | null = null;

function subtleAvailable(): boolean {
  return typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";
}

function openVaultDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") { resolve(null); return; }
    try {
      const req = indexedDB.open("yyc3_matrix");
      req.onsuccess = () => {
        const db = req.result;
        // 落档 64：别的连接请求版本升级时立即让路（否则会 block yyc3-storage 的升级）
        db.onversionchange = () => { try { db.close(); } catch { /* ignore */ } };
        // store 缺失（旧版本库，如 v5 时代打开）：带版本重开触发 upgrade 补建
        if (!db.objectStoreNames.contains(VAULT_STORE)) {
          const oldVersion = db.version;
          try { db.close(); } catch { /* ignore */ }
          const upReq = indexedDB.open("yyc3_matrix", Math.max(oldVersion, 6));
          upReq.onupgradeneeded = () => {
            const up = upReq.result;
            if (!up.objectStoreNames.contains(VAULT_STORE)) {
              up.createObjectStore(VAULT_STORE, { keyPath: "id" });
            }
          };
          upReq.onsuccess = () => {
            const upDb = upReq.result;
            upDb.onversionchange = () => { try { upDb.close(); } catch { /* ignore */ } };
            resolve(upDb);
          };
          upReq.onerror = () => resolve(null);
          upReq.onblocked = () => resolve(null);
          return;
        }
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(VAULT_STORE)) {
          db.createObjectStore(VAULT_STORE, { keyPath: "id" });
        }
      };
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
}

function idbGet(db: IDBDatabase, store: string, id: string): Promise<unknown> {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(store, "readonly").objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch { resolve(undefined); }
  });
}

function idbPut(db: IDBDatabase, store: string, value: unknown): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch { resolve(false); }
  });
}

/**
 * 取设备绑定密钥（单例）：优先 IndexedDB 持久化的非导出 CryptoKey；
 * 不存在则生成并持久化；IDB 不可用/克隆失败时回退内存密钥（进程生命周期）。
 */
export function getDeviceVaultKey(): Promise<CryptoKey | null> {
  if (keyPromise) { return keyPromise; }
  keyPromise = (async () => {
    if (memoryKey) { return memoryKey; }
    if (!subtleAvailable()) { return null; }
    try {
      const db = await openVaultDB();
      if (db) {
        try {
          const stored = await idbGet(db, VAULT_STORE, VAULT_KEY_ID) as { key?: CryptoKey } | undefined;
          if (stored?.key) {
            memoryKey = stored.key;
            return memoryKey;
          }
          const key = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            false, // extractable: false —— 设备绑定，密钥材料不可导出
            ["encrypt", "decrypt"],
          );
          const ok = await idbPut(db, VAULT_STORE, { id: VAULT_KEY_ID, key, createdAt: Date.now() });
          memoryKey = key;
          if (!ok) {
            // fake-indexeddb 等不支持克隆 CryptoKey：退回内存密钥（进程内有效）
            console.warn("[credential-crypto] CryptoKey 持久化失败，回退内存密钥（刷新后凭据需重录）");
          }
          return memoryKey;
        } finally {
          // 用完即关：不长期占住连接，避免 block yyc3-storage 的版本升级
          try { db.close(); } catch { /* ignore */ }
        }
      }
    } catch { /* 落入内存兜底 */ }
    try {
      memoryKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
      );
      return memoryKey;
    } catch {
      return null;
    }
  })();
  return keyPromise;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) { s += String.fromCharCode(b); }
  return btoa(s);
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

export function isEncryptedCredential(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ENVELOPE_PREFIX);
}

/** 加密凭据；空串原样返回；加密不可用时回退明文（安全性回落已在落档登记） */
export async function encryptCredential(plain: string): Promise<string> {
  if (!plain) { return ""; }
  const key = await getDeviceVaultKey();
  if (!key) { return plain; }
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, key, new TextEncoder().encode(plain),
    );
    const combined = new Uint8Array(iv.length + cipher.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(cipher), iv.length);
    return `${ENVELOPE_PREFIX}${toBase64(combined)}`;
  } catch {
    return plain;
  }
}

/** 解密凭据；无前缀视为历史明文直通；解密失败（密钥被清）返回空串 */
export async function decryptCredential(value: string): Promise<string> {
  if (!value) { return ""; }
  if (!isEncryptedCredential(value)) { return value; }
  const key = await getDeviceVaultKey();
  if (!key) { return ""; }
  try {
    const combined = fromBase64(value.slice(ENVELOPE_PREFIX.length));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(plain);
  } catch {
    return "";
  }
}

/**
 * 多层解包：历史上曾因迁移 bug 产生「密文再加密」的双重信封（落档 64）；
 * 解密结果若仍是信封则继续剥层（上限 3 层），实现存量数据自愈。
 */
export async function unwrapCredential(value: string): Promise<string> {
  let current = value;
  for (let depth = 0; depth < 3 && isEncryptedCredential(current); depth++) {
    const next = await decryptCredential(current);
    if (!next) { return ""; } // 密钥丢失/解密失败：如实为空
    current = next;
  }
  return current;
}

// ============================================================
//  zustand persist 异步 storage：指定字段在磁盘态加密
// ============================================================

export interface CredentialFieldSpec {
  /** 数组字段：对数组每项的指定键加密（如 configuredModels[].apiKey） */
  arrays?: Array<{ list: string; field: string }>;
  /** 对象字段：对对象下指定键加密（如 values.aiApiKey） */
  fields?: Array<{ obj: string; keys: string[] }>;
}

async function encryptParsed(document: Record<string, unknown>, spec: CredentialFieldSpec): Promise<void> {
  // zustand persist 落盘形态为 {state, version}——字段路径相对内层 state
  const state = (document.state ?? document) as Record<string, unknown>;
  for (const { list, field } of spec.arrays ?? []) {
    const arr = state[list];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const rec = item as Record<string, unknown> | undefined;
        if (rec && typeof rec === "object" && typeof rec[field] === "string" && rec[field]) {
          rec[field] = await encryptCredential(rec[field]);
        }
      }
    }
  }
  for (const { obj, keys } of spec.fields ?? []) {
    const target = state[obj] as Record<string, unknown> | undefined;
    if (target && typeof target === "object") {
      for (const k of keys) {
        if (typeof target[k] === "string" && target[k]) {
          target[k] = await encryptCredential(target[k]);
        }
      }
    }
  }
}

async function decryptParsed(document: Record<string, unknown>, spec: CredentialFieldSpec): Promise<boolean> {
  // zustand persist 落盘形态为 {state, version}——字段路径相对内层 state
  const state = (document.state ?? document) as Record<string, unknown>;
  let changed = false;
  for (const { list, field } of spec.arrays ?? []) {
    const arr = state[list];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const rec = item as Record<string, unknown> | undefined;
        if (rec && typeof rec === "object" && typeof rec[field] === "string" && rec[field]) {
          const decrypted = await unwrapCredential(rec[field]);
          // 历史明文（非信封）也算「待升级」，触发 fire-and-forget 回写密文
          if (decrypted !== rec[field] || !isEncryptedCredential(rec[field])) { changed = true; }
          rec[field] = decrypted;
        }
      }
    }
  }
  for (const { obj, keys } of spec.fields ?? []) {
    const target = state[obj] as Record<string, unknown> | undefined;
    if (target && typeof target === "object") {
      for (const k of keys) {
        if (typeof target[k] === "string" && target[k]) {
          const decrypted = await unwrapCredential(target[k]);
          if (decrypted !== target[k] || !isEncryptedCredential(target[k])) { changed = true; }
          target[k] = decrypted;
        }
      }
    }
  }
  return changed;
}

/**
 * 供 zustand persist `createJSONStorage` 使用的异步 StateStorage：
 * - setItem：解析 → 加密指定字段 → 写 localStorage（磁盘态恒为密文）
 * - getItem：读 → 解密指定字段 → 返回 JSON（内存态为明文）；检测到历史明文时
 *   fire-and-forget 回写密文（一次性升级）
 */
export function createCredentialAwareStorage(spec: CredentialFieldSpec) {
  return {
    getItem: async (name: string): Promise<string | null> => {
      const raw = localStorage.getItem(name);
      if (!raw) { return null; }
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const changed = await decryptParsed(parsed, spec);
        if (changed) {
          // 历史/异构状态一次性升级为密文：基于【解密后的 parsed】再加密——
          // 严禁用原始 raw 加密（那会把密文二次加密，解密链从此断裂）
          void (async () => {
            try {
              const fresh = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
              await encryptParsed(fresh, spec);
              localStorage.setItem(name, JSON.stringify(fresh));
            } catch { /* ignore */ }
          })();
        }
        return JSON.stringify(parsed);
      } catch {
        return raw;
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        await encryptParsed(parsed, spec);
        localStorage.setItem(name, JSON.stringify(parsed));
      } catch {
        localStorage.setItem(name, value);
      }
    },
    removeItem: async (name: string): Promise<void> => {
      localStorage.removeItem(name);
    },
  };
}
