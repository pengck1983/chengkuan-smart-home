# 小智物联网项目归整与迁移与云端结构设计

## 目标

将当前 E 盘生产版本归重新归整为一个 Git 仓库，并部署到阿里云 ECS。微信小程序、未来网页控制台和后续接触网弹簧补偿监控共用同一主域名体系。

## 本机目录

正式仓库固定为 `E:\小智物联网项目\chengkuan-smart-home`，包含：

- `server/`：Node.js 业务后端。
- `mcp-bridge/`：小智 MCP 桥接服务。
- `miniprogram/`：微信小程序源码。
- `startup/`：本机回退期间使用的 Windows 启停脚本。
- `deployment/`：ECS、systemd、Nginx 和迁移说明。

生产 `.env` 和 `server/data/` 保持在上述目录内，但由 `.gitignore` 排除。原来的三个分离目录先继续运行，待统一目录及 ECS 验收后再归档。

## ECS 目录

代码部署到 `/opt/chengkuan/apps/chengkuan-smart-home`，生产配置放在 `/opt/chengkuan/config/chengkuan-smart-home`，业务数据放在 `/opt/chengkuan/data/chengkuan-smart-home`。Node.js 和 MCP 分别使用独立 systemd 服务并以低权限账户运行。

## 域名规划

- `chengkuan-iot.cn`：项目总入口。
- `api.chengkuan-iot.cn`：小程序和网页共用的小智业务 API。
- `home.chengkuan-iot.cn`：未来智慧小家网页控制台。
- `spring.chengkuan-iot.cn`：未来接触网弹簧补偿监控。

Nginx 只公开 80/443。Node.js 3000 和 MCP 内部接口 3001 不直接暴露公网。

## 迁移与回退

迁移先使用生产数据副本验证。最终切换时短暂停止本机 Node.js 和 MCP，复制最新 `db.json`，启动 ECS 服务，再切换 DNS 和小程序 API 地址。本机原目录与 cpolar 入口保留 3 至 7 天用于回退，避免新旧服务长期同时消费生产 MQTT Topic。

## 验收

`https://api.chengkuan-iot.cn/health` 返回 200，ECS 重启后服务自动启动，MQTT、设备查询、控制、历史数据、语音 MCP 和 800/750 W 告警配置均正常。Git 历史不得包含 `.env`、数据库、私钥或证书。
