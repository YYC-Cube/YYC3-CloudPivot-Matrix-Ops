/**
 * @file: FamilyShare.tsx
 * @description: FamilyShare.tsx
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: active
 * @tags: [component]
 */

import React, { useState } from "react";
import {
  Share2, BookOpen, ThumbsUp, MessageSquare, Bookmark,
  PlusCircle, TrendingUp, Award, Lightbulb, Clock, Smile, X,
} from "lucide-react";
import { GlassCard } from "../../shared/GlassCard";
import { FadeIn } from "./FadeIn";
import { FamilyPageHeader } from "./FamilyPageHeader";
import { useFamilyMemberSlice } from "../store";
import { useFamilyPostsSlice, type PostCategory } from "../store/family-posts-slice";

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  knowledge: { label: "知识分享", color: "#00d4ff", icon: BookOpen },
  insight: { label: "洞察发现", color: "#FFD700", icon: TrendingUp },
  creative: { label: "创意设计", color: "#FF7043", icon: Lightbulb },
  growth: { label: "成长记录", color: "#00FF88", icon: Award },
};

export function FamilyShare() {
  const { members } = useFamilyMemberSlice();
  const posts = useFamilyPostsSlice((s) => s.posts);
  const toggleLike = useFamilyPostsSlice((s) => s.toggleLike);
  const toggleBookmark = useFamilyPostsSlice((s) => s.toggleBookmark);
  const addPost = useFamilyPostsSlice((s) => s.addPost);
  const [filter, setFilter] = useState<string>("all");
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState<{ author: string; category: PostCategory; title: string; content: string; tags: string }>({
    author: "meta-oracle", category: "knowledge", title: "", content: "", tags: "",
  });

  const filtered = filter === "all" ? posts : posts.filter(p => p.category === filter);

  const handlePublish = () => {
    if (!draft.title.trim() || !draft.content.trim()) { return; }
    addPost({
      author: draft.author,
      category: draft.category,
      title: draft.title.trim(),
      content: draft.content.trim(),
      time: new Date().toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      tags: draft.tags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean),
    });
    setDraft({ author: "meta-oracle", category: "knowledge", title: "", content: "", tags: "" });
    setShowComposer(false);
  };

  return (
    <div className="min-h-full pb-8">
      <FamilyPageHeader
        icon={Share2}
        iconColor="#FF69B4"
        title="分享空间"
        subtitle="家人们的知识结晶 · 创意火花 · 成长足迹"
        actions={
          <button
            onClick={() => setShowComposer(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(0,180,255,0.1)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,180,255,0.15)] transition-colors"
            style={{ fontSize: "0.78rem" }}
          >
            <PlusCircle className="w-4 h-4" /> 发布分享
          </button>
        }
      />

      {/* 发布编辑器（真实写入 family-posts-slice） */}
      {showComposer && (
        <div className="max-w-4xl mx-auto px-4 md:px-8 mt-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>发布分享</span>
              <button onClick={() => setShowComposer(false)} className="text-[rgba(224,240,255,0.3)] hover:text-[rgba(224,240,255,0.6)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <select
                value={draft.author}
                onChange={e => setDraft(d => ({ ...d, author: e.target.value }))}
                className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(224,240,255,0.7)] outline-none"
                style={{ fontSize: "0.72rem" }}
              >
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select
                value={draft.category}
                onChange={e => setDraft(d => ({ ...d, category: e.target.value as PostCategory }))}
                className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(224,240,255,0.7)] outline-none"
                style={{ fontSize: "0.72rem" }}
              >
                {Object.entries(CATEGORY_MAP).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
              </select>
              <input
                value={draft.tags}
                onChange={e => setDraft(d => ({ ...d, tags: e.target.value }))}
                placeholder="标签（空格分隔，可选）"
                className="flex-1 px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(224,240,255,0.7)] outline-none placeholder-[rgba(224,240,255,0.2)]"
                style={{ fontSize: "0.72rem" }}
              />
            </div>
            <input
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="标题"
              className="w-full px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(224,240,255,0.8)] outline-none placeholder-[rgba(224,240,255,0.2)] mb-2"
              style={{ fontSize: "0.78rem" }}
            />
            <textarea
              value={draft.content}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
              placeholder="分享内容..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(224,240,255,0.8)] outline-none placeholder-[rgba(224,240,255,0.2)] resize-none"
              style={{ fontSize: "0.78rem" }}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handlePublish}
                disabled={!draft.title.trim() || !draft.content.trim()}
                className="px-4 py-1.5 rounded-lg bg-[rgba(0,180,255,0.15)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] disabled:opacity-30 transition-all"
                style={{ fontSize: "0.72rem" }}
              >
                发布
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 筛选 */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filter === "all" ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]" : "bg-[rgba(0,40,80,0.2)] text-[rgba(224,240,255,0.4)] border border-[rgba(0,180,255,0.06)]"}`}
            style={{ fontSize: "0.72rem" }}
          >
            全部
          </button>
          {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              style={{
                fontSize: "0.72rem",
                background: filter === key ? `${cat.color}12` : "rgba(0,40,80,0.2)",
                border: `1px solid ${filter === key ? `${cat.color}30` : "rgba(0,180,255,0.06)"}`,
                color: filter === key ? cat.color : "rgba(224,240,255,0.4)",
              }}
            >
              <cat.icon className="w-3 h-3" /> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 帖子列表 */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 mt-6 space-y-5">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Share2 className="w-8 h-8 mx-auto mb-3 text-[rgba(0,212,255,0.2)]" />
            <p className="text-[rgba(224,240,255,0.35)]" style={{ fontSize: "0.8rem" }}>
              暂无分享内容
            </p>
            <p className="text-[rgba(224,240,255,0.2)] mt-1" style={{ fontSize: "0.65rem" }}>
              点击右上角「发布分享」，写下家人间的第一条真实分享
            </p>
          </div>
        )}
        {filtered.map((post, i) => {
          const member = members.find(m => m.id === post.author);
          const cat = CATEGORY_MAP[post.category];
          const Icon = member?.icon || Smile;
          return (
            <FadeIn key={post.id} delay={i * 0.06}>
              <GlassCard className="p-5 hover:border-[rgba(0,212,255,0.2)] transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${member?.color || "#00d4ff"}12`, border: `1px solid ${member?.color || "#00d4ff"}30` }}>
                      <Icon className="w-4 h-4" style={{ color: member?.color || "#00d4ff" }} />
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: member?.color || "#e0f0ff" }}>{member?.name || "Family"}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-[rgba(224,240,255,0.2)]" />
                        <span className="text-[rgba(224,240,255,0.25)]" style={{ fontSize: "0.6rem" }}>{post.time}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md flex items-center gap-1" style={{ fontSize: "0.6rem", background: `${cat.color}10`, border: `1px solid ${cat.color}20`, color: cat.color }}>
                    <cat.icon className="w-3 h-3" /> {cat.label}
                  </span>
                </div>

                <h3 className="text-[#e0f0ff] mb-2" style={{ fontSize: "0.95rem" }}>{post.title}</h3>
                <p className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.78rem", lineHeight: 1.8 }}>
                  {post.content}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {post.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-[rgba(0,40,80,0.3)] text-[rgba(0,212,255,0.5)] border border-[rgba(0,180,255,0.08)]" style={{ fontSize: "0.6rem" }}>
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-5 mt-4 pt-3 border-t border-[rgba(0,180,255,0.04)]">
                  <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5 transition-colors" style={{ fontSize: "0.7rem", color: post.liked ? "#FF69B4" : "rgba(224,240,255,0.3)" }}>
                    <ThumbsUp className="w-3.5 h-3.5" /> {post.likes}
                  </button>
                  <button className="flex items-center gap-1.5 text-[rgba(224,240,255,0.3)] hover:text-[rgba(224,240,255,0.6)] transition-colors" style={{ fontSize: "0.7rem" }}>
                    <MessageSquare className="w-3.5 h-3.5" /> {post.comments}
                  </button>
                  <button onClick={() => toggleBookmark(post.id)} className="flex items-center gap-1.5 transition-colors" style={{ fontSize: "0.7rem", color: post.bookmarked ? "#FFD700" : "rgba(224,240,255,0.3)" }}>
                    <Bookmark className="w-3.5 h-3.5" /> {post.bookmarks}
                  </button>
                  <button className="flex items-center gap-1.5 text-[rgba(224,240,255,0.3)] hover:text-[rgba(224,240,255,0.6)] transition-colors ml-auto" style={{ fontSize: "0.7rem" }}>
                    <Share2 className="w-3.5 h-3.5" /> 分享
                  </button>
                </div>
              </GlassCard>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
