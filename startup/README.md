# 成宽智慧小家 24 小时服务器自启动脚本

本目录用于在 24 小时服务器上配置开机自启动：

1. Node.js 业务服务器：`E:\小智物联网项目\chengkuan-smart-home\server`
2. 小智 MCP：`E:\小智物联网项目\chengkuan-smart-home\mcp-bridge`
3. cpolar 固定域名隧道

## 放置位置

建议把本目录复制到 24 小时服务器：

```powershell
E:\小智物联网项目\chengkuan-smart-home\startup
```

最终至少应有这些文件：

```text
E:\小智物联网项目\chengkuan-smart-home\startup\start-chengkuan-smart-home.ps1
E:\小智物联网项目\chengkuan-smart-home\startup\stop-chengkuan-smart-home.ps1
E:\小智物联网项目\chengkuan-smart-home\startup\install-startup-task.ps1
```

## 第一次安装

在 24 小时服务器上，用管理员身份打开 PowerShell：

```powershell
cd E:\小智物联网项目\chengkuan-smart-home\startup
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\install-startup-task.ps1
```

安装完成后测试：

```powershell
Start-ScheduledTask -TaskName ChengkuanSmartHomeStartup
```

## 查看是否启动成功

浏览器打开：

```text
http://127.0.0.1:3000/health
https://chengkuan-home.vip.cpolar.cn/health
```

PowerShell 查看端口：

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
Get-NetTCPConnection -LocalPort 3001 -State Listen
```

## 日志位置

```text
E:\小智物联网项目\chengkuan-smart-home\startup\logs\startup.log
E:\小智物联网项目\chengkuan-smart-home\startup\logs\xiaozhi-iot-server.log
E:\小智物联网项目\chengkuan-smart-home\startup\logs\xiaozhi-iot-server.err.log
E:\小智物联网项目\chengkuan-smart-home\startup\logs\xiaozhi-iot-mcp.log
E:\小智物联网项目\chengkuan-smart-home\startup\logs\xiaozhi-iot-mcp.err.log
E:\小智物联网项目\chengkuan-smart-home\startup\logs\cpolar.log
E:\小智物联网项目\chengkuan-smart-home\startup\logs\cpolar.err.log
```

## 手动停止

```powershell
cd E:\小智物联网项目\chengkuan-smart-home\startup
.\stop-chengkuan-smart-home.ps1
```

## 注意

- 如果 cpolar 已安装为 Windows 服务，脚本会优先启动 `cpolar` 服务。
- 如果没有 cpolar 服务，脚本会尝试执行 `cpolar start-all`。
- 如果 cpolar 隧道名称不是默认配置，建议先在 cpolar 后台确认固定域名隧道已经保存到本机配置。
- 这个脚本不保存任何密码或 token。
