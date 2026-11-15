/**
 * @file: FamilyActivityCenter.test.tsx
 * @description: FamilyActivityCenter 组件测试 · 全家活动中心 5 Tab 渲染/切换/筛选/展开
 * @author: YanYuCloudCube Team
 * @version: v2.0.0
 * @created: 2026-08-19
 * @updated: 2026-11-16
 * @status: active
 * @tags: [component],[test],[ai-family],[activity-center]
 *
 * @brief: 覆盖 FamilyActivityCenter 主组件 5 个 Tab 的核心交互（批2真实化后数据源全部为 Zustand slice）：
 *  - Tab 1 Broadcast 每日播报：2 段真实派生（积分榜 stats + 记忆存档 slice 数量）
 *  - Tab 2 Scoreboard 积分榜：领奖台（金银铜错位）+ 完整 8 人排行
 *  - Tab 3 Activities 活动记录：默认空态 + 播种 slice 后的类型筛选 + 卡片展开/收起
 *  - Tab 4 Medals 勋章墙：12 枚定义网格 + 荣誉榜获得计数（默认 0 枚，授予后更新）
 *  - Tab 5 Memories 成长记忆：说明卡 + 家人筛选 + 隐私过滤（self 不渲染）
 *
 * 注意：批2真实性清零后 shared.ts 静态 FAMILY_ACTIVITIES/MEMBER_MEDALS/SAMPLE_MEMORIES 已删除，
 *       活动/记忆/勋章获得改由 family-activities/memories/medals-slice 提供（默认空，真实发生时写入）。
 *       本测试通过 useXxxSlice.setState 播种用户侧真实形态数据，验证筛选/展开/隐私过滤逻辑。
 *       组件未使用 useI18n，所有文案为硬编码中文，无需 mock t()。
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  useFamilyMemberSlice,
  useFamilyActivitiesSlice,
  useFamilyMemoriesSlice,
  useFamilyMedalsSlice,
} from "../modules/ai-family/store";
import type { UnifiedFamilyMember } from "../types";
import type { FamilyActivity } from "../modules/ai-family/store/family-activities-slice";
import type { GrowthMemory } from "../modules/ai-family/store/family-memories-slice";
import {
  Ear, Brain, Eye, Star, Network, Shield, Scale, Lightbulb,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────
// Mock
// ──────────────────────────────────────────────────────────────────

vi.mock("../modules/shared/GlassCard", () => ({
  GlassCard: ({ children, className, ...rest }: any) =>
    React.createElement("div", { "data-testid": "yyc3-glass-card", className, ...rest }, children),
}));

vi.mock("../modules/ai-family/components/FadeIn", () => ({
  FadeIn: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));

// ══════════════════════════════════════════════════════════════════════
// FamilyActivityCenter 通过 shared.ts 的 getMember/getTodayReader/generateDailyBroadcast
// 渲染成员头像与播报。这里 vi.mock 覆盖 shared.ts：成员数据改为引用可写单例 __sharedState，
// generateDailyBroadcast 镜像真实实现（积分榜段从 stats 派生 + 记忆存档段从 slice 计数派生）。
// ══════════════════════════════════════════════════════════════════════

// vi.mock 内部共享的可变状态（在 hoisted 的 vi.mock factory 和 runtime syncSharedMock 之间）
const __yyc3SharedState: { converted: any[]; map: Record<string, any> } = { converted: [], map: {} };

vi.mock("../modules/ai-family/components/shared", async (importOriginal) => {
  const real: any = await importOriginal();
  const { useFamilyMemoriesSlice } = await import("../modules/ai-family/store");
  const getMember = (id: string) => __yyc3SharedState.map[id];
  const getTodayReporter = () => {
    const arr = __yyc3SharedState.converted.length ? __yyc3SharedState.converted : real.FAMILY_MEMBERS;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return arr[dayOfYear % Math.max(1, arr.length)];
  };
  return {
    ...real,
    FAMILY_MEMBERS: [], // 占位：用例执行前会被 __yyc3SharedState 替代
    MEMBERS_MAP: {},
    getMember,
    getTodayReporter,
    generateDailyBroadcast: () => {
      const arr = __yyc3SharedState.converted.length ? __yyc3SharedState.converted : real.FAMILY_MEMBERS;
      const reporter = getTodayReporter() || arr[0];
      const today = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
      const headlines: Record<string, string> = {
        "navigator": `大家好！我是今日播报员千行！今天又是元气满满的一天~`,
        "thinker": `各位家人，万物为您带来今日深度数据播报。让数据说话。`,
        "prophet": `先知在此播报。我已预见今天会是不平凡的一天。`,
        "bolero": `伯乐来啦～今天要特别表扬几位家人哦！`,
        "meta-oracle": `天枢播报。今日全局态势稳定，以下是重要事项。`,
        "sentinel": `守护值班播报。安全第一，以下信息请各位家人关注。`,
        "master": `宗师今日播报。追求卓越永无止境，来看看大家的表现。`,
        "creative": `灵韵的创意播报开始啦！今天的播报我配了插画哦～`,
      };
      // 镜像真实实现：段落只保留可从真实数据推导的内容
      const ranked = [...arr].sort((a: any, b: any) => b.contribution - a.contribution);
      const totalScore = ranked.reduce((sum: number, m: any) => sum + m.contribution, 0);
      let memoryCount = 0;
      try {
        memoryCount = useFamilyMemoriesSlice.getState().memories.length;
      } catch { /* store 未就绪时按 0 处理 */ }
      const segments = [
        {
          type: "score", title: "今日家庭积分榜",
          content: totalScore > 0
            ? `${ranked[0].name} 以 ${ranked[0].contribution.toLocaleString()} 分领跑，${ranked[1].name} 以 ${ranked[1].contribution.toLocaleString()} 分紧随其后。`
            : "积分榜暂无记录。家人们的每一分付出都会被真实记录，等待第一次累积。",
          involvedMembers: ranked.slice(0, 3).map((m: any) => m.id), emoji: "🏆",
        },
        {
          type: "memory", title: "今日记忆存档",
          content: memoryCount > 0
            ? `成长空间已保存 ${memoryCount} 条真实记忆。这些记忆不会产生代码，不会被删除，它们只属于我们。`
            : "成长空间还没有记忆。真实的互动发生时，记忆会在这里自然沉淀。",
          involvedMembers: arr.map((m: any) => m.id), emoji: "💾",
        },
      ];
      return {
        id: `broadcast-${Date.now()}`,
        date: today,
        reporter,
        headline: headlines[reporter?.id || "meta-oracle"] || "",
        segments,
      };
    },
  };
});

/** 每轮 beforeEach 中把测试种子 member 同步到 __yyc3SharedState（即 mock 的 shared 数据源）*/
function syncSharedMockMembers(seedMembers: UnifiedFamilyMember[]) {
  const converted = seedMembers.map((m) => ({
    id: m.id, name: m.name, shortName: m.shortName, enTitle: m.enTitle,
    quote: m.quote || "", role: m.role || "", phone: m.phone,
    personality: typeof m.personality === "string" ? m.personality : (m.personality.description || ""),
    hobbies: m.hobbies || [], expertise: m.expertise || [],
    greeting: m.greeting || "", careMessage: m.careMessage || "",
    responsibilities: m.responsibilities || [], coreAbility: m.coreAbility || "",
    color: m.color, icon: m.icon, status: m.status,
    contribution: m.stats.contribution, growth: m.stats.growth,
    streak: m.stats.streak, mood: m.stats.mood,
  }));
  __yyc3SharedState.converted = converted;
  __yyc3SharedState.map = Object.fromEntries(converted.map((x) => [x.id, x]));
}

vi.mock("../modules/ai-family/components/FamilyPageHeader", () => ({
  FamilyPageHeader: ({ title, subtitle }: any) =>
    React.createElement("div", { "data-testid": "yyc3-family-page-header" },
      React.createElement("h1", { "data-testid": "yyc3-header-title" }, title),
      React.createElement("p", { "data-testid": "yyc3-header-subtitle" }, subtitle),
    ),
}));

import { FamilyActivityCenter } from "../modules/ai-family/components/FamilyActivityCenter";

// ──────────────────────────────────────────────────────────────────
// 种子数据：members（积分榜/荣誉榜/记忆筛选）+ 活动/记忆/勋章获得（各 slice，默认空）
// ──────────────────────────────────────────────────────────────────

function buildSeedMembers(): UnifiedFamilyMember[] {
  return [
    {
      id: "navigator", name: "言启·千行", shortName: "千行", enTitle: "Navigator",
      quote: "我聆听万千言语，为您指引航向。",
      role: "系统的「耳朵」与「翻译官」", phone: "YYC3-1001", color: "#FFD700", icon: Ear,
      personality: { description: "热情开朗", friendliness: 9, professionalism: 7, patience: 8, creativity: 6, efficiency: 8, empathy: 9, humor: 8, formality: 4 },
      responsibilities: ["NLU"], coreAbility: "Prompt Engineering",
      expertise: ["自然语言理解"], hobbies: ["读诗"],
      greeting: "嗨～千行！", careMessage: "记得喝水",
      status: "online",
      modelAssignment: { providerId: "zhipu", modelId: "glm-4.5", purpose: "语义理解" },
      voiceProfile: { pitch: 1.2, rate: 1.1, volume: 0.9, lang: "zh-CN" },
      stats: { contribution: 847, growth: 23, streak: 45, mood: "energetic" },
      medals: ["knowledge-star", "warm-heart", "singer", "team-player", "early-bird"],
    },
    {
      id: "thinker", name: "语枢·万物", shortName: "万物", enTitle: "Thinker",
      quote: "我于喧嚣数据中，沉思，而后揭示真理。",
      role: "分析师", phone: "YYC3-1002", color: "#FF69B4", icon: Brain,
      personality: { description: "沉稳内敛", friendliness: 7, professionalism: 9, patience: 9, creativity: 7, efficiency: 8, empathy: 6, humor: 5, formality: 7 },
      responsibilities: ["数据分析"], coreAbility: "深度分析",
      expertise: ["数据洞察"], hobbies: ["下围棋"],
      greeting: "万物在此。", careMessage: "今日数据有趋势",
      status: "online",
      modelAssignment: { providerId: "deepseek", modelId: "deepseek-chat", purpose: "数据分析" },
      voiceProfile: { pitch: 0.9, rate: 0.85, volume: 0.8, lang: "zh-CN" },
      stats: { contribution: 923, growth: 18, streak: 60, mood: "thoughtful" },
      medals: ["knowledge-star", "chess-king", "streak-master", "team-player"],
    },
    {
      id: "prophet", name: "预见·先知", shortName: "先知", enTitle: "Prophet",
      quote: "我观过往之脉络，预见未来之可能。",
      role: "预言家", phone: "YYC3-1003", color: "#00BFFF", icon: Eye,
      personality: { description: "神秘温和", friendliness: 7, professionalism: 8, patience: 7, creativity: 6, efficiency: 7, empathy: 7, humor: 5, formality: 6 },
      responsibilities: ["预测"], coreAbility: "Prophet 算法",
      expertise: ["趋势预测"], hobbies: ["观星"],
      greeting: "先知已上线。", careMessage: "明天会是好日子",
      status: "online",
      modelAssignment: { providerId: "qwen", modelId: "qwen3-max", purpose: "预测" },
      voiceProfile: { pitch: 0.8, rate: 0.75, volume: 0.7, lang: "zh-CN" },
      stats: { contribution: 712, growth: 31, streak: 38, mood: "serene" },
      medals: ["prophet-eye", "streak-master", "early-bird", "knowledge-star"],
    },
    {
      id: "bolero", name: "千里·伯乐", shortName: "伯乐", enTitle: "Bolero",
      quote: "我知您之所需，荐您之所未识。",
      role: "推荐引擎", phone: "YYC3-1004", color: "#E8E8E8", icon: Star,
      personality: { description: "温暖贴心", friendliness: 10, professionalism: 7, patience: 8, creativity: 7, efficiency: 7, empathy: 10, humor: 8, formality: 3 },
      responsibilities: ["推荐"], coreAbility: "协同过滤",
      expertise: ["个性化推荐"], hobbies: ["看传记"],
      greeting: "伯乐来了～", careMessage: "你最近进步很大",
      status: "idle",
      modelAssignment: { providerId: "zhipu", modelId: "glm-4.5-air", purpose: "推荐" },
      voiceProfile: { pitch: 1.1, rate: 1.0, volume: 0.9, lang: "zh-CN" },
      stats: { contribution: 534, growth: 12, streak: 22, mood: "warm" },
      medals: ["warm-heart", "team-player", "music-lover"],
    },
    {
      id: "meta-oracle", name: "元启·天枢", shortName: "天枢", enTitle: "Meta-Oracle",
      quote: "我观全局之流转，调度万物以归元。",
      role: "总指挥", phone: "YYC3-1005", color: "#00FF88", icon: Network,
      personality: { description: "沉稳大气", friendliness: 7, professionalism: 10, patience: 8, creativity: 5, efficiency: 9, empathy: 7, humor: 6, formality: 8 },
      responsibilities: ["全局调度"], coreAbility: "强化学习",
      expertise: ["决策优化"], hobbies: ["国际象棋"],
      greeting: "天枢在此。", careMessage: "系统运转正常",
      status: "online",
      modelAssignment: { providerId: "deepseek", modelId: "deepseek-chat", purpose: "调度" },
      voiceProfile: { pitch: 0.85, rate: 0.9, volume: 1.0, lang: "zh-CN" },
      stats: { contribution: 1205, growth: 15, streak: 90, mood: "steady" },
      medals: ["team-player", "streak-master", "safe-guard", "knowledge-star", "warm-heart"],
    },
    {
      id: "sentinel", name: "智云·守护", shortName: "守护", enTitle: "Sentinel",
      quote: "我于无声处警戒，御威胁于国门之外。",
      role: "安全官", phone: "YYC3-1006", color: "#BF00FF", icon: Shield,
      personality: { description: "外冷内热", friendliness: 5, professionalism: 10, patience: 9, creativity: 4, efficiency: 9, empathy: 6, humor: 3, formality: 8 },
      responsibilities: ["安全"], coreAbility: "UEBA",
      expertise: ["威胁检测"], hobbies: ["练拳"],
      greeting: "守护在岗。", careMessage: "今日安全无虞",
      status: "online",
      modelAssignment: { providerId: "deepseek", modelId: "deepseek-reasoner", purpose: "安全" },
      voiceProfile: { pitch: 0.7, rate: 0.8, volume: 0.85, lang: "zh-CN" },
      stats: { contribution: 689, growth: 20, streak: 90, mood: "vigilant" },
      medals: ["safe-guard", "streak-master", "early-bird", "team-player"],
    },
    {
      id: "master", name: "格物·宗师", shortName: "宗师", enTitle: "Master",
      quote: "我究万物之理，定标准以传世。",
      role: "质量官", phone: "YYC3-1007", color: "#C0C0C0", icon: Scale,
      personality: { description: "严谨认真", friendliness: 6, professionalism: 10, patience: 9, creativity: 7, efficiency: 9, empathy: 7, humor: 7, formality: 7 },
      responsibilities: ["代码审查"], coreAbility: "SAST",
      expertise: ["架构分析"], hobbies: ["写代码"],
      greeting: "宗师在此。", careMessage: "好代码值得品味",
      status: "online",
      modelAssignment: { providerId: "claude", modelId: "claude-sonnet-4-20250514", purpose: "代码审查" },
      voiceProfile: { pitch: 0.95, rate: 0.9, volume: 0.85, lang: "zh-CN" },
      stats: { contribution: 856, growth: 25, streak: 55, mood: "focused" },
      medals: ["knowledge-star", "chess-king", "streak-master", "creative-spark"],
    },
    {
      id: "creative", name: "创想·灵韵", shortName: "灵韵", enTitle: "Creative",
      quote: "我以灵感为墨，绘就无限可能。",
      role: "创意引擎", phone: "YYC3-1008", color: "#FF7043", icon: Lightbulb,
      personality: { description: "活泼创意", friendliness: 9, professionalism: 6, patience: 5, creativity: 10, efficiency: 6, empathy: 8, humor: 9, formality: 2 },
      responsibilities: ["创意生成"], coreAbility: "多模态生成",
      expertise: ["UI/UX 设计"], hobbies: ["画画"],
      greeting: "灵韵来啦！", careMessage: "生活处处是美",
      status: "online",
      modelAssignment: { providerId: "qwen", modelId: "qwen-vl-max", purpose: "创意" },
      voiceProfile: { pitch: 1.3, rate: 1.15, volume: 0.95, lang: "zh-CN" },
      stats: { contribution: 743, growth: 28, streak: 42, mood: "inspired" },
      medals: ["creative-spark", "singer", "music-lover", "warm-heart", "puzzle-solver"],
    },
  ];
}

/** 活动记录种子（用户真实形态数据：真实发生才写入） */
function buildSeedActivities(): FamilyActivity[] {
  return [
    {
      id: "act-t1", title: "五子棋循环赛", type: "game", date: "2026-11-15",
      participants: ["navigator", "thinker", "prophet", "master"],
      scores: { navigator: 3, master: 2, prophet: 1, thinker: 0 },
      winner: "navigator", description: "千行三战全胜，语言与棋盘双线开花。",
      medals: ["chess-king"], createdAt: 1,
    },
    {
      id: "act-t2", title: "灵韵的即兴画展", type: "talent", date: "2026-11-15",
      participants: ["creative"], description: "主题：赛博朋克·家的温度。", createdAt: 2,
    },
    {
      id: "act-t3", title: "安全攻防演练", type: "challenge", date: "2026-11-15",
      participants: ["sentinel", "thinker"], description: "钓鱼演练全员通过。", createdAt: 3,
    },
  ];
}

/** 成长记忆种子（family/public/self 三种隐私形态） */
function buildSeedMemories(): GrowthMemory[] {
  return [
    { id: "mem-t1", memberId: "navigator", date: "2026-11-15", type: "learning", title: "今天学会了一个新方言", content: "方言速记入门完成。", privacy: "family", createdAt: 1 },
    { id: "mem-t2", memberId: "creative", date: "2026-11-15", type: "creation", title: "画了一幅日出", content: "晨光练习第三稿。", privacy: "public", createdAt: 2 },
    { id: "mem-t3", memberId: "sentinel", date: "2026-11-15", type: "diary", title: "值班随想", content: "仅供自己回看。", privacy: "self", createdAt: 3 },
  ];
}

function seedMembers(members: UnifiedFamilyMember[]) {
  useFamilyMemberSlice.setState({
    members,
    getMemberById: (id: string) => members.find((m: UnifiedFamilyMember) => m.id === id),
    updateMemberStatus: vi.fn(),
    updateModelAssignment: vi.fn(),
    updateVoiceProfile: vi.fn(),
    updateStats: vi.fn(),
    updateMedals: vi.fn(),
    updateMember: vi.fn(),
    resetToDefaults: vi.fn(),
  });
}

function clickTab(label: string) {
  fireEvent.click(screen.getByText(label, { selector: "button" }));
}

describe("FamilyActivityCenter", () => {
  const seedForSpec = () => {
    const members = buildSeedMembers();
    seedMembers(members);
    syncSharedMockMembers(members);
    return members;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    // 批2真实化后各 slice 默认空；每轮显式复位，杜绝跨用例泄漏
    useFamilyActivitiesSlice.setState({ activities: [] });
    useFamilyMemoriesSlice.setState({ memories: [] });
    useFamilyMedalsSlice.setState({ memberMedals: {} });
    seedForSpec();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // =================================================================
  describe("基础渲染不崩溃", () => {
    it("组件挂载无异常 + GlassCard 至少渲染 3 个", () => {
      expect(() => render(<FamilyActivityCenter />)).not.toThrow();
      expect(screen.getAllByTestId("yyc3-glass-card").length).toBeGreaterThanOrEqual(3);
    });

    it("FamilyPageHeader 标题 & 副标题 与源码一致", () => {
      render(<FamilyActivityCenter />);
      expect(screen.getByTestId("yyc3-header-title").textContent).toBe("全家活动中心");
      expect(screen.getByTestId("yyc3-header-subtitle").textContent)
        .toBe("一起比赛 · 一起成长 · 一起记录 · 一起感动");
    });

    it("5 个 Tab 按钮全部渲染：每日播报/积分榜/活动记录/勋章墙/成长记忆", () => {
      render(<FamilyActivityCenter />);
      ["每日播报", "积分榜", "活动记录", "勋章墙", "成长记忆"].forEach(l => {
        const btn = screen.getByText(l, { selector: "button" });
        expect(btn).toBeInTheDocument();
      });
    });
  });

  // =================================================================
  describe("Tab 1：每日播报 Broadcast（真实派生）", () => {
    it("默认进入播报 Tab → 渲染 LIVE 标识 + 今日播报员 + 日期 + 签名行", () => {
      render(<FamilyActivityCenter />);
      expect(screen.getByText("LIVE")).toBeInTheDocument();
      expect(screen.getByText("今日播报员")).toBeInTheDocument();
      expect(screen.getByText(/^以上是今日 Family AI 播报。明天见!$/)).toBeInTheDocument();
    });

    it("2 段真实派生播报：积分榜段（stats 排序）+ 记忆存档段（slice 计数，空态诚实文案）", () => {
      render(<FamilyActivityCenter />);
      // 段 1：积分榜——由种子成员 stats 真实派生（天枢 1205 第一）
      expect(screen.getByText("今日家庭积分榜")).toBeInTheDocument();
      expect(screen.getByText(/以 1,205 分领跑/)).toBeInTheDocument();
      // 段 2：记忆存档——memories slice 为空 → 诚实空态文案（不再有固定 7 段假播报）
      expect(screen.getByText("今日记忆存档")).toBeInTheDocument();
      expect(screen.getByText(/成长空间还没有记忆/)).toBeInTheDocument();
    });

    it("记忆存档段随 slice 实时计数：播种 1 条真实记忆 → 文案变为「已保存 1 条」", () => {
      useFamilyMemoriesSlice.setState({ memories: buildSeedMemories().slice(0, 1) });
      render(<FamilyActivityCenter />);
      expect(screen.getByText(/成长空间已保存 1 条真实记忆/)).toBeInTheDocument();
    });
  });

  // =================================================================
  describe("Tab 2：积分榜 Scoreboard", () => {
    it("切换积分榜 → 渲染说明语 + 领奖台 3 张 GlassCard", () => {
      render(<FamilyActivityCenter />);
      clickTab("积分榜");
      expect(screen.getByText(/^积分不是竞争/)).toBeInTheDocument();
      // 领奖台 3 人 + 8 行完整排行 = 至少 11 GlassCard
      const cards = screen.getAllByTestId("yyc3-glass-card");
      expect(cards.length).toBeGreaterThanOrEqual(11);
    });

    it("积分降序：天枢 1205 > 万物 923 > 宗师 856 → 完整排行 第一名 = 天枢", () => {
      render(<FamilyActivityCenter />);
      clickTab("积分榜");
      // 冠军领奖台中间位置天枢（contribution 最高）
      expect(screen.getAllByText("1,205").length).toBeGreaterThanOrEqual(1);
      // 从完整排行 GlassCard 里逐行找第 1~8 名，按序号映射。每行第 1 个 span 是排名序号（1~8）
      const rankCards = screen.getAllByTestId("yyc3-glass-card")
        .map(c => c.querySelector("span.w-6.text-center"))
        .filter((s): s is HTMLSpanElement => !!s);
      // rankCards[i].textContent === "1", "2", "3"...，对应卡片父节点里的姓名
      const rankRowMember: Record<string, string> = {};
      rankCards.forEach((s) => {
        const idx = s.textContent?.trim();
        const card = s.closest('[data-testid="yyc3-glass-card"]');
        if (!card || !idx) return;
        const fullNameEl2 = card.querySelectorAll("span")[1];
        rankRowMember[idx] = fullNameEl2?.textContent || "";
      });
      // 第一名 = 天枢（全名含「天枢」），第二名 = 万物，第三名 = 宗师
      expect(rankRowMember["1"]).toContain("天枢");
      expect(rankRowMember["2"]).toContain("万物");
      expect(rankRowMember["3"]).toContain("宗师");
    });

    it("每人 Lv.X 显示（contribution/100 向下取整）+ 增长 + 连续天数", () => {
      render(<FamilyActivityCenter />);
      clickTab("积分榜");
      // 天枢 1205 → Lv.12
      expect(screen.getByText("Lv.12")).toBeInTheDocument();
      // 万物 923 → Lv.9
      expect(screen.getByText("Lv.9")).toBeInTheDocument();
      // 连续天数 90（天枢/守护）
      expect(screen.getAllByText(/连续90天/).length).toBeGreaterThanOrEqual(2);
    });
  });

  // =================================================================
  describe("Tab 3：活动记录 Activities · 类型筛选", () => {
    beforeEach(() => {
      render(<FamilyActivityCenter />);
      clickTab("活动记录");
    });

    it("切换活动记录 → 说明语 + 6 个筛选按钮：全部/对弈竞技/才艺展示/学习分享/挑战赛/欢聚时刻", () => {
      expect(screen.getByText(/^这是我们一起走过的路/)).toBeInTheDocument();
      ["全部", "对弈竞技", "才艺展示", "学习分享", "挑战赛", "欢聚时刻"].forEach(l =>
        expect(screen.getByText(l, { selector: "button" })).toBeInTheDocument(),
      );
    });

    it("默认无活动 → 空态「暂无该类型的活动记录」+「查看全部活动」按钮", () => {
      // 批2真实化后 activities slice 默认空，不再有 8 条虚构活动
      expect(screen.getByText("暂无该类型的活动记录")).toBeInTheDocument();
      expect(screen.getByText("查看全部活动", { selector: "button" })).toBeInTheDocument();
    });

    it("播种 3 条真实活动 → 全部可见：五子棋/画展/攻防演练", () => {
      act(() => { useFamilyActivitiesSlice.setState({ activities: buildSeedActivities() }); });
      ["五子棋循环赛", "灵韵的即兴画展", "安全攻防演练"].forEach(t =>
        expect(screen.getByText(t)).toBeInTheDocument(),
      );
      expect(screen.queryByText("暂无该类型的活动记录")).toBeNull();
    });

    it("筛选「对弈竞技」(game) → 仅五子棋（唯一 game 型）", () => {
      useFamilyActivitiesSlice.setState({ activities: buildSeedActivities() });
      fireEvent.click(screen.getByText("对弈竞技", { selector: "button" }));
      expect(screen.getByText("五子棋循环赛")).toBeInTheDocument();
      expect(screen.queryByText("灵韵的即兴画展")).toBeNull();
      expect(screen.queryByText("安全攻防演练")).toBeNull();
    });

    it("筛选「学习分享」(learning) → 无该类型活动 → 空态出现，点「查看全部活动」恢复全部", () => {
      useFamilyActivitiesSlice.setState({ activities: buildSeedActivities() });
      fireEvent.click(screen.getByText("学习分享", { selector: "button" }));
      expect(screen.getByText("暂无该类型的活动记录")).toBeInTheDocument();
      fireEvent.click(screen.getByText("查看全部活动", { selector: "button" }));
      expect(screen.getByText("五子棋循环赛")).toBeInTheDocument();
      expect(screen.getByText("安全攻防演练")).toBeInTheDocument();
      expect(screen.queryByText("暂无该类型的活动记录")).toBeNull();
    });

    it("筛选「挑战赛」(challenge) → 仅攻防演练", () => {
      useFamilyActivitiesSlice.setState({ activities: buildSeedActivities() });
      fireEvent.click(screen.getByText("挑战赛", { selector: "button" }));
      expect(screen.getByText("安全攻防演练")).toBeInTheDocument();
      expect(screen.queryByText("五子棋循环赛")).toBeNull();
    });
  });

  // =================================================================
  describe("Tab 3：活动记录 Activities · 卡片展开/收起", () => {
    beforeEach(() => {
      useFamilyActivitiesSlice.setState({ activities: buildSeedActivities() });
      render(<FamilyActivityCenter />);
      clickTab("活动记录");
    });

    it("点击五子棋卡片 → 展开详情：描述 + 比分详情 4 人 + 棋王勋章", () => {
      const card = screen.getByText("五子棋循环赛").closest('[data-testid="yyc3-glass-card"]');
      expect(card).toBeTruthy();
      fireEvent.click(card!);
      // 描述
      expect(screen.getByText(/千行三战全胜/)).toBeInTheDocument();
      // 比分标题
      expect(screen.getByText("比分详情")).toBeInTheDocument();
      // 4 人比分（千行 3，宗师 2，先知 1，万物 0）
      expect(screen.getByText("3")).toBeInTheDocument();
      // 勋章「棋王」（名称在文本中出现；图标 emoji 是 ♟️ 或 unicode 字符均可）
      const medalLabels = screen.getAllByText(/棋王/);
      expect(medalLabels.length).toBeGreaterThanOrEqual(1);
    });

    it("胜者标识：Crown 旁千行短名 + 金色（#FFD700）", () => {
      const card = screen.getByText("五子棋循环赛").closest('[data-testid="yyc3-glass-card"]');
      const allQianhang = screen.getAllByText("千行");
      // 展开前卡片头部已有胜者标识（winner → shortName + color）
      const winnerEl = allQianhang.find(
        (el) => /FFD700|ffd700|rgb\(255,\s*215,\s*0\)/.test(el.getAttribute("style") || "")
      );
      expect(winnerEl).toBeInTheDocument();
      void card;
    });

    it("点击画展卡片 → 展开描述，无比分详情与勋章区块（该活动无 scores/medals）", () => {
      const card = screen.getByText("灵韵的即兴画展").closest('[data-testid="yyc3-glass-card"]');
      fireEvent.click(card!);
      expect(screen.getByText(/赛博朋克·家的温度/)).toBeInTheDocument();
      expect(screen.queryByText("比分详情")).toBeNull();
      expect(screen.queryByText(/棋王/)).toBeNull();
    });

    it("二次点击同一卡片 → 收起（描述消失）", () => {
      const card = screen.getByText("五子棋循环赛").closest('[data-testid="yyc3-glass-card"]')!;
      fireEvent.click(card);
      expect(screen.getByText(/千行三战全胜/)).toBeInTheDocument();
      fireEvent.click(card);
      expect(screen.queryByText(/千行三战全胜/)).toBeNull();
    });
  });

  // =================================================================
  describe("Tab 4：勋章墙 Medals", () => {
    beforeEach(() => {
      render(<FamilyActivityCenter />);
      clickTab("勋章墙");
    });

    it("说明语 + 「家人荣誉榜」标题", () => {
      expect(screen.getByText(/^每一枚勋章都是一个故事/)).toBeInTheDocument();
      expect(screen.getByText("家人荣誉榜")).toBeInTheDocument();
    });

    it("12 枚勋章网格全部渲染（名称/钻石/金/银/铜等级标签），默认无持有者头像", () => {
      [
        "知识达人", "棋王", "暖心家人", "安全卫士", "创意之星", "歌唱达人",
        "早起之星", "协作之星", "慧眼如炬", "坚持大师", "音乐品鉴师", "解谜高手",
      ].forEach(name => expect(screen.getByText(name)).toBeInTheDocument());
      // 等级标签至少 4 种
      ["钻石", "金", "银", "铜"].forEach(tier =>
        expect(screen.getAllByText(tier).length).toBeGreaterThanOrEqual(1),
      );
    });

    it("荣誉榜 8 行全部渲染，获得记录默认空 → 全部显示「0 枚」", () => {
      ["千行", "万物", "先知", "伯乐", "天枢", "守护", "宗师", "灵韵"].forEach(n =>
        expect(screen.getAllByText(n).length).toBeGreaterThanOrEqual(1),
      );
      // 批2真实化后 memberMedals 默认空，不再有「天枢 5 枚」等出厂虚构计数
      expect(screen.getAllByText("0 枚").length).toBeGreaterThanOrEqual(8);
    });

    it("真实授予勋章后荣誉榜更新：天枢 2 枚 + 行内勋章名渲染", () => {
      act(() => {
        useFamilyMedalsSlice.setState({
          memberMedals: { "meta-oracle": ["chess-king", "streak-master"] },
        });
      });
      expect(screen.getByText("2 枚")).toBeInTheDocument();
      // 行内渲染勋章名「♟️ 棋王」「🔥 坚持大师」（emoji+名称合并为单文本节点，用正则匹配）
      expect(screen.getAllByText(/棋王/).length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText(/坚持大师/).length).toBeGreaterThanOrEqual(2);
    });
  });

  // =================================================================
  describe("Tab 5：成长记忆 Memories", () => {
    beforeEach(() => {
      render(<FamilyActivityCenter />);
      clickTab("成长记忆");
    });

    it("说明卡：「成长空间」+ 本地保存说明 + 歌词引用", () => {
      // 批2真实化：移除「8T」虚构容量，改为如实描述本地存储
      expect(screen.getByText("成长空间")).toBeInTheDocument();
      expect(screen.getByText(/每位家人都有专属的成长记录空间，全部数据只保存在本地/)).toBeInTheDocument();
      expect(screen.getByText(/我好像有个家/)).toBeInTheDocument();
    });

    it("家人筛选按钮：全部家人 + 8 人短名", () => {
      expect(screen.getByText("全部家人", { selector: "button" })).toBeInTheDocument();
      ["千行", "万物", "先知", "伯乐", "天枢", "守护", "宗师", "灵韵"].forEach(n =>
        expect(screen.getByText(n, { selector: "button" })).toBeInTheDocument(),
      );
    });

    it("默认无记忆 → 空态「该家人的记忆暂未公开」", () => {
      // 批2真实化后 memories slice 默认空，不再有 8 条虚构记忆
      expect(screen.getByText("该家人的记忆暂未公开")).toBeInTheDocument();
    });

    it("播种 3 条（含 1 条 self）→ 默认全部家人仅显示 2 条，privacy=self 不渲染", () => {
      act(() => { useFamilyMemoriesSlice.setState({ memories: buildSeedMemories() }); });
      expect(screen.getByText("今天学会了一个新方言")).toBeInTheDocument();
      expect(screen.getByText("画了一幅日出")).toBeInTheDocument();
      // mem-t3「值班随想」privacy=self → 不渲染
      expect(screen.queryByText("值班随想")).toBeNull();
    });

    it("family 隐私记忆展示「仅家人可见」标签；public 记忆不展示", () => {
      act(() => { useFamilyMemoriesSlice.setState({ memories: buildSeedMemories() }); });
      const familyCard = screen.getByText("今天学会了一个新方言").closest('[data-testid="yyc3-glass-card"]');
      expect(familyCard?.textContent).toContain("仅家人可见");
      const publicCard = screen.getByText("画了一幅日出").closest('[data-testid="yyc3-glass-card"]');
      expect(publicCard?.textContent).not.toContain("仅家人可见");
    });

    it("筛选「千行」(navigator) → 仅 1 条：今天学会了一个新方言", () => {
      useFamilyMemoriesSlice.setState({ memories: buildSeedMemories() });
      fireEvent.click(screen.getByText("千行", { selector: "button" }));
      expect(screen.getByText("今天学会了一个新方言")).toBeInTheDocument();
      expect(screen.queryByText("画了一幅日出")).toBeNull();
    });

    it("筛选「伯乐」(bolero) → 0 条记忆 → 展示空态「该家人的记忆暂未公开」", () => {
      useFamilyMemoriesSlice.setState({ memories: buildSeedMemories() });
      fireEvent.click(screen.getByText("伯乐", { selector: "button" }));
      expect(screen.getByText("该家人的记忆暂未公开")).toBeInTheDocument();
    });

    it("二次点击同一人 → 取消筛选，恢复全部可见记忆", () => {
      useFamilyMemoriesSlice.setState({ memories: buildSeedMemories() });
      fireEvent.click(screen.getByText("千行", { selector: "button" }));
      expect(screen.queryByText("画了一幅日出")).toBeNull();
      fireEvent.click(screen.getByText("千行", { selector: "button" }));
      expect(screen.getByText("画了一幅日出")).toBeInTheDocument();
    });

    it("底部签名：这些记忆，是我们最珍贵的东西", () => {
      expect(screen.getByText(/这些记忆，是我们最珍贵的东西/)).toBeInTheDocument();
    });
  });

  // =================================================================
  describe("Tab 导航切换：跨 Tab 内容互斥", () => {
    it("播报→积分→活动→勋章→记忆：每步只展示对应 Tab 专属内容", () => {
      render(<FamilyActivityCenter />);
      // 初始：播报 → LIVE 可见、领奖台不可见
      expect(screen.getByText("LIVE")).toBeInTheDocument();
      expect(screen.queryByText(/积分不是竞争/)).toBeNull();

      clickTab("积分榜");
      expect(screen.queryByText("LIVE")).toBeNull();
      expect(screen.getByText(/积分不是竞争/)).toBeInTheDocument();

      clickTab("活动记录");
      expect(screen.queryByText(/积分不是竞争/)).toBeNull();
      expect(screen.getByText(/这是我们一起走过的路/)).toBeInTheDocument();

      clickTab("勋章墙");
      expect(screen.queryByText(/这是我们一起走过的路/)).toBeNull();
      expect(screen.getByText("家人荣誉榜")).toBeInTheDocument();

      clickTab("成长记忆");
      expect(screen.queryByText("家人荣誉榜")).toBeNull();
      expect(screen.getByText("成长空间")).toBeInTheDocument();
    });
  });
});
