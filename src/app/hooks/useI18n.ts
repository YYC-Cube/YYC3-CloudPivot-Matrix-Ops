/**
 * @file: useI18n.ts
 * @description: 国际化 Hook · 支持中文/English 动态切换
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-02-26
 * @updated: 2026-04-09
 * @status: active
 * @tags: [hook],[i18n],[locale]
 *
 * @copyright: YanYuCloudCube Team
 * @license: MIT
 *
 * @brief: 提供国际化功能，支持中英文动态切换
 *
 * @details:
 * - localStorage 持久化语言偏好
 * - React Context 全局共享
 * - 动态切换无需刷新
 * - t() 函数支持嵌套 key 和模板变量
 *
 * @dependencies: React, Context API
 * @exports: useI18n, I18nProvider, I18nContext, SUPPORTED_LOCALES
 * @notes: 需要在 App 根组件包裹 I18nProvider
 */

import { useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from "react";
import { I18nEngine } from "@yyc3/i18n-core";
import type { TranslationMap } from "@yyc3/i18n-core";
import { zhCN, enUS } from "../i18n";
import type { Locale, LocaleInfo, I18nContextValue } from "../types";
import { useSettingsSSOT } from "../store/slices/settings-ssot-slice";

// RF-011: Re-export 已移除

/** 合法语言值守卫（SSOT values.language 为 string，需收窄到 Locale） */
function toLocale(value: unknown): Locale | null {
  return value === "en-US" || value === "zh-CN" ? value : null;
}

// ============================================================
// i18n 引擎（落档 43：自研 60 行实现换芯 @yyc3/i18n-core）
// - 嵌套 TranslationMap 原生支持 → zh-CN/en-US 词典原样注册
// - 缺 key 回退语义一致：返回 key 本身（missingKeyHandler 兜底）
// - ★ 双引擎固定注册在引擎 DEFAULT_LOCALE("en") 标签下：非默认 locale
//   的构造会触发异步懒加载，其续体会把已注册词典覆盖为框架自带小语言包
//   （jsdom 实证）；固定 DEFAULT 则构造器同步短路，注册即终态、永不切换，
//   零异步竞态。引擎 locale 语义弃用（仅消费 t()），语言切换由应用层
//   在两引擎间选择（localeRef），LRU 缓存按引擎隔离不可能跨语言串味。
// ============================================================

function makeEngine(map: unknown): I18nEngine {
  const e = new I18nEngine({ locale: "en", missingKeyHandler: (key) => key });
  e.registerTranslation("en", map as TranslationMap);
  return e;
}

const ENGINES: Record<Locale, I18nEngine> = {
  "zh-CN": makeEngine(zhCN),
  "en-US": makeEngine(enUS),
};

/** 当前生效语言（引擎选择的唯一依据；初始化/setLocale/SSOT 同步三处维护） */
const localeRef: { current: Locale } = { current: "zh-CN" };

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文" },
  { code: "en-US", label: "English",  nativeLabel: "English" },
];

const STORAGE_KEY = "yyc3_locale";

// ============================================================
// 工具函数: 模板变量归一（string|number → string，引擎参数签名）
// ============================================================

function toEngineParams(vars?: Record<string, string | number>): Record<string, string> | undefined {
  if (!vars) {return undefined;}
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)]));
}

// ============================================================
// Context
// ============================================================

export const I18nContext = createContext<I18nContextValue>({
  locale: "zh-CN",
  setLocale: () => {},
  t: (key, vars) => ENGINES["zh-CN"].t(key, toEngineParams(vars)),
  locales: SUPPORTED_LOCALES,
});

// ============================================================
// Hook
// ============================================================

export function useI18nProvider() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") {return "zh-CN";}
    // 优先取独立语言键，其次回落设置 SSOT 的 language 值（设置核心统一驱动）
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial: Locale =
      saved === "en-US" || saved === "zh-CN"
        ? saved
        : (toLocale(useSettingsSSOT.getState().values.language) ?? "zh-CN");
    localeRef.current = initial;
    return initial;
  });

  /** 应用 Locale 变更 → React 状态 + 引擎选择同步切换 */
  const applyLocale = useCallback((next: Locale) => {
    localeRef.current = next;
    setLocaleState(next);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    applyLocale(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // storage unavailable
    }
    // 写穿到设置 SSOT，保持单一数据源一致（同值时 zustand 不触发额外渲染）
    const ssot = useSettingsSSOT.getState();
    if (ssot.values.language !== newLocale) {
      ssot.updateValue("language", newLocale);
    }
  }, [applyLocale]);

  // 挂载时对齐：若 localStorage 恢复的语言与 SSOT 不一致，回写 SSOT 完成单一数据源归并
  const didInitRef = useRef(false);
  useEffect(() => {
    didInitRef.current = true;
    const ssot = useSettingsSSOT.getState();
    if (toLocale(ssot.values.language) !== locale) {
      ssot.updateValue("language", locale);
    }
    // 仅在首次挂载执行归并，locale 初值已由 useState 惰性初始化确定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSOT → i18n 单向同步：统一设置面板修改语言，界面即时切换（编辑即生效）
  // ★ 跳过首次挂载：初始语言由 localStorage 优先恢复，避免同步 effect 覆盖用户偏好
  const ssotLanguage = useSettingsSSOT((s) => s.values.language);
  const prevSsotLanguageRef = useRef(ssotLanguage);
  useEffect(() => {
    if (prevSsotLanguageRef.current === ssotLanguage) { return; }
    prevSsotLanguageRef.current = ssotLanguage;
    const next = toLocale(ssotLanguage);
    if (next && next !== locale) {
      applyLocale(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // storage unavailable
      }
    }
  }, [ssotLanguage, locale, applyLocale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      return ENGINES[localeRef.current].t(key, toEngineParams(vars));
    },
    []
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, locales: SUPPORTED_LOCALES }),
    [locale, setLocale, t]
  );

  return value;
}

/**
 * 消费 i18n 上下文的快捷 Hook
 */
export function useI18n() {
  return useContext(I18nContext);
}