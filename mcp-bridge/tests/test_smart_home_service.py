import pytest

from smart_home_service import SmartHomeService


class FakeApi:
    def __init__(self):
        self.calls = []
        self.devices = [
            {
                "deviceId": "s1",
                "name": "计量插座 01",
                "type": "meterSocket",
                "online": True,
                "state": {
                    "switches": [{"switch": "on", "outlet": 0}],
                    "RMS_VoltageA": 241.8,
                    "RMS_CurrentA": 0.304,
                    "activePowerA": 15,
                    "electricalEnergy": 0.4,
                },
            },
            {"deviceId": "s2", "name": "计量插座 02", "type": "meterSocket", "online": True, "state": {"switch": "off", "activePowerA": 0}},
            {"deviceId": "e1", "name": "环境传感器", "type": "sensor", "online": True, "state": {"temperature": 2480, "humidity": 8261}},
            {"deviceId": "l1", "name": "智能彩灯 01", "type": "light", "online": True, "state": {}},
            {"deviceId": "v1", "name": "语音喇叭 01", "type": "speaker", "online": True, "state": {}},
        ]

    def list_devices(self):
        return self.devices

    def switch_device(self, device_id, on):
        self.calls.append(("switch", device_id, on))
        return {"commandStatus": "sent"}

    def control_light(self, device_id, params):
        self.calls.append(("light", device_id, params))
        return {"commandStatus": "sent"}

    def control_speaker(self, device_id, params):
        self.calls.append(("speaker", device_id, params))
        return {"commandStatus": "sent"}


def test_reports_environment_without_inventing_missing_values():
    text = SmartHomeService(FakeApi()).get_environment()
    assert "24.8" in text
    assert "82.61" in text
    assert "照度暂无数据" in text


def test_reports_string_illuminance_as_a_number():
    api = FakeApi()
    api.devices[2]["state"]["Illuminance"] = "137"

    text = SmartHomeService(api).get_environment()

    assert "照度137勒克斯" in text


def test_sensor_device_status_includes_illuminance():
    api = FakeApi()
    api.devices[2]["state"]["Illuminance"] = "137"

    text = SmartHomeService(api).get_device_status("环境传感器")

    assert "照度137勒克斯" in text


def test_sensor_with_measurements_is_not_reported_offline():
    api = FakeApi()
    api.devices[2]["online"] = False
    api.devices[2]["state"]["Illuminance"] = 109

    text = SmartHomeService(api).get_device_status("环境传感器")

    assert "环境传感器在线" in text
    assert "离线" not in text


def test_reports_all_meter_socket_measurements():
    text = SmartHomeService(FakeApi()).get_device_status("计量插座 01")

    assert "当前开启" in text
    assert "电压241.8伏" in text
    assert "电流0.304安" in text
    assert "功率15瓦" in text
    assert "电量0.4度" in text


def test_meter_socket_status_requires_all_five_fields():
    text = SmartHomeService(FakeApi()).get_meter_socket_status("计量插座 01")

    assert text == (
        "请完整播报以下5项，不得省略："
        "开关状态：开启；电压：241.8伏；电流：0.304安；"
        "功率：15瓦；累计电量：0.4度。"
    )


def test_controls_all_sockets():
    api = FakeApi()
    text = SmartHomeService(api).control_socket("全部插座", "off")
    assert api.calls == [("switch", "s1", False), ("switch", "s2", False)]
    assert "2 个插座" in text


def test_controls_blue_light():
    api = FakeApi()
    SmartHomeService(api).control_light("智能彩灯 01", color="蓝色")
    assert api.calls[-1] == ("light", "l1", {"switch": True, "hue": 240, "saturation": 100})


def test_controls_light_warmth_without_color_values():
    api = FakeApi()
    SmartHomeService(api).control_light("智能彩灯 01", warmth=100)
    assert api.calls[-1] == ("light", "l1", {"switch": True, "colorTemp": 2000})


def test_sets_light_color_temperature_without_color_mode_values():
    api = FakeApi()

    text = SmartHomeService(api).set_light_color_temperature("智能彩灯 01", 3200)

    assert api.calls[-1] == ("light", "l1", {"switch": True, "colorTemp": 3200})
    assert text == "已将智能彩灯 01切换到色温模式，目标色温3200开尔文。"


def test_color_temperature_mode_defaults_to_natural_white():
    api = FakeApi()

    text = SmartHomeService(api).set_light_color_temperature("智能彩灯 01")

    assert api.calls[-1] == ("light", "l1", {"switch": True, "colorTemp": 4000})
    assert "目标色温4000开尔文" in text


def test_rejects_light_color_temperature_outside_protocol_range():
    with pytest.raises(ValueError, match="2000 到 6500"):
        SmartHomeService(FakeApi()).set_light_color_temperature("智能彩灯 01", 7000)


def test_rejects_an_unknown_power_state():
    with pytest.raises(ValueError, match="on 或 off"):
        SmartHomeService(FakeApi()).control_socket("插座1", "打开")


def test_speaks_text_with_the_tts_speaker():
    api = FakeApi()

    text = SmartHomeService(api).speak_text("语音喇叭 01", "插座功率过高")

    assert api.calls[-1] == ("speaker", "v1", {"text": "插座功率过高"})
    assert text == "已向语音喇叭 01发送文字播报指令。"


def test_plays_a_supported_warning_tone():
    api = FakeApi()

    text = SmartHomeService(api).play_warning_tone("语音喇叭 01", 3)

    assert api.calls[-1] == ("speaker", "v1", {"tone": "alert_3"})
    assert text == "已向语音喇叭 01发送警示音3。"


def test_rejects_an_unknown_warning_tone():
    with pytest.raises(ValueError, match="1 到 5"):
        SmartHomeService(FakeApi()).play_warning_tone("语音喇叭 01", 6)
