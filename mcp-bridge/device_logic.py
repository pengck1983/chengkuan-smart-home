import re


COLORS = {
    "红": (0, 100), "红色": (0, 100),
    "橙": (30, 100), "橙色": (30, 100),
    "黄": (60, 100), "黄色": (60, 100),
    "绿": (120, 100), "绿色": (120, 100),
    "青": (180, 100), "青色": (180, 100),
    "蓝": (240, 100), "蓝色": (240, 100),
    "紫": (280, 100), "紫色": (280, 100),
    "粉": (330, 70), "粉色": (330, 70),
}


class DeviceResolutionError(ValueError):
    pass


def normalize_name(value):
    return re.sub(r"[\s_-]+", "", str(value or "")).lower()


def resolve_device(devices, requested_name, expected_type=None):
    candidates = [item for item in devices if not expected_type or item.get("type") == expected_type]
    name = normalize_name(requested_name)
    exact = [item for item in candidates if normalize_name(item.get("name")) == name]
    if len(exact) == 1:
        return exact[0]

    if expected_type == "meterSocket":
        ordered = sorted(candidates, key=lambda item: item.get("name", ""))
        aliases = {"1": 0, "01": 0, "a": 0, "2": 1, "02": 1, "b": 1}
        for suffix, index in aliases.items():
            if name in {"插座" + suffix, "计量插座" + suffix} and index < len(ordered):
                return ordered[index]

    partial = [item for item in candidates if name and name in normalize_name(item.get("name"))]
    if len(partial) == 1:
        return partial[0]
    names = "、".join(item.get("name", item.get("deviceId", "")) for item in candidates)
    raise DeviceResolutionError("无法唯一确定设备，可选设备：" + (names or "无"))


def warmth_to_kelvin(warmth):
    value = max(0, min(100, int(round(float(warmth)))))
    return int(round(6500 - value * 45))


def color_to_hs(color):
    return COLORS.get(normalize_name(color))
