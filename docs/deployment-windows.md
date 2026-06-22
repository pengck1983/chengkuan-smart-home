# Windows 部署手册

## 1. 前置条件

- Windows 10/11 24 小时运行电脑
- Node.js 20 或更高版本
- Python 3.10 或更高版本
- 已创建的 EMQX MQTT 用户
- 已保留的 cpolar HTTPS 二级域名
- 微信小程序 AppID 与 AppSecret
- 小智 MCP WebSocket 地址

## 2. 启动业务服务器

```powershell
cd server
npm.cmd install
Copy-Item .env.example .env
notepad .env
npm.cmd run check
npm.cmd start
```

访问 `http://127.0.0.1:3000/health`，确认 HTTP 与 MQTT 状态正常。

## 3. 启动 cpolar

在服务器配置 HTTP 隧道：本地端口 `3000`，二级域名填已保留名称。启动后验证：

```text
https://YOUR_RESERVED_SUBDOMAIN.vip.cpolar.cn/health
```

不要把 `127.0.0.1:3001` 暴露到公网。

## 4. 配置微信小程序

复制配置模板：

```powershell
cd miniprogram
Copy-Item config\server.example.js config\server.js
```

把 `apiBaseUrl` 改为 cpolar HTTPS 地址。登录微信公众平台，在“开发管理 -> 开发设置 -> 服务器域名”中添加同一 request 合法域名。EMQX WebSocket 域名仅在仍有直连功能时才需要保留；本公开版本的小程序通过业务 API 工作。

## 5. 启动 MCP Bridge

```powershell
cd mcp-bridge
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe mcp_pipe.py
```

启动顺序必须是：Node.js -> cpolar -> MCP Bridge。

## 6. 日常检查

1. `/health` 返回 `ok: true` 且 MQTT `connected: true`。
2. 网关在 EMQX 客户端列表中在线。
3. Node 窗口能看到注册及状态消息。
4. MCP 窗口显示 WebSocket 已连接。
5. 手机能登录、查询并控制设备。

## 7. 生产建议

- 使用任务计划程序或进程管理器自动拉起 Node、cpolar 和 MCP。
- 定期备份 `server/data`，但不要上传 GitHub。
- 定期轮换全部密钥，并限制服务器远程登录。
- 后续可将 JSON 存储迁移到 SQLite/PostgreSQL。

