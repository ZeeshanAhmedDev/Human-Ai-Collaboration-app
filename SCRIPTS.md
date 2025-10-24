# 🚀 Platform Management Scripts

Quick reference for the AI Collaboration Platform management scripts.

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| **start.sh** | Start entire platform | `./start.sh` |
| **stop.sh** | Stop all services | `./stop.sh` |
| **test.sh** | Test functionality | `./test.sh` |

## Quick Start

```bash
# 1. Start the platform
./start.sh

# 2. Access the application
# Frontend: http://localhost:3000
# Gateway API: http://localhost:8000

# 3. Test everything works
./test.sh

# 4. Stop when done
./stop.sh
```

## What Each Script Does

### `./start.sh` - Complete Platform Startup
- ✅ Starts MongoDB database (Docker)
- ✅ Starts Ollama AI service (Docker) 
- ✅ Downloads AI model (qwen2.5-coder:1.5b-instruct)
- ✅ Starts Gateway API (Python FastAPI)
- ✅ Starts Orchestrator service (Python FastAPI)
- ✅ Starts Task service (Python FastAPI)
- ✅ Starts React frontend (Node.js)
- ✅ Performs health checks
- ✅ Opens browser automatically

### `./stop.sh` - Clean Shutdown
- 🛑 Stops all Python backend processes
- 🛑 Stops React frontend
- 🛑 Stops Docker containers (MongoDB, Ollama)
- 🛑 Cleans up process files

### `./test.sh` - Health & Functionality Tests
- 🧪 Tests Docker services
- 🧪 Tests API health endpoints
- 🧪 Tests database connectivity
- 🧪 Tests AI service
- 🧪 Tests frontend accessibility
- 🧪 Tests complete workflow

## Platform Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    🌐 Frontend (React)                   │
│                   http://localhost:3000                  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                🚪 Gateway API (FastAPI)                 │
│                   http://localhost:8000                  │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
     ┌────────▼──────────┐       ┌───────▼────────┐
     │  🤖 Orchestrator   │       │  💾 Task       │
     │  localhost:8001    │       │  localhost:8002│
     └────────┬──────────┘       └───────┬────────┘
              │                          │
     ┌────────▼──────────┐       ┌───────▼────────┐
     │  🧠 Ollama AI      │       │  🗄️ MongoDB    │
     │  localhost:11434   │       │  localhost:27017│
     └───────────────────┘       └────────────────┘
```

## Service URLs

After running `./start.sh`, access these URLs:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main user interface |
| **Gateway API** | http://localhost:8000 | REST API gateway |
| **Orchestrator** | http://localhost:8001 | AI agent coordination |
| **Task Service** | http://localhost:8002 | Task management |
| **Ollama AI** | http://localhost:11434 | AI model server |
| **MongoDB** | mongodb://localhost:27017 | Database |

## Health Check Commands

```bash
# Check all services are healthy
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health

# Test AI service
curl http://localhost:11434/api/version

# Test goal execution
curl -X POST http://localhost:8000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"goal": "Create a hello world function"}'
```

## Prerequisites

- **Docker Desktop** with WSL2 integration enabled
- **Ports available**: 3000, 8000, 8001, 8002, 11434, 27017
- **Disk space**: ~3GB for AI model download
- **Memory**: ~4GB RAM recommended

## Troubleshooting

### Common Issues

1. **Docker not available**
   ```
   [ERROR] Docker is not available
   ```
   → Enable WSL2 integration in Docker Desktop

2. **Port conflicts**
   ```
   [ERROR] Port 8000 is already in use
   ```
   → Stop conflicting services: `lsof -i :8000`

3. **Model download fails**
   ```
   [ERROR] Failed to download Ollama model
   ```
   → Check internet connection and disk space

### Reset Everything

If something goes wrong, reset completely:

```bash
# Stop everything
./stop.sh

# Remove all containers and data
docker-compose -f docker-compose.dependencies.yml down -v

# Remove virtual environments
rm -rf */venv frontend/node_modules

# Start fresh
./start.sh
```

## Development Tips

- **Hot reload**: All services support code changes without restart
- **Logs**: Check individual service logs in respective directories
- **Debug mode**: Set `DEBUG=true` environment variable
- **Manual start**: Each service can be started individually

## Getting Help

1. Run `./test.sh` to diagnose issues
2. Check logs in service directories
3. See detailed documentation: `docs/scripts-documentation.md`
4. Create GitHub issue with test output

---

**💡 Pro Tip**: Run `./test.sh` regularly to ensure everything is working correctly!

*Quick reference guide - See `docs/scripts-documentation.md` for complete documentation*