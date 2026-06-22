import os
import sys

from dotenv import load_dotenv
from fastmcp import FastMCP

from iot_api import IoTApiClient
from smart_home_service import SmartHomeService


if sys.platform == "win32":
    sys.stderr.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()
api = IoTApiClient(os.environ["IOT_API_BASE_URL"], os.environ["MCP_BRIDGE_SECRET"])
service = SmartHomeService(api)
mcp = FastMCP("ChengkuanSmartHome")


@mcp.tool()
def get_home_status() -> str:
    """查询家中设备的在线、开关和主要数据状态。"""
    return service.get_home_status()


@mcp.tool()
def get_environment() -> str:
    """查询室内温度、湿度和照度。"""
    return service.get_environment()


@mcp.tool()
def get_device_status(device_name: str) -> str:
    """按名称查询一个设备的当前状态。"""
    return service.get_device_status(device_name)


@mcp.tool()
def get_meter_socket_status(device_name: str) -> str:
    """查询指定计量插座的完整实时数据。必须完整播报开关状态、电压、电流、功率和累计电量五项，不得省略。"""
    return service.get_meter_socket_status(device_name)


@mcp.tool()
def control_socket(device_name: str, power_state: str) -> str:
    """打开或关闭指定插座或全部插座，power_state 只能是 on 或 off。"""
    return service.control_socket(device_name, power_state)


@mcp.tool()
def control_light(
    device_name: str,
    power_state: str | None = None,
    brightness: int | None = None,
    color: str | None = None,
    warmth: int | None = None,
) -> str:
    """控制彩灯开关、亮度或彩色模式。需要暖白、自然白、冷白或具体色温时，请使用 set_light_color_temperature。"""
    return service.control_light(device_name, power_state, brightness, color, warmth)


@mcp.tool()
def set_light_color_temperature(device_name: str, color_temperature: int = 4000) -> str:
    """将彩灯切换到色温模式。只说“切换到色温模式”时使用默认自然白 4000 开尔文；暖白约 2700，冷白约 6000，范围为 2000 到 6500。"""
    return service.set_light_color_temperature(device_name, color_temperature)


@mcp.tool()
def speak_text(device_name: str, text: str) -> str:
    """让 UIID 1400 语音喇叭播报一段文字。适用于提醒、通知和告警，不用于播放在线音乐。"""
    return service.speak_text(device_name, text)


@mcp.tool()
def play_warning_tone(device_name: str, tone_number: int = 1) -> str:
    """让 UIID 1400 语音喇叭播放内置警示音，tone_number 可选 1 到 5。"""
    return service.play_warning_tone(device_name, tone_number)


if __name__ == "__main__":
    mcp.run(transport="stdio")
