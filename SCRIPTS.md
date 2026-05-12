# Platform Management Scripts

This project now has one clear automation path: run the application with Docker Compose, then use the scripts as convenient wrappers.

## Quick Start

On Windows PowerShell:

```powershell
.\start.ps1
.\test.ps1
.\stop.ps1
```

On Git Bash, WSL, Linux, or macOS:

```bash
./start.sh
./test.sh
./stop.sh
```

Open the app at:

```text
http://localhost:3000
```

## Script Overview

| Script | Platform | Purpose |
| --- | --- | --- |
| `start.ps1` | Windows PowerShell | Build, start, and health-check the Docker app |
| `stop.ps1` | Windows PowerShell | Stop containers cleanly |
| `test.ps1` | Windows PowerShell | Verify endpoints and workflow behavior |
| `start.sh` | Bash/WSL/Linux/macOS | Build, start, and health-check the Docker app |
| `stop.sh` | Bash/WSL/Linux/macOS | Stop containers cleanly |
| `test.sh` | Bash/WSL/Linux/macOS | Verify endpoints and workflow behavior |

## What Starts

`docker-compose.yml` starts:

- React frontend on `http://localhost:3000`
- Gateway service on `http://localhost:8000`
- Orchestrator service on `http://localhost:8001`
- Task service on `http://localhost:8002`
- MongoDB on `mongodb://localhost:27017` only when the `local-db` profile is enabled

The optional `docker-compose.dependencies.yml` is only for starting MongoDB and local Ollama without the app containers.

## Common Commands

Start everything and rebuild images:

```powershell
.\start.ps1
```

Start without rebuilding:

```powershell
.\start.ps1 -NoBuild
```

Follow logs:

```powershell
docker compose logs -f
```

Run health checks:

```powershell
.\test.ps1
```

Stop everything but keep MongoDB data:

```powershell
.\stop.ps1
```

Stop and delete local Docker volumes:

```powershell
.\stop.ps1 -Volumes
```

## Pro Workflow

1. Start Docker Desktop.
2. Run `.\start.ps1`.
3. Open `http://localhost:3000`.
4. Keep a second terminal open with `docker compose logs -f`.
5. After code changes, rebuild with `docker compose up -d --build`.
6. Run `.\test.ps1` before showing the project or making a demo.
7. Stop with `.\stop.ps1` when finished.

## Troubleshooting

Check container status:

```powershell
docker compose ps
```

Read logs for one service:

```powershell
docker compose logs --tail=120 gateway_service
docker compose logs --tail=120 orchestrator_service
docker compose logs --tail=120 task_service
docker compose logs --tail=120 frontend
```

Restart one service:

```powershell
docker compose restart gateway_service
```

Rebuild one service:

```powershell
docker compose up -d --build frontend
```

Reset local MongoDB data:

```powershell
.\stop.ps1 -Volumes
.\start.ps1
```

## Notes

- `MZ-feature-complete.patch` is a patch/archive file, not a startup script.
- Real secrets belong in `.env`, not in `.env.example`.
- If `.env` is missing, `start.ps1` and `start.sh` automatically enable local MongoDB.
- If `.env` contains `MONGO_URI=mongodb://mongodb:27017`, local MongoDB is enabled.
- If you use Ollama Cloud, set `OLLAMA_API_KEY` in `.env`.
- If you use local Ollama from Docker, set `OLLAMA_BASE_URL=http://host.docker.internal:11434/api/generate`.
