#!/bin/bash

echo "🔍 Debug Check - Stock Analysis App"
echo "=================================="

# Check if processes are running
echo
echo "📊 Process Status:"
echo "Frontend (port 3000):"
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running on port 3000"
    lsof -i :3000 | grep LISTEN
else
    echo "❌ Frontend is NOT running on port 3000"
fi

echo
echo "Backend (port 3001):"
if lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ Backend is running on port 3001"
    lsof -i :3001 | grep LISTEN
else
    echo "❌ Backend is NOT running on port 3001"
fi

# Check Redis
echo
echo "🔗 Redis Status:"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is running and responding"
    else
        echo "❌ Redis is not responding"
    fi
else
    echo "⚠️ Redis CLI not found - cannot check Redis status"
fi

# Check for Node.js processes
echo
echo "🔍 Node.js Processes:"
ps aux | grep node | grep -v grep | while read line; do
    echo "$line"
done

# Check network connectivity
echo
echo "🌐 Network Connectivity:"
echo "Frontend to Backend:"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend health endpoint accessible"
    echo "📋 Health response:"
    curl -s http://localhost:3001/health | jq . 2>/dev/null || curl -s http://localhost:3001/health
else
    echo "❌ Backend health endpoint not accessible"
fi

echo
echo "🚀 Quick Actions:"
echo "To restart backend: cd backend && npm start"
echo "To restart frontend: cd frontend && npm start"
echo "To run debug: node debug-backend.js"
echo "To check logs: Use browser dev tools console (F12)"

echo
echo "📝 Frontend Debug Instructions:"
echo "1. Open browser dev tools (F12)"
echo "2. Go to Console tab"
echo "3. Try analyzing a stock (e.g., AAPL)"
echo "4. Watch for debug messages starting with emojis"

echo
echo "📝 Backend Debug Instructions:"
echo "1. Backend logs will show in terminal"
echo "2. Look for messages starting with emojis"
echo "3. Check Redis connectivity"
echo "4. Verify all agents are starting" 