/**
 * @file: follow-up-slice.ts
 * @description: follow-up-slice.ts description
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-15
 * @updated: 2026-04-15
 * @status: active
 * @tags: [type]
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FollowUpRecord } from '../../types';
import type { AlertData } from '../../types/websocket-types';

/** 告警级别 → 工单优先级映射 */
const ALERT_LEVEL_TO_PRIORITY: Record<AlertData["level"], FollowUpRecord["priority"]> = {
  critical: "critical",
  error: "high",
  warning: "medium",
  info: "low",
};

/**
 * 历史演示告警清理（落档 55 · P0 真实性批次）：
 * 2026-10-19~20 由已退役的演示 WS 摄入的 `node-a100-*` 工单会永久留在 persist 里，
 * 在「真实告警」位置进入首页横幅 / TopBar 铃铛 / 巡查待处理项，且当前链路无法产生
 * 同类事件（agent 不上报温度、本地规则无 temperature 指标）——按来源一次性剔除。
 * 仅匹配演示源（node-a100-NN / ALERT-node-a100-NN-* / 旧硬编码 AL-00NN），不误删真实工单。
 */
const LEGACY_DEMO_SOURCE = /^node-a100-\d+$/;
const LEGACY_DEMO_TASK = /^ALERT-node-a100-\d+-/;
const LEGACY_DEMO_ID = /^AL-00\d{2}$/;

function purgeLegacyDemoAlerts(items: FollowUpRecord[]): FollowUpRecord[] {
  return items.filter(
    (f) =>
      !LEGACY_DEMO_SOURCE.test(f.assigneeName ?? "") &&
      !LEGACY_DEMO_TASK.test(f.taskId ?? "") &&
      !LEGACY_DEMO_ID.test(f.id ?? ""),
  );
}

export interface FollowUpSlice {
  followUps: FollowUpRecord[];
  addFollowUp: (fu: Omit<FollowUpRecord, 'id' | 'createdAt'>) => void;
  /**
   * 摄入 WS 真实告警（幂等）：同一 source+alertId 只生成一张工单。
   * 真实告警事件流入口 — agent 推送的 alert 消息经此持久化，
   * 替代历史 DEFAULT_FOLLOWUPS 假种子（已按「禁止硬编码」原则清除）。
   * @returns true=新建工单，false=重复告警被去重
   */
  ingestWSAlert: (alert: AlertData) => boolean;
  updateFollowUp: (id: string, updates: Partial<FollowUpRecord>) => void;
  removeFollowUp: (id: string) => void;
  completeFollowUp: (id: string) => void;
}

export const useFollowUpSlice = create<FollowUpSlice>()(
  persist(
    (set) => ({
      followUps: [],
      addFollowUp: (fu) => set((s) => ({
        followUps: [...s.followUps, {
          ...fu,
          // 同毫秒连发时 Date.now() 会撞 ID（曾致 completeFollowUp 误伤同 ID 工单），追加随机段防碰撞
          id: `fu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }],
      })),
      ingestWSAlert: (alert) => {
        let created = false;
        set((s) => {
          const taskId = `ALERT-${alert.source}-${alert.id}`;
          if (s.followUps.some((f) => f.taskId === taskId)) {
            return s; // 幂等去重：同一告警不重复建单
          }
          created = true;
          const now = Date.now();
          const record: FollowUpRecord = {
            id: `fu-${now}-${Math.random().toString(36).slice(2, 8)}`,
            taskId,
            taskName: alert.message,
            assignee: "system",
            assigneeName: alert.source,
            priority: ALERT_LEVEL_TO_PRIORITY[alert.level] ?? "medium",
            status: "pending",
            dueDate: now + 86400000,
            notes: `WS 实时告警 · 来源 ${alert.source} · ${new Date(alert.timestamp || now).toLocaleString("zh-CN", { hour12: false })}`,
            createdAt: alert.timestamp || now,
            updatedAt: now,
            category: "maintenance",
          };
          return { ...s, followUps: [record, ...s.followUps].slice(0, 200) };
        });
        return created;
      },
      updateFollowUp: (id, updates) => set((s) => ({
        followUps: s.followUps.map((f) => f.id === id ? { ...f, ...updates } : f),
      })),
      removeFollowUp: (id) => set((s) => ({
        followUps: s.followUps.filter((f) => f.id !== id),
      })),
      completeFollowUp: (id) => set((s) => ({
        followUps: s.followUps.map((f) => f.id === id ? { ...f, status: "completed" as const, completedAt: Date.now() } : f),
      })),
    }),
    {
      name: 'yyc3-follow-up-slice',
      partialize: (state) => ({ followUps: state.followUps }),
      // v1：一次性剔除历史演示告警（落档 55）。用 migrate 而非 onRehydrateStorage，
      // 迁移结果会回写 localStorage，避免每次启动都在内存里再过滤一遍。
      version: 1,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as { followUps?: FollowUpRecord[] };
        const followUps = Array.isArray(state.followUps) ? state.followUps : [];
        return { ...state, followUps: purgeLegacyDemoAlerts(followUps) };
      },
    }
  )
);
