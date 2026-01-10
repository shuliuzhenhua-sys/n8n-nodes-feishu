# Project Context

## Purpose
本项目是一个 n8n 社区节点包，用于集成飞书开放平台 API，提供飞书在知识库、云文档、多维表格、消息、日历、任务、通讯录等模块的自动化能力与节点化操作。

## Tech Stack
- TypeScript（ES2019，严格模式）
- Node.js >= 20.15
- n8n community nodes 生态（n8nNodesApiVersion: 1）
- 构建与工具链：tsc、gulp（图标复制）、rimraf
- 代码规范：ESLint（@n8n/node-cli）、Prettier

## Project Conventions

### Code Style
- 使用制表符缩进（tabs）
- 文件命名：节点/凭据类使用 PascalCase；文件名形如 `Xxx.node.ts`、`Xxx.credentials.ts`
- 仅在 `credentials/` 与 `nodes/` 上运行 Prettier
- ESLint 覆盖 `credentials/**/*.ts`、`nodes/**/*.ts`、`package.json`

### Architecture Patterns
- 节点实现位于 `nodes/FeishuNode/`（主节点 `FeishuNode.node.ts`）
- 认证配置位于 `credentials/`，含应用级与 OAuth2 凭据
- `dist/` 为编译输出与打包产物，禁止手改（由 `npm run build` 生成）

### Testing Strategy
- 当前无自动化测试；基础验证使用 `npm run build` + `npm run lint`
- 如需新增测试脚本，放在 `test/` 并保持轻量（如模块加载验证）

### Git Workflow
- 提交信息简短明确；发布相关可用 `chore: release vX.Y.Z`
- 功能/修复用直述语句；PR 说明目的、影响范围、验证步骤

## Domain Context
- 对接飞书开放平台 API（需关注权限、频率限制与错误码）
- 支持应用凭证与 OAuth2 用户授权；部分能力需将应用添加为文档协作者
- 节点包含自动分页（Return All）、批次管理与超时配置

## Important Constraints
- 运行环境要求 Node.js >= 20.15
- `dist/` 由构建生成，不得手动修改
- 保持 n8n 社区节点规范与 `n8n` 字段配置一致

## External Dependencies
- 飞书开放平台 API（open.feishu.cn）
- n8n 工作流运行时（peer dependency: `n8n-workflow`）
