/**
 * @file: NodeEditModal.test.tsx
 * @description: NodeEditModal 测试 — 添加/编辑表单校验、user 来源标记、删除回调
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-11-16
 * @updated: 2026-11-16
 * @status: active
 * @tags: [component],[test],[monitor],[node]
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NodeEditModal } from "../modules/monitor/NodeEditModal";
import type { NodeData } from "../types";

const ToastMock = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => ToastMock(a), info: (...a: unknown[]) => ToastMock(a) } }));

describe("NodeEditModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it("添加模式：渲染空表单 + 标题为「添加节点」", () => {
    render(<NodeEditModal initial={null} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "添加节点" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("如 yyc3-n1")).toHaveValue("");
  });

  it("编辑模式：预填现有节点字段", () => {
    const node: NodeData = {
      id: "yyc3-n1", status: "active", gpu: 60, mem: 40, temp: 55,
      model: "svl2 TP2", tasks: 3, role: "DGX · 强推理", host: "100.65.64.49", source: "user",
    };
    render(<NodeEditModal initial={node} onClose={vi.fn()} onSubmit={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "编辑节点" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("如 yyc3-n1")).toHaveValue("yyc3-n1");
    expect(screen.getByDisplayValue("DGX · 强推理")).toBeInTheDocument();
    expect(screen.getByDisplayValue("100.65.64.49")).toBeInTheDocument();
    // 编辑模式显示移除按钮
    expect(screen.getByText("移除节点")).toBeInTheDocument();
  });

  it("校验：节点 ID 为空时提交被拦截并提示", () => {
    const onSubmit = vi.fn();
    render(<NodeEditModal initial={null} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("添加节点", { selector: "button" }));
    expect(screen.getByRole("alert")).toHaveTextContent("节点 ID 必填");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("添加提交：输出 source=user 的完整节点并关闭", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<NodeEditModal initial={null} onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText("如 yyc3-n1"), { target: { value: "yyc3-n1" } });
    fireEvent.change(screen.getByPlaceholderText("如 100.65.64.49"), { target: { value: "100.65.64.49" } });
    fireEvent.change(screen.getByPlaceholderText(/DGX/), { target: { value: "DGX · 强推理 svl2 TP2 head" } });
    fireEvent.click(screen.getByText("添加节点", { selector: "button" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0] as NodeData;
    expect(submitted.id).toBe("yyc3-n1");
    expect(submitted.source).toBe("user");
    expect(submitted.host).toBe("100.65.64.49");
    expect(submitted.role).toBe("DGX · 强推理 svl2 TP2 head");
    expect(onClose).toHaveBeenCalled();
  });

  it("百分比字段越界值被钳制到 0-100", () => {
    const onSubmit = vi.fn();
    render(<NodeEditModal initial={null} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText("如 yyc3-n1"), { target: { value: "n1" } });
    const gpuInputs = screen.getAllByDisplayValue("0");
    // gpu/mem/tasks 三个数字输入默认 0（temp 默认 30）；改第一个（gpu）为 250
    fireEvent.change(gpuInputs[0], { target: { value: "250" } });
    fireEvent.click(screen.getByText("添加节点", { selector: "button" }));
    const submitted = onSubmit.mock.calls[0][0] as NodeData;
    expect(submitted.gpu).toBe(100);
  });

  it("移除回调：编辑模式点击移除触发 onRemove 并关闭", () => {
    const node: NodeData = {
      id: "yyc3-45", status: "inactive", gpu: 0, mem: 0, temp: 30, model: "", tasks: 0, source: "user",
    };
    const onRemove = vi.fn();
    const onClose = vi.fn();
    render(<NodeEditModal initial={node} onClose={onClose} onSubmit={vi.fn()} onRemove={onRemove} />);
    fireEvent.click(screen.getByText("移除节点"));
    expect(onRemove).toHaveBeenCalledWith("yyc3-45");
    expect(onClose).toHaveBeenCalled();
  });
});
