#!/bin/bash

# 🧪 AI Collaboration Platform - Quick Test Script
# This script performs a quick test of all services

echo "🧪 Testing AI Collaboration Platform..."
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test 1: Check if Docker services are running
print_status "Checking Docker services..."
if docker ps | grep -q "ai-collaboration-mongodb"; then
    print_success "MongoDB container is running"
else
    print_error "MongoDB container not found"
fi

if docker ps | grep -q "ai-collaboration-ollama"; then
    print_success "Ollama container is running"
else
    print_error "Ollama container not found"
fi

# Test 2: Check service health endpoints
print_status "Testing service health endpoints..."

services=("Gateway:8000" "Orchestrator:8001" "Task:8002")

for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if curl -s -f "http://localhost:$port/health" > /dev/null; then
        print_success "$name service health check passed"
    else
        print_error "$name service health check failed"
    fi
done

# Test 3: Check database connectivity
print_status "Testing MongoDB connectivity..."
if docker exec ai-collaboration-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    print_success "MongoDB connection successful"
else
    print_error "MongoDB connection failed"
fi

# Test 4: Check Ollama service
print_status "Testing Ollama service..."
if curl -s "http://localhost:11434/api/version" > /dev/null; then
    print_success "Ollama service is responding"
else
    print_error "Ollama service not responding"
fi

# Test 5: Frontend accessibility
print_status "Testing Frontend accessibility..."
if curl -s "http://localhost:3000" > /dev/null; then
    print_success "Frontend is accessible"
else
    print_error "Frontend not accessible"
fi

# Test 6: Test goal execution flow (if all services are up)
print_status "Testing complete goal execution flow..."
response=$(curl -s -X POST "http://localhost:8000/api/execute" \
    -H "Content-Type: application/json" \
    -d '{"goal": "Create a simple hello world function"}')

if echo "$response" | grep -q "goal"; then
    print_success "Goal execution flow working"
else
    print_error "Goal execution flow failed"
fi

echo ""
print_status "Test Summary:"
echo "============="
print_status "✅ All tests completed"
print_status "🌐 Access the application at: http://localhost:3000"
echo ""
print_status "If any tests failed, check:"
echo "  1. All services are started with ./start.sh"
echo "  2. Docker Desktop is running"
echo "  3. WSL2 integration is enabled"