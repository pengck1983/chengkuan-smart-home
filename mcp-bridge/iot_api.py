import requests


class IoTApiError(RuntimeError):
    pass


class IoTApiClient:
    def __init__(self, base_url, secret, session=None):
        self.base_url = str(base_url).rstrip("/")
        self.session = session or requests.Session()
        self.session.headers.update({"X-MCP-Bridge-Key": secret})

    def _request(self, method, path, payload=None):
        try:
            response = self.session.request(method, self.base_url + path, json=payload, timeout=5)
            data = response.json()
        except (requests.RequestException, ValueError) as error:
            raise IoTApiError("无法访问智能家居服务：" + str(error)) from error
        if response.status_code < 200 or response.status_code >= 300:
            raise IoTApiError(data.get("error", "HTTP " + str(response.status_code)))
        return data

    def list_devices(self):
        return self._request("GET", "/api/mcp/devices").get("devices", [])

    def switch_device(self, device_id, on):
        return self._request("POST", f"/api/mcp/devices/{device_id}/switch", {"on": bool(on)})

    def control_light(self, device_id, params):
        return self._request("POST", f"/api/mcp/devices/{device_id}/light", params)

    def control_speaker(self, device_id, params):
        return self._request("POST", f"/api/mcp/devices/{device_id}/speaker", params)
