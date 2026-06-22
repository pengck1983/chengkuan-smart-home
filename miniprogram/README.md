# 微信小程序

原生微信小程序客户端。当前架构下，小程序只通过 HTTPS 访问 Node.js 业务服务器，**不直接连接 EMQX，也不保存 MQTT 账号密码**。

## 功能

- 微信一键登录。
- 绑定已配置网络和 MQTT 的 Zigbee 网关。
- 房间分类和设备卡片。
- 计量插座开关、详细电参数和定时任务。
- 环境传感器实时数据和24小时趋势。
- 彩灯亮度、色温和彩色模式。
- 语音喇叭文字播报和内置警示音。
- 设备重命名和用户信息页。

## 导入前配置

1. 复制服务器配置模板：

```powershell
Copy-Item config\server.example.js config\server.js
```

2. 填写公网 HTTPS API 域名：

```js
const serverConfig = {
  apiBaseUrl: "https://YOUR_PUBLIC_API_DOMAIN"
};

module.exports = serverConfig;
```

3. 在微信开发者工具中导入本目录，并把 `project.config.json` 中的 `appid` 替换为自己的小程序 AppID。

4. 在微信公众平台的“开发管理 → 开发设置 → 服务器域名”中，将同一 HTTPS 域名加入 `request` 合法域名。

## 本地检查

```powershell
npm.cmd install
npm.cmd run check
node --test test/*.test.js
```

然后在微信开发者工具中执行“编译”、“预览”和“真机调试”。

## 登录与网关绑定

1. 小程序调用 `wx.login` 获得一次性 code。
2. Node.js 服务器使用 AppID 和 AppSecret 换取 OpenID。
3. 服务器签发业务 Token，小程序用该 Token 访问后续 API。
4. 用户输入或扫码获得网关 MAC，将网关绑定到当前 OpenID。

## 发布注意

- `config/server.js` 是部署环境文件，已被 Git 忽略。
- 公开仓库使用 `touristappid`，正式上传前必须换成自己的 AppID。
- 真机和体验版必须使用 HTTPS 且通过合法域名检查。
- SourceMap 默认关闭，避免在公开包中泄露本地源码路径和调试信息。

