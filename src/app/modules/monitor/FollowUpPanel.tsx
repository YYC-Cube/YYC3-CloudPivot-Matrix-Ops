/**
 * @file: FollowUpPanel.tsx
 * @description: FollowUpPanel.tsx
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: active
 * @tags: [component]
 */

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  Filter,
  Info,
  XCircle,
} from "lucide-react";
import React, { useCallback, useContext, useState } from "react";
import { useI18n } from "../../hooks/useI18n";
import { useWebSocketData } from "../../hooks/useWebSocketData";
import { ViewContext } from "../../lib/view-context";
import { useAlerts } from "../../stores/global-store";
import type { FollowUpItem, FollowUpStatus } from "../../types";
import { FollowUpCard } from "./FollowUpCard";
import { FollowUpDrawer } from "./FollowUpDrawer";
import { GlassCard } from "../shared/GlassCard";


export function FollowUpPanel() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();
  const { followUps, updateFollowUp } = useAlerts();
  const wsData = useWebSocketData();
  const [drawerItem, setDrawerItem] = useState<FollowUpItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<"all" | FollowUpItem["severity"]>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | FollowUpItem["status"]>("all");

  const openDrawer = useCallback((item: FollowUpItem) => {
    setDrawerItem(item);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerItem(null), 300);
  }, []);

  const quickFix = useCallback((item: FollowUpItem) => {
    updateFollowUp(item.id, { status: "investigating" as FollowUpStatus });
  }, [updateFollowUp]);

  const markResolved = useCallback((item: FollowUpItem) => {
    updateFollowUp(item.id, { status: "resolved" as FollowUpStatus });
    closeDrawer();
  }, [updateFollowUp, closeDrawer]);

  const filteredItems = followUps.filter((item) => {
    if (filterSeverity !== "all" && item.severity !== filterSeverity) { return false; }
    if (filterStatus !== "all" && item.status !== filterStatus) { return false; }
    return true;
  });

  const stats = {
    total: followUps.length,
    critical: followUps.filter((i) => i.severity === "critical").length,
    error: followUps.filter((i) => i.severity === "error").length,
    warning: followUps.filter((i) => i.severity === "warning").length,
    active: followUps.filter((i) => i.status === "active").length,
    investigating: followUps.filter((i) => i.status === "investigating").length,
    resolved: followUps.filter((i) => i.status === "resolved").length,
  };

  const severityFilters = [
    { key: "all" as const, label: t("common.all"), icon: Filter, color: "#00d4ff" },
    { key: "critical" as const, label: t("ai.severity.critical"), icon: XCircle, color: "#ff3366" },
    { key: "error" as const, label: t("common.error"), icon: AlertTriangle, color: "#ff6600" },
    { key: "warning" as const, label: t("common.warning"), icon: AlertCircle, color: "#ffaa00" },
    { key: "info" as const, label: t("common.info"), icon: Info, color: "#00d4ff" },
  ];

  const statusFilters = [
    { key: "all" as const, label: t("common.all") },
    { key: "active" as const, label: t("pwa.online") },
    { key: "investigating" as const, label: t("ai.analyzing") },
    { key: "resolved" as const, label: t("followUp.markResolved") },
    { key: "ignored" as const, label: t("ai.dismiss") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,51,102,0.1)] flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#ff3366]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              {t("followUp.title")}
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {t("followUp.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {wsData.isSimulated && (
            <span
              className="px-2 py-0.5 rounded-full text-amber-300 border border-amber-500/30 bg-amber-500/10"
              style={{ fontSize: "0.6rem" }}
            >
              模拟数据
            </span>
          )}
          <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.68rem" }}>
            {stats.total} {t("common.all")}
          </span>
        </div>
      </div>

      <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-2`}>
        <StatCard label={t("ai.severity.critical")} value={stats.critical} icon={XCircle} color="#ff3366" />
        <StatCard label={t("common.error")} value={stats.error} icon={AlertTriangle} color="#ff6600" />
        <StatCard label={t("ai.analyzing")} value={stats.investigating} icon={Activity} color="#ffaa00" />
        <StatCard label={t("followUp.markResolved")} value={stats.resolved} icon={CheckCircle} color="#00ff88" />
      </div>

      <GlassCard className="p-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[rgba(0,212,255,0.35)] mr-1" style={{ fontSize: "0.68rem" }}>
              {t("ai.severity.critical").charAt(0)}:
            </span>
            {severityFilters.map((f) => {
              const Icon = f.icon;
              const isActive = filterSeverity === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilterSeverity(f.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${isActive
                    ? "border border-[rgba(0,212,255,0.25)]"
                    : "border border-transparent hover:border-[rgba(0,180,255,0.1)]"
                    }`}
                  style={{
                    fontSize: "0.68rem",
                    backgroundColor: isActive ? `${f.color}12` : "transparent",
                    color: isActive ? f.color : "rgba(0,212,255,0.4)",
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block w-px h-5 bg-[rgba(0,180,255,0.1)]" />

          <div className="flex items-center gap-1 flex-wrap">
            {statusFilters.map((f) => {
              const isActive = filterStatus === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${isActive
                    ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                    : "text-[rgba(0,212,255,0.4)] border border-transparent hover:border-[rgba(0,180,255,0.1)]"
                    }`}
                  style={{ fontSize: "0.68rem" }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <FollowUpCard
              key={item.id}
              item={item}
              onOpenDrawer={openDrawer}
              onQuickFix={quickFix}
              onMarkResolved={markResolved}
              compact={isMobile}
            />
          ))}
        </div>
      ) : (
        <GlassCard className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-10 h-10 text-[#00ff88] mb-3 opacity-50" />
            <p className="text-[#e0f0ff] mb-1" style={{ fontSize: "0.9rem" }}>
              {t("common.noData")}
            </p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.72rem" }}>
              {t("palette.noResults")}
            </p>
          </div>
        </GlassCard>
      )}

      <FollowUpDrawer
        item={drawerItem}
        isOpen={drawerOpen}
        onClose={closeDrawer}
        onQuickFix={quickFix}
        onMarkResolved={markResolved}
        isMobile={isMobile}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <GlassCard className="p-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}12` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>{label}</p>
          <p className="text-[#e0f0ff]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif" }}>{value}</p>
        </div>
      </div>
    </GlassCard>
  );
}
