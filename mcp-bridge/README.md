# 小智 AI MCP Bridge

该 Python 程序把成宽智慧小家的查询和控制能力暴露为 MCP 工具，并通过小智 MCP WebSocket 与 AI 助手连接。

## 安全边界

- Python 不连接 EMQX，不保存 MQTT 账号密码。
- Python 只访问 `http://127.0.0.1:3001`，由 Node.js 执行真正的设备查询和控制。
- `MCP_BRIDGE_SECRET` 是 Node 与 Python 共享的内部密钥，两端必须一致。
- `MCP_ENDPOINT` 包含小智 Token，只能保存在服务器 `.env`。
- Node MCP API 必须继续绑定 `127.0.0.1`，不得通过 cpolar 暴露。

## 安装

```powershell
cd mcp-bridge
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

编辑 `.env`：

```env
MCP_ENDPOINT=wss://api.xiaozhi.me/mcp/?token=REPLACE_ON_SERVER
IOT_API_BASE_URL=http://127.0.0.1:3001
MCP_BRIDGE_SECRET=GENERATE_A_DIFFERENT_RANDOM_SECRET
```

## 验证

```powershell
.\.venv\Scripts\python.exe -m pytest -v
.\.venv\Scripts\python.exe -m py_compile mcp_pipe.py smart_home_mcp.py smart_home_service.py iot_api.py device_logic.py
```

读取 Node `.env` 中的内部密钥并检查 MCP API：

```powershell
$envMap = @{}
Get-Content ..\server\.env | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') {
    $envMap[$matches[1].Trim()] = $matches[2].Trim()
  }
}
Invoke-RestMethod http://127.0.0.1:3001/health `
  -Headers @{ 'X-MCP-Bridge-Key' = $envMap['MCP_BRIDGE_SECRET'] }
```

## 启动

先启动 Node.js 服务器，再新开 PowerShell：

```powershell
.\.venv\Scripts\python.exe mcp_pipe.py
```

成功日志应包含：

```text
Connecting to WebSocket server...
Successfully connected to WebSocket server
Starting MCP server
```

## 支持的交互

- 查询家庭设备列表和在线状态。
- 查询环境温度、湿度和照度。
- 查询计量插座开关、电压、电流、功率和电量。
- 打开或关闭计量插座。
- 打开彩灯，调整亮度、彩色和色温模式。

示例语音：

- “小智，室内温度和湿度是多少？”
- “小智，计量插座 01 的电压、电流和电量是多少？”
- “小智，打开计量插座 01。”
- “小智，把智能彩灯 01 调成暖光。”

控制工具只说明指令已交给业务服务器，不把未收到设备 ACK 的乐观状态误报为硬件已完成执行。

