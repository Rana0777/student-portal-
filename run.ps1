param(
    [int]$Port = 5500
)

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Test-PortOpen($port) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing -TimeoutSec 2
        return $true
    } catch { return $false }
}

function Start-ServerAndOpen($cmd, $args) {
    # Start server in a new PowerShell window so this script can continue
    Start-Process powershell -ArgumentList @('-NoExit','-Command',"cd `"$root`"; $cmd $args") | Out-Null

    # Wait until server responds
    for ($i = 0; $i -lt 20; $i++) { if (Test-PortOpen $Port) { break } Start-Sleep -Milliseconds 300 }

    $url = "http://localhost:$Port/index.html"
    Start-Process $url
    Write-Host "Opened $url"
}

if (Get-Command python) {
    Start-ServerAndOpen 'python' "-m http.server $Port"
    exit 0
}

if (Get-Command node) {
    # Use npx serve if Node is available
    Start-ServerAndOpen 'npx' "serve -l $Port"
    exit 0
}

# Fallback: open file directly if no runtime found
Write-Warning "Python/Node not found. Opening file directly (some features may be limited)."
Start-Process (Join-Path $root 'index.html')

