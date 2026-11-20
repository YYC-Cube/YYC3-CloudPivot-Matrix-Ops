/**
 * @file: NodeEditModal.tsx
 * @description: 节点添加/编辑表单弹窗 — 全节点清单可编辑入口（批5：替换硬编码占位添加）
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-16
 * @updated: 2026-11-16
 * @status: active
 * @tags: [component],[monitor],[node],[form]
 *
 * @brief: 添加/编辑双模式。提交时打 source:"user" 标记——用户维护的全节点清单
 *         不随 agent WS 权威快照删除（见 node-slice mergeFromWS）。
 */

import React, { useEffect, useState } from "react";
import { Server, X } from "lucide-react";
import type { NodeData, NodeStatusType } from "../../types/node-types";

export interface NodeEditModalProps {
  /** 编辑模式传现有节点；添加模式传 null */
  initial: NodeData | null;
  onClose: () => void;
  onSubmit: (node: NodeData) => void;
  /** 仅编辑模式展示 */
  onRemove?: (id: string) => void;
}

type FormState = {
  id: string;
  role: string;
  host: string;
  wsPort: string;
  status: NodeStatusType;
  gpu: string;
  mem: string;
  temp: string;
  model: string;
  tasks: string;
};

function toForm(node: NodeData | null): FormState {
  return {
    id: node?.id || "",
    role: node?.role || "",
    host: node?.host || "",
    wsPort: node?.wsPort ? String(node.wsPort) : "",
    status: node?.status || "inactive",
    gpu: String(node?.gpu ?? 0),
    mem: String(node?.mem ?? 0),
    temp: String(node?.temp ?? 30),
    model: node?.model || "",
    tasks: String(node?.tasks ?? 0),
  };
}

const clampPct = (raw: string): number => Math.max(0, Math.min(100, Number(raw) || 0));

export function NodeEditModal({ initial, onClose, onSubmit, onRemove }: NodeEditModalProps) {
  const isEdit = initial !== null;
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(toForm(initial));
  }, [initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  const handleSubmit = () => {
    const id = form.id.trim();
    if (!id) {
      setError("节点 ID 必填");
      return;
    }
    const node: NodeData = {
      id,
      role: form.role.trim(),
      host: form.host.trim(),
      wsPort: form.wsPort.trim() ? Math.max(1, Math.min(65535, Number(form.wsPort) || 3113)) : undefined,
      status: form.status,
      gpu: clampPct(form.gpu),
      // 落档 56：用户在面板显式维护的 GPU/温度视为用户声明值，参与均值与展示
      gpuAvailable: true,
      mem: clampPct(form.mem),
      temp: Math.max(-20, Math.min(150, Number(form.temp) || 30)),
      tempAvailable: true,
      model: form.model.trim(),
      tasks: Math.max(0, Math.round(Number(form.tasks) || 0)),
      source: "user",
    };
    onSubmit(node);
    onClose();
  };

  const label = "block text-[rgba(224,240,255,0.4)] mb-1";
  const input =
    "w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)] transition-colors";
  const statusOptions: { value: NodeStatusType; label: string }[] = [
    { value: "active", label: "在线 active" },
    { value: "warning", label: "告警 warning" },
    { value: "inactive", label: "离线 inactive" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-0" onClick={onClose}>
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[560px] max-h-[85vh] overflow-auto rounded-2xl bg-[rgba(8,25,55,0.9)] backdrop-blur-2xl border border-[rgba(0,180,255,0.2)] shadow-[0_0_60px_rgba(0,180,255,0.1)] p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)]">
              <Server className="w-5 h-5 text-[#00d4ff]" />
            </div>
            <div>
              <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.05rem" }}>
                {isEdit ? "编辑节点" : "添加节点"}
              </h2>
              <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.62rem" }}>
                全节点清单 · 保存后面板即时生效（用户维护数据，不随 agent 快照删除）
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all" aria-label="关闭">
            <X className="w-4 h-4 text-[rgba(224,240,255,0.5)]" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={label}>节点 ID *</label>
              <input
                className={input}
                value={form.id}
                onChange={(e) => set("id", e.target.value)}
                placeholder="如 yyc3-n1"
                disabled={isEdit}
              />
            </div>
            <div>
              <label className={label}>主机地址（Tailscale IP / 主机名）</label>
              <input
                className={input}
                value={form.host}
                onChange={(e) => set("host", e.target.value)}
                placeholder="如 100.65.64.49"
              />
            </div>
            <div>
              <label className={label}>agent WS 端口</label>
              <input
                className={input}
                type="number"
                value={form.wsPort}
                onChange={(e) => set("wsPort", e.target.value)}
                placeholder="默认 3113"
              />
            </div>
          </div>

          <div>
            <label className={label}>节点角色描述</label>
            <input
              className={input}
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              placeholder="如 DGX · 强推理 svl2 TP2 head + Wan 主力"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={label}>状态</label>
              <select
                className={input}
                value={form.status}
                onChange={(e) => set("status", e.target.value as NodeStatusType)}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[rgba(8,25,55,1)]">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>GPU 利用率 %</label>
              <input className={input} type="number" min={0} max={100} value={form.gpu} onChange={(e) => set("gpu", e.target.value)} />
            </div>
            <div>
              <label className={label}>内存利用率 %</label>
              <input className={input} type="number" min={0} max={100} value={form.mem} onChange={(e) => set("mem", e.target.value)} />
            </div>
            <div>
              <label className={label}>温度 °C</label>
              <input className={input} type="number" value={form.temp} onChange={(e) => set("temp", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={label}>当前部署模型</label>
              <input className={input} value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="如 svl2 TP2" />
            </div>
            <div>
              <label className={label}>活跃任务数</label>
              <input className={input} type="number" min={0} value={form.tasks} onChange={(e) => set("tasks", e.target.value)} />
            </div>
          </div>

          {error && (
            <p className="text-[#ff3366]" style={{ fontSize: "0.72rem" }} role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-5">
          <div>
            {isEdit && onRemove && (
              <button
                onClick={() => {
                  onRemove(initial!.id);
                  onClose();
                }}
                className="px-3 py-2 rounded-lg border border-[rgba(255,51,102,0.3)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.1)] transition-all"
                style={{ fontSize: "0.72rem" }}
              >
                移除节点
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[rgba(0,180,255,0.15)] text-[rgba(224,240,255,0.5)] hover:text-[rgba(224,240,255,0.8)] transition-all"
              style={{ fontSize: "0.75rem" }}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.15)] border border-[rgba(0,212,255,0.35)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.25)] transition-all"
              style={{ fontSize: "0.75rem" }}
            >
              {isEdit ? "保存修改" : "添加节点"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
