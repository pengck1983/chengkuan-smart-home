import pytest

from device_logic import DeviceResolutionError, color_to_hs, resolve_device, warmth_to_kelvin


DEVICES = [
    {"deviceId": "s1", "name": "计量插座 01", "type": "meterSocket"},
    {"deviceId": "s2", "name": "计量插座 02", "type": "meterSocket"},
    {"deviceId": "l1", "name": "智能彩灯 01", "type": "light"},
]


def test_resolves_socket_aliases():
    assert resolve_device(DEVICES, "插座1", "meterSocket")["deviceId"] == "s1"
    assert resolve_device(DEVICES, "插座B", "meterSocket")["deviceId"] == "s2"


def test_rejects_ambiguous_socket_name():
    with pytest.raises(DeviceResolutionError):
        resolve_device(DEVICES, "插座", "meterSocket")


def test_maps_warmth_in_the_correct_direction():
    assert warmth_to_kelvin(0) == 6500
    assert warmth_to_kelvin(100) == 2000
    assert warmth_to_kelvin(50) == 4250


def test_maps_named_colors():
    assert color_to_hs("蓝色") == (240, 100)
    assert color_to_hs("暖白") is None
