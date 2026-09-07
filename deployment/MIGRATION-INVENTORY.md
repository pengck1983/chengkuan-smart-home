# 小智物联网迁移盘点

盘点日期：2026-09-07

## 代码与运行来源

- GitHub：`https://github.com/pengck1983/chengkuan-smart-home.git`
- 分支：`main`
- 归整基线：`7511ad4db29b0fabb6084f196883b687311e3f4c`
- 现有 Node.js 生产目录：`E:\小智物联网项目\xiaozhi-iot-server`
- 现有 MCP 生产目录：`E:\小智物联网项目\xiaozhi-iot-mcp`
- 现有 Windows 启动目录：`E:\小智物联网项目\chengkuan-startup`
- 统一仓库：`E:\小智物联网项目\chengkuan-smart-home`

## 服务和端口

- Node.js：`npm start`，业务端口 3000。
- MCP 内部 API：127.0.0.1:3001。
- Python MCP：`.venv\Scripts\python.exe mcp_pipe.py`。
- 现有公网入口：cpolar 的 `chengkuan-home.vip.cpolar.cn`。

## 生产数据

`server/data/db.json` 盘点时包含 1 个网关、7 个设备、500 条事件和 2 个计划任务。生产配置由 `server/.env` 和 `mcp-bridge/.env` 提供；两侧 `MCP_BRIDGE_SECRET` 已确认一致，具体值不写入文档。

## ECS 与域名

- ECS 实例 ID：`i-bp1hgw29o8lvfftr1l8p`。
- 地域与可用区：华南 1（深圳）F。
- SSH 用户：`ecs-user`。
- SSH 私钥：`E:\chengkuan-iot-key.pem`。
- ECS 公网 IPv4：`120.76.219.143`。
- 主域名：`chengkuan-iot.cn`。
- 第一阶段 API 域名：`api.chengkuan-iot.cn`。
- DNS 当前未解析到 IPv4 地址。

## ECS 部署状态

- 代码：`/opt/chengkuan/apps/chengkuan-smart-home`。
- 配置：`/opt/chengkuan/config/chengkuan-smart-home`，仅服务账户可读。
- 数据：`/opt/chengkuan/data/chengkuan-smart-home/db.json`。
- 已安装 Node.js 20、Python 3、Nginx、Git 和 rsync；服务器已有 4 GiB swap。
- Node.js 生产校验和 28 项测试通过，Python 23 项测试通过。
- Node.js 的 3000/3001 端口只监听 `127.0.0.1`。
- 公网 80 端口经 Nginx 到 Node.js 的健康检查返回 200，MQTT 连接正常。
- Node.js 和 MCP systemd 服务当前均为 `inactive/disabled`，正式切换前不与本机生产服务并行运行。

## 备份

迁移前备份位于 `E:\小智物联网项目\backups\2026-09-07`，SHA-256 清单位于该目录的 `manifest.sha256`。秘密备份目录已限制为当前 Windows 用户和 SYSTEM 可访问。
