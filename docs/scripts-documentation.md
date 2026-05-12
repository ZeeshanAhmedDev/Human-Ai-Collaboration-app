# Management Scripts Documentation

This guide explains how the project automation is configured and how to use it confidently during development, testing, and demos.

## Automation Strategy

The project is Docker-first. The scripts do not start random local Python or Node processes anymore. They call Docker Compose, wait for the services to become reachable, and then show the correct URLs.

This avoids the old problems where:

- `start.sh` mixed Docker containers with local virtual environments.
- `stop.sh` tried to kill local processes that might not belong to the project.
- `test.sh` expected old MongoDB and Ollama container names.
- `docker-compose.dependencies.yml` referenced an undefined volume and a missing `scripts/mongo-init.js` file.
- Documentation referred to outdated commands and corrupted output symbols.

## Files

| File | Purpose |
| --- | --- |
| `docker-compose.yml` | Main full-stack Docker setup |
| `docker-compose.dependencies.yml` | Optional MongoDB plus local Ollama only |
| `start.ps1` | Windows PowerShell startup wrapper |
| `stop.ps1` | Windows PowerShell shutdown wrapper |
| `test.ps1` | Windows PowerShell health and workflow checks |
| `start.sh` | Bash startup wrapper |
| `stop.sh` | Bash shutdown wrapper |
| `test.sh` | Bash health and workflow checks |
| `.env.example` | Safe environment template with no secrets |

## Main Services

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Gateway API | `http://localhost:8000` |
| Gateway docs | `http://localhost:8000/docs` |
| Orchestrator | `http://localhost:8001` |
| Task service | `http://localhost:8002` |
| MongoDB | `mongodb://localhost:27017` when the `local-db` profile is enabled |

## Windows PowerShell Usage

Start the whole platform:

```powershell
.\start.ps1
```

Start without rebuilding images:

```powershell
.\start.ps1 -NoBuild
```

Start and keep logs open:

```powershell
.\start.ps1 -Logs
```

Run checks:

```powershell
.\test.ps1
```

Stop containers and keep data:

```powershell
.\stop.ps1
```

Stop containers and delete local Docker volumes:

```powershell
.\stop.ps1 -Volumes
```

## Bash, WSL, Linux, or macOS Usage

Start the whole platform:

```bash
./start.sh
```

Start without rebuilding images:

```bash
./start.sh --no-build
```

Start and keep logs open:

```bash
./start.sh --logs
```

Run checks:

```bash
./test.sh
```

Stop containers and keep data:

```bash
./stop.sh
```

Stop containers and delete local Docker volumes:

```bash
./stop.sh --volumes
```

## What `start` Does

1. Checks that Docker is installed and running.
2. Enables the `local-db` profile when `.env` is missing or `MONGO_URI=mongodb://mongodb:27017`.
3. Validates `docker-compose.yml`.
4. Runs `docker compose up -d --build` by default.
5. Waits for:
   - Task service health endpoint.
   - Orchestrator health endpoint.
   - Gateway health endpoint.
   - Frontend page.
6. Prints the important URLs and next commands.

## What `test` Does

The test scripts verify:

- Docker is available and running.
- Docker Compose config is valid.
- Containers are visible through `docker compose ps`.
- Frontend is reachable.
- Gateway health endpoint is reachable.
- Orchestrator health endpoint is reachable.
- Task service health endpoint is reachable.
- KPI endpoint returns KPI data.
- The small-talk workflow classifies `how are u` as `small_talk`.

The small-talk check is useful because it verifies the thesis-critical behavior: casual messages should not trigger the Planner, Developer, Tester, and Reviewer pipeline.

## What `stop` Does

`stop` runs:

```bash
docker compose down --remove-orphans
```

By default, Docker volumes are preserved so local MongoDB data remains available. Use the volume option only when you want a clean reset.

## Environment Setup

Create your `.env` file from the example:

```powershell
Copy-Item .env.example .env
```

For Ollama Cloud, set:

```text
OLLAMA_API_KEY=your_key_here
OLLAMA_BASE_URL=https://ollama.com/api/generate
OLLAMA_MODEL=qwen3-coder:480b
```

For local Ollama running on your host machine, set:

```text
OLLAMA_BASE_URL=http://host.docker.internal:11434/api/generate
OLLAMA_MODEL=qwen3-coder:480b
```

For the Docker-managed local MongoDB, keep:

```text
MONGO_URI=mongodb://mongodb:27017
DB_NAME=ai_collab_team
```

When this MongoDB URI is present, `start.ps1` and `start.sh` enable the `local-db` compose profile automatically.

## Optional Local Ollama

If you want only MongoDB and Ollama containers without the app:

```powershell
docker compose -f docker-compose.dependencies.yml up -d
```

Pull a local model:

```powershell
docker exec ai-collaboration-ollama ollama pull qwen3-coder:480b
```

For a smaller local model:

```powershell
docker exec ai-collaboration-ollama ollama pull qwen2.5-coder:1.5b-instruct
```

Then set `.env`:

```text
OLLAMA_BASE_URL=http://ollama:11434/api/generate
OLLAMA_MODEL=qwen2.5-coder:1.5b-instruct
```

## Pro Commands

Show running containers:

```powershell
docker compose ps
```

Follow all logs:

```powershell
docker compose logs -f
```

Follow one service:

```powershell
docker compose logs -f gateway_service
```

Restart one service:

```powershell
docker compose restart orchestrator_service
```

Rebuild one service:

```powershell
docker compose up -d --build orchestrator_service
```

Open an interactive shell inside a service:

```powershell
docker compose exec gateway_service sh
```

Check the KPI endpoint:

```powershell
Invoke-RestMethod http://localhost:8000/api/kpis
```

Send a small-talk test:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8000/api/execute `
  -Method Post `
  -ContentType application/json `
  -Body '{"goal":"how are u"}'
```

## Troubleshooting

If the frontend does not open:

```powershell
docker compose logs --tail=120 frontend
docker compose restart frontend
```

If the backend stream fails:

```powershell
docker compose logs --tail=120 gateway_service
docker compose logs --tail=120 orchestrator_service
```

If KPI data fails:

```powershell
docker compose logs --tail=120 task_service
docker compose logs --tail=120 mongodb
```

If ports are busy on Windows:

```powershell
netstat -ano | findstr ":3000"
netstat -ano | findstr ":8000"
```

If you need a clean local reset:

```powershell
.\stop.ps1 -Volumes
docker compose build --no-cache
.\start.ps1
```

## Demo Checklist

Before presenting the project:

1. Start Docker Desktop.
2. Run `.\start.ps1`.
3. Run `.\test.ps1`.
4. Open `http://localhost:3000`.
5. Keep `docker compose logs -f` open in another terminal.
6. Test small talk with `how are u`.
7. Test a real task with `Create a FastAPI endpoint for user registration`.
8. Approve the plan and complete the workflow.
9. Open the KPI dashboard.

## Patch File Note

`MZ-feature-complete.patch` is not an automation script. Treat it as a saved patch or implementation snapshot. Do not run it. If you ever need to inspect it:

```powershell
git apply --stat MZ-feature-complete.patch
```

Apply it only on a clean branch and only when you intentionally want those changes:

```powershell
git apply MZ-feature-complete.patch
```
