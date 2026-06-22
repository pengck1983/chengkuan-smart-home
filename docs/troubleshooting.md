# 故障排查

## 小程序提示 `url not in domain list`

确认 `config/server.js` 与微信公众平台 request 合法域名完全一致，必须是 HTTPS 域名且不能带路径。保存域名后重新编译上传体验版。

## 微信登录提示未配置

检查 Node `.env` 中 `WECHAT_APPID`、`WECHAT_APPSECRET` 是否存在且无多余引号，保存后彻底停止旧 Node 进程并重启。

## 端口 3000 被占用

```powershell
$p = (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess
Get-CimInstance Win32_Process -Filter "ProcessId=$p" | Select ProcessId,Name,CommandLine
Stop-Process -Id $p
```

## MQTT 已连接但网关绿灯不亮

优先检查 Node 是否回复网关 `register_rsp`，以及应答中的 `sequence` 是否与请求一致。MQTT 连接成功不等于网关业务注册成功。

## 小程序有数据，小智读不到

依次检查：Node 内部 API、`MCP_BRIDGE_SECRET` 两端一致、Python 格式化函数是否接受字符串数值、MCP WebSocket 是否在线。先直接调用内部 API，再执行 Python 本地查询，最后测试小智。

## 状态能读但控制无效

检查 `deviceId`、设备类型、控制参数名、数值范围和控制响应 Topic。不要仅根据 MQTT publish 成功判定硬件执行成功。

## cpolar 返回 404

确认固定域名隧道指向 `http://localhost:3000`，浏览器访问 `/health` 而不是根路径。若域名或隧道改变，小程序配置和微信 request 合法域名都要同步更新。

## 体验版白屏

先在开发者工具真机调试查看运行时错误；确认上传版本号确实更新、页面 WXML/WXSS 已编译、组件按需注入配置正确。清缓存只能排除缓存问题，不能替代定位实际异常。

