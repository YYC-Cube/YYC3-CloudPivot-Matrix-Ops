/**
 * ipc-handlers.ts
 * =================
 * Electron 主进程 IPC 处理器
 */

import { execFile } from "child_process";
import { app, BrowserWindow, dialog, Notification as ElectronNotification, ipcMain, shell } from "electron";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { IPCChannel, type IPCResponse } from "../src/shared/ipc-types";
import { permissionManager } from "./permission-manager";

const ALLOWED_SHELL_COMMANDS = new Set([
  'open', 'xdg-open', 'start',
  'ping', 'echo', 'which', 'where',
]);

const DANGEROUS_ARG_PATTERN = /[|;&`$>\n\r]/;

/** app.getPath 合法名称白名单（批3d F-05） */
const ALLOWED_APP_PATHS = new Set([
  "home", "appData", "userData", "tmp", "temp",
  "documents", "downloads", "desktop", "logs", "crashDumps",
]);

/**
 * 路径入参守卫（批3d F-05）：必须为不含 NUL 的绝对路径字符串。
 * 返回错误消息；null 表示通过。
 */
function pathGuardError(p: unknown): string | null {
  if (typeof p !== "string" || p.length === 0) {
    return "Invalid path: non-empty string required";
  }
  if (!path.isAbsolute(p)) {
    return "Invalid path: absolute path required";
  }
  if (p.includes("\0")) {
    return "Invalid path: NUL byte not allowed";
  }
  return null;
}

/**
 * 桥接层路径权限检查（与 FILE_READ/FILE_WRITE 既有策略一致化）。
 * 注：sessionId 由主进程会话机制维护，未建立会话时按拒绝处理（fail-closed）。
 */
function hasPathAccess(event: Electron.IpcMainInvokeEvent, p: string): boolean {
  const sessionId = (event as any).sessionId;
  return permissionManager.hasPathPermission(sessionId, p);
}

/**
 * 对话框/通知 options 守卫：必须为普通对象。
 */
function optionsGuardError(o: unknown): string | null {
  if (typeof o !== "object" || o === null || Array.isArray(o)) {
    return "Invalid options: plain object required";
  }
  return null;
}

/**
 * 创建成功响应
 */
function createSuccessResponse<T>(data?: T): IPCResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

/**
 * 创建错误响应
 */
function createErrorResponse(error: string): IPCResponse {
  return {
    success: false,
    error,
    timestamp: Date.now(),
  };
}

/**
 * 注册文件系统 IPC 处理器
 */
export function registerFileSystemHandlers(): void {
  // 读取文件
  ipcMain.handle(IPCChannel.FILE_READ, async (event, filePath: string, options?: any) => {
    try {
      // 权限检查
      const sessionId = (event as any).sessionId;
      if (!permissionManager.hasPathPermission(sessionId, filePath)) {
        return createErrorResponse("Permission denied: cannot access this file");
      }

      const content = await fs.promises.readFile(filePath, options);
      return createSuccessResponse(content);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 写入文件
  ipcMain.handle(IPCChannel.FILE_WRITE, async (event, filePath: string, data: string | Buffer, options?: any) => {
    try {
      // 权限检查
      const sessionId = (event as any).sessionId;
      if (!permissionManager.hasPathPermission(sessionId, filePath)) {
        return createErrorResponse("Permission denied: cannot write to this file");
      }

      // 文件大小检查
      const fileSize = Buffer.byteLength(data);
      if (!permissionManager.isFileSizeAllowed(sessionId, fileSize)) {
        return createErrorResponse("File size exceeds limit");
      }

      await fs.promises.writeFile(filePath, data, options);
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 删除文件
  ipcMain.handle(IPCChannel.FILE_DELETE, async (event, filePath: string) => {
    try {
      const guard = pathGuardError(filePath);
      if (guard) { return createErrorResponse(guard); }
      if (!hasPathAccess(event, filePath)) {
        return createErrorResponse("Permission denied: cannot delete this file");
      }
      await fs.promises.unlink(filePath);
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 检查文件是否存在
  ipcMain.handle(IPCChannel.FILE_EXISTS, async (event, filePath: string) => {
    try {
      const guard = pathGuardError(filePath);
      if (guard) { return createErrorResponse(guard); }
      if (!hasPathAccess(event, filePath)) {
        return createErrorResponse("Permission denied: cannot inspect this file");
      }
      const exists = fs.existsSync(filePath);
      return createSuccessResponse(exists);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 列出目录内容
  ipcMain.handle(IPCChannel.FILE_LIST, async (event, dirPath: string, _options?: any) => {
    try {
      const guard = pathGuardError(dirPath);
      if (guard) { return createErrorResponse(guard); }
      if (!hasPathAccess(event, dirPath)) {
        return createErrorResponse("Permission denied: cannot list this directory");
      }
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const files = entries.map(entry => ({
        path: path.join(dirPath, entry.name),
        name: entry.name,
        size: 0,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        createdAt: 0,
        modifiedAt: 0,
        accessedAt: 0,
      }));
      return createSuccessResponse(files);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取文件信息
  ipcMain.handle(IPCChannel.FILE_STAT, async (event, filePath: string) => {
    try {
      const guard = pathGuardError(filePath);
      if (guard) { return createErrorResponse(guard); }
      if (!hasPathAccess(event, filePath)) {
        return createErrorResponse("Permission denied: cannot stat this file");
      }
      const stats = await fs.promises.stat(filePath);
      return createSuccessResponse({
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        createdAt: stats.birthtimeMs,
        modifiedAt: stats.mtimeMs,
        accessedAt: stats.atimeMs,
      });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 创建目录
  ipcMain.handle(IPCChannel.FILE_MKDIR, async (event, dirPath: string) => {
    try {
      const guard = pathGuardError(dirPath);
      if (guard) { return createErrorResponse(guard); }
      if (!hasPathAccess(event, dirPath)) {
        return createErrorResponse("Permission denied: cannot create this directory");
      }
      await fs.promises.mkdir(dirPath, { recursive: true });
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 复制文件
  ipcMain.handle(IPCChannel.FILE_COPY, async (event, source: string, destination: string) => {
    try {
      const guardSrc = pathGuardError(source);
      const guardDst = pathGuardError(destination);
      if (guardSrc) { return createErrorResponse(guardSrc); }
      if (guardDst) { return createErrorResponse(guardDst); }
      if (!hasPathAccess(event, source) || !hasPathAccess(event, destination)) {
        return createErrorResponse("Permission denied: cannot copy between these paths");
      }
      await fs.promises.copyFile(source, destination);
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 移动文件
  ipcMain.handle(IPCChannel.FILE_MOVE, async (event, source: string, destination: string) => {
    try {
      const guardSrc = pathGuardError(source);
      const guardDst = pathGuardError(destination);
      if (guardSrc) { return createErrorResponse(guardSrc); }
      if (guardDst) { return createErrorResponse(guardDst); }
      if (!hasPathAccess(event, source) || !hasPathAccess(event, destination)) {
        return createErrorResponse("Permission denied: cannot move between these paths");
      }
      await fs.promises.rename(source, destination);
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 注册系统监控 IPC 处理器
 */
export function registerSystemMonitorHandlers(): void {
  // 获取 CPU 信息
  ipcMain.handle(IPCChannel.SYSTEM_CPU, async () => {
    try {
      const cpus = os.cpus();
      const loadAverage = os.loadavg();

      return createSuccessResponse({
        model: cpus[0]?.model || "Unknown",
        speed: cpus[0]?.speed || 0,
        usage: loadAverage[0] / cpus.length,
        cores: cpus.length,
        loadAverage,
      });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取内存信息
  ipcMain.handle(IPCChannel.SYSTEM_MEMORY, async () => {
    try {
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;

      return createSuccessResponse({
        total,
        free,
        used,
        usage: (used / total) * 100,
      });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取磁盘信息
  ipcMain.handle(IPCChannel.SYSTEM_DISK, async () => {
    try {
      const homeDir = os.homedir();

      return createSuccessResponse([
        {
          filesystem: "main",
          mountpoint: homeDir,
          total: 0,
          free: 0,
          used: 0,
          usage: 0,
        },
      ]);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取网络信息
  ipcMain.handle(IPCChannel.SYSTEM_NETWORK, async () => {
    try {
      const interfaces = os.networkInterfaces();
      const networkInfo = Object.entries(interfaces).map(([name, addrs]) => ({
        interface: name,
        ip: addrs?.[0]?.address || "",
        mac: addrs?.[0]?.mac || "",
        bytesReceived: 0,
        bytesSent: 0,
      }));

      return createSuccessResponse(networkInfo);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取进程信息
  ipcMain.handle(IPCChannel.SYSTEM_PROCESSES, async () => {
    try {
      return createSuccessResponse([
        {
          pid: process.pid,
          name: "YYC3-CloudPivot-Matrix-Ops",
          cpu: 0,
          memory: process.memoryUsage().heapUsed,
          status: "running",
        },
      ]);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 注册应用控制 IPC 处理器
 */
export function registerAppControlHandlers(): void {
  // 获取应用版本
  ipcMain.handle(IPCChannel.APP_VERSION, async () => {
    try {
      const version = app.getVersion();
      return createSuccessResponse(version);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取应用路径（批3d F-05：白名单枚举，防任意 Electron 特殊路径探测）
  ipcMain.handle(IPCChannel.APP_PATH, async (_, name: string) => {
    try {
      if (typeof name !== "string" || !ALLOWED_APP_PATHS.has(name)) {
        return createErrorResponse(`App path not allowed: ${String(name)}`);
      }
      const appPath = app.getPath(name as any);
      return createSuccessResponse(appPath);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取应用配置
  ipcMain.handle(IPCChannel.APP_CONFIG, async () => {
    try {
      const config = {
        name: app.getName(),
        version: app.getVersion(),
        locale: app.getLocale(),
        isPackaged: app.isPackaged,
      };
      return createSuccessResponse(config);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 重启应用
  ipcMain.handle(IPCChannel.APP_RESTART, async () => {
    try {
      app.relaunch();
      app.exit();
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 退出应用
  ipcMain.handle(IPCChannel.APP_QUIT, async () => {
    try {
      app.quit();
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 注册对话框 IPC 处理器
 */
export function registerDialogHandlers(): void {
  // 显示打开对话框
  ipcMain.handle(IPCChannel.DIALOG_OPEN, async (_, options: any) => {
    try {
      const guard = optionsGuardError(options);
      if (guard) { return createErrorResponse(guard); }
      const result = await dialog.showOpenDialog(options);
      return createSuccessResponse(result.filePaths);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 显示保存对话框
  ipcMain.handle(IPCChannel.DIALOG_SAVE, async (_, options: any) => {
    try {
      const guard = optionsGuardError(options);
      if (guard) { return createErrorResponse(guard); }
      const result = await dialog.showSaveDialog(options);
      return createSuccessResponse(result.filePath || "");
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 显示消息对话框
  ipcMain.handle(IPCChannel.DIALOG_MESSAGE, async (_, options: any) => {
    try {
      const guard = optionsGuardError(options);
      if (guard) { return createErrorResponse(guard); }
      const result = await dialog.showMessageBox(options);
      return createSuccessResponse(result.response);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 注册 Shell IPC 处理器
 */
export function registerShellHandlers(): void {
  // 打开外部链接或本地路径（批3d F-05：仅放行 http(s) URL 与绝对路径，拒绝其他协议）
  ipcMain.handle(IPCChannel.SHELL_OPEN, async (_, target: string) => {
    try {
      if (typeof target !== "string" || target.length === 0 || target.includes("\0")) {
        return createErrorResponse("Invalid target: non-empty string without NUL required");
      }
      if (/^https?:\/\//i.test(target)) {
        await shell.openExternal(target);
        return createSuccessResponse(undefined);
      }
      if (path.isAbsolute(target)) {
        await shell.openPath(target);
        return createSuccessResponse(undefined);
      }
      return createErrorResponse("Only http(s) URLs or absolute paths are allowed");
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 执行命令 (白名单限制)
  ipcMain.handle(IPCChannel.SHELL_EXECUTE, async (_, command: string, args: string[] = []) => {
    try {
      const baseCmd = path.basename(command);
      if (!ALLOWED_SHELL_COMMANDS.has(baseCmd)) {
        return createErrorResponse(`Command not allowed: ${baseCmd}`);
      }
      for (const arg of args) {
        if (DANGEROUS_ARG_PATTERN.test(arg)) {
          return createErrorResponse('Invalid argument: contains disallowed characters');
        }
      }
      const result = await new Promise<string>((resolve, reject) => {
        execFile(command, args, { timeout: 10000 }, (err, stdout) => {
          if (err) { reject(err); } else { resolve(stdout); }
        });
      });
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 注册所有 IPC 处理器
 */
export function registerNotificationHandlers(): void {
  ipcMain.handle(IPCChannel.NOTIFICATION_SHOW, async (_, options: { title: string; body?: string; icon?: string; tag?: string; silent?: boolean; requireInteraction?: boolean }) => {
    try {
      if (!ElectronNotification.isSupported()) {
        return createErrorResponse("Notifications not supported on this system");
      }

      const notif = new ElectronNotification({
        title: options.title,
        body: options.body || "",
        icon: options.icon,
        silent: options.silent,
      });

      notif.on("click", () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.show();
          win.focus();
        }
      });

      return createSuccessResponse("sent");
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  ipcMain.handle(IPCChannel.NOTIFICATION_PERMISSION, async () => {
    return createSuccessResponse("granted");
  });

  ipcMain.handle(IPCChannel.NOTIFICATION_REQUEST, async () => {
    return createSuccessResponse("granted");
  });
}

export function registerAllIPCHandlers(): void {
  registerFileSystemHandlers();
  registerSystemMonitorHandlers();
  registerAppControlHandlers();
  registerDialogHandlers();
  registerShellHandlers();
  registerNotificationHandlers();

  console.info("[IPC] All handlers registered");
}

// 导出数据库处理器
export { registerDatabaseHandlers } from "./database-handlers";
