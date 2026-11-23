/**
 * @file: Login.tsx
 * @description: Login 组件
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: active
 * @tags: [component]
 */

import React, { useState, useCallback } from "react";
import { Lock, Mail, Eye, EyeOff, Zap, Ghost, ShieldCheck } from "lucide-react";
import { APP_BRAND } from "../../config/app-brand";
import { YYC3Logo } from "./YYC3Logo";
import {
  hasLocalAdminAccount, initAdminAccount, localSignIn,
} from "../../lib/mock-auth";
import { hashPassword, passwordIssue } from "../../lib/auth-credentials";

interface LoginProps {
  onLoginSuccess: () => void;
  onGhostLogin?: () => void;
}

export function Login({ onLoginSuccess, onGhostLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ghostHover, setGhostHover] = useState(false);
  const [ghostActivating, setGhostActivating] = useState(false);

  /**
   * C-2 本地认证（落档 68）：无本地账号 → 初始化管理员；已有账号 → 口令登录。
   * 账号存 user-mgmt-slice（PBKDF2 哈希，零明文）；Ghost 旁路已按主控裁决关停
   * （onGhostLogin 仅保留给测试/历史调用，App 不再传入）。
   */
  const initMode = !hasLocalAdminAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) { return; }
    setError(null);
    const account = email.trim();
    if (initMode) {
      const weak = passwordIssue(password);
      if (weak) { setError(weak); return; }
      if (password !== password2) { setError("两次输入的口令不一致"); return; }
      setBusy(true);
      try {
        const hash = await hashPassword(password);
        await initAdminAccount(account || "admin", password, hash);
        onLoginSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "初始化失败");
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const r = await localSignIn(account, password);
      if ("session" in r) { onLoginSuccess(); }
      else { setError(r.error); }
    } finally {
      setBusy(false);
    }
  };

  const handleGhostLogin = useCallback(() => {
    if (!onGhostLogin || ghostActivating) {return;}
    setGhostActivating(true);
    // Brief visual delay for the activation effect
    setTimeout(() => {
      onGhostLogin();
    }, 600);
  }, [onGhostLogin, ghostActivating]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #060e1f 0%, #0a1628 30%, #081430 60%, #040c1a 100%)" }}>

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(rgba(0,212,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #00d4ff, transparent 70%)" }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #7b2ff7, transparent 70%)" }} />
      </div>

      {/* Ghost mode activation overlay */}
      {ghostActivating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] animate-[fadeIn_0.3s_ease]" />
          <div className="relative flex flex-col items-center gap-4 animate-[pulseGhost_0.6s_ease]">
            <Ghost className="w-16 h-16 text-[rgba(0,212,255,0.6)]" style={{ filter: "drop-shadow(0 0 30px rgba(0,212,255,0.5))" }} />
            <span className="text-[rgba(0,212,255,0.7)] tracking-[0.3em]" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.85rem" }}>
              GHOST MODE
            </span>
            <div className="w-32 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent animate-pulse" />
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="rounded-2xl bg-[rgba(8,25,55,0.7)] backdrop-blur-2xl border border-[rgba(0,180,255,0.15)] shadow-[0_0_60px_rgba(0,180,255,0.08)] p-8 md:p-10">

          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <YYC3Logo size="xl" glow showStatus={false} className="shadow-[0_0_30px_rgba(0,180,255,0.4)]" />
            </div>
            <h1
              className="text-[#00d4ff] tracking-[0.3em] mb-1"
              style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "1.4rem" }}
              data-testid="login-title"
            >
              {APP_BRAND.nameZh}
            </h1>
            <p
              className="text-[rgba(0,212,255,0.4)]"
              style={{ fontSize: "0.75rem", letterSpacing: "0.15em" }}
              data-testid="login-subtitle"
            >
              {APP_BRAND.sloganZh}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 模式说明（落档 68：初始化管理员 / 本地登录） */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.12)]"
              data-testid="login-mode-label"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#00ff88] shrink-0" />
              <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.66rem" }}>
                {initMode
                  ? "首次使用：创建本地管理员账号（口令 PBKDF2 哈希存储，零明文）"
                  : "本地账号登录 · 口令错误将拒止 · Ghost 旁路已关停"}
              </span>
            </div>

            {/* 账号 */}
            <div>
              <label className="block text-[rgba(0,212,255,0.5)] mb-1.5" style={{ fontSize: "0.72rem" }}>
                {initMode ? "管理员名称" : "账号（用户名/邮箱）"}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,212,255,0.3)]" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={initMode ? "admin" : "输入账号"}
                  data-testid="login-email-input"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.5)] focus:shadow-[0_0_15px_rgba(0,180,255,0.1)] transition-all"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[rgba(0,212,255,0.5)] mb-1.5" style={{ fontSize: "0.72rem" }}>
                {initMode ? "设置口令（≥6 位）" : "口令"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,212,255,0.3)]" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={initMode ? "设置口令" : "输入口令"}
                  data-testid="login-password-input"
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.5)] focus:shadow-[0_0_15px_rgba(0,180,255,0.1)] transition-all"
                  style={{ fontSize: "0.85rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  data-testid="login-toggle-password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all"
                >
                  {showPwd
                    ? <EyeOff className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
                    : <Eye className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />}
                </button>
              </div>
            </div>

            {/* Confirm（仅初始化模式） */}
            {initMode && (
              <div>
                <label className="block text-[rgba(0,212,255,0.5)] mb-1.5" style={{ fontSize: "0.72rem" }}>
                  确认口令
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,212,255,0.3)]" />
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    placeholder="再次输入口令"
                    data-testid="login-confirm-password-input"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.5)] transition-all"
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <p className="px-3 py-2 rounded-lg border border-[rgba(255,51,102,0.25)] bg-[rgba(255,51,102,0.08)] text-[rgba(255,150,170,0.95)]" style={{ fontSize: "0.7rem" }} data-testid="login-error">
                {error}
              </p>
            )}

            {/* Submit · 本地认证 */}
            <button
              type="submit"
              disabled={busy}
              data-testid="login-submit-button"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#0066ff] text-white transition-all hover:shadow-[0_0_25px_rgba(0,180,255,0.4)] relative overflow-hidden min-h-[48px] disabled:opacity-60"
              style={{ fontSize: "0.9rem", letterSpacing: "0.1em" }}
            >
              {busy ? "校验中…" : initMode ? "初始化管理员并进入" : "登录"}
            </button>
          </form>

          {/* ── 分隔线 ── */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[rgba(0,180,255,0.08)]" />
            <span className="text-[rgba(0,212,255,0.15)]" style={{ fontSize: "0.58rem", letterSpacing: "0.1em" }}>OR</span>
            <div className="flex-1 h-px bg-[rgba(0,180,255,0.08)]" />
          </div>

          {/* ── Ghost Login Button ── */}
          {onGhostLogin && (
            <button
              type="button"
              onClick={handleGhostLogin}
              disabled={ghostActivating}
              onMouseEnter={() => setGhostHover(true)}
              onMouseLeave={() => setGhostHover(false)}
              className="group w-full relative overflow-hidden rounded-xl transition-all duration-300 min-h-[48px]"
              style={{
                background: ghostHover
                  ? "linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(123,47,247,0.08) 100%)"
                  : "rgba(0,40,80,0.15)",
                border: ghostHover
                  ? "1px solid rgba(0,212,255,0.25)"
                  : "1px solid rgba(0,180,255,0.08)",
                boxShadow: ghostHover
                  ? "0 0 30px rgba(0,212,255,0.08), inset 0 0 30px rgba(0,212,255,0.03)"
                  : "none",
              }}
            >
              {/* Scan line effect on hover */}
              {ghostHover && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.02) 2px, rgba(0,212,255,0.02) 4px)",
                  }}
                />
              )}

              <div className="relative flex items-center justify-center gap-2.5 py-3 px-4">
                <Ghost
                  className="w-[18px] h-[18px] transition-all duration-300"
                  style={{
                    color: ghostHover ? "#00d4ff" : "rgba(0,212,255,0.3)",
                    filter: ghostHover ? "drop-shadow(0 0 8px rgba(0,212,255,0.5))" : "none",
                  }}
                />
                <span
                  className="transition-colors duration-300"
                  style={{
                    color: ghostHover ? "#00d4ff" : "rgba(0,212,255,0.35)",
                    fontSize: "0.82rem",
                    letterSpacing: "0.15em",
                    fontFamily: "'Orbitron', sans-serif",
                  }}
                >
                  GHOST MODE
                </span>

                {/* 右侧状态指示 */}
                <div className="absolute right-4 flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: ghostHover ? "#00ff88" : "rgba(0,255,136,0.2)",
                      boxShadow: ghostHover ? "0 0 6px rgba(0,255,136,0.5)" : "none",
                    }}
                  />
                  <span
                    className="transition-colors duration-300"
                    style={{
                      color: ghostHover ? "rgba(0,255,136,0.6)" : "rgba(0,255,136,0.15)",
                      fontSize: "0.55rem",
                      fontFamily: "'Rajdhani', monospace",
                    }}
                  >
                    FULL ACCESS
                  </span>
                </div>
              </div>
            </button>
          )}

          {/* Footer hints */}
          <div className="mt-5 pt-4 border-t border-[rgba(0,180,255,0.08)]">
            <div className="flex items-center gap-2 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.65rem" }}>
              <Zap className="w-3 h-3" />
              <span>本地闭环系统 · YYC³ Family 内部专用</span>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulseGhost {
          0% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
