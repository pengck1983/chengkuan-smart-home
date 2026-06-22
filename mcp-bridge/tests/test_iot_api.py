import pytest

from iot_api import IoTApiClient, IoTApiError


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self, response):
        self.response = response
        self.headers = {}
        self.calls = []

    def request(self, method, url, json=None, timeout=None):
        self.calls.append((method, url, json, timeout))
        return self.response


def test_lists_devices_with_secret_header():
    session = FakeSession(FakeResponse(200, {"devices": [{"deviceId": "s1"}]}))
    client = IoTApiClient("http://127.0.0.1:3001", "secret", session=session)
    assert client.list_devices()[0]["deviceId"] == "s1"
    assert session.headers["X-MCP-Bridge-Key"] == "secret"
    assert session.calls[0] == ("GET", "http://127.0.0.1:3001/api/mcp/devices", None, 5)


def test_raises_the_server_error_message():
    session = FakeSession(FakeResponse(503, {"error": "MQTT is offline"}))
    client = IoTApiClient("http://127.0.0.1:3001", "secret", session=session)
    with pytest.raises(IoTApiError, match="MQTT is offline"):
        client.switch_device("s1", True)


def test_controls_a_speaker():
    session = FakeSession(FakeResponse(200, {"commandStatus": "sent"}))
    client = IoTApiClient("http://127.0.0.1:3001", "secret", session=session)

    client.control_speaker("voice-1", {"text": "警告"})

    assert session.calls[0] == (
        "POST",
        "http://127.0.0.1:3001/api/mcp/devices/voice-1/speaker",
        {"text": "警告"},
        5,
    )
