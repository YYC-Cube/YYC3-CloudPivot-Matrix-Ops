/**
 * @file: full-backup.ts
 * @description: YYC³ 全量数据备份与恢复 · 一键导出所有存储层数据
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-16
 * @updated: 2026-04-16
 * @status: active
 * @tags: [lib],[backup],[data-management]
 *
 * @brief: 一键全量备份/恢复所有本地存储数据
 *
 * @details:
 * - 遍历所有 yyc3- 前缀的 localStorage 键
 * - 导出 IndexedDB (yyc3_matrix) 全部 object store 数据
 * - JSON 格式输出，带版本号和时间戳
 * - 恢复时逐层还原，支持版本兼容迁移
 */

import { exportStoreData, importStoreData } from "../stores/global-store";
import { clearAllStorage, exportAllData, importAllData } from "./yyc3-storage";
import {
  AUTH_STORAGE_KEYS, isFullyRedacted, isProjectStorageKey, redactStorageValue,
  stripRedactedJson,
} from "./storage-registry";

// ============================================================
// 类型定义
// ============================================================

export interface FullBackupData {
  /** v2 起：敏感字段默认脱敏（[REDACTED]），导入时跳过占位值 */
  _version: 2;
  _redacted?: boolean;
  _exportedAt: string;
  _tool: "yyc3-full-backup";
  localStorage: Record<string, string>;
  indexedDB: Record<string, unknown[]>;
  globalStore: string; // GlobalStore 导出的 JSON
}

// ============================================================
// 备份键边界（落档 59：统一由 storage-registry 提供，禁止各模块自带前缀表）
// ============================================================

function shouldBackup(key: string): boolean {
  // 认证/会话键不备份：恢复它们等于注入登录态
  return isProjectStorageKey(key) && !AUTH_STORAGE_KEYS.has(key);
}

/** 导入时还原单个值：整体脱敏跳过；部分脱敏移除占位字段 */
function restoreStorageValue(raw: string): string | null {
  if (isFullyRedacted(raw)) { return null; }
  try {
    const parsed = JSON.parse(raw);
    const cleaned = stripRedactedJson(parsed);
    return JSON.stringify(cleaned);
  } catch {
    return raw;
  }
}

// ============================================================
// IndexedDB 数据读取
// ============================================================

async function readIndexedDBData(): Promise<Record<string, unknown[]>> {
  try {
    return await exportAllData();
  } catch (e) {
    console.warn("[FullBackup] IndexedDB read failed:", e);
    return {};
  }
}

// ============================================================
// 导出 API
// ============================================================

/**
 * 全量导出所有本地数据
 * - 包括所有 yyc3- 前缀的 localStorage 键
 * - 包括 IndexedDB yyc3_matrix 的全部 object store
 * - 包括 GlobalStore 的导出数据
 */
export async function exportFullBackup(): Promise<string> {
  // 1. 收集 localStorage
  const lsData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && shouldBackup(key)) {
      const value = localStorage.getItem(key);
      if (value) {
        // 落档 59：敏感字段真实脱敏（apiKey/password/token/secret → [REDACTED]）
        lsData[key] = redactStorageValue(key, value);
      }
    }
  }

  // 2. 收集 IndexedDB
  const idbData = await readIndexedDBData();

  // 3. GlobalStore 导出
  const globalStoreData = exportStoreData();

  const backup: FullBackupData = {
    _version: 2,
    _redacted: true,
    _exportedAt: new Date().toISOString(),
    _tool: "yyc3-full-backup",
    localStorage: lsData,
    indexedDB: idbData,
    globalStore: globalStoreData,
  };

  return JSON.stringify(backup, null, 2);
}

// ============================================================
// 导入 API
// ============================================================

/**
 * 全量恢复本地数据
 * - 先恢复 localStorage
 * - 再恢复 IndexedDB
 * - 最后恢复 GlobalStore
 * - 触发所有同步通道广播
 */
export interface ImportOptions {
  /** 覆盖模式（默认 true）：先清空项目 localStorage + 全部 IndexedDB store，再导入备份。
   *  认证会话键在清理前快照、清理后恢复，避免恢复数据时被强制登出。 */
  replace?: boolean;
}

export async function importFullBackup(
  json: string,
  options: ImportOptions = {},
): Promise<{ success: boolean; errors: string[] }> {
  const { replace = true } = options;
  const errors: string[] = [];

  try {
    const backup = JSON.parse(json) as FullBackupData;

    if (backup._tool !== "yyc3-full-backup") {
      return { success: false, errors: ["Invalid backup file: missing _tool marker"] };
    }
    // 落档 59：版本边界（v1/v2 可导入；更高版本拒绝，避免未知 schema 覆盖）
    if (typeof backup._version !== "number" || backup._version > 2) {
      return { success: false, errors: [`Unsupported backup version: ${String(backup._version)}`] };
    }

    // 0. 覆盖模式：清空项目键 + IndexedDB，保留认证会话
    if (replace) {
      const authSnapshot = new Map<string, string>();
      for (const key of AUTH_STORAGE_KEYS) {
        const value = localStorage.getItem(key);
        if (value !== null) { authSnapshot.set(key, value); }
      }
      try {
        await clearAllStorage();
      } catch (e) {
        errors.push(`clear before import: ${(e as Error).message}`);
      }
      for (const [key, value] of authSnapshot) {
        try { localStorage.setItem(key, value); } catch { /* ignore */ }
      }
    }

    // 1. 恢复 localStorage（键白名单 + 跳过认证键 + 跳过脱敏占位）
    if (backup.localStorage) {
      for (const [key, value] of Object.entries(backup.localStorage)) {
        if (!isProjectStorageKey(key) || AUTH_STORAGE_KEYS.has(key)) { continue; }
        const restored = restoreStorageValue(value);
        if (restored === null) { continue; }
        try {
          localStorage.setItem(key, restored);
        } catch (e) {
          errors.push(`localStorage[${key}]: ${(e as Error).message}`);
        }
      }
    }

    // 2. 恢复 IndexedDB
    if (backup.indexedDB && Object.keys(backup.indexedDB).length > 0) {
      try {
        await restoreIndexedDBData(backup.indexedDB);
      } catch (e) {
        errors.push(`IndexedDB: ${(e as Error).message}`);
      }
    }

    // 3. 恢复 GlobalStore
    if (backup.globalStore) {
      const ok = importStoreData(backup.globalStore);
      if (!ok) {
        errors.push("GlobalStore import failed");
      }
    }

    // 4. 广播全量同步
    try {
      const { broadcastSyncMessage } = await import("./broadcast-channel");
      broadcastSyncMessage({ domain: "global-store", action: "reset" });
    } catch { /* ignore */ }

    return { success: errors.length === 0, errors };
  } catch (e) {
    return { success: false, errors: [`Parse error: ${(e as Error).message}`] };
  }
}

async function restoreIndexedDBData(data: Record<string, unknown[]>): Promise<void> {
  try {
    await importAllData(data as Parameters<typeof importAllData>[0]);
  } catch (e) {
    console.warn("[FullBackup] IndexedDB restore failed:", e);
    throw e;
  }
}

/**
 * 生成备份文件并触发下载
 */
export async function downloadFullBackup(): Promise<void> {
  const data = await exportFullBackup();
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yyc3-full-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  // 记录真实备份时间，供安全监控「数据管理」读取
  try {
    localStorage.setItem("yyc3_last_backup_at", String(Date.now()));
  } catch {
    // 存储不可用时忽略
  }
}
