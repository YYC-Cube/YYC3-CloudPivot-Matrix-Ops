/**
 * @file: node-types.ts
 * @description: 节点与集群类型 — 实时节点 + DB 记录 + 转换函数
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-20
 * @updated: 2026-04-20
 * @status: active
 * @tags: [types],[node],[cluster]
 */

/** 节点运行状态 */
export type NodeStatusType = "active" | "warning" | "inactive";

/**
 * 实时节点数据（WebSocket 推送 / 前端展示）
 * 字段使用 camelCase 短名，适合高频 UI 渲染
 */
/** 每卡 DCGM 实测明细（OpsPanel /api/metrics gpus[] 行）——P4 深度接入 */
export interface NodeGpuMetric {
  idx: number;        // 卡序号
  model: string;      // GPU 型号（如 NVIDIA GB10）
  util: number;       // 利用率 %
  temp: number;       // 温度 °C
  powerW: number;     // 功耗 W
  clockMhz: number;   // SM 频率 MHz
  xid: number;        // XID 错误计数
}

/** vLLM 推理实测（OpsPanel /api/metrics inference）——P4 深度接入 */
export interface NodeVllmMetric {
  model: string;
  qps: number;
  genTokensPerS: number;
  promptTokensPerS: number;
  avgLatencyS: number;
  ttftS: number;
  prefixHit: number;   // 前缀缓存命中率 0-1
  kvCache: number;     // KV Cache 使用率 0-1
  running: number;
  waiting: number;
}

/** 节点实时指标聚合（OpsPanel 轮询挂载） */
export interface NodeLiveMetrics {
  gpus?: NodeGpuMetric[];
  vllm?: NodeVllmMetric;
  updatedAt?: string;
}

export interface NodeData {
  id: string;
  status: NodeStatusType;
  gpu: number;       // GPU 利用率 0-100
  mem: number;       // 内存利用率 0-100
  temp: number;      // 温度 °C
  model: string;     // 当前部署模型
  tasks: number;     // 活跃任务数
  /** 节点角色描述（用户维护，如「NAS · PG 双库+API 网关」）——批5 全节点清单 */
  role?: string;
  /** 主机地址（Tailscale IP / 主机名）——批5 全节点清单 */
  host?: string;
  /** 该节点 agent WS 端口（默认 3113）——M4 方案 A：useMultiNodeWS 直连远端快照 */
  wsPort?: number;
  /** 数据来源：user=用户在面板维护的全节点清单（WS 权威快照不删除）；ws=agent 快照上报 */
  source?: "user" | "ws";
  /** OpsPanel 真实指标（每卡 DCGM / vLLM 推理率）——P4；缺失=数据源未覆盖该节点 */
  metrics?: NodeLiveMetrics;
}

/**
 * 数据库节点状态（PostgreSQL Schema: infra.nodes）
 * 字段使用 snake_case，与 DB 列名一致
 */
export interface NodeStatusRecord {
  id: string;
  hostname: string;
  gpu_util: number;
  mem_util: number;
  temp_celsius: number;
  model_deployed: string;
  active_tasks: number;
  status: NodeStatusType;
}

/** NodeStatusRecord → NodeData 转换 */
export function toNodeData(record: NodeStatusRecord): NodeData {
  return {
    id: record.hostname,
    status: record.status,
    gpu: record.gpu_util,
    mem: record.mem_util,
    temp: record.temp_celsius,
    model: record.model_deployed,
    tasks: record.active_tasks,
  };
}
