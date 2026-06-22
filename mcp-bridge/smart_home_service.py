from device_logic import DeviceResolutionError, color_to_hs, resolve_device, warmth_to_kelvin


def scaled(value):
    return None if value is None else float(value) / 100.0


def pick(state, *keys):
    for key in keys:
        if state.get(key) is not None:
            return state[key]
    return None


def pick_switch(state):
    value = pick(state, "switch")
    if value is not None:
        return value
    switches = state.get("switches") or []
    if switches and isinstance(switches[0], dict):
        return switches[0].get("switch")
    return None


def power_bool(value):
    normalized = str(value or "").strip().lower()
    if normalized == "on":
        return True
    if normalized == "off":
        return False
    raise ValueError("power_state 必须是 on 或 off")


def format_metric(label, value, unit=""):
    if value is None:
        return label + "暂无数据"
    try:
        text = f"{float(value):g}"
    except (TypeError, ValueError):
        text = str(value)
    return f"{label}{text}{unit}"


class SmartHomeService:
    def __init__(self, api):
        self.api = api

    def get_home_status(self):
        devices = self.api.list_devices()
        if not devices:
            return "当前没有发现设备。"
        online = sum(1 for item in devices if item.get("online", True))
        details = "；".join(self._device_summary(item) for item in devices)
        return f"共 {len(devices)} 个设备，{online} 个在线。{details}"

    def get_environment(self):
        device = resolve_device(self.api.list_devices(), "环境传感器", "sensor")
        state = device.get("state") or {}
        temperature = scaled(pick(state, "temperature", "temp"))
        humidity = scaled(pick(state, "humidity"))
        illuminance = pick(state, "Illuminance", "illuminance", "lux")
        return "，".join([
            format_metric("温度", temperature, "摄氏度"),
            format_metric("湿度", humidity, "%"),
            format_metric("照度", illuminance, "勒克斯"),
        ])

    def get_device_status(self, device_name):
        device = resolve_device(self.api.list_devices(), device_name)
        return self._device_summary(device)

    def get_meter_socket_status(self, device_name):
        device = resolve_device(self.api.list_devices(), device_name, "meterSocket")
        state = device.get("state") or {}
        switch_value = pick_switch(state)
        if switch_value in ("on", True, 1):
            switch = "开启"
        elif switch_value in ("off", False, 0):
            switch = "关闭"
        else:
            switch = "暂无数据"
        fields = [
            "开关状态：" + switch,
            format_metric("电压：", pick(state, "RMS_VoltageA", "voltageA", "voltage"), "伏"),
            format_metric("电流：", pick(state, "RMS_CurrentA", "currentA", "current"), "安"),
            format_metric("功率：", pick(state, "activePowerA", "powerA", "power"), "瓦"),
            format_metric("累计电量：", pick(state, "electricalEnergy", "energy"), "度"),
        ]
        return "请完整播报以下5项，不得省略：" + "；".join(fields) + "。"

    def control_socket(self, device_name, power_state):
        on = power_bool(power_state)
        devices = self.api.list_devices()
        normalized = str(device_name or "").strip().lower()
        if normalized in {"全部插座", "所有插座", "all"}:
            sockets = [item for item in devices if item.get("type") == "meterSocket"]
            if not sockets:
                raise DeviceResolutionError("没有找到计量插座")
            for socket in sockets:
                self.api.switch_device(socket["deviceId"], on)
            return f"已向 {len(sockets)} 个插座发送{'打开' if on else '关闭'}指令。"
        device = resolve_device(devices, device_name, "meterSocket")
        self.api.switch_device(device["deviceId"], on)
        return f"已向{device['name']}发送{'打开' if on else '关闭'}指令。"

    def control_light(self, device_name, power_state=None, brightness=None, color=None, warmth=None):
        device = resolve_device(self.api.list_devices(), device_name, "light")
        params = {}
        if power_state is not None:
            params["switch"] = power_bool(power_state)
        if brightness is not None:
            params["switch"] = True
            params["brightness"] = self._percent(brightness, "brightness")
        if color is not None:
            hs = color_to_hs(color)
            if hs is None:
                raise ValueError("暂不支持该颜色，可使用红、橙、黄、绿、青、蓝、紫或粉色")
            params.update({"switch": True, "hue": hs[0], "saturation": hs[1]})
        if warmth is not None:
            params.update({"switch": True, "colorTemp": warmth_to_kelvin(self._percent(warmth, "warmth"))})
        if not params:
            raise ValueError("请指定开关、亮度、颜色或冷暖程度")
        self.api.control_light(device["deviceId"], params)
        return f"已向{device['name']}发送灯光控制指令。"

    def set_light_color_temperature(self, device_name, color_temperature=4000):
        device = resolve_device(self.api.list_devices(), device_name, "light")
        temperature = int(round(float(color_temperature)))
        if temperature < 2000 or temperature > 6500:
            raise ValueError("color_temperature 必须在 2000 到 6500 开尔文之间")
        self.api.control_light(device["deviceId"], {
            "switch": True,
            "colorTemp": temperature,
        })
        return f"已将{device['name']}切换到色温模式，目标色温{temperature}开尔文。"

    def speak_text(self, device_name, text):
        device = resolve_device(self.api.list_devices(), device_name, "speaker")
        content = str(text or "").strip()
        if not content:
            raise ValueError("播报文字不能为空")
        self.api.control_speaker(device["deviceId"], {"text": content})
        return f"已向{device['name']}发送文字播报指令。"

    def play_warning_tone(self, device_name, tone_number=1):
        device = resolve_device(self.api.list_devices(), device_name, "speaker")
        number = int(tone_number)
        if number < 1 or number > 5:
            raise ValueError("tone_number 必须在 1 到 5 之间")
        self.api.control_speaker(device["deviceId"], {"tone": f"alert_{number}"})
        return f"已向{device['name']}发送警示音{number}。"

    @staticmethod
    def _percent(value, name):
        number = int(round(float(value)))
        if number < 0 or number > 100:
            raise ValueError(name + " 必须在 0 到 100 之间")
        return number

    @staticmethod
    def _device_summary(device):
        state = device.get("state") or {}
        online = "在线" if device.get("online", True) else "离线"
        if device.get("type") == "meterSocket":
            switch = "开启" if pick_switch(state) in ("on", True, 1) else "关闭"
            metrics = [
                format_metric("电压", pick(state, "RMS_VoltageA", "voltageA", "voltage"), "伏"),
                format_metric("电流", pick(state, "RMS_CurrentA", "currentA", "current"), "安"),
                format_metric("功率", pick(state, "activePowerA", "powerA", "power"), "瓦"),
                format_metric("电量", pick(state, "electricalEnergy", "energy"), "度"),
            ]
            return f"{device['name']}{online}，当前{switch}，" + "，".join(metrics)
        if device.get("type") == "sensor":
            has_measurements = any([
                pick(state, "temperature", "temp") is not None,
                pick(state, "humidity") is not None,
                pick(state, "Illuminance", "illuminance", "lux") is not None,
            ])
            sensor_status = "在线" if has_measurements else online
            return f"{device['name']}{sensor_status}，{SmartHomeService._environment_summary(state)}"
        if device.get("type") == "light":
            switch = "开启" if pick(state, "switch") in ("on", True, 1) else "关闭"
            brightness = pick(state, "brightness")
            suffix = "" if brightness is None else f"，亮度{brightness}%"
            return f"{device['name']}{online}，当前{switch}{suffix}"
        if device.get("type") == "speaker":
            return f"{device['name']}{online}，支持文字播报和内置警示音"
        return f"{device.get('name', '设备')}{online}"

    @staticmethod
    def _environment_summary(state):
        temperature = scaled(pick(state, "temperature", "temp"))
        humidity = scaled(pick(state, "humidity"))
        illuminance = pick(state, "Illuminance", "illuminance", "lux")
        return "，".join([
            format_metric("温度", temperature, "摄氏度"),
            format_metric("湿度", humidity, "%"),
            format_metric("照度", illuminance, "勒克斯"),
        ])
