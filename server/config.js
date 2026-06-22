require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

const config = {
  port: Number(process.env.PORT || 3000),
  mcpApiPort: Number(process.env.MCP_API_PORT || 3001),
  mcpBridgeSecret: process.env.MCP_BRIDGE_SECRET || "",
  mqttUrl: required("MQTT_URL"),
  mqttUsername: required("MQTT_USERNAME"),
  mqttPassword: required("MQTT_PASSWORD"),
  mqttCaFile: process.env.MQTT_CA_FILE || "",
  defaultGatewayMac: (process.env.DEFAULT_GATEWAY_MAC || "").toLowerCase(),
  defaultHomeName: process.env.DEFAULT_HOME_NAME || "成宽智慧小家",
  appTokenSecret: process.env.APP_TOKEN_SECRET || "dev-secret",
  wechatAppId: process.env.WECHAT_APPID || "",
  wechatAppSecret: process.env.WECHAT_APPSECRET || "",
  powerAlarmWatts: Number(process.env.POWER_ALARM_WATTS || 600),
  powerAlarmResetWatts: Number(process.env.POWER_ALARM_RESET_WATTS || 500),
  powerAlarmCooldownMs: Number(process.env.POWER_ALARM_COOLDOWN_MS || 60000)
};

module.exports = config;
