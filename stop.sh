#!/bin/bash

# 🛑 AI Collaboration Platform - Stop Script
# This script stops all running services

echo "🛑 Stopping AI Collaboration Platform..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Stop Python services using saved PIDs
if [ -f .gateway.pid ]; then
    GATEWAY_PID=$(cat .gateway.pid)
    kill $GATEWAY_PID 2>/dev/null && print_status "Gateway service stopped"
    rm .gateway.pid
fi

if [ -f .orchestrator.pid ]; then
    ORCHESTRATOR_PID=$(cat .orchestrator.pid)
    kill $ORCHESTRATOR_PID 2>/dev/null && print_status "Orchestrator service stopped"
    rm .orchestrator.pid
fi

if [ -f .task.pid ]; then
    TASK_PID=$(cat .task.pid)
    kill $TASK_PID 2>/dev/null && print_status "Task service stopped"
    rm .task.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && print_status "Frontend stopped"
    rm .frontend.pid
fi

# Kill any remaining uvicorn and npm processes
print_status "Cleaning up remaining processes..."
pkill -f "uvicorn app.main:app" 2>/dev/null
pkill -f "npm start" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null

# Stop Docker services
print_status "Stopping Docker dependencies..."
if command -v docker &> /dev/null; then
    docker-compose -f docker-compose.dependencies.yml down 2>/dev/null
else
    print_status "Docker not available, skipping Docker cleanup"
fi

print_success "All services stopped successfully!"
echo ""
print_status "To start again, run: ./start.sh"