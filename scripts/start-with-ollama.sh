#!/bin/bash

# Stock Analysis App - Startup Script with Ollama
# This script starts all required services for the stock analysis application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔷 Stock Analysis App - Starting with AI Enhancement${NC}"
echo "=================================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i ":$1" >/dev/null 2>&1
}

# Function to check if a service is running on a port
check_service() {
    local port=$1
    local service=$2
    if port_in_use $port; then
        echo -e "${GREEN}✅ $service is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service is not running on port $port${NC}"
        return 1
    fi
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found. Please install npm${NC}"
    exit 1
fi

# Check Redis
if command_exists redis-server; then
    echo -e "${GREEN}✅ Redis server available${NC}"
    REDIS_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  Redis server not found in PATH${NC}"
    REDIS_AVAILABLE=false
fi

# Check Ollama
if command_exists ollama; then
    OLLAMA_VERSION=$(ollama --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ Ollama: $OLLAMA_VERSION${NC}"
    OLLAMA_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  Ollama not found. AI features will be disabled${NC}"
    echo -e "${BLUE}💡 To install Ollama: curl -fsSL https://ollama.ai/install.sh | sh${NC}"
    OLLAMA_AVAILABLE=false
fi

echo ""

# Start Redis if available
if [ "$REDIS_AVAILABLE" = true ]; then
    if ! check_service 6379 "Redis"; then
        echo -e "${YELLOW}🔄 Starting Redis server...${NC}"
        redis-server --daemonize yes --port 6379
        sleep 2
        if check_service 6379 "Redis"; then
            echo -e "${GREEN}✅ Redis started successfully${NC}"
        else
            echo -e "${RED}❌ Failed to start Redis${NC}"
            echo -e "${BLUE}💡 Try starting Redis manually: redis-server${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Please start Redis manually: redis-server${NC}"
fi

# Start Ollama if available
if [ "$OLLAMA_AVAILABLE" = true ]; then
    if ! check_service 11434 "Ollama"; then
        echo -e "${YELLOW}🔄 Starting Ollama service...${NC}"
        ollama serve >/dev/null 2>&1 &
        OLLAMA_PID=$!
        sleep 3
        if check_service 11434 "Ollama"; then
            echo -e "${GREEN}✅ Ollama started successfully (PID: $OLLAMA_PID)${NC}"
            
            # Check for recommended model
            echo -e "${YELLOW}🔄 Checking for recommended model...${NC}"
            if ollama list | grep -q "llama4:maverick"; then
  echo -e "${GREEN}✅ llama4:maverick model found${NC}"
else
  echo -e "${YELLOW}📥 Downloading llama4:maverick model (this may take a while)...${NC}"
  ollama pull llama4:maverick
                echo -e "${GREEN}✅ Model downloaded successfully${NC}"
            fi
        else
            echo -e "${RED}❌ Failed to start Ollama${NC}"
            echo -e "${BLUE}💡 Try starting Ollama manually: ollama serve${NC}"
        fi
    fi
fi

echo ""

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚙️  Creating environment configuration...${NC}"
    cp backend/config.example backend/.env
    echo -e "${GREEN}✅ Created backend/.env from template${NC}"
    echo -e "${BLUE}💡 Edit backend/.env to add your API keys for better data${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Starting Stock Analysis Application...${NC}"
echo ""

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${YELLOW}🔄 Starting backend server...${NC}"
cd backend
npm run dev >/dev/null 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5
if check_service 3001 "Backend API"; then
    echo -e "${GREEN}✅ Backend started successfully${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo -e "${BLUE}💡 Check backend logs for errors${NC}"
    cleanup
fi

# Start frontend
echo -e "${YELLOW}🔄 Starting frontend...${NC}"
cd frontend
npm start >/dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 10
if check_service 3000 "Frontend"; then
    echo -e "${GREEN}✅ Frontend started successfully${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    echo -e "${BLUE}💡 Check frontend logs for errors${NC}"
    cleanup
fi

echo ""
echo -e "${GREEN}🎉 Stock Analysis App is now running!${NC}"
echo "=================================="
echo -e "${BLUE}📱 Frontend:  ${NC}http://localhost:3000"
echo -e "${BLUE}🔧 Backend:   ${NC}http://localhost:3001"
if [ "$REDIS_AVAILABLE" = true ]; then
    echo -e "${BLUE}📊 Redis:     ${NC}localhost:6379"
fi
if [ "$OLLAMA_AVAILABLE" = true ]; then
    echo -e "${BLUE}🧠 Ollama:    ${NC}http://localhost:11434"
fi
echo ""
echo -e "${YELLOW}💡 Try analyzing stocks like: AAPL, TSLA, GOOGL, MSFT${NC}"
echo -e "${YELLOW}📖 Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and wait for user interrupt
wait 