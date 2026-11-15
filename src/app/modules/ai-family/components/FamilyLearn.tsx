/**
 * @file: FamilyLearn.tsx
 * @description: FamilyLearn.tsx
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-11-16
 * @status: active
 * @tags: [component]
 */

import React, { useState } from "react";
import {
  BookOpen, GraduationCap, Award,
  Play, CheckCircle2, Sparkles, Brain,
  Database, Shield,
} from "lucide-react";
import { GlassCard } from "../../shared/GlassCard";
import { FadeIn } from "./FadeIn";
import { FamilyPageHeader } from "./FamilyPageHeader";
import { useFamilySkillsSlice } from "../store";

/** 成就 iconName → lucide 组件映射（持久化只存字符串，渲染时恢复组件） */
const ACHIEVEMENT_ICONS: Record<string, React.ElementType> = {
  Award, BookOpen, Brain, Shield, Database,
};

export function FamilyLearn() {
  const { courses, achievements } = useFamilySkillsSlice();
  const [activeTab, setActiveTab] = useState<"courses" | "achievements">("courses");

  const earnedBadges = achievements.filter(a => a.earned).length;

  return (
    <div className="min-h-full pb-8">
      <FamilyPageHeader
        icon={GraduationCap}
        iconColor="#00FF88"
        title="学习成长"
        subtitle="AI 导师陪伴式学习 · 个性化成长路径 · 数据真实沉淀"
      />

      {/* 概览 + Tabs */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "课程总数", value: `${courses.length}`, color: "#00FF88" },
            { label: "成就徽章", value: `${earnedBadges}/${achievements.length}`, color: "#FFD700" },
          ].map(s => (
            <GlassCard key={s.label} className="p-3 text-center">
              <p className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.65rem" }}>{s.label}</p>
              <p style={{ fontSize: "1.1rem", color: s.color }} className="mt-1">{s.value}</p>
            </GlassCard>
          ))}
        </div>

        <div className="flex gap-1 mb-6">
          {[
            { key: "courses" as const, label: "AI 课程", icon: BookOpen },
            { key: "achievements" as const, label: "成就墙", icon: Award },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${activeTab === tab.key ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]" : "text-[rgba(224,240,255,0.4)] hover:text-[rgba(224,240,255,0.6)]"}`}
              style={{ fontSize: "0.78rem" }}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ Courses ═══ */}
        {activeTab === "courses" && (
          <div className="space-y-4">
            {courses.length === 0 && (
              <GlassCard className="p-8 text-center">
                <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.82rem" }}>
                  暂无课程。真实创建的课程会在这里呈现进度。
                </p>
              </GlassCard>
            )}
            {courses.map((course, i) => (
              <FadeIn key={course.id} delay={i * 0.06}>
                <GlassCard className="p-5 hover:border-[rgba(0,212,255,0.2)] transition-all cursor-pointer group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-[#e0f0ff] group-hover:text-[#00d4ff] transition-colors" style={{ fontSize: "0.95rem" }}>{course.title}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1" style={{ fontSize: "0.68rem", color: course.color }}>
                          <Sparkles className="w-3 h-3" /> AI 导师:{course.mentor}
                        </span>
                        <span className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.65rem" }}>
                          {course.done}/{course.total} 节
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-[rgba(0,40,80,0.3)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${course.progress}%`, background: `linear-gradient(90deg, ${course.color}, ${course.color}80)` }} />
                        </div>
                        <span style={{ fontSize: "0.7rem", color: course.color }}>{course.progress}%</span>
                      </div>
                    </div>
                    <button
                      className="px-4 py-2 rounded-lg flex items-center gap-1.5 shrink-0 transition-all"
                      style={{ background: `${course.color}10`, border: `1px solid ${course.color}25`, color: course.color, fontSize: "0.72rem" }}
                    >
                      <Play className="w-3.5 h-3.5" /> 继续学习
                    </button>
                  </div>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        )}

        {/* ═══ Achievements ═══ */}
        {activeTab === "achievements" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {achievements.map((badge, i) => {
              const BadgeIcon = ACHIEVEMENT_ICONS[badge.iconName] ?? Award;
              return (
                <FadeIn key={badge.id} delay={i * 0.05}>
                  <GlassCard className={`p-4 text-center ${!badge.earned ? "opacity-40" : ""} hover:scale-[1.03] transition-transform`}>
                    <div
                      className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                      style={{
                        background: badge.earned ? `${badge.color}15` : "rgba(128,128,128,0.08)",
                        border: `2px solid ${badge.earned ? `${badge.color}40` : "rgba(128,128,128,0.15)"}`,
                        boxShadow: badge.earned ? `0 0 20px ${badge.color}15` : "none",
                      }}
                    >
                      <BadgeIcon className="w-6 h-6" style={{ color: badge.earned ? badge.color : "rgba(128,128,128,0.3)" }} />
                    </div>
                    <p className="text-[rgba(224,240,255,0.8)]" style={{ fontSize: "0.75rem" }}>{badge.name}</p>
                    <p className="text-[rgba(224,240,255,0.3)] mt-1" style={{ fontSize: "0.58rem", lineHeight: 1.4 }}>{badge.desc}</p>
                    {badge.earned && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#00FF88]" />
                        <span className="text-[#00FF88]" style={{ fontSize: "0.55rem" }}>已获得</span>
                      </div>
                    )}
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
