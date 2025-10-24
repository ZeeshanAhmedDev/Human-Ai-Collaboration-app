#!/bin/bash

# 🚀 AI Collaboration Platform - Startup Script
# This script starts all services for the AI Collaboration Platform

set -e

echo "🚀 Starting AI Collaboration Platform..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not available in WSL2"
    print_warning "Please enable Docker Desktop WSL2 integration:"
    echo "1. Open Docker Desktop on Windows"
    echo "2. Go to Settings > Resources > WSL Integration"
    echo "3. Enable integration with your WSL distro"
    echo "4. Click 'Apply & Restart'"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running"
    print_warning "Please start Docker Desktop"
    exit 1
fi

print_status "Docker is available and running ✓"

# Start dependencies (MongoDB and Ollama)
print_status "Starting dependencies (MongoDB & Ollama)..."
docker-compose -f docker-compose.dependencies.yml up -d

# Wait for services to be healthy
print_status "Waiting for dependencies to be ready..."
sleep 10

# Check MongoDB health
print_status "Checking MongoDB connection..."
for i in {1..30}; do
    if docker exec ai-collaboration-mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        print_success "MongoDB is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "MongoDB failed to start"
        exit 1
    fi
    sleep 2
done

# Check Ollama health
print_status "Checking Ollama service..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/version &> /dev/null; then
        print_success "Ollama is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        print_warning "Ollama may not be fully ready, but continuing..."
        break
    fi
    sleep 2
done

# Pull Ollama model if not already available
print_status "Ensuring Ollama model is available..."
docker exec ai-collaboration-ollama ollama pull qwen2.5-coder:1.5b-instruct || print_warning "Model pull may take time, continuing..."

print_success "Dependencies started successfully!"

# Start Python services
print_status "Starting backend services..."

# Start Gateway Service
print_status "Starting Gateway Service (Port 8000)..."
cd gateway_service
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start gateway in background
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
GATEWAY_PID=$!
cd ..

sleep 3

# Start Orchestrator Service
print_status "Starting Orchestrator Service (Port 8001)..."
cd orchestrator_service
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start orchestrator in background
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
ORCHESTRATOR_PID=$!
cd ..

sleep 3

# Start Task Service
print_status "Starting Task Service (Port 8002)..."
cd task_service
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start task service in background
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload &
TASK_PID=$!
cd ..

sleep 3

# Start Frontend
print_status "Starting Frontend (Port 3000)..."
cd frontend
if [ ! -d "node_modules" ]; then
    print_status "Installing npm dependencies..."
    npm install
fi

# Start frontend in background
npm start &
FRONTEND_PID=$!
cd ..

# Wait a moment for all services to start
sleep 5

# Health checks
print_status "Performing health checks..."

# Check backend services
for service in "Gateway:8000" "Orchestrator:8001" "Task:8002"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if curl -s "http://localhost:$port/health" &> /dev/null; then
        print_success "$name service is healthy!"
    else
        print_warning "$name service may still be starting..."
    fi
done

# Print access information
echo ""
print_success "🎉 AI Collaboration Platform is starting up!"
echo "======================================"
echo ""
print_status "Service URLs:"
echo "  🌐 Frontend:     http://localhost:3000"
echo "  🚪 Gateway API:  http://localhost:8000"
echo "  🤖 Orchestrator: http://localhost:8001"
echo "  💾 Task Service: http://localhost:8002"
echo "  🗄️  MongoDB:     mongodb://localhost:27017"
echo "  🧠 Ollama:       http://localhost:11434"
echo ""
print_status "Health Check URLs:"
echo "  Gateway:      http://localhost:8000/health"
echo "  Orchestrator: http://localhost:8001/health"
echo "  Task Service: http://localhost:8002/health"
echo ""
print_status "Frontend should open automatically in your browser"
print_status "If not, navigate to: http://localhost:3000"
echo ""

# Save PIDs for cleanup
echo $GATEWAY_PID > .gateway.pid
echo $ORCHESTRATOR_PID > .orchestrator.pid
echo $TASK_PID > .task.pid
echo $FRONTEND_PID > .frontend.pid

print_warning "To stop all services, run: ./stop.sh"
echo ""
print_status "Logs will appear below. Press Ctrl+C to stop all services."

# Wait for user interruption
trap 'echo ""; print_status "Stopping all services..."; kill $GATEWAY_PID $ORCHESTRATOR_PID $TASK_PID $FRONTEND_PID 2>/dev/null; docker-compose -f docker-compose.dependencies.yml down; print_success "All services stopped!"; exit 0' INT

# Keep script running and show logs
wait