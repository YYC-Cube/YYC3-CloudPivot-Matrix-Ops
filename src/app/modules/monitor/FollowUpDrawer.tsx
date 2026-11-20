/**
 * @file: FollowUpDrawer.tsx
 * @description: FollowUpDrawer.tsx
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: active
 * @tags: [component]
 */

import React, { useState, useEffect, useRef } from "react";
import { useCopyFeedback } from "../../hooks/useCopyFeedback";
import {
  X, AlertTriangle, AlertCircle, Info, XCircle, Clock, User,
  ChevronRight, Zap, Bot, CheckCircle, Loader2,
  Link2, Server, Copy, Check,
} from "lucide-react";
import { OperationChain } from "../ops/OperationChain";
import { QuickActionGroup } from "./QuickActionGroup";
import { useProviderSlice } from "../../store/slices/provider-slice";
import { callConfiguredModel } from "../../lib/model-request";
import type { FollowUpItem, FollowUpSeverity, FollowUpStatus } from "../../types";

interface FollowUpDrawerProps {
  item: FollowUpItem | null;
  isOpen: boolean;
  onClose: () => void;
  onQuickFix?: (item: FollowUpItem) => void;
  onMarkResolved?: (item: FollowUpItem) => void;
  isMobile?: boolean;
}

const severityConfig: Record<FollowUpSeverity, {
  icon: React.ElementType;
  color: string;
  label: string;
}> = {
  critical: { icon: XCircle,        color: "#ff3366", label: "严重" },
  error:    { icon: AlertTriangle,   color: "#ff6600", label: "错误" },
  warning:  { icon: AlertCircle,     color: "#ffaa00", label: "警告" },
  info:     { icon: Info,            color: "#00d4ff", label: "信息" },
};

const statusLabels: Record<FollowUpStatus, { label: string; color: string }> = {
  active:        { label: "活跃",   color: "#ff3366" },
  investigating: { label: "排查中", color: "#ffaa00" },
  resolved:      { label: "已解决", color: "#00ff88" },
  ignored:       { label: "已忽略", color: "rgba(0,212,255,0.3)" },
};

// AI 建议改为真实模型调用（落档 55 · P0 真实性批次）：无激活模型时如实提示，不生成占位建议

export function FollowUpDrawer({
  item,
  isOpen,
  onClose,
  onQuickFix,
  onMarkResolved,
  isMobile = false,
}: FollowUpDrawerProps) {
  const [activeTab, setActiveTab] = useState<"detail" | "chain" | "metrics" | "ai">("detail");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedIdx, copyText] = useCopyFeedback<number>();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Reset tab on new item
  useEffect(() => {
    if (item) {
      setActiveTab("detail");
      setAiSuggestions([]);
      setAiError(null);
    }
  }, [item]);

  // Escape key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {onClose();}
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, onClose]);

  const loadAiSuggestions = async () => {
    setAiLoading(true);
    setAiError(null);
    const model = useProviderSlice.getState().getActiveModel();
    if (!model) {
      setAiSuggestions([]);
      setAiLoading(false);
      setAiError("暂无激活模型 — 请前往「系统设置 → 模型管理」添加并激活后再试（不生成占位建议）。");
      return;
    }
    try {
      const prompt = [
        `告警来源：${item?.source ?? "未知"}`,
        `告警标题：${item?.title ?? "未知"}`,
        `告警级别：${item ? severityConfig[item.severity].label : "未知"}`,
        `上报指标：${item?.metric || "未上报"}`,
        "请基于以上真实上下文给出 3 条可执行的处置建议，每条一行，不要编造未提供的指标或节点。",
      ].join("\n");
      const result = await callConfiguredModel(
        "你是 YYC³ 运维告警分析助手。只依据用户提供的告警上下文作答；缺少数据时明确说明缺失，不得编造指标、节点或时间。",
        [{ role: "user", content: prompt }],
        model,
        { temperature: 0.3, maxTokens: 600 },
      );
      if (result.success) {
        const lines = result.text
          .split(/\n+/)
          .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 6);
        setAiSuggestions(lines.length > 0 ? lines : [result.text.trim()]);
      } else {
        setAiError(`模型调用失败（${model.model}）：${result.error ?? "未知错误"}`);
      }
    } catch (err) {
      setAiError(`模型调用异常：${(err as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  };


  if (!item) {return null;}

  const sev = severityConfig[item.severity];
  const SevIcon = sev.icon;
  const st = statusLabels[item.status];

  const tabs = [
    { key: "detail" as const,  label: "详情" },
    { key: "chain" as const,   label: `链路 (${item.chain.length})` },
    { key: "metrics" as const, label: "指标" },
    { key: "ai" as const,      label: "AI 建议" },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`
          fixed top-0 right-0 h-full z-[71]
          bg-[rgba(6,14,31,0.98)] backdrop-blur-2xl
          border-l border-[rgba(0,180,255,0.15)]
          shadow-[-20px_0_60px_rgba(0,0,0,0.4)]
          transition-transform duration-300 ease-out
          flex flex-col overflow-hidden
          ${isMobile ? "w-full" : "w-[520px] max-w-full"}
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* ======== Header ======== */}
        <div className="shrink-0 p-4 border-b border-[rgba(0,180,255,0.1)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${sev.color}15` }}
              >
                <SevIcon className="w-5 h-5" style={{ color: sev.color }} />
              </div>
              <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      data-testid="followup-severity-label"
                      className="px-2 py-0.5 rounded"
                      style={{ fontSize: "0.62rem", backgroundColor: `${sev.color}15`, color: sev.color }}
                    >
                      {sev.label}
                    </span>
                    <span
                      data-testid="followup-status-label"
                      className="px-2 py-0.5 rounded"
                      style={{ fontSize: "0.62rem", backgroundColor: `${st.color}15`, color: st.color }}
                    >
                      {st.label}
                    </span>
                  <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>
                    #{item.id}
                  </span>
                </div>
                <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>
                  {item.title}
                </h3>
                {item.metric && (
                  <p data-testid="followup-metric" className="mt-0.5" style={{ fontSize: "0.78rem", color: sev.color }}>
                    {item.metric}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[rgba(255,51,102,0.08)] transition-all shrink-0"
            >
              <X className="w-5 h-5 text-[rgba(0,212,255,0.5)]" />
            </button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>
              <Clock className="w-3.5 h-3.5" />
              {new Date(item.timestamp).toLocaleString("zh-CN")}
            </span>
            <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>
              <Server className="w-3.5 h-3.5" />
              {item.source}
            </span>
            {item.assignee && (
              <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>
                <User className="w-3.5 h-3.5" />
                {item.assignee}
              </span>
            )}
          </div>
        </div>

        {/* ======== Tab Bar ======== */}
        <div className="shrink-0 flex items-center gap-0.5 px-4 py-2 border-b border-[rgba(0,180,255,0.08)] bg-[rgba(0,40,80,0.1)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              data-testid={`followup-tab-${tab.key}`}
              onClick={() => {
                setActiveTab(tab.key);
                // 不自动调用模型（避免误触产生费用）；由「获取 AI 建议」按钮显式触发
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                  : "text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] border border-transparent"
              }`}
              style={{ fontSize: "0.72rem" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ======== Content ======== */}
        <div className="flex-1 overflow-auto p-4 space-y-4">

          {/* === Detail Tab === */}
          {activeTab === "detail" && (
            <>
              {/* Quick Actions */}
              <div>
                <h4 className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.75rem" }}>
                  快速操作
                </h4>
                <QuickActionGroup
                  onViewDetail={() => setActiveTab("chain")}
                  onViewHistory={() => setActiveTab("metrics")}
                  onViewRelated={() => setActiveTab("chain")}
                  onQuickFix={onQuickFix ? () => onQuickFix(item) : undefined}
                  onMarkResolved={onMarkResolved ? () => onMarkResolved(item) : undefined}
                />
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div>
                  <h4 className="text-[rgba(0,212,255,0.5)] mb-2" style={{ fontSize: "0.75rem" }}>
                    标签
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.4)] text-[rgba(0,212,255,0.5)] border border-[rgba(0,180,255,0.08)]"
                        style={{ fontSize: "0.68rem" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chain Preview */}
              {item.chain.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.75rem" }}>
                      操作链路摘要
                    </h4>
                    <button
                      onClick={() => setActiveTab("chain")}
                      className="flex items-center gap-1 text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-colors"
                      style={{ fontSize: "0.68rem" }}
                    >
                      查看全部 <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <OperationChain events={item.chain.slice(0, 3)} compact />
                </div>
              )}

              {/* Related alerts */}
              {item.relatedAlerts && item.relatedAlerts.length > 0 && (
                <div>
                  <h4 className="text-[rgba(0,212,255,0.5)] mb-2" style={{ fontSize: "0.75rem" }}>
                    关联告警
                  </h4>
                  <div className="space-y-1.5">
                    {item.relatedAlerts.map((alertId) => (
                      <div
                        key={alertId}
                        className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all cursor-pointer"
                      >
                        <Link2 className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />
                        <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>
                          {alertId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* === Chain Tab === */}
          {activeTab === "chain" && (
            <div>
              <h4 className="text-[rgba(0,212,255,0.5)] mb-4" style={{ fontSize: "0.78rem" }}>
                完整操作链路 · {item.chain.length} 步
              </h4>
              <OperationChain events={item.chain} />
            </div>
          )}

          {/* === Metrics Tab === */}
          {activeTab === "metrics" && (
            <div>
              <h4 className="text-[rgba(0,212,255,0.5)] mb-4" style={{ fontSize: "0.78rem" }}>
                关联指标 · {item.source}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "上报指标", value: item.metric || "未上报", tone: item.metric ? "text-[#e0f0ff]" : "text-[rgba(0,212,255,0.35)]" },
                  { label: "告警来源", value: item.source || "未知", tone: "text-[#e0f0ff]" },
                  { label: "级别", value: sev.label, tone: "text-[#e0f0ff]" },
                  { label: "状态", value: st.label, tone: "text-[#e0f0ff]" },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>
                        {m.label}
                      </span>
                    </div>
                    <span
                      className={m.tone}
                      style={{ fontSize: "0.82rem", fontFamily: "'Rajdhani', monospace" }}
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
              {!item.metric && (
                <p className="mt-3 text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
                  该告警未上报关联指标——此处不显示推测值；真实指标以上报源（agent / OpsPanel）为准。
                </p>
              )}
            </div>
          )}

          {/* === AI Tab === */}
          {activeTab === "ai" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-4 h-4 text-[#aa55ff]" />
                <h4 className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.78rem" }}>
                  AI 智能建议
                </h4>
              </div>

              {/* Context（真实告警上下文，不编造历史次数） */}
              <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)] mb-4">
                <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.7rem" }}>
                  告警上下文
                </p>
                <p className="text-[#e0f0ff] mt-1" style={{ fontSize: "0.78rem" }}>
                  {item.source} · {item.title}
                </p>
                <p className="text-[rgba(0,212,255,0.45)] mt-1" style={{ fontSize: "0.7rem" }}>
                  上报指标：{item.metric || "未上报"}
                </p>
              </div>

              {/* Suggestions */}
              {aiLoading ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 className="w-5 h-5 text-[#00d4ff] animate-spin" />
                  <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.78rem" }}>
                    AI 正在分析...
                  </span>
                </div>
              ) : aiError ? (
                <div className="p-3 rounded-xl bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.18)]">
                  <p className="text-[rgba(255,180,200,0.9)]" style={{ fontSize: "0.75rem", lineHeight: 1.6 }}>
                    {aiError}
                  </p>
                  <button
                    onClick={loadAiSuggestions}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.6)] hover:text-[#00d4ff] transition-all"
                    style={{ fontSize: "0.72rem" }}
                  >
                    重试
                  </button>
                </div>
              ) : aiSuggestions.length > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>
                    推荐操作
                  </p>
                  {aiSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="group p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,180,255,0.2)] transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-[#00ff88] mt-0.5 shrink-0" />
                        <p className="text-[#c0dcf0] flex-1" style={{ fontSize: "0.75rem", lineHeight: 1.6 }}>
                          {s}
                        </p>
                        <button
                          onClick={() => copyText(s, i)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[rgba(0,212,255,0.1)] transition-all shrink-0"
                        >
                          {copiedIdx === i ? (
                            <Check className="w-3 h-3 text-[#00ff88]" />
                          ) : (
                            <Copy className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => onQuickFix?.(item)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      应用建议
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
                      style={{ fontSize: "0.75rem" }}
                    >
                      忽略
                    </button>
                    <button
                      onClick={() => setActiveTab("detail")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
                      style={{ fontSize: "0.75rem" }}
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={loadAiSuggestions}
                  className="w-full py-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:border-[rgba(0,180,255,0.25)] transition-all"
                  style={{ fontSize: "0.78rem" }}
                >
                  <Bot className="w-4 h-4 inline mr-2" />
                  获取 AI 建议
                </button>
              )}
            </div>
          )}
        </div>

        {/* ======== Footer ======== */}
        <div className="shrink-0 p-3 border-t border-[rgba(0,180,255,0.08)] flex items-center justify-between">
          <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.62rem" }}>
            CloudPivot Matrix Ops Follow-up System v1.0
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.72rem" }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </>
  );
}