# Node.js 业务服务器

该服务器是整个系统的业务中心：它通过 MQTT/TLS 连接 EMQX，接收 Zigbee 网关和子设备上报，向微信小程序提供 HTTPS API，并通过本机回环 API 为小智 MCP 提供受限访问。

## 主要职责

- EMQX MQTT/TLS 连接、订阅和发布。
- 网关注册、子设备添加与设备清单 ACK。
- 状态合并、设备历史、网关与用户绑定。
- 微信 `wx.login` code 换取 OpenID 和业务登录令牌。
- 计量插座、彩灯和 UIID 1400 语音喇叭控制。
- 计量插座功率超限告警：默认 600 W 报警，低于 500 W 重新布防。
- `127.0.0.1:3001` MCP 内部 API，使用 `MCP_BRIDGE_SECRET` 鉴权。

## 环境要求

- Node.js 20或更高版本。
- 可用的 EMQX MQTT/TLS 部署。
- 已配置到同一 EMQX 的 Zigbee MQTT 网关。
- 真实微信登录需要正式小程序 AppID 和 AppSecret。

## 安装与配置

```powershell
cd server
Copy-Item .env.example .env
npm.cmd install
```

编辑 `.env`，至少填写：

```env
MQTT_URL=mqtts://YOUR_EMQX_HOST:8883
MQTT_USERNAME=YOUR_MQTT_USERNAME
MQTT_PASSWORD=YOUR_MQTT_PASSWORD
DEFAULT_GATEWAY_MAC=YOUR_GATEWAY_MAC
APP_TOKEN_SECRET=GENERATE_A_LONG_RANDOM_SECRET
WECHAT_APPID=YOUR_MINIPROGRAM_APPID
WECHAT_APPSECRET=YOUR_MINIPROGRAM_APPSECRET
MCP_BRIDGE_SECRET=GENERATE_ANOTHER_RANDOM_SECRET
```

`APP_TOKEN_SECRET` 与 `MCP_BRIDGE_SECRET` 不得相同。`MCP_BRIDGE_SECRET` 必须与 `mcp-bridge/.env` 中的值一致。

## 启动与检查

```powershell
npm.cmd run check
npm.cmd start
```

启动后检查：

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
```

期望 `ok=true` 且 `mqtt.connected=true`。正常日志应包含：

```text
[server] listening on http://localhost:3000
[mcp-api] listening on http://127.0.0.1:3001
[mqtt] connected
```

## 接口边界

- `3000`：小程序业务 API，通过 HTTPS 反向代理对外暴露。
- `3001`：MCP 内部 API，只绑定 `127.0.0.1`，不得通过 cpolar 或防火墙公开。
- `data/db.json`：第一版本地数据库，只用于部署环境，已被 Git 忽略。

## 安全注意

- 不要在小程序中保存 MQTT 密码。
- 不要把 `.env`、`data/db.json`、日志或微信 AppSecret 上传到 GitHub。
- 修改 MQTT 密码后，需要同步更新网关和本服务器。
- 生产环境建议使用服务管理器、定期备份和独立数据库。

