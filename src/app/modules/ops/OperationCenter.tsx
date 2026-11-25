/**
 * @file: OperationCenter.tsx
 * @description: OperationCenter.tsx
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: active
 * @tags: [component]
 */

import React, { useContext, useEffect, useMemo, useState } from "react";
import { Settings, Zap, ShieldAlert, XCircle } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import { OperationCategory } from "./OperationCategory";
import { QuickActionGrid } from "../shared/QuickActionGrid";
import { OperationTemplate } from "./OperationTemplate";
import { OperationLogStream } from "./OperationLogStream";
import { useOperationCenter } from "../../hooks/useOperationCenter";
import { useI18n } from "../../hooks/useI18n";
import { ViewContext } from "../../lib/view-context";

export function OperationCenter() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();

  const {
    categories,
    activeCategory,
    setActiveCategory,
    actions,
    isExecuting,
    executeAction,
    paramAction,
    submitParamAction,
    closeParamAction,
    templates,
    runTemplate,
    addTemplate,
    deleteTemplate,
    logs,
    logFilter,
    setLogFilter,
    searchQuery,
    setSearchQuery,
  } = useOperationCenter();

  // ── 落档 75：参数化动作 modal（qa2/qa7/qa8/qa9 计划/实执行） ──
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [paramError, setParamError] = useState<string | null>(null);
  const fields = useMemo(() => paramAction?.fields ?? [], [paramAction]);

  useEffect(() => {
    if (paramAction) {
      const init: Record<string, string> = {};
      for (const f of paramAction.fields) { init[f.key] = ""; }
      setParamValues(init);
      setParamError(null);
    }
  }, [paramAction]);

  const closeParamModal = () => { closeParamAction(); setParamError(null); };

  return (
    <div className="space-y-4">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              {t("operations.title")}
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {t("operations.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ======== Category Tabs ======== */}
      <OperationCategory
        categories={categories}
        active={activeCategory}
        onChange={setActiveCategory}
      />

      {/* ======== Quick Actions ======== */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#ffaa00]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
            {t("operations.quickActions")}
          </h3>
          <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.65rem" }}>
            ({actions.length})
          </span>
        </div>
        <QuickActionGrid
          actions={actions}
          isExecuting={isExecuting}
          onExecute={executeAction}
          isMobile={isMobile}
        />
      </GlassCard>

      {/* ======== Templates ======== */}
      <OperationTemplate
        templates={templates}
        onRunTemplate={runTemplate}
        onDeleteTemplate={deleteTemplate}
        onAddTemplate={addTemplate}
      />

      {/* ======== Log Stream ======== */}
      <OperationLogStream
        logs={logs}
        filter={logFilter}
        onFilterChange={setLogFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isMobile={isMobile}
      />

      {/* ======== 参数化动作 modal（落档 75：qa2/qa7/qa8/qa9 计划/实执行） ======== */}
      {paramAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-0" onClick={() => { closeParamModal(); }}>
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[520px] max-h-[85vh] overflow-auto rounded-2xl bg-[rgba(8,25,55,0.95)] backdrop-blur-2xl border border-[rgba(0,180,255,0.2)] shadow-[0_0_60px_rgba(0,180,255,0.1)] p-5 md:p-6"
            onClick={(e) => e.stopPropagation()}
            data-testid="action-param-modal"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#e0f0ff] flex items-center gap-2" style={{ fontSize: "1rem" }}>
                <ShieldAlert className={`w-4 h-4 ${paramAction.destructive ? "text-[#ff3366]" : "text-[#00d4ff]"}`} />
                {paramAction.label}
              </h3>
              <button onClick={closeParamModal} title="关闭" className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)]">
                <XCircle className="w-5 h-5 text-[rgba(0,212,255,0.4)]" />
              </button>
            </div>

            {paramAction.destructive && (
              <div className="mb-4 p-2.5 rounded-lg border border-[rgba(255,51,102,0.3)] bg-[rgba(255,51,102,0.08)] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-[#ff3366] shrink-0 mt-0.5" />
                <span className="text-[rgba(255,180,200,0.95)]" style={{ fontSize: "0.7rem" }}>
                  destructive 动作：确认执行时将自动携带 CONFIRM=destructive-confirm（两步确认第二步）。
                </span>
              </div>
            )}

            <div className="space-y-3">
              {fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.7rem" }}>
                    {f.key}
                    {f.required && <span className="text-[#ff3366]"> *</span>}
                    <span className="text-[rgba(0,212,255,0.3)] ml-1">— {f.desc}</span>
                  </span>
                  <input
                    type="text"
                    value={paramValues[f.key] ?? ""}
                    onChange={(e) => setParamValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.required ? "必填" : "可选（留空用默认）"}
                    data-testid={`action-arg-${f.key}`}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.5)] font-mono"
                    style={{ fontSize: "0.75rem" }}
                  />
                </label>
              ))}

              {paramError && (
                <p className="px-3 py-2 rounded-lg border border-[rgba(255,51,102,0.25)] bg-[rgba(255,51,102,0.08)] text-[rgba(255,150,170,0.95)]" style={{ fontSize: "0.7rem" }} data-testid="action-param-error">
                  {paramError}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  // 必填客户端预检；非必填留空 = 脚本默认值（不注入）
                  const args: Record<string, string> = {};
                  for (const f of fields) {
                    const v = (paramValues[f.key] ?? "").trim();
                    if (f.required && !v) { setParamError(`缺少必填参数: ${f.key}`); return; }
                    if (v) {
                      if (!new RegExp(f.pattern).test(v)) { setParamError(`参数不合法: ${f.key}（${f.desc}）`); return; }
                      args[f.key] = v;
                    }
                  }
                  setParamError(null);
                  void submitParamAction(args);
                }}
                disabled={isExecuting !== null}
                data-testid="action-param-submit"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#0066ff] text-white disabled:opacity-60"
                style={{ fontSize: "0.82rem" }}
              >
                {isExecuting !== null ? "执行中…" : "执行"}
              </button>
              <button onClick={closeParamModal} className="px-4 py-2.5 rounded-xl border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.55)]" style={{ fontSize: "0.82rem" }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}