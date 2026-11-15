/**
 * @file: FamilyChat.tsx
 * @description: FamilyChat.tsx
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: active
 * @tags: [component]
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, Send, Users, ChevronLeft, Smile,
  Sparkles, Search,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useFamilyMemberSlice } from "../store";
import { useFamilyChatSlice } from "../store/family-chat-slice";
import { hexToRgb } from "./shared";
import { FamilyAIService } from "../../../lib/family-ai-service";

type ChannelType = "family-group" | string;

function nowTimeStr(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

export function FamilyChat() {
  const nav = useNavigate();
  const { members } = useFamilyMemberSlice();
  const channelsData = useFamilyChatSlice((s) => s.channels);
  const addMessage = useFamilyChatSlice((s) => s.addMessage);
  const [activeChannel, setActiveChannel] = useState<ChannelType>("family-group");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = channelsData[activeChannel] || [];

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) { return; }

    addMessage(activeChannel, { sender: "user", text, time: nowTimeStr(), type: "text" });
    setInput("");
    setSending(true);

    try {
      // 发送后的最新历史（含本条用户消息），供模型上下文使用
      const history = useFamilyChatSlice.getState().channels[activeChannel] || [];
      const response = activeChannel === "family-group"
        ? await FamilyAIService.chatGroup(text, history)
        : await FamilyAIService.chat({
            memberId: activeChannel,
            userMessage: text,
            conversationHistory: history,
            channelType: "private",
          });

      if (response.source === "error") {
        // 诚实离线：未接线/未配置/不可达时如实说明，绝不伪造回复
        const name = activeChannel === "family-group"
          ? "家人们"
          : (members.find((m) => m.id === activeChannel)?.shortName ?? "家人");
        addMessage(activeChannel, {
          sender: "system",
          text: `「${name}」当前离线：${response.error}`,
          time: nowTimeStr(),
          type: "system",
          source: "error",
        });
      } else {
        addMessage(activeChannel, {
          sender: response.senderId,
          text: response.text,
          time: nowTimeStr(),
          type: "text",
          source: response.source,
        });
      }
    } finally {
      setSending(false);
    }
  }, [input, activeChannel, sending, addMessage, members]);

  const channels = [
    { id: "family-group" as const, label: "家庭群聊", icon: Users, desc: "全体家人", color: "#00d4ff" },
    ...members.map(m => ({ id: m.id, label: m.shortName, icon: m.icon, desc: m.name, color: m.color })),
  ];
  const activeChannelInfo = channels.find(c => c.id === activeChannel)!;

  return (
    <div className="h-full flex">
      {/* ═══ 左侧频道列表 ═══ */}
      <div className="w-64 shrink-0 border-r border-[rgba(0,180,255,0.08)] flex-col bg-[rgba(4,10,22,0.5)] hidden md:flex">
        <div className="p-4 border-b border-[rgba(0,180,255,0.06)]">
          <button
            onClick={() => nav("/ai-family")}
            className="flex items-center gap-2 text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-colors mb-3"
            style={{ fontSize: "0.72rem" }}
          >
            <ChevronLeft className="w-3 h-3" /> 返回家园
          </button>
          <h2 className="text-[#e0f0ff] flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
            <MessageCircle className="w-4 h-4 text-[#00d4ff]" /> 家人对话
          </h2>
        </div>

        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.08)]">
            <Search className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />
            <input
              className="bg-transparent text-[rgba(224,240,255,0.7)] outline-none flex-1"
              style={{ fontSize: "0.72rem" }}
              placeholder="搜索对话..."
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,180,255,0.1) transparent" }}>
          {channels.map(ch => {
            const isActive = ch.id === activeChannel;
            const Icon = ch.icon;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${isActive ? "" : "hover:bg-[rgba(0,40,80,0.2)]"}`}
                style={{
                  background: isActive ? `rgba(${hexToRgb(ch.color)}, 0.08)` : "transparent",
                  borderLeft: isActive ? `2px solid ${ch.color}` : "2px solid transparent",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${ch.color}12`, border: `1px solid ${ch.color}25` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: ch.color }} />
                </div>
                <div className="min-w-0">
                  <p className={`truncate ${isActive ? "text-[#e0f0ff]" : "text-[rgba(224,240,255,0.6)]"}`} style={{ fontSize: "0.78rem" }}>
                    {ch.label}
                  </p>
                  <p className="text-[rgba(224,240,255,0.25)] truncate" style={{ fontSize: "0.58rem" }}>{ch.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ 右侧聊天区 ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 头部 */}
        <div className="shrink-0 px-5 py-3 border-b border-[rgba(0,180,255,0.08)] flex items-center justify-between bg-[rgba(4,10,22,0.5)]">
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/ai-family")} className="md:hidden text-[rgba(0,212,255,0.5)]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: `${activeChannelInfo.color}12`, border: `1px solid ${activeChannelInfo.color}30` }}
            >
              <activeChannelInfo.icon className="w-4 h-4" style={{ color: activeChannelInfo.color }} />
            </div>
            <div>
              <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>
                {activeChannel === "family-group" ? "AI Family 家庭群聊" : activeChannelInfo.desc}
              </h3>
              <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.6rem" }}>
                {activeChannel === "family-group" ? `${members.length}位家人` : "一对一对话"}
              </p>
            </div>
          </div>
        </div>

        {/* 消息列表 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,180,255,0.1) transparent" }}>
          {messages.map(msg => {
            if (msg.type === "system") {
              return (
                <div key={msg.id} className="text-center py-2">
                  <span className="px-3 py-1 rounded-full bg-[rgba(0,40,80,0.2)] text-[rgba(224,240,255,0.3)] border border-[rgba(0,180,255,0.06)]" style={{ fontSize: "0.6rem" }}>
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isUser = msg.sender === "user";
            const member = !isUser ? members.find(m => m.id === msg.sender) : null;
            const avatarColor = member?.color || "#00d4ff";
            const AvatarIcon = member?.icon || Sparkles;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                style={{ animation: "fadeSlideIn 0.3s ease" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: isUser ? "rgba(0,212,255,0.1)" : `${avatarColor}12`,
                    border: `1px solid ${isUser ? "rgba(0,212,255,0.3)" : `${avatarColor}30`}`,
                  }}
                >
                  {isUser ? (
                    <span style={{ fontSize: "0.55rem", color: "#00d4ff" }}>你</span>
                  ) : (
                    <AvatarIcon className="w-3.5 h-3.5" style={{ color: avatarColor }} />
                  )}
                </div>

                <div className={`max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
                  {!isUser && member && (
                    <span className="mb-1 flex items-center gap-1.5" style={{ fontSize: "0.6rem", color: avatarColor }}>
                      {member.shortName}
                      {(msg.source === "agent" || msg.source === "mock") && (
                        <span className="px-1 rounded bg-[rgba(255,180,0,0.1)] border border-[rgba(255,180,0,0.2)] text-[rgba(255,180,0,0.7)]" style={{ fontSize: "0.5rem" }}>
                          演示
                        </span>
                      )}
                    </span>
                  )}
                  <div
                    className="px-4 py-2.5 rounded-xl"
                    style={{
                      background: isUser
                        ? "linear-gradient(135deg, rgba(0,120,200,0.25), rgba(0,80,160,0.15))"
                        : "rgba(15,25,50,0.6)",
                      border: `1px solid ${isUser ? "rgba(0,180,255,0.15)" : "rgba(0,180,255,0.06)"}`,
                    }}
                  >
                    <p className="text-[rgba(224,240,255,0.8)]" style={{ fontSize: "0.8rem", lineHeight: 1.7 }}>
                      {msg.text}
                    </p>
                  </div>
                  <span className="mt-1 block text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.5rem", textAlign: isUser ? "right" : "left" }}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 输入区 */}
        <div className="shrink-0 px-5 py-3 border-t border-[rgba(0,180,255,0.08)] bg-[rgba(4,10,22,0.5)]">
          <div className="flex items-end gap-3">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] focus-within:border-[rgba(0,212,255,0.3)] transition-colors">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="flex-1 bg-transparent text-[rgba(224,240,255,0.8)] outline-none placeholder-[rgba(224,240,255,0.2)]"
                style={{ fontSize: "0.82rem" }}
                placeholder="和家人说点什么..."
              />
              <Smile className="w-4 h-4 text-[rgba(224,240,255,0.2)] cursor-pointer hover:text-[rgba(224,240,255,0.5)] transition-colors" />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-xl transition-all disabled:opacity-30"
              style={{
                background: input.trim() ? "rgba(0,180,255,0.15)" : "rgba(0,40,80,0.2)",
                border: `1px solid ${input.trim() ? "rgba(0,212,255,0.3)" : "rgba(0,180,255,0.08)"}`,
              }}
            >
              <Send className="w-4 h-4 text-[#00d4ff]" />
            </button>
          </div>
        </div>
      </div>

      {/* CSS for message animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
