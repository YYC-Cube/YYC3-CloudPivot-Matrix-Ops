#!/usr/bin/env node
/**
 * YYC3 文档日志体系标头校验脚本（零依赖）
 *
 * 用法:
 *   node scripts/check-doc-headers.js [目录...]        # 校验模式（默认扫描 0307-CP-IM-开发进度）
 *   node scripts/check-doc-headers.js --registry [目录] # 生成追溯注册表条目（stdout）
 *
 * 校验规则依据《YYC3-团队通用-标头标尾》§2.1 与《YYC3-团队通用-开发标准》§1.3~§1.9：
 *  - 必填字段: file, title, description, author, version, created, updated, status, tags, category, language
 *  - file 与磁盘文件名一致（error）；title 与正文 H1 一致（warning）
 *  - description ≤ 50 字（error）；created/updated 为 YYYY-MM-DD（error）
 *  - tags 为合法 YAML 流式序列 [a, b]（error），禁止 [a],[b] 写法
 *  - version 为 vX.Y.Z（warning）；含「变更历史」章节与 <p align="center"> 标尾（warning）
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_TARGET = path.join(
  __dirname,
  "..",
  "docs",
  "03-YYC3-CP-IM-项目开发-实施阶段",
  "0307-CP-IM-开发进度",
);

const REQUIRED_FIELDS = [
  "file",
  "title",
  "description",
  "author",
  "version",
  "created",
  "updated",
  "status",
  "tags",
  "category",
  "language",
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VERSION_RE = /^v\d+\.\d+\.\d+$/;
const TAGS_OK_RE = /^\[[^\[\]]+\]$/; // [a, b, c] 流式序列

function listMarkdownFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function parseDoc(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const rel = path.relative(process.cwd(), filePath).split(path.sep).join("/");
  const base = { rel, base: path.basename(filePath), raw, frontmatter: {}, body: raw };

  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { ...base, error: "缺少 frontmatter（未找到 --- 块）" };

  const frontmatter = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) frontmatter[kv[1]] = kv[2].trim();
  }
  const body = raw.slice(m[0].length);
  return { ...base, frontmatter, body };
}

function checksumOf(raw) {
  // 《文档闭环》: 移除元数据块 → SHA256 → 前 16 位
  const stripped = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  return crypto.createHash("sha256").update(stripped, "utf8").digest("hex").slice(0, 16);
}

function validateDoc(doc) {
  const errors = [];
  const warnings = [];
  if (doc.error) {
    errors.push(doc.error);
    return { errors, warnings, checksum: checksumOf(doc.raw) };
  }
  const fm = doc.frontmatter;

  for (const f of REQUIRED_FIELDS) {
    if (!fm[f] || !String(fm[f]).length) errors.push(`缺少必填字段: ${f}`);
  }
  if (fm.file && fm.file !== doc.base) {
    errors.push(`file 字段 "${fm.file}" 与磁盘文件名 "${doc.base}" 不一致`);
  }
  if (fm.description && fm.description.length > 50) {
    errors.push(`description 超长（${fm.description.length} > 50 字）`);
  }
  if (fm.tags && !TAGS_OK_RE.test(fm.tags)) {
    errors.push(`tags 非法 YAML 流式序列: "${fm.tags}"（应为 [a, b, c]，禁止 [a],[b],[c]）`);
  }
  for (const f of ["created", "updated"]) {
    if (fm[f] && !DATE_RE.test(fm[f])) errors.push(`${f} 格式应为 YYYY-MM-DD: "${fm[f]}"`);
  }
  if (fm.version && !VERSION_RE.test(fm.version)) {
    warnings.push(`version 非 vX.Y.Z 形式: "${fm.version}"`);
  }
  const h1 = doc.body.match(/^#\s+(.+)$/m);
  if (h1 && fm.title && h1[1].trim() !== fm.title) {
    warnings.push(`title 与 H1 不一致: "${fm.title}" vs "${h1[1].trim()}"`);
  }
  if (!doc.body.includes("## 变更历史")) warnings.push("缺少「变更历史」章节");
  if (!doc.body.includes('<p align="center">')) warnings.push("缺少标尾 <p align=\"center\"> 页脚");
  return { errors, warnings, checksum: checksumOf(doc.raw) };
}

function main() {
  const args = process.argv.slice(2);
  const registryMode = args.includes("--registry");
  const targets = args.filter((a) => !a.startsWith("--")).map((p) => path.resolve(p));
  const dirs = targets.length ? targets : [DEFAULT_TARGET];

  const docs = dirs.flatMap((d) => {
    if (!fs.existsSync(d)) return [];
    if (fs.statSync(d).isFile() && d.endsWith(".md")) return [parseDoc(d)];
    return listMarkdownFiles(d).map(parseDoc);
  });
  if (!docs.length) {
    console.error(`未找到 Markdown 文档，扫描目录: ${dirs.join(", ")}`);
    process.exit(1);
  }

  if (registryMode) {
    // 追溯注册表条目生成（《文档闭环》追溯记录结构）
    const now = new Date();
    const localDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate(),
    ).padStart(2, "0")}`; // 本地日期，避免 UTC 偏移导致 trace_id 日期错位
    const records = docs.map((doc, i) => {
      const { errors, checksum } = validateDoc(doc);
      return {
        trace_id: `TRC-${localDate}${String(i + 1).padStart(3, "0")}`,
        document: doc.rel,
        action: "create",
        timestamp: now.toISOString(),
        version: doc.frontmatter.version || "v0.0.0",
        checksum,
        author: doc.frontmatter.author || "YYC³ Team",
        valid: errors.length === 0,
        related_docs: [],
      };
    });
    console.log(JSON.stringify(records, null, 2));
    return;
  }

  let errorCount = 0;
  let warnCount = 0;
  for (const doc of docs) {
    const { errors, warnings } = validateDoc(doc);
    for (const e of errors) {
      errorCount += 1;
      console.error(`[error]   ${doc.rel}: ${e}`);
    }
    for (const w of warnings) {
      warnCount += 1;
      console.warn(`[warning] ${doc.rel}: ${w}`);
    }
  }
  console.log(
    `\n扫描 ${docs.length} 篇文档: ${errorCount} error, ${warnCount} warning` +
      (registryMode ? "" : errorCount ? " → 门禁失败" : " → 门禁通过"),
  );
  process.exit(errorCount ? 1 : 0);
}

main();
