$ErrorActionPreference = "Stop"
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $baseDir
$logDir = Join-Path $baseDir "logs"
$serverDir = Join-Path $projectRoot "server"
$mcpDir = Join-Path $projectRoot "mcp-bridge"

New-Item -ItemType Directory -Force -Path $baseDir, $logDir | Out-Null

function Start-BackgroundProcess {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [string[]]$ArgumentList = @()
    )

    if (!(Test-Path -LiteralPath $WorkingDirectory)) {
        throw "$Name working directory not found: $WorkingDirectory"
    }

    $stdout = Join-Path $logDir "$Name.log"
    $stderr = Join-Path $logDir "$Name.err.log"

    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -WindowStyle Hidden `
        -PassThru

    "$((Get-Date).ToString('s')) started $Name pid=$($process.Id)" |
        Add-Content -LiteralPath (Join-Path $logDir "startup.log") -Encoding UTF8
}

function Start-Cpolar {
    $service = Get-Service -Name "cpolar" -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -ne "Running") {
            Start-Service -Name "cpolar"
        }
        "$((Get-Date).ToString('s')) cpolar service status=$((Get-Service -Name 'cpolar').Status)" |
            Add-Content -LiteralPath (Join-Path $logDir "startup.log") -Encoding UTF8
        return
    }

    $cpolar = (Get-Command "cpolar.exe" -ErrorAction SilentlyContinue)
    if (!$cpolar) {
        $candidate = "C:\Program Files\cpolar\cpolar.exe"
        if (Test-Path -LiteralPath $candidate) {
            $cpolar = [pscustomobject]@{ Source = $candidate }
        }
    }
    if (!$cpolar) {
        throw "cpolar.exe not found. Install cpolar or add it to PATH."
    }

    Start-BackgroundProcess `
        -Name "cpolar" `
        -FilePath $cpolar.Source `
        -WorkingDirectory $baseDir `
        -ArgumentList @("start-all")
}

Start-Cpolar

Start-BackgroundProcess `
    -Name "xiaozhi-iot-server" `
    -FilePath "npm.cmd" `
    -WorkingDirectory $serverDir `
    -ArgumentList @("start")

Start-BackgroundProcess `
    -Name "xiaozhi-iot-mcp" `
    -FilePath (Join-Path $mcpDir ".venv\Scripts\python.exe") `
    -WorkingDirectory $mcpDir `
    -ArgumentList @("mcp_pipe.py")

"$((Get-Date).ToString('s')) all startup commands submitted" |
    Add-Content -LiteralPath (Join-Path $logDir "startup.log") -Encoding UTF8
