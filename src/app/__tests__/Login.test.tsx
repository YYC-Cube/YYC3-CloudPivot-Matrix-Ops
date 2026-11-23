/**
 * @file: Login.test.tsx
 * @description: Login.test.tsx description
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-11-16
 * @status: active
 * @tags: [component]
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Login } from "../modules/shared/Login";
import { useUserMgmtSlice } from "../store/slices/user-mgmt-slice";

vi.mock("../modules/shared/YYC3Logo", () => ({
  YYC3Logo: () => <div data-testid="yyc3-logo">YYC3 Logo</div>,
}));

describe("Login Component", () => {
  const mockOnLoginSuccess = vi.fn();
  const mockOnGhostLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // C-2 认证用例涉及本地账号域：逐例重置（无账号 = 初始化模式）
    localStorage.clear();
    useUserMgmtSlice.setState({ users: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it("should render login form", () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByTestId("yyc3-logo")).toBeInTheDocument();
    expect(screen.getByTestId("login-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
  });

  it("should show ghost mode button when onGhostLogin is provided", () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} onGhostLogin={mockOnGhostLogin} />);

    const ghostButtons = screen.getAllByText(/GHOST MODE/i);
    expect(ghostButtons.length).toBeGreaterThan(0);
  });

  it("should not show ghost mode button when onGhostLogin is not provided", () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.queryByText(/GHOST MODE/i)).not.toBeInTheDocument();
  });

  it("should not show fake demo account hint", () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} onGhostLogin={mockOnGhostLogin} />);

    expect(screen.queryByText(/Demo 账号/i)).not.toBeInTheDocument();
  });

  it("should update email and password inputs", () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const emailInput = screen.getByTestId("login-email-input");
    const passwordInput = screen.getByTestId("login-password-input");

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it("should toggle password visibility", () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const passwordInput = screen.getByTestId("login-password-input");
    const toggleButton = screen.getByTestId("login-toggle-password");

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
  });

  // 落档 68（C-2 认证）：「无凭据点击即进入」的 Ghost 语义已关停——
  // 空凭据提交被本地认证拒止，不再触发任何登录回调
  it("空凭据提交被拒止（关 Ghost 后本地认证生效）", () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} onGhostLogin={mockOnGhostLogin} />);

    fireEvent.click(screen.getByTestId("login-submit-button"));

    expect(mockOnGhostLogin).not.toHaveBeenCalled();
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId("login-error")).toBeInTheDocument();
  });

  it("初始化模式：设置口令并提交即创建管理员并进入（onLoginSuccess）", async () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByTestId("login-email-input"), { target: { value: "admin" } });
    fireEvent.change(screen.getByTestId("login-password-input"), { target: { value: "local-test-pwd" } });
    fireEvent.change(screen.getByTestId("login-confirm-password-input"), { target: { value: "local-test-pwd" } });
    fireEvent.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1));
    // 账号已落 user-mgmt（口令哈希，不含明文）
    const users = useUserMgmtSlice.getState().users;
    expect(users).toHaveLength(1);
    expect(JSON.stringify(users)).not.toContain("local-test-pwd");
  });

  it("两次口令不一致被拒止", () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByTestId("login-password-input"), { target: { value: "abcdef" } });
    fireEvent.change(screen.getByTestId("login-confirm-password-input"), { target: { value: "ghijkl" } });
    fireEvent.click(screen.getByTestId("login-submit-button"));

    expect(screen.getByTestId("login-error")).toBeInTheDocument();
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("should call onGhostLogin when ghost mode is activated", async () => {
    render(
      <Login
        onLoginSuccess={mockOnLoginSuccess}
        onGhostLogin={mockOnGhostLogin}
      />
    );

    const ghostButtons = screen.getAllByText(/GHOST MODE/i);
    fireEvent.click(ghostButtons[0].closest("button")!);

    await waitFor(() => {
      expect(mockOnGhostLogin).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it("should prevent multiple ghost login activations", async () => {
    render(
      <Login
        onLoginSuccess={mockOnLoginSuccess}
        onGhostLogin={mockOnGhostLogin}
      />
    );

    const ghostButtons = screen.getAllByText(/GHOST MODE/i);
    const ghostButton = ghostButtons[0].closest("button")!;
    fireEvent.click(ghostButton);
    fireEvent.click(ghostButton);

    await waitFor(() => {
      expect(mockOnGhostLogin).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });
  });
});
