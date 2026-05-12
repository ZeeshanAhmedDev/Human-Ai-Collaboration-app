param(
    [switch]$Volumes
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

function Write-Info($Message) { Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Ok($Message) { Write-Host "[OK] $Message" -ForegroundColor Green }

function Invoke-Compose {
    param([string[]]$ComposeArgs)
    & docker compose @ComposeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose $($ComposeArgs -join ' ') failed with exit code $LASTEXITCODE"
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is required. Install Docker Desktop first."
}

$downArgs = @("down", "--remove-orphans")
if ($Volumes) {
    $downArgs += "--volumes"
}

Write-Info "Stopping application containers"
Invoke-Compose $downArgs

if (Test-Path "docker-compose.dependencies.yml") {
    Write-Info "Stopping optional dependency containers if they exist"
    & docker compose -f docker-compose.dependencies.yml @downArgs *> $null
}

Write-Ok "All Docker services are stopped."
if ($Volumes) {
    Write-Host "Local Docker volumes were removed."
}
else {
    Write-Host "Local Docker volumes were preserved. Use .\stop.ps1 -Volumes to delete them."
}
