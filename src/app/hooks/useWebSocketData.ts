/**
 * @file: useWebSocketData.ts
 * @description: WebSocket 实时数据推送（模块级单实例）· 多消费者共享一条连接
 * @author: YanYuCloudCube Team
 * @version: v4.0.0
 * @created: 2026-02-26
 * @updated: 2026-11-23
 * @status: active
 * @tags: [hook],[websocket],[realtime],[singleton]
 *
 * @brief: WebSocket 实时数据推送管理（落档 67 单实例化：全应用仅一条 WS 连接）
 *
 * @details:
 * - ★ v4.0（落档 67 / C-1）：连接生命周期收敛到模块级单例控制器，
 *   所有 useWebSocketData() 消费者经 useSyncExternalStore 订阅同一份快照 —
 *   此前 Layout/告警/跟进/巡查/诊断/浮窗各建一条连接（6 处 = 6 条 TCP）。
 * - 生命周期：首个消费者挂载即启动；连接常驻（Layout 恒挂载，无反复重连开销）。
 * - 设置驱动（Settings SSOT 订阅）：端点变更即重连；重连间隔/最大次数取设置
 *   （超限如实断开）；应用层心跳（agent 回 heartbeat_ack）；演示模式关闭时
 *   WS 不可达如实断开、不产模拟数据。
 * - 消息路由：qps_update / latency_update / node_status（authoritative 全量快照）
 *   / alert（跟进工单+日志+操作流三域持久化）/ throughput_history / system_stats。
 * - 断链语义：连接失败空态呈现（0/占位符），绝不以模拟数据顶替真实链路。
 *
 * @dependencies: React, WebSocket API, DataBus, useNodeSlice, Settings SSOT
 * @exports: useWebSocketData, __resetWebSocketDataControllerForTests
 */

import { useEffect, useSyncExternalStore } from "react";

import type {
  AlertData,
  ConnectionState,
  NodeData,
  ThroughputPoint,
  WSMessage,
  WebSocketDataState,
} from "../types";

import { getAPIConfig } from "../lib/api-config";
import { dataBus } from "../lib/data-bus";
import { useNodeSlice } from "../store/slices/node-slice";
import { useFollowUpSlice } from "../store/slices/follow-up-slice";
import { useLogSlice } from "../store/slices/log-slice";
import { useAppSlice } from "../store/slices/app-slice";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";

// ============================================================
// Simulated Data Generator — 演示模式专属（demoMode 才可达）
// ============================================================

const SIM_DEMO_NODES: NodeData[] = [
  { id: "DEMO-GPU-01", status: "active",   gpu: 87, mem: 72, temp: 68, model: "demo-70b",  tasks: 128 },
  { id: "DEMO-GPU-02", status: "active",   gpu: 92, mem: 85, temp: 74, model: "demo-72b",  tasks: 156 },
  { id: "DEMO-GPU-03", status: "warning",  gpu: 98, mem: 94, temp: 82, model: "demo-v3",   tasks: 89 },
  { id: "DEMO-GPU-04", status: "active",   gpu: 45, mem: 38, temp: 52, model: "demo-7b",   tasks: 34 },
  { id: "DEMO-GPU-05", status: "inactive", gpu: 0,  mem: 5,  temp: 32, model: "",          tasks: 0 },
];

function jitter(base: number, range: number): number {
  return Math.max(0, base + (Math.random() - 0.5) * range * 2);
}

function generateSimulatedNodes(baseNodes: NodeData[]): NodeData[] {
  return baseNodes.map((n) => ({
    ...n,
    gpu: n.status === "inactive" ? 0 : Math.min(100, Math.round(jitter(n.gpu, 5))),
    mem: n.status === "inactive" ? n.mem : Math.min(100, Math.round(jitter(n.mem, 3))),
    temp: n.status === "inactive" ? n.temp : Math.round(jitter(n.temp, 2)),
    tasks: n.status === "inactive" ? 0 : Math.max(0, Math.round(jitter(n.tasks, 10))),
  }));
}

let throughputCounter = 0;

function generateThroughputPoint(): ThroughputPoint {
  const now = new Date();
  const hms = now.toLocaleTimeString("zh-CN", { hour12: false });
  throughputCounter += 1;
  return {
    time: `${hms}.${String(throughputCounter % 1000).padStart(3, "0")}`,
    qps: Math.round(jitter(3800, 400)),
    latency: Math.round(jitter(48, 8)),
    tokens: Math.round(jitter(138000, 15000)),
  };
}

// ============================================================
// 模块级单例控制器
// ============================================================

const MAX_THROUGHPUT_HISTORY = 60;
const DEFAULT_SIMULATE_INTERVAL_MS = 2000;
const RECONNECT_DELAY_MS = 5000;

const RECONNECT_DEFAULT_MAX = 10;
const HEARTBEAT_DEFAULT_MS = 30000;

interface ControllerSettings {
  endpoint: string;
  token: string;
  demoMode: boolean;
  autoRefresh: boolean;
  simulateIntervalMs: number;
  autoReconnect: boolean;
  reconnectDelayMs: number;
  maxReconnect: number;
  heartbeatEnabled: boolean;
  heartbeatIntervalMs: number;
}

function readSettings(): ControllerSettings {
  const s = useSettingsSSOT.getState();
  return {
    endpoint: s.values.wsEndpoint,
    token: s.values.wsToken ?? "",
    demoMode: s.toggles.demoMode,
    autoRefresh: s.runtime.autoRefresh,
    simulateIntervalMs:
      Number.isFinite(s.runtime.refreshInterval) && s.runtime.refreshInterval >= 500
        ? s.runtime.refreshInterval
        : DEFAULT_SIMULATE_INTERVAL_MS,
    autoReconnect: s.toggles.wsAutoReconnect,
    reconnectDelayMs: Number(s.values.wsReconnectInterval) || RECONNECT_DELAY_MS,
    maxReconnect: Number.isFinite(Number(s.values.wsMaxReconnect)) && Number(s.values.wsMaxReconnect) > 0
      ? Number(s.values.wsMaxReconnect)
      : RECONNECT_DEFAULT_MAX,
    heartbeatEnabled: s.toggles.wsHeartbeat,
    heartbeatIntervalMs: Number.isFinite(Number(s.values.wsHeartbeatInterval)) && Number(s.values.wsHeartbeatInterval) >= 5000
      ? Number(s.values.wsHeartbeatInterval)
      : HEARTBEAT_DEFAULT_MS,
  };
}

interface WSController {
  getSnapshot: () => WebSocketDataState;
  subscribe: (cb: () => void) => () => void;
  ensureStarted: () => void;
  manualReconnect: () => void;
  clearAlerts: () => void;
  /** 测试专用：解除 store 订阅并停表断连（生产不调用） */
  dispose: () => void;
}

let controller: WSController | null = null;

function getController(): WSController {
  if (controller) { return controller; }

  // ----- 可变内部态（每次 commit 生成新快照） -----
  let connectionState: ConnectionState = "connecting";
  let reconnectCount = 0;
  let lastSyncTime = new Date().toLocaleString("zh-CN", { hour12: false });
  let liveQPS = 0;
  let qpsTrend = "-";
  let liveLatency = 0;
  let latencyTrend = "-";
  let activeNodes = "0/0";
  let gpuUtil = "-";
  let tokenThroughput = "-";
  let storageUsed = "-";
  let throughputHistory: ThroughputPoint[] = [];
  let alerts: AlertData[] = [];
  let nodesCache: NodeData[] = useNodeSlice.getState().nodes;

  let snapshot: WebSocketDataState = {
    connectionState, isSimulated: false, reconnectCount, lastSyncTime,
    liveQPS, qpsTrend, liveLatency, latencyTrend, activeNodes, gpuUtil,
    tokenThroughput, storageUsed, nodes: nodesCache, throughputHistory,
    alerts, manualReconnect: () => {}, clearAlerts: () => {},
  };
  const listeners = new Set<() => void>();

  let ws: WebSocket | null = null;
  let simulateTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectAttempts = 0;
  let started = false;
  let generation = 0;          // 每次 start 递增；异步回调比对防串代
  let connectCycleConnected = false; // 当前连接代是否成功 open 过

  let settings = readSettings();

  const manualReconnect = () => {
    if (ws) { ws.close(); }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    connectionState = "reconnecting";
    commit();
    start();
  };
  const clearAlerts = () => { alerts = []; commit(); };

  function commit(): void {
    snapshot = {
      connectionState,
      isSimulated: connectionState === "simulated",
      reconnectCount,
      lastSyncTime,
      liveQPS,
      qpsTrend,
      liveLatency,
      latencyTrend,
      activeNodes,
      gpuUtil,
      tokenThroughput,
      storageUsed,
      nodes: nodesCache,
      throughputHistory,
      alerts,
      manualReconnect,
      clearAlerts,
    };
    for (const cb of listeners) { cb(); }
  }

  // ----- 节点切片订阅：快照.nodes 恒为统一 Store 同一份 -----
  const unsubscribeNodes = useNodeSlice.subscribe((s) => {
    if (s.nodes !== nodesCache) {
      nodesCache = s.nodes;
      commit();
    }
  });

  // ----- 设置订阅：SSOT 变更即时生效（落档 56/57 语义保留） -----
  const unsubscribeSettings = useSettingsSSOT.subscribe(() => {
    const next = readSettings();
    const prev = settings;
    settings = next;
    if (next.endpoint !== prev.endpoint) {
      // 端点变更：整代重启（关闭旧连接、清重连计时，按新端点重连）
      restart();
      return;
    }
    if (!next.autoReconnect && reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (next.heartbeatEnabled !== prev.heartbeatEnabled
      || next.heartbeatIntervalMs !== prev.heartbeatIntervalMs) {
      restartHeartbeat();
    }
    if (connectionState === "simulated") {
      if (!next.demoMode) {
        stopSimulation();
        connectionState = "disconnected";
        commit();
        return;
      }
      if (next.autoRefresh
        && (next.simulateIntervalMs !== prev.simulateIntervalMs || next.autoRefresh !== prev.autoRefresh)) {
        stopSimulation();
        simulateTimer = setInterval(runSimulation, next.simulateIntervalMs);
      } else if (!next.autoRefresh && simulateTimer) {
        clearInterval(simulateTimer);
        simulateTimer = null;
      }
    }
  });

  function restartHeartbeat(): void {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (settings.heartbeatEnabled && ws && ws.readyState === WebSocket.OPEN) {
      heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, settings.heartbeatIntervalMs);
    }
  }

  function stopSimulation(): void {
    if (simulateTimer) { clearInterval(simulateTimer); simulateTimer = null; }
  }

  function runSimulation(): void {
    const sliceState = useNodeSlice.getState().nodes;
    // slice 为空时以演示种子为基准（仅 demoMode 模拟路径可达此处）
    const baseNodes = sliceState.length > 0 ? sliceState : SIM_DEMO_NODES;
    const newNodes = generateSimulatedNodes(baseNodes);
    // 模拟数据同样经 DataBus 合并，保留用户编辑
    useNodeSlice.getState().mergeFromWS(newNodes);

    const active = newNodes.filter((n) => n.status !== "inactive");
    activeNodes = `${active.length}/${newNodes.length}`;
    const avgGpu = active.reduce((s, n) => s + n.gpu, 0) / (active.length || 1);
    gpuUtil = `${avgGpu.toFixed(1)}%`;

    const newQps = Math.round(jitter(3800, 400));
    liveQPS = newQps;
    qpsTrend = newQps > 3800 ? `+${((newQps / 3800 - 1) * 100).toFixed(1)}%` : `-${((1 - newQps / 3800) * 100).toFixed(1)}%`;

    const newLatency = Math.round(jitter(48, 8));
    liveLatency = newLatency;
    latencyTrend = newLatency < 48 ? `-${((1 - newLatency / 48) * 100).toFixed(1)}%` : `+${((newLatency / 48 - 1) * 100).toFixed(1)}%`;

    const tp = Math.round(jitter(138, 15));
    tokenThroughput = `${tp}K/s`;

    throughputHistory = [...throughputHistory, generateThroughputPoint()].slice(-MAX_THROUGHPUT_HISTORY);
    lastSyncTime = new Date().toLocaleString("zh-CN", { hour12: false });
    commit();
  }

  function startSimulation(): void {
    if (simulateTimer) { return; }
    if (!settings.demoMode) {
      // 演示模式关闭：WS 不可达时如实显示断开状态，不生成模拟数据
      connectionState = "disconnected";
      commit();
      return;
    }
    connectionState = "simulated";
    if (settings.autoRefresh) {
      simulateTimer = setInterval(runSimulation, settings.simulateIntervalMs);
    }
    runSimulation();
    if (!settings.autoRefresh) { stopSimulation(); }
  }

  function start(): void {
    generation += 1;
    const gen = generation;
    connectCycleConnected = false;
    connectionState = "connecting";
    commit();

    const base = (settings.endpoint || getAPIConfig().wsEndpoint || "").trim();
    const token = settings.token.trim();
    const wsUrl = token
      ? `${base}${base.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
      : base;

    try {
      const socket = new WebSocket(wsUrl);
      ws = socket;

      const connectTimeout = setTimeout(() => {
        if (gen === generation && !connectCycleConnected && socket.readyState !== WebSocket.OPEN) {
          socket.close();
        }
      }, 8000);

      socket.onopen = () => {
        clearTimeout(connectTimeout);
        if (gen !== generation) { socket.close(); return; }
        connectCycleConnected = true;
        reconnectAttempts = 0;
        connectionState = "connected";
        reconnectCount = 0;
        stopSimulation();
        restartHeartbeat();
        dataBus.registerWSSender((msg) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(msg));
            return true;
          }
          return false;
        });
        commit();
      };

      socket.onmessage = (event) => {
        if (gen !== generation) { return; }
        try {
          const msg: WSMessage = JSON.parse(event.data);
          dataBus.ingestWSMessage(msg);
          switch (msg.type) {
            case "qps_update":
              liveQPS = msg.payload.qps;
              qpsTrend = msg.payload.trend;
              break;
            case "latency_update":
              liveLatency = msg.payload.latency;
              latencyTrend = msg.payload.trend;
              break;
            case "node_status":
              // 真实 WS 全量快照：权威替换，清除模拟种子与已下线节点
              useNodeSlice.getState().mergeFromWS(msg.payload as NodeData[], { authoritative: true });
              break;
            case "alert": {
              const alertPayload = msg.payload;
              alerts = [alertPayload, ...alerts].slice(0, 100);
              // 真实告警 → 告警工单域持久化（幂等去重），TopBar/巡查/协同全局面板共享
              useFollowUpSlice.getState().ingestWSAlert(alertPayload);
              // 真实告警 → 日志域（persist，保留最近 200 条）
              useLogSlice.getState().addLog({
                timestamp: alertPayload.timestamp || Date.now(),
                level: alertPayload.level === "critical" || alertPayload.level === "error"
                  ? "error"
                  : alertPayload.level === "warning" ? "warn" : "info",
                source: alertPayload.source,
                message: alertPayload.message,
              });
              // 真实告警 → 操作流域（会话级实时事件流）
              useAppSlice.getState().addRecentOp({
                id: `OP-ALERT-${alertPayload.source}-${alertPayload.id}`,
                action: "系统告警",
                target: alertPayload.message,
                user: alertPayload.source,
                time: new Date(alertPayload.timestamp || Date.now()).toLocaleTimeString("zh-CN", { hour12: false }),
                status: alertPayload.level === "critical" || alertPayload.level === "error"
                  ? "error"
                  : alertPayload.level === "warning" ? "warning" : "pending",
              });
              break;
            }
            case "throughput_history":
              throughputHistory = msg.payload.slice(-MAX_THROUGHPUT_HISTORY);
              break;
            case "system_stats":
              activeNodes = msg.payload.activeNodes;
              gpuUtil = msg.payload.gpuUtil;
              tokenThroughput = msg.payload.tokenThroughput;
              storageUsed = msg.payload.storageUsed;
              break;
            case "heartbeat_ack":
              break;
          }
          lastSyncTime = new Date().toLocaleString("zh-CN", { hour12: false });
          commit();
        } catch {
          // silently ignore parse errors for non-critical messages
        }
      };

      socket.onclose = () => {
        clearTimeout(connectTimeout);
        if (ws === socket) { ws = null; }
        dataBus.unregisterWSSender();
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
        if (gen !== generation) { return; } // 旧代关闭（端点变更/手动重连）：不降级不重连

        if (!connectCycleConnected) {
          startSimulation();
        }
        // 自动重连开关关闭：如实置断开
        if (!settings.autoReconnect) {
          if (connectionState !== "simulated") { connectionState = "disconnected"; commit(); }
          return;
        }
        // 重连间隔/最大次数取设置；超限如实置断开
        if (reconnectAttempts >= settings.maxReconnect) {
          if (connectionState !== "simulated") { connectionState = "disconnected"; commit(); }
          return;
        }
        reconnectAttempts += 1;
        reconnectTimer = setTimeout(() => {
          if (gen !== generation) { return; }
          reconnectCount += 1;
          connectCycleConnected = false;
          commit();
          start();
        }, settings.reconnectDelayMs);
        commit();
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch {
      startSimulation();
    }
  }

  function restart(): void {
    // 端点变更：标记旧代失效并关闭旧连接，全新一代按新端点连接
    generation += 1;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    stopSimulation();
    if (ws) { ws.close(); ws = null; }
    reconnectAttempts = 0;
    started = true;
    start();
  }

  controller = {
    getSnapshot: () => snapshot,
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    ensureStarted: () => {
      if (started) { return; }
      started = true;
      start();
    },
    manualReconnect,
    clearAlerts,
    dispose: () => {
      unsubscribeSettings();
      unsubscribeNodes();
      generation += 1; // 使全部异步回调失效
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      stopSimulation();
      if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
      if (ws) { try { ws.close(); } catch { /* ignore */ } ws = null; }
    },
  };
  return controller;
}

/** 供测试重置单例（生产代码勿用）：解除 store 订阅并丢弃控制器 */
export function __resetWebSocketDataControllerForTests(): void {
  if (!controller) { return; }
  controller.dispose();
  controller = null;
}

// ============================================================
// Hook — 全部消费者共享同一控制器（落档 67 单实例）
// ============================================================

export function useWebSocketData(): WebSocketDataState {
  const ctl = getController();
  useEffect(() => {
    ctl.ensureStarted();
  }, [ctl]);
  return useSyncExternalStore(ctl.subscribe, ctl.getSnapshot, ctl.getSnapshot);
}
