/**
 * @file: UnifiedModelManager.tsx
 * @description: 统一模型管理组件 — 选择→测试→测通→使用 完整闭环
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-30
 * @updated: 2026-04-30
 * @status: active
 * @tags: [component],[model],[unified]
 */

import {
  CheckCircle,
  Cpu,
  Edit2,
  Eye, EyeOff,
  HelpCircle,
  Plug,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Wifi, WifiOff,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useModelProvider } from "../hooks/useModelProvider";
import { GlassCard } from "../modules/shared/GlassCard";
import type { ConfiguredModel } from "../types";

const STATUS_CONFIG = {
  active: { color: "#00ff88", bg: "rgba(0,255,136,0.1)", icon: CheckCircle, label: "已激活" },
  error: { color: "#ff3366", bg: "rgba(255,51,102,0.1)", icon: XCircle, label: "异常" },
  unchecked: { color: "#aa55ff", bg: "rgba(170,85,255,0.1)", icon: HelpCircle, label: "未检测" },
};

interface UnifiedModelManagerProps {
  compact?: boolean;
  showHeader?: boolean;
}

export function UnifiedModelManager({ compact = false, showHeader = true }: UnifiedModelManagerProps) {
  const {
    providers,
    configuredModels,
    activeModelId,
    testingIds,
    addModel,
    updateModel,
    removeModel,
    testConnection,
    testAllConnections,
    setActiveModel,
    addProvider,
    updateProvider,
    removeProvider,
    resetProvider,
  } = useModelProvider();

  const [editModel, setEditModel] = useState<ConfiguredModel | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  // 服务商管理（主控指令：预设可删可减可编辑 + 可新增，借鉴 ZCode 模型设置）
  const [showProviderMgr, setShowProviderMgr] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [pLabel, setPLabel] = useState("");
  const [pBaseUrl, setPBaseUrl] = useState("");
  const [pModels, setPModels] = useState("");
  const [pRequiresKey, setPRequiresKey] = useState(true);
  const [pApiKey, setPApiKey] = useState("");
  const [providerKeyVisible, setProviderKeyVisible] = useState(false);
  const [providerDeleteConfirm, setProviderDeleteConfirm] = useState<string | null>(null);
  // 图一式双栏：当前选中服务商（左列表 → 右详情）
  const [selProviderId, setSelProviderId] = useState<string | null>(null);

  const selectedProvider = useMemo(
    () => providers.find(pl => pl.id === selProviderId) || null,
    [providers, selProviderId]
  );
  const providerModels = useMemo(
    () => configuredModels.filter(m => m.providerId === selProviderId),
    [configuredModels, selProviderId]
  );

  // form state
  const [fProviderId, setFProviderId] = useState<string>("");
  const [fModel, setFModel] = useState("");
  const [fApiKey, setFApiKey] = useState("");
  const [fBaseUrl, setFBaseUrl] = useState("");
  const [fProxyUrl, setFProxyUrl] = useState("");

  const providerOptions = useMemo(() =>
    providers.map(p => ({
      id: p.id,
      label: p.label,
      baseUrl: p.baseUrl,
      isLocal: p.isLocal,
      requiresApiKey: p.requiresApiKey,
    })),
    [providers]);

  const selectedProviderModels = useMemo(() => {
    if (!fProviderId) { return []; }
    return providers.find(p => p.id === fProviderId)?.models || [];
  }, [fProviderId, providers]);

  const stats = useMemo(() => ({
    total: configuredModels.length,
    active: configuredModels.filter(m => m.status === "active").length,
    error: configuredModels.filter(m => m.status === "error").length,
    unchecked: configuredModels.filter(m => m.status === "unchecked").length,
  }), [configuredModels]);

  const openAdd = () => {
    setEditModel(null);
    setIsAdding(true);
    setShowForm(true);
    setFProviderId(providerOptions[0]?.id || "");
    setFModel(""); setFApiKey(""); setFBaseUrl(""); setFProxyUrl("");
  };

  /** 从服务商详情「添加模型」进入：预选服务商并带出其 Base URL / 服务商级 Key */
  const openAddFor = (providerId: string) => {
    const p = providers.find(pl => pl.id === providerId);
    setEditModel(null);
    setIsAdding(true);
    setShowForm(true);
    setFProviderId(providerId);
    setFModel("");
    setFApiKey(p?.apiKey || "");
    setFBaseUrl(p?.baseUrl || "");
    setFProxyUrl("");
  };

  /** 系列快捷添加：已配置提示跳过；需要 Key 但服务商未存 → 打开预填表单；否则直建+激活 */
  const quickAddModel = (p: NonNullable<typeof selectedProvider>, modelName: string) => {
    if (providerModels.some(pm => pm.model === modelName)) {
      toast.info(`已配置：${modelName}`);
      return;
    }
    if (p.requiresApiKey && !p.apiKey) {
      setSelProviderId(p.id);
      openAddFor(p.id);
      setFModel(modelName);
      toast.info(`请先填写 ${p.label} 的 API Key，已预填模型 ${modelName}`);
      return;
    }
    const created = addModel(p.id as never, modelName, p.apiKey || "", p.baseUrl || undefined, undefined);
    if (created) {
      setActiveModel((created as ConfiguredModel).id);
      toast.success(`已添加并激活：${modelName}`);
    }
  };

  // ── 服务商管理 handlers ──
  const openNewProvider = () => {
    setEditingProviderId(null);
    setShowProviderMgr(true);
    setPLabel(""); setPBaseUrl(""); setPModels(""); setPRequiresKey(true); setPApiKey(""); setProviderKeyVisible(false);
  };
  const openEditProvider = (id: string) => {
    const p = providers.find(x => x.id === id);
    if (!p) { return; }
    setEditingProviderId(id);
    setShowProviderMgr(false);
    setSelProviderId(id);
    setPLabel(p.label); setPBaseUrl(p.baseUrl); setPModels(p.models.join(", ")); setPRequiresKey(p.requiresApiKey); setPApiKey(p.apiKey || "");
  };
  const saveProvider = () => {
    if (!pLabel.trim()) { toast.error("服务商名称必填"); return; }
    const models = pModels.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
    if (editingProviderId) {
      updateProvider(editingProviderId, { label: pLabel.trim(), baseUrl: pBaseUrl.trim(), models, requiresApiKey: pRequiresKey, apiKey: pApiKey.trim() || undefined });
      toast.success(`服务商已更新：${pLabel.trim()}`);
    } else {
      const created = addProvider({
        label: pLabel.trim(),
        baseUrl: pBaseUrl.trim() || "https://",
        authType: pRequiresKey ? "api-key" : "none",
        models,
        requiresApiKey: pRequiresKey,
        apiKey: pApiKey.trim() || undefined,
        isLocal: false,
      });
      setSelProviderId(created.id);
      toast.success(`服务商已新增：${pLabel.trim()}`);
    }
    setShowProviderMgr(false);
    openNewProvider();
    setShowProviderMgr(false);
  };
  const doRemoveProvider = (id: string) => {
    const p = providers.find(x => x.id === id);
    removeProvider(id);
    setProviderDeleteConfirm(null);
    if (selProviderId === id) { setSelProviderId(null); }
    toast.success(`服务商已删除：${p?.label ?? id}（关联模型配置一并清除）`);
  };

  /** 右栏内联表单跟随选中服务商（切换/重置/更新后即同步；新建模式不抢占输入） */
  useEffect(() => {
    if (selProviderId && !showProviderMgr) {
      const p = providers.find(x => x.id === selProviderId);
      if (p) { setPLabel(p.label); setPBaseUrl(p.baseUrl); setPApiKey(p.apiKey || ""); }
    }
  }, [selProviderId, providers, showProviderMgr]);

  const openEdit = (m: ConfiguredModel) => {
    setEditModel(m);
    setIsAdding(false);
    setShowForm(true);
    setFProviderId(m.providerId);
    setFModel(m.model); setFApiKey(m.apiKey); setFBaseUrl(m.baseUrl); setFProxyUrl(m.proxyUrl || "");
  };

  const closeForm = () => { setEditModel(null); setIsAdding(false); setShowForm(false); };

  const handleSave = useCallback(() => {
    if (!fProviderId) { toast.error("请选择服务商"); return; }
    if (!fModel.trim()) { toast.error("请输入模型名称"); return; }

    const provider = providers.find(p => p.id === fProviderId);
    const baseUrl = fBaseUrl.trim() || provider?.baseUrl || "";

    if (isAdding) {
      const newModel = addModel(fProviderId as any, fModel.trim(), fApiKey.trim(), baseUrl || undefined, fProxyUrl.trim() || undefined);
      if (newModel) {
        toast.success(`模型 ${fModel} 已添加`, { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" } });
        closeForm();
      }
    } else if (editModel) {
      updateModel(editModel.id, {
        model: fModel.trim(),
        apiKey: fApiKey.trim(),
        baseUrl: baseUrl || editModel.baseUrl,
        proxyUrl: fProxyUrl.trim() || undefined,
      });
      toast.success(`模型 ${fModel} 已更新`, { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" } });
      closeForm();
    }
  }, [fProviderId, fModel, fApiKey, fBaseUrl, fProxyUrl, isAdding, editModel, providers, addModel, updateModel]);

  const handleTest = useCallback(async (id: string) => {
    try {
      await testConnection(id);
      toast.success("连接测试通过", { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" } });
    } catch (e: any) {
      toast.error(`测试失败: ${e.message}`, { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(255,51,102,0.3)", color: "#e0f0ff" } });
    }
  }, [testConnection]);

  const handleTestAll = useCallback(async () => {
    if (configuredModels.length === 0) {
      toast.info("暂无模型可测试");
      return;
    }
    toast.info(`正在测试 ${configuredModels.length} 个模型...`, { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,212,255,0.3)", color: "#e0f0ff" } });
    await testAllConnections();
    const updatedStats = { active: 0, error: 0 };
    configuredModels.forEach(m => { if (m.status === "active") { updatedStats.active++; } if (m.status === "error") { updatedStats.error++; } });
    toast.success(`测试完成: ${updatedStats.active} 通过, ${updatedStats.error} 失败`, { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" } });
  }, [configuredModels, testAllConnections]);

  const handleSelect = useCallback((id: string) => {
    setActiveModel(id);
    const model = configuredModels.find(m => m.id === id);
    if (model) {
      toast.success(`已选择: ${model.model} (${model.providerLabel})`, { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" } });
    }
  }, [configuredModels, setActiveModel]);

  const handleDelete = useCallback((id: string) => {
    removeModel(id);
    if (activeModelId === id) { setActiveModel(null); }
    toast.success("模型已删除", { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" } });
    setDeleteConfirm(null);
  }, [removeModel, activeModelId, setActiveModel]);

  const toggleApiKey = (id: string) => {
    setShowApiKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4" data-testid="unified-model-manager">
      {showHeader && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-[#00d4ff]" />
            </div>
            <div>
              <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>模型管理</h2>
              <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>选择 → 测试 → 测通 → 使用</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleTestAll}
              disabled={testingIds.length > 0 || configuredModels.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.15)] transition-all disabled:opacity-40"
              style={{ fontSize: "0.78rem" }}
              title="测试所有模型连接"
            >
              {testingIds.length > 0 ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {testingIds.length > 0 ? `测试中 (${testingIds.length})` : "全部测试"}
            </button>

            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.25)] transition-all"
              style={{ fontSize: "0.78rem" }}
            >
              <Plus className="w-4 h-4" />
              添加模型
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-4"}`}>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#e0f0ff]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.total}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>总模型</p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#00ff88]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.active}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>已激活</p>
        </GlassCard>
        {!compact && (
          <GlassCard className="p-3 flex flex-col items-center">
            <span className="text-[#ff3366]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
              {stats.error}
            </span>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>异常</p>
          </GlassCard>
        )}
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#aa55ff]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.unchecked}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>未检测</p>
        </GlassCard>
      </div>

      {/* 服务商管理（图一式：左列表+右详情——预设/自定义分组，详情内直接管理模型与 Key） */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex" style={{ minHeight: "420px" }}>
          {/* 左栏：服务商列表 */}
          <div className="w-56 shrink-0 border-r border-[rgba(0,180,255,0.12)] p-3 space-y-3 overflow-y-auto" style={{ maxHeight: "560px" }}>
            <div>
              <p className="text-[rgba(0,212,255,0.4)] mb-1.5 px-1" style={{ fontSize: "0.62rem" }}>预设服务商</p>
              <div className="space-y-1">
                {providers.filter(pl => pl.isBuiltin).map(pl => (
                  <button key={pl.id} onClick={() => { setSelProviderId(pl.id); setShowProviderMgr(false); openEditProvider(pl.id); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all text-left ${
                      selProviderId === pl.id && !showProviderMgr ? "bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.3)]" : "border border-transparent hover:bg-[rgba(0,212,255,0.06)]"
                    }`}>
                    <span className="truncate text-[#e0f0ff]" style={{ fontSize: "0.75rem" }}>{pl.label}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1 ${pl.apiKey || !pl.requiresApiKey ? "bg-[#00ff88]" : "bg-[rgba(255,221,0,0.5)]"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[rgba(0,212,255,0.4)] mb-1.5 px-1" style={{ fontSize: "0.62rem" }}>自定义服务商</p>
              <div className="space-y-1">
                {providers.filter(pl => !pl.isBuiltin).map(pl => (
                  <button key={pl.id} onClick={() => { setSelProviderId(pl.id); setShowProviderMgr(false); openEditProvider(pl.id); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all text-left ${
                      selProviderId === pl.id && !showProviderMgr ? "bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.3)]" : "border border-transparent hover:bg-[rgba(0,212,255,0.06)]"
                    }`}>
                    <span className="truncate text-[#e0f0ff]" style={{ fontSize: "0.75rem" }}>{pl.label}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1 ${pl.apiKey || !pl.requiresApiKey ? "bg-[#00ff88]" : "bg-[rgba(255,221,0,0.5)]"}`} />
                  </button>
                ))}
                {providers.filter(pl => !pl.isBuiltin).length === 0 && (
                  <p className="px-2.5 py-2 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.68rem" }}>暂无——点下方按钮新增</p>
                )}
              </div>
            </div>
            <button onClick={() => { setSelProviderId(null); openNewProvider(); }}
              className="w-full flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.15)] transition-all"
              style={{ fontSize: "0.72rem" }}>
              <Plus className="w-3.5 h-3.5" /> 新增服务商
            </button>
          </div>

          {/* 右栏：详情 */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: "560px" }}>
            {/* 新建服务商表单 */}
            {showProviderMgr && !selProviderId && (
              <div className="space-y-2.5">
                <p className="text-[#00d4ff]" style={{ fontSize: "0.85rem", fontFamily: "'Orbitron', sans-serif" }}>新增服务商</p>
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>名称 *</label>
                  <input value={pLabel} onChange={e => setPLabel(e.target.value)} placeholder="如 YYC³ 网关备用线"
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.8rem" }} />
                </div>
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>Base URL</label>
                  <input value={pBaseUrl} onChange={e => setPBaseUrl(e.target.value)} placeholder="OpenAI 兼容 …/v1"
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.8rem" }} />
                </div>
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>模型系列（逗号分隔，可留空）</label>
                  <input value={pModels} onChange={e => setPModels(e.target.value)} placeholder="model-a, model-b"
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.8rem" }} />
                </div>
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>API Key（可留空后续补）</label>
                  <input value={pApiKey} onChange={e => setPApiKey(e.target.value)} type={providerKeyVisible ? "text" : "password"} placeholder="sk-... / vk-..."
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.8rem" }} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[rgba(224,240,255,0.6)] cursor-pointer" style={{ fontSize: "0.72rem" }}>
                    <input type="checkbox" checked={pRequiresKey} onChange={e => setPRequiresKey(e.target.checked)} className="accent-[#00d4ff]" />
                    需要 API Key
                  </label>
                  <button onClick={saveProvider}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[rgba(0,140,200,0.2)] border border-[rgba(0,212,255,0.4)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.3)] transition-all"
                    style={{ fontSize: "0.72rem" }}>
                    <Save className="w-3.5 h-3.5" /> 创建
                  </button>
                </div>
              </div>
            )}

            {/* 服务商详情 */}
            {selProviderId && selectedProvider && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-[#e0f0ff]" style={{ fontSize: "1rem", fontFamily: "'Orbitron', sans-serif" }}>{selectedProvider.label}</span>
                    {selectedProvider.isBuiltin && <span className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.12)] text-[rgba(0,212,255,0.55)] shrink-0" style={{ fontSize: "0.6rem" }}>内置</span>}
                    {selectedProvider.isCustom && <span className="px-1.5 py-0.5 rounded bg-[rgba(0,255,136,0.1)] text-[rgba(0,255,136,0.6)] shrink-0" style={{ fontSize: "0.6rem" }}>自定义</span>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedProvider.isBuiltin && (
                      <button onClick={() => { resetProvider(selectedProvider.id); toast.success(`已重置为预设：${selectedProvider.label}`); }}
                        className="p-1.5 rounded-md hover:bg-[rgba(0,212,255,0.1)] transition-all" title="重置为预设值">
                        <RefreshCw className="w-3.5 h-3.5 text-[rgba(0,212,255,0.45)]" />
                      </button>
                    )}
                    {providerDeleteConfirm === selectedProvider.id ? (
                      <span className="flex items-center gap-1">
                        <button onClick={() => doRemoveProvider(selectedProvider.id)}
                          className="px-2 py-1 rounded-md bg-[rgba(255,51,102,0.15)] text-[#ff3366]" style={{ fontSize: "0.65rem" }}>确认删除</button>
                        <button onClick={() => setProviderDeleteConfirm(null)}
                          className="px-2 py-1 rounded-md text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.65rem" }}>取消</button>
                      </span>
                    ) : (
                      <button onClick={() => setProviderDeleteConfirm(selectedProvider.id)}
                        className="p-1.5 rounded-md hover:bg-[rgba(255,51,102,0.1)] transition-all" title="删除服务商（关联模型一并清除）">
                        <Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.5)]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 名称 + Base URL（内联编辑，保存即时生效） */}
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>名称</label>
                  <input value={pLabel} onChange={e => setPLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.8rem" }} />
                </div>
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>Base URL</label>
                  <input value={pBaseUrl} onChange={e => setPBaseUrl(e.target.value)} placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.8rem" }} />
                </div>

                {/* API 格式（展示型：引擎按 provider id 路由） */}
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>API 格式</label>
                  <div className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.25)] border border-[rgba(0,180,255,0.1)] text-[rgba(224,240,255,0.5)]"
                    style={{ fontSize: "0.8rem" }} title="引擎按服务商自动路由：Ollama 原生 /api/chat，其余 OpenAI 兼容 /v1/chat/completions">
                    {selectedProvider.id === "ollama" ? "Ollama 原生 (/api/chat)" : "OpenAI 兼容 (/v1/chat/completions)"}
                  </div>
                </div>

                {/* API Key（服务商级，保存即时生效） */}
                {selectedProvider.requiresApiKey && (
                  <div>
                    <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>API Key</label>
                    <div className="flex items-center gap-2">
                      <input value={pApiKey} onChange={e => setPApiKey(e.target.value)} type={providerKeyVisible ? "text" : "password"} placeholder="sk-... / vk-..."
                        className="flex-1 px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                        style={{ fontSize: "0.8rem" }} />
                      <button onClick={() => setProviderKeyVisible(v => !v)} className="p-2 rounded-lg hover:bg-[rgba(0,212,255,0.08)] transition-all" title="显示/隐藏">
                        {providerKeyVisible ? <EyeOff className="w-4 h-4 text-[rgba(0,212,255,0.4)]" /> : <Eye className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />}
                      </button>
                      <button onClick={() => { updateProvider(selectedProvider.id, { apiKey: pApiKey.trim() || undefined, label: pLabel.trim() || selectedProvider.label, baseUrl: pBaseUrl.trim() || selectedProvider.baseUrl }); toast.success("服务商配置已保存"); }}
                        className="px-3 py-2 rounded-lg bg-[rgba(0,140,200,0.2)] border border-[rgba(0,212,255,0.4)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.3)] transition-all" style={{ fontSize: "0.72rem" }}>
                        保存
                      </button>
                    </div>
                  </div>
                )}

                {/* 模型列表 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.7rem" }}>
                      模型列表 <span className="text-[rgba(0,212,255,0.3)]">（已配置 {providerModels.length} 项）</span>
                    </label>
                    <button onClick={() => openAddFor(selectedProvider.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.25)] transition-all"
                      style={{ fontSize: "0.7rem" }}>
                      <Plus className="w-3.5 h-3.5" /> 添加模型
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {providerModels.map(m => (
                      <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[rgba(0,20,45,0.4)] border border-[rgba(0,180,255,0.08)]">
                        <div className="min-w-0">
                          <p className="text-[#e0f0ff] truncate" style={{ fontSize: "0.78rem", fontFamily: "'JetBrains Mono', monospace" }}>
                            {m.model}
                            {activeModelId === m.id && <span className="ml-2 px-1.5 py-0.5 rounded bg-[rgba(0,255,136,0.12)] text-[#00ff88]" style={{ fontSize: "0.6rem" }}>已激活</span>}
                          </p>
                          <p className="text-[rgba(0,212,255,0.35)] truncate" style={{ fontSize: "0.62rem" }}>
                            {m.status === "active" ? "测通" : m.status === "error" ? "异常" : "未检测"} · {m.baseUrl}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleTest(m.id)} className="p-1.5 rounded-md hover:bg-[rgba(0,212,255,0.1)] transition-all" title="测试连接">
                            {testingIds.includes(m.id) ? <RefreshCw className="w-3.5 h-3.5 text-[#00d4ff] animate-spin" /> : <Wifi className="w-3.5 h-3.5 text-[rgba(0,212,255,0.5)]" />}
                          </button>
                          <button onClick={() => openEdit(m)} className="p-1.5 rounded-md hover:bg-[rgba(0,212,255,0.1)] transition-all" title="编辑">
                            <Edit2 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.5)]" />
                          </button>
                          {deleteConfirm === m.id ? (
                            <button onClick={() => handleDelete(m.id)} className="px-2 py-1 rounded-md bg-[rgba(255,51,102,0.15)] text-[#ff3366]" style={{ fontSize: "0.65rem" }}>确认</button>
                          ) : (
                            <button onClick={() => setDeleteConfirm(m.id)} className="p-1.5 rounded-md hover:bg-[rgba(255,51,102,0.1)] transition-all" title="删除">
                              <Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.5)]" />
                            </button>
                          )}
                          <button onClick={() => { if (activeModelId !== m.id) { handleSelect(m.id); } }}
                            className={`relative w-8 h-4 rounded-full transition-all shrink-0 ${activeModelId === m.id ? "bg-[#00ff88]" : "bg-[rgba(0,212,255,0.2)]"}`}
                            title={activeModelId === m.id ? "当前激活模型" : "设为激活模型"}>
                            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${activeModelId === m.id ? "left-4" : "left-0.5"}`} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {providerModels.length === 0 && (
                      <p className="px-3 py-3 rounded-lg bg-[rgba(0,20,45,0.3)] text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.7rem" }}>
                        暂无已配置模型——点「添加模型」，或从下方系列快捷添加
                      </p>
                    )}
                    {selectedProvider.models.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {selectedProvider.models.map(mname => (
                          <button key={mname} onClick={() => quickAddModel(selectedProvider, mname)}
                            className="px-2 py-1 rounded-md bg-[rgba(0,212,255,0.06)] border border-[rgba(0,180,255,0.15)] text-[rgba(224,240,255,0.6)] hover:border-[rgba(0,212,255,0.4)] hover:text-[#e0f0ff] transition-all"
                            style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace" }}
                            title={providerModels.some(pm => pm.model === mname) ? "已配置" : "点击快速添加"}>
                            + {mname}{providerModels.some(pm => pm.model === mname) ? " ✓" : ""}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 空态 */}
            {!selProviderId && !showProviderMgr && (
              <div className="h-full flex items-center justify-center text-[rgba(0,212,255,0.3)]" style={{ minHeight: "300px", fontSize: "0.78rem" }}>
                ← 从左侧选择服务商查看详情
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Add/Edit Form */}
      {showForm && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[#e0f0ff] flex items-center gap-2" style={{ fontSize: "0.88rem" }}>
              <Plug className="w-4 h-4 text-[#00d4ff]" />
              {isAdding ? "添加新模型" : `编辑: ${editModel?.model}`}
            </h4>
            <button onClick={closeForm} className="p-1 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all" title="关闭">
              <X className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>服务商 *</label>
              <select value={fProviderId} onChange={e => { setFProviderId(e.target.value); setFModel(""); }}
                className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none"
                style={{ fontSize: "0.8rem" }}
                title="选择服务商"
              >
                {providerOptions.map(p => (
                  <option key={p.id} value={p.id} style={{ background: "#0a1830" }}>
                    {p.label}{p.isLocal ? " (本地)" : ""}{p.requiresApiKey ? " 🔑" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>
                模型 *<span className="text-[rgba(0,212,255,0.3)] ml-1">（自动对齐服务商系列，可自定义输入）</span>
              </label>
              {/* 主控指令（落档 43 §七）：datalist 双能力——选中服务商自动对齐其模型系列，
                  同时允许自由输入任意自定义模型名（网关目录/新系列） */}
              <input
                value={fModel}
                onChange={e => setFModel(e.target.value)}
                list="umm-provider-models"
                placeholder={selectedProviderModels.length > 0 ? `选择或输入（如 ${selectedProviderModels[0]}）` : "输入模型名称"}
                className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                style={{ fontSize: "0.8rem" }}
                title="选择模型"
              />
              <datalist id="umm-provider-models">
                {selectedProviderModels.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>API Key</label>
              <input value={fApiKey} onChange={e => setFApiKey(e.target.value)} type="password" placeholder="sk-..."
                className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                style={{ fontSize: "0.8rem" }} />
            </div>
            <div>
              <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>Base URL</label>
              <input value={fBaseUrl} onChange={e => setFBaseUrl(e.target.value)} placeholder={providers.find(p => p.id === fProviderId)?.baseUrl || "https://..."}
                className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                style={{ fontSize: "0.8rem" }} />
            </div>
            <div>
              <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>代理 URL (可选)</label>
              <input value={fProxyUrl} onChange={e => setFProxyUrl(e.target.value)} placeholder="https://proxy.example.com"
                className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                style={{ fontSize: "0.8rem" }} />
            </div>
          </div>
          <div className="flex gap-2 pt-3">
            <button onClick={closeForm}
              className="px-4 py-2 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.78rem" }}>取消</button>
            <button onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[rgba(0,140,200,0.5)] border border-[rgba(0,180,255,0.3)] text-white hover:bg-[rgba(0,160,220,0.6)] transition-all flex items-center gap-1.5"
              style={{ fontSize: "0.78rem" }}>
              <Save className="w-3.5 h-3.5" />
              {isAdding ? "创建" : "保存"}
            </button>
          </div>
        </GlassCard>
      )}

      {/* Model List */}
      <div className="space-y-2.5">
        {configuredModels.length === 0 && (
          <GlassCard className="p-8 text-center">
            <Cpu className="w-10 h-10 text-[rgba(0,212,255,0.2)] mx-auto mb-3" />
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.85rem" }}>暂无模型配置</p>
            <p className="text-[rgba(0,212,255,0.2)] mt-1" style={{ fontSize: "0.72rem" }}>点击「添加模型」开始配置 AI 服务</p>
            <button onClick={openAdd}
              className="mt-4 px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all inline-flex items-center gap-1.5"
              style={{ fontSize: "0.78rem" }}>
              <Plus className="w-3.5 h-3.5" />
              添加第一个模型
            </button>
          </GlassCard>
        )}

        {configuredModels.map((model) => {
          const provider = providers.find(p => p.id === model.providerId);
          const sc = STATUS_CONFIG[model.status];
          const StatusIcon = sc.icon;
          const isActive = activeModelId === model.id;
          const isTesting = testingIds.includes(model.id);
          const showKey = showApiKeys[model.id];

          return (
            <div
              key={model.id}
              className={`relative p-3.5 rounded-xl transition-all duration-300 cursor-pointer ${isActive
                ? "bg-[rgba(0,255,136,0.05)] border-2 border-[rgba(0,255,136,0.3)] shadow-[0_0_20px_rgba(0,255,136,0.08)]"
                : "bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,180,255,0.2)]"
                }`}
              onClick={() => handleSelect(model.id)}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
              )}

              <div className="flex items-center justify-between gap-3">
                {/* Left: Model Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg shrink-0 ${isActive ? "bg-[rgba(0,255,136,0.12)]" : "bg-[rgba(0,212,255,0.08)]"}`}>
                    <Cpu className={`w-4 h-4 ${isActive ? "text-[#00ff88]" : "text-[#00d4ff]"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#e0f0ff] truncate" style={{ fontSize: "0.85rem" }}>{model.model}</span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-[rgba(0,255,136,0.1)] text-[#00ff88] shrink-0" style={{ fontSize: "0.55rem" }}>当前使用</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[rgba(0,212,255,0.3)] truncate" style={{ fontSize: "0.62rem", fontFamily: "'JetBrains Mono', monospace" }}>
                        {provider?.label || model.providerId}
                      </span>
                      <span className="text-[rgba(0,212,255,0.15)]" style={{ fontSize: "0.55rem" }}>·</span>
                      <span className="text-[rgba(0,212,255,0.2)] truncate" style={{ fontSize: "0.6rem" }}>
                        {model.baseUrl}
                      </span>
                    </div>
                    {model.apiKey && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[rgba(0,212,255,0.15)]" style={{ fontSize: "0.55rem" }}>Key:</span>
                        <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.55rem", fontFamily: "'JetBrains Mono', monospace" }}>
                          {showKey ? model.apiKey : `${model.apiKey.slice(0, 6)}${"•".repeat(12)}`}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleApiKey(model.id); }}
                          className="p-0.5 rounded hover:bg-[rgba(0,212,255,0.1)]"
                        >
                          {showKey ? <EyeOff className="w-2.5 h-2.5 text-[rgba(0,212,255,0.3)]" /> : <Eye className="w-2.5 h-2.5 text-[rgba(0,212,255,0.3)]" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Status + Actions */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Status Badge */}
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${sc.bg}`} style={{ fontSize: "0.65rem", color: sc.color }}>
                    <StatusIcon className="w-3 h-3" />
                    {sc.label}
                  </span>

                  {/* Test Button */}
                  <button
                    onClick={() => handleTest(model.id)}
                    disabled={isTesting}
                    className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all disabled:opacity-50"
                    title="测试连接"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 text-[#00d4ff] animate-spin" />
                    ) : model.status === "active" ? (
                      <Wifi className="w-3.5 h-3.5 text-[#00ff88]" />
                    ) : (
                      <WifiOff className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff]" />
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(model)}
                    className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all"
                    title="编辑"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff]" />
                  </button>

                  {/* Delete */}
                  {deleteConfirm === model.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(model.id)} className="p-1.5 rounded-lg bg-[rgba(255,51,102,0.2)] hover:bg-[rgba(255,51,102,0.3)]" title="确认删除">
                        <CheckCircle className="w-3.5 h-3.5 text-[#ff3366]" />
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)]" title="取消">
                        <X className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(model.id)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(255,51,102,0.1)] transition-all"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)] hover:text-[#ff3366]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
