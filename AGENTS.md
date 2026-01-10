<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Repository Guidelines

## 项目结构与模块组织
- `nodes/`：节点实现与资源定义，主节点在 `nodes/FeishuNode/`，文件命名如 `FeishuNode.node.ts`。
- `credentials/`：认证配置与图标资源（`.credentials.ts` 与 `icon.svg`）。
- `dist/`：编译输出与打包产物，请勿手改（由 `npm run build` 生成）。
- `test/`：轻量测试/加载验证脚本（如 `moduleLoadTest.ts`）。
- 根目录：`tsconfig.json`、`eslint.config.mjs`、`gulpfile.js` 管理构建与规范。

## 构建、测试与开发命令
- `npm run build`：清理 `dist/`，编译 TypeScript，并复制图标资源。
- `npm run dev`：启动 `tsc --watch`，用于本地迭代。
- `npm run lint` / `npm run lintfix`：ESLint 检查/自动修复。
- `npm run format`：Prettier 格式化 `credentials/` 与 `nodes/`。
- `npm run prepublishOnly`：发布前执行 build + lint。

## 编码风格与命名约定
- 语言：TypeScript（ES2019），严格模式开启。
- 缩进：使用制表符（参见现有代码）。
- 命名：节点与凭据类使用 PascalCase，文件名模式如 `Xxx.node.ts`、`Xxx.credentials.ts`。
- 规范工具：ESLint 基于 `@n8n/node-cli`，Prettier 用于格式化。

## 测试指南
- 当前未配置自动化测试命令；建议通过 `npm run build` + `npm run lint` 进行基本验证。
- 新增测试脚本建议放在 `test/`，命名保持清晰（如 `moduleLoadTest.ts`）。

## 提交与合并请求规范
- 提交信息以简短、明确为主，历史中既有中文描述也有 `chore: release vX.Y.Z` 风格。
- 建议：功能/修复用直述语句，发布相关可用 `chore:` 前缀。
- PR 需包含：变更目的、影响范围、验证步骤；如改动节点行为，请注明是否破坏兼容。
- 如改动资源或编译输出，说明是否已运行 `npm run build`。

## 环境与配置提示
- 运行环境：Node.js `>= 20.15`。
- n8n 社区节点依赖在 `package.json` 的 `n8n` 字段中维护。
