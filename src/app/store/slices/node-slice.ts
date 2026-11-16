/**
 * @file: node-slice.ts
 * @description: YYC³ 节点 Slice · 统一管理所有节点相关状态
 * @author: YanYuCloudCube Team
 * @version: v2.0.0 (enhanced with devtools + immer)
 * @created: 2026-04-15
 * @updated: 2026-04-16
 * @status: active
 * @tags: [store],[slice],[node],[devtools],[immer]
 *
 * @brief: 合并原 nodeStore + useNodeCacheStore + db-queries nodes 为单一 Slice
 *
 * @features:
 * - ✅ 持久化：自动保存到 localStorage (persist middleware)
 * - ✅ 时间旅行调试：Redux DevTools 支持 (devtools middleware)
 * - ✅ 不可变更新：Immer 简化状态操作 (immer middleware)
 * - ✅ 智能合并：通过 DataBus 处理遥测 vs 编辑字段的冲突
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { NodeData } from '../../types';
import { dataBus, type DataSource } from '../../lib/data-bus';

/**
 * 2026-11-11 禁止硬编码政策：DEFAULT_NODES 假节点种子已清除。
 * 真实来源：WS 全量快照（mergeFromWS authoritative）/ 用户手动添加；
 * 演示数据由 useWebSocketData 的 demoMode 模拟器自带种子生成（不污染本 slice）。
 */
const DEFAULT_NODES: NodeData[] = [];

/** 历史假节点 ID — persist 迁移时一次性清除 */
const LEGACY_FAKE_NODE_IDS = new Set([
  "GPU-A100-01", "GPU-A100-02", "GPU-A100-03", "GPU-A100-04",
  "GPU-A100-05", "GPU-A100-06", "GPU-A100-07", "GPU-A100-08",
  "GPU-H100-01",
]);

interface NodeSlice {
  nodes: NodeData[];
  lastSource: DataSource | null;
  lastUpdateAt: string | null;

  setNodes: (nodes: NodeData[], source?: DataSource) => void;
  /**
   * 合并 WS 推送的节点快照
   * @param options.authoritative 真实 WS 全量快照时为 true：
   *   未出现在快照中的节点（含 DEFAULT_NODES 模拟种子）视为已下线并移除；
   *   模拟数据路径不传（保持旧合并行为，保留用户手动添加的节点）
   */
  mergeFromWS: (incoming: NodeData[], options?: { authoritative?: boolean }) => void;
  updateNode: (id: string, updates: Partial<NodeData>) => void;
  addNode: (node: NodeData) => void;
  removeNode: (id: string) => void;
  resetNodes: () => void;
  clearUserEdits: (nodeId: string) => void;

  readonly derived: {
    activeNodes: NodeData[];
    inactiveNodes: NodeData[];
    activeCount: number;
    totalCount: number;
    activeRatio: string;
    avgGpu: number;
    avgMem: number;
    avgTemp: number;
    totalTasks: number;
  };
}

function computeDerived(nodes: NodeData[]) {
  const activeNodes = nodes.filter((n) => n.status !== "inactive");
  const inactiveNodes = nodes.filter((n) => n.status === "inactive");
  const activeCount = activeNodes.length;
  const totalCount = nodes.length;

  const avgGpu = activeCount > 0
    ? Math.round(activeNodes.reduce((s, n) => s + n.gpu, 0) / activeCount * 10) / 10
    : 0;
  const avgMem = activeCount > 0
    ? Math.round(activeNodes.reduce((s, n) => s + n.mem, 0) / activeCount * 10) / 10
    : 0;
  const avgTemp = activeCount > 0
    ? Math.round(activeNodes.reduce((s, n) => s + n.temp, 0) / activeCount * 10) / 10
    : 0;
  const totalTasks = activeNodes.reduce((s, n) => s + n.tasks, 0);

  return {
    activeNodes,
    inactiveNodes,
    activeCount,
    totalCount,
    activeRatio: `${activeCount}/${totalCount}`,
    avgGpu,
    avgMem,
    avgTemp,
    totalTasks,
  };
}

export const useNodeSlice = create<NodeSlice>()(
  devtools(
    persist(
      immer(
        (set, _get) => ({
          nodes: DEFAULT_NODES,
          lastSource: null,
          lastUpdateAt: null,

          derived: computeDerived(DEFAULT_NODES),

          setNodes: (nodes, source = "initialization") => {
            set((state) => {
              state.nodes = nodes;
              state.lastSource = source;
              state.lastUpdateAt = new Date().toISOString();
              state.derived = computeDerived(nodes);
            });
          },

          mergeFromWS: (incoming, options) => {
            set((state) => {
              // 批5 全节点清单：用户在面板维护的节点（source==="user"）不随 WS 权威快照
              // 删除——快照只覆盖 agent 上报节点，远端全节点清单是用户配置的真实数据
              const userNodes = options?.authoritative
                ? state.nodes.filter((n) => n.source === "user")
                : [];
              const merged = dataBus.mergeNodeData(
                state.nodes,
                incoming,
                "websocket",
                "ws_priority",
                options?.authoritative ? { dropAbsent: true } : undefined
              );
              const restored = userNodes
                .filter((u) => !merged.some((m) => m.id === u.id))
                // 批6：user 节点状态由 OpsPanel 探针轮询驱动（useOpsPanelMetrics），
                // WS 快照仅保存在性，不覆盖其真实状态（快照不含远端节点信息）
                .map((u) => ({ ...u }));
              const nodes = [...merged, ...restored];
              state.nodes = nodes;
              state.lastSource = "websocket";
              state.lastUpdateAt = new Date().toISOString();
              state.derived = computeDerived(nodes);
            });
          },

          updateNode: (id, updates) => {
            set((state) => {
              const updated = dataBus.updateUserEditNode(state.nodes, id, updates);
              state.nodes = updated;
              state.lastSource = "user_edit";
              state.lastUpdateAt = new Date().toISOString();
              state.derived = computeDerived(updated);
              const targetNode = updated.find((n) => n.id === id);
              if (targetNode) {
                const sent = dataBus.sendWS({
                  type: "node_update",
                  entity: "nodes",
                  data: [targetNode],
                });
                if (!sent) {
                  console.info(`[NodeSlice] Edit queued for ${id} (offline or no WS)`);
                }
              }
            });
          },

          addNode: (node) => {
            set((state) => {
              state.nodes.push(node);
              state.lastSource = "user_edit";
              state.lastUpdateAt = new Date().toISOString();
              state.derived = computeDerived(state.nodes);
              dataBus.sendWS({ type: "node_update", entity: "nodes", data: [node] });
            });
          },

          removeNode: (id) => {
            set((state) => {
              const removed = state.nodes.find((n) => n.id === id);
              state.nodes = state.nodes.filter((n) => n.id !== id);
              state.lastSource = "user_edit";
              state.lastUpdateAt = new Date().toISOString();
              state.derived = computeDerived(state.nodes);
              if (removed) {
                dataBus.sendWS({ type: "node_update", entity: "nodes", data: [{ ...removed, status: "inactive" as const }] });
              }
            });
          },

          resetNodes: () => {
            set((state) => {
              state.nodes = DEFAULT_NODES;
              state.lastSource = "initialization";
              state.lastUpdateAt = null;
              state.derived = computeDerived(DEFAULT_NODES);
            });
          },

          clearUserEdits: (nodeId) => {
            dataBus.clearUserEdits(nodeId);
          },
        })
      ),
      {
        name: 'yyc3-node-slice',
        partialize: (state) => ({ nodes: state.nodes }),
        version: 1,
        migrate: (persisted, version) => {
          // v0→v1：清除历史 DEFAULT_NODES 假节点种子（按 ID 精确识别，保留用户真实添加）
          const state = persisted as { nodes?: NodeData[] };
          if (version < 1 && Array.isArray(state.nodes)) {
            state.nodes = state.nodes.filter((n) => !LEGACY_FAKE_NODE_IDS.has(n.id));
          }
          return state;
        },
        // 再水合后重算派生统计（partialize 只存 nodes，derived 需同步重建）
        onRehydrateStorage: () => (state) => {
          if (state) {
            useNodeSlice.setState({ derived: computeDerived(state.nodes) });
          }
        },
      }
    ),
    {
      name: 'YYC³ Node Slice',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);
