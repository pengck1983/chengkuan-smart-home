$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$errors = [System.Collections.Generic.List[string]]::new()

$forbiddenNames = @(
  ".env",
  "db.json",
  "server.log",
  "server.err.log",
  "project.private.config.json"
)

$forbiddenDirectories = @("node_modules", ".venv", "__pycache__", ".pytest_cache")
$forbiddenExtensions = @(".pem", ".key", ".p12", ".pfx", ".map", ".zip")

Get-ChildItem -LiteralPath $root -Force -Recurse | ForEach-Object {
  $relative = $_.FullName.Substring($root.Length).TrimStart("\")
  if ($_.PSIsContainer) {
    if ($forbiddenDirectories -contains $_.Name) {
      $errors.Add("Forbidden directory: $relative")
    }
    return
  }

  if ($forbiddenNames -contains $_.Name) {
    $errors.Add("Forbidden file: $relative")
  }
  if ($forbiddenExtensions -contains $_.Extension.ToLowerInvariant()) {
    $errors.Add("Forbidden file extension: $relative")
  }
}

$contentPatterns = [ordered]@{
  "real gateway MAC" = "2cbcbb06b7fc"
  "real speaker device ID" = "6f211bdeab38c1a4"
  "real fixed domain" = "chengkuan-home\.vip\.cpolar\.cn"
  "real EMQX host" = "uff6c914\.ala\.cn-shenzhen\.emqxsl\.cn"
  "real mini program AppID" = "wx3029d1c22b30d33e"
  "known MQTT password" = "Pck@123456"
  "embedded Xiaozhi JWT" = "token=eyJ"
  "private Windows user path" = "Users[\\/]19537"
}

$textExtensions = @(
  ".js", ".json", ".md", ".py", ".ps1", ".txt", ".wxml", ".wxss",
  ".html", ".css", ".yml", ".yaml", ".toml", ".ini", ".example"
)

Get-ChildItem -LiteralPath $root -File -Force -Recurse | Where-Object {
  $_.FullName -notmatch "[\\/]\.git[\\/]" -and
  $_.FullName -ne $PSCommandPath -and
  ($textExtensions -contains $_.Extension.ToLowerInvariant() -or $_.Name -like "*.example")
} | ForEach-Object {
  $relative = $_.FullName.Substring($root.Length).TrimStart("\")
  $content = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
  foreach ($entry in $contentPatterns.GetEnumerator()) {
    if ($content -match $entry.Value) {
      $errors.Add("$($entry.Key): $relative")
    }
  }
}

if ($errors.Count -gt 0) {
  Write-Host "Public release security check failed:" -ForegroundColor Red
  $errors | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "Public release security check passed." -ForegroundColor Green
