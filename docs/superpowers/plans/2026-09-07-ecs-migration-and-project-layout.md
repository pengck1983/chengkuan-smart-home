# 小智物联网项目归整与 ECS 迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 E 盘生产项目归整为单一 Git 仓库，并安全部署到阿里云 ECS，通过 `api.chengkuan-iot.cn` 提供 HTTPS 服务。

**Architecture:** GitHub 仓库作为代码骨架，E 盘当前运行目录提供生产 `.env` 和 `db.json`。ECS 使用 Nginx、Node.js、Python MCP 与 systemd；生产配置和数据位于代码仓库之外，并通过符号链接或服务环境参数接入。

**Tech Stack:** Ubuntu 22.04、Node.js 20、Python 3、systemd、Nginx、Certbot、EMQX Cloud、Git

**Spec:** `docs/superpowers/specs/2026-09-07-ecs-migration-and-project-layout-design.md`

## Global Constraints

- 不向 GitHub 提交 `.env`、`db.json`、SSH 私钥或证书。
- EMQX Cloud 账户和 Topic 保持不变。
- 公网只开放 22、80、443，3000/3001 仅供服务器本机使用。
- ECS 验收完成前保留本机运行目录和 cpolar 回退入口。

---

### Task 1: 建立统一本机仓库

**Files:**
- Create: `startup/`
- Create: `server/.env`（Git 忽略）
- Create: `mcp-bridge/.env`（Git 忽略）
- Create: `server/data/db.json`（Git 忽略）

- [x] 从 GitHub `main` 的 `7511ad4` 建立统一仓库。
- [x] 合并 E 盘生产 `.env` 与最新 `db.json`。
- [x] 复制并调整 Windows 启停脚本，使其使用 `server/` 和 `mcp-bridge/`。
- [x] 运行 Node.js 与 Python 测试并确认秘密文件未被 Git 跟踪。

### Task 2: 建立迁移备份

**Files:**
- Create: `E:\小智物联网项目\backups\2026-09-07\manifest.sha256`

- [x] 备份当前生产代码、两个 `.env` 和 `db.json`。
- [x] 计算 SHA-256，并限制秘密备份目录的 Windows 访问权限。
- [x] 核对数据库设备、事件和计划任务数量。

### Task 3: 初始化 ECS

**Files:**
- Create: `deployment/systemd/chengkuan-iot-server.service`
- Create: `deployment/systemd/chengkuan-iot-mcp.service`
- Create: `deployment/nginx/api.chengkuan-iot.cn.conf`

- [x] 使用 `E:\chengkuan-iot-key.pem` 登录 `ecs-user@120.76.219.143`。
- [x] 创建低权限服务账户和 `/opt/chengkuan` 目录。
- [x] 安装 Node.js 20、Python、Nginx、Git、rsync；确认服务器已有 4 GiB swap。
- [x] 上传代码、配置和数据副本并安装依赖。
- [x] 安装 systemd 服务定义，但保持业务服务 `inactive/disabled`，等待正式切换。
- [x] 验证 3000/3001 仅监听 `127.0.0.1`，并完成公网 IP 经 Nginx 到 Node.js 的临时健康检查。

### Task 4: 配置域名与 HTTPS

**Files:**
- Modify: `deployment/nginx/api.chengkuan-iot.cn.conf`

- [ ] 为 `api.chengkuan-iot.cn` 创建指向 ECS 公网 IP 的 A 记录。
- [ ] 验证 ICP 备案和域名实名状态。
- [ ] 启用 Nginx 并申请 HTTPS 证书。
- [ ] 验证公网只能访问 80/443，3000/3001 不可直接访问。

### Task 5: 验收和正式切换

- [ ] 验证健康检查、MQTT、设备查询、控制、历史数据和语音 MCP。
- [ ] 短暂停止本机服务并上传最后一次 `db.json`。
- [ ] 把微信小程序 API 地址改为 `https://api.chengkuan-iot.cn` 并完成合法域名配置。
- [ ] 观察日志和数据一致性；失败时恢复本机 cpolar 入口。
