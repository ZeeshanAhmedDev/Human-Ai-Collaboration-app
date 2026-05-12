param(
    [switch]$NoBuild,
    [switch]$Logs,
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir
$ComposePrefix = @()
$UsingLocalDb = $false

function Write-Info($Message) { Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Ok($Message) { Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Warn($Message) { Write-Host "[WARN] $Message" -ForegroundColor Yellow }

function Invoke-Compose {
    param([string[]]$ComposeArgs)
    & docker compose @ComposeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose $($ComposeArgs -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Test-Http {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return [int]$response.StatusCode -lt 500
    }
    catch {
        return $false
    }
}

function Wait-Http {
    param(
        [string]$Name,
        [string]$Url
    )

    Write-Info "Waiting for $Name at $Url"
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        if (Test-Http -Url $Url) {
            Write-Ok "$Name is reachable."
            return
        }
        Start-Sleep -Seconds 2
    }

    docker compose ps
    docker compose logs --tail=80 $Name 2>$null
    throw "$Name did not become ready within $TimeoutSeconds seconds."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is required. Install Docker Desktop first."
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running. Start Docker Desktop, then run this script again."
}

if (-not (Test-Path ".env")) {
    Write-Warn ".env was not found. Starting the Docker local MongoDB profile."
    Write-Warn "For Ollama Cloud, create .env and set OLLAMA_API_KEY and OLLAMA_MODEL."
    $ComposePrefix = @("--profile", "local-db")
    $UsingLocalDb = $true
}
elseif (Select-String -Path ".env" -Pattern "^\s*MONGO_URI=mongodb://mongodb(:27017)?" -Quiet) {
    Write-Info ".env uses the Docker MongoDB service, enabling the local-db profile."
    $ComposePrefix = @("--profile", "local-db")
    $UsingLocalDb = $true
}

Write-Info "Validating docker-compose.yml"
Invoke-Compose ($ComposePrefix + @("config", "--quiet"))

$upArgs = @("up", "-d")
if (-not $NoBuild) {
    $upArgs += "--build"
}

Write-Info "Starting services with Docker Compose"
Invoke-Compose ($ComposePrefix + $upArgs)

Wait-Http "task_service" "http://localhost:8002/health"
Wait-Http "orchestrator_service" "http://localhost:8001/health"
Wait-Http "gateway_service" "http://localhost:8000/api/health"
Wait-Http "frontend" "http://localhost:3000"

Write-Host ""
Write-Ok "Human-AI Collaboration app is running."
Write-Host "Frontend:      http://localhost:3000"
Write-Host "Gateway API:   http://localhost:8000"
Write-Host "API docs:      http://localhost:8000/docs"
Write-Host "Orchestrator:  http://localhost:8001"
Write-Host "Task service:  http://localhost:8002"
if ($UsingLocalDb) {
    Write-Host "MongoDB:       mongodb://localhost:27017"
}
else {
    Write-Host "MongoDB:       configured from .env"
}
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  .\test.ps1                 Run health and workflow checks"
Write-Host "  docker compose logs -f     Follow logs"
Write-Host "  .\stop.ps1                 Stop the app"

if ($Logs) {
    Invoke-Compose ($ComposePrefix + @("logs", "-f", "--tail=120"))
}
