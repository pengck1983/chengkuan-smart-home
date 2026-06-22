# Security Policy

## Never commit credentials

The following values are secrets and must exist only in local `.env` files,
gateway configuration, a password manager, or the relevant provider console:

- EMQX `MQTT_USERNAME` and `MQTT_PASSWORD`
- WeChat Mini Program `WECHAT_APPSECRET` and code-upload private key
- `APP_TOKEN_SECRET`
- `MCP_BRIDGE_SECRET`
- the token embedded in the Xiaozhi `MCP_ENDPOINT`
- cpolar authtoken
- GitHub personal access tokens and SSH private keys
- Windows/RDP, Wi-Fi, and gateway administration passwords

`WECHAT_APPID`, public API domains, broker hostnames and documentation links
are identifiers rather than passwords, but deployments may still choose to
replace them with examples for privacy.

## Runtime data

Do not publish `data/db.json`, logs, user OpenIDs, login tokens, gateway MAC
addresses, device IDs, home names, SourceMap files, screenshots containing
credentials, or review test accounts.

## Accidental exposure

If a secret is committed or shared, deleting the file is not sufficient.
Rotate the credential at its provider, update every dependent service, and
invalidate old sessions. Report security issues privately to the repository
owner instead of opening a public issue containing sensitive details.

