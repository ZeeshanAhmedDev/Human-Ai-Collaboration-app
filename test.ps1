$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

$Failed = 0

function Write-Test($Message) { Write-Host "[TEST] $Message" -ForegroundColor Cyan }
function Write-Pass($Message) { Write-Host "[PASS] $Message" -ForegroundColor Green }
function Write-Fail($Message) {
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    $script:Failed += 1
}

function Test-CommandExists($Command) {
    if (Get-Command $Command -ErrorAction SilentlyContinue) {
        Write-Pass "$Command is available"
    }
    else {
        Write-Fail "$Command is missing"
    }
}

function Test-HttpEndpoint($Label, $Url, $ExpectedText = "") {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        $body = [string]$response.Content
        if ($ExpectedText -and -not $body.Contains($ExpectedText)) {
            Write-Fail "$Label responded, but did not include expected text: $ExpectedText"
            return
        }
        Write-Pass "$Label is reachable"
    }
    catch {
        Write-Fail "$Label is not reachable at $Url"
    }
}

function Test-SmallTalkWorkflow {
    try {
        $payload = @{ goal = "how are u" } | ConvertTo-Json
        $response = Invoke-RestMethod `
            -Uri "http://localhost:8000/api/execute" `
            -Method Post `
            -ContentType "application/json" `
            -Body $payload `
            -TimeoutSec 30

        if ($response.intent -eq "small_talk") {
            Write-Pass "Small-talk request is classified correctly"
        }
        else {
            Write-Fail "Small-talk request was not classified as small_talk"
        }
    }
    catch {
        Write-Fail "Small-talk API request failed"
    }
}

Write-Host "Testing Human-AI Collaboration app"
Write-Host "=================================="

Test-CommandExists "docker"

docker info *> $null
if ($LASTEXITCODE -eq 0) {
    Write-Pass "Docker is running"
}
else {
    Write-Fail "Docker is not running"
}

Write-Test "Validating Docker Compose configuration"
docker compose config --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Pass "docker-compose.yml is valid"
}
else {
    Write-Fail "docker-compose.yml is invalid"
}

Write-Test "Container status"
docker compose ps
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Could not read Docker Compose status"
}

Write-Test "Checking HTTP endpoints"
Test-HttpEndpoint "Frontend" "http://localhost:3000" "<div"
Test-HttpEndpoint "Gateway API" "http://localhost:8000/api/health" "healthy"
Test-HttpEndpoint "Orchestrator" "http://localhost:8001/health" "healthy"
Test-HttpEndpoint "Task service" "http://localhost:8002/health" "healthy"
Test-HttpEndpoint "KPI endpoint" "http://localhost:8000/api/kpis" "total_tasks"

Write-Test "Checking workflow behavior"
Test-SmallTalkWorkflow

Write-Host ""
if ($Failed -eq 0) {
    Write-Pass "All checks passed."
    Write-Host "Open the app at http://localhost:3000"
    exit 0
}

Write-Host "[FAIL] $Failed check(s) failed." -ForegroundColor Red
Write-Host "Helpful commands:"
Write-Host "  docker compose ps"
Write-Host "  docker compose logs --tail=120 gateway_service"
Write-Host "  docker compose logs --tail=120 orchestrator_service"
Write-Host "  docker compose logs --tail=120 task_service"
exit 1
