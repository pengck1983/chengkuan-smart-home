$ErrorActionPreference = "Continue"

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $baseDir
$logDir = Join-Path $baseDir "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$patterns = @(
    (Join-Path $projectRoot "server"),
    (Join-Path $projectRoot "mcp-bridge"),
    "mcp_pipe.py"
)

Get-CimInstance Win32_Process |
    Where-Object {
        $cmd = $_.CommandLine
        $cmd -and ($patterns | Where-Object { $cmd -like "*$_*" })
    } |
    ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force
        "$((Get-Date).ToString('s')) stopped pid=$($_.ProcessId) $($_.Name)" |
            Add-Content -LiteralPath (Join-Path $logDir "startup.log") -Encoding UTF8
    }

$service = Get-Service -Name "cpolar" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Stop-Service -Name "cpolar"
    "$((Get-Date).ToString('s')) stopped cpolar service" |
        Add-Content -LiteralPath (Join-Path $logDir "startup.log") -Encoding UTF8
}
