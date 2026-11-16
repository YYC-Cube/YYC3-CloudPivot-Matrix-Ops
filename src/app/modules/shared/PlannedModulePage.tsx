/**
 * @file: PlannedModulePage.tsx
 * @description: 规划中模块占位页（落档 49）——业务空间新增页面统一挂载；
 *               说明模块定位与规划状态，不伪造任何业务数据。
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-17
 * @updated: 2026-11-17
 * @status: active
 * @tags: [module],[planned]
 */

import { GlassCard } from "./GlassCard";
import { Hammer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { useI18n } from "../../hooks/useI18n";

export interface PlannedModulePageProps {
  /** 页面标题（中文，直接展示；导航文案走 i18n key） */
  title: string;
  /** 一句话定位 */
  summary: string;
  /** 规划要点（3-5 条） */
  roadmap: string[];
}

export function PlannedModulePage({ title, summary, roadmap }: PlannedModulePageProps) {
  const nav = useNavigate();
  const { t } = useI18n();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4" data-testid="planned-module-page">
      <div className="flex items-center gap-3">
        <button
          onClick={() => nav("/")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.55)] hover:text-[#00d4ff] transition-all"
          style={{ fontSize: "0.72rem" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 返回
        </button>
        <h1 className="text-[#e0f0ff]" style={{ fontSize: "1.15rem", fontFamily: "'Orbitron', sans-serif" }}>{title}</h1>
        <span className="px-2 py-0.5 rounded-md bg-[rgba(255,221,0,0.1)] border border-[rgba(255,221,0,0.25)] text-[rgba(255,221,0,0.8)]"
          style={{ fontSize: "0.62rem" }}>
          {t("nav.planning")}
        </span>
      </div>

      <GlassCard className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,221,0,0.08)] flex items-center justify-center shrink-0">
            <Hammer className="w-5 h-5 text-[rgba(255,221,0,0.7)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{summary}</p>
            <p className="text-[rgba(0,212,255,0.35)] mt-1.5" style={{ fontSize: "0.7rem" }}>
              本模块已纳入产品规划，界面与能力将在后续批次实现；当前不提供任何模拟数据。
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="text-[#e0f0ff] mb-3" style={{ fontSize: "0.85rem" }}>规划要点</h2>
        <ul className="space-y-2">
          {roadmap.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[rgba(224,240,255,0.6)]" style={{ fontSize: "0.75rem" }}>
              <span className="mt-1.5 w-1 h-1 rounded-full bg-[rgba(0,212,255,0.5)] shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
