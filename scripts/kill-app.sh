#!/bin/bash

# Stock Analysis App - Kill Application Script
# This script kills all running instances of the stock analysis application

echo "🛑 Killing Stock Analysis Application..."

# Function to kill processes by pattern
kill_processes() {
    local pattern="$1"
    local description="$2"
    
    echo "🔍 Looking for $description..."
    
    # Find PIDs of processes matching the pattern
    local pids=$(ps aux | grep "$pattern" | grep -v grep | awk '{print $2}')
    
    if [ -n "$pids" ]; then
        echo "📋 Found processes: $pids"
        echo "$pids" | xargs kill -TERM 2>/dev/null
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Force kill if still running
        local remaining_pids=$(ps aux | grep "$pattern" | grep -v grep | awk '{print $2}')
        if [ -n "$remaining_pids" ]; then
            echo "⚠️  Force killing remaining processes: $remaining_pids"
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null
        fi
    else
        echo "✅ No $description found"
    fi
}

# Kill backend processes
kill_processes "node.*src/index.js" "Backend server"
kill_processes "nodemon.*src/index.js" "Backend nodemon"

# Kill frontend processes
kill_processes "node.*react-scripts" "Frontend React app"
kill_processes "npm.*start" "npm start processes"

# Kill any remaining Node.js processes related to the app
echo "🔍 Looking for any remaining Node.js processes in the project directory..."
local project_pids=$(ps aux | grep "node" | grep "stock-analysis-app" | grep -v grep | awk '{print $2}')

if [ -n "$project_pids" ]; then
    echo "📋 Found project-related Node.js processes: $project_pids"
    echo "$project_pids" | xargs kill -TERM 2>/dev/null
    sleep 1
    echo "$project_pids" | xargs kill -KILL 2>/dev/null
else
    echo "✅ No project-related Node.js processes found"
fi

# Check if ports are still in use
echo "🔍 Checking if ports are still in use..."

# Check port 3001 (backend)
if lsof -ti:3001 >/dev/null 2>&1; then
    echo "⚠️  Port 3001 (backend) is still in use"
    lsof -ti:3001 | xargs kill -KILL 2>/dev/null
    echo "✅ Killed processes using port 3001"
else
    echo "✅ Port 3001 (backend) is free"
fi

# Check port 3000 (frontend)
if lsof -ti:3000 >/dev/null 2>&1; then
    echo "⚠️  Port 3000 (frontend) is still in use"
    lsof -ti:3000 | xargs kill -KILL 2>/dev/null
    echo "✅ Killed processes using port 3000"
else
    echo "✅ Port 3000 (frontend) is free"
fi

echo ""
echo "🎉 Application kill process completed!"
echo ""
echo "📊 Summary:"
echo "   • Backend server (port 3001): Killed"
echo "   • Frontend server (port 3000): Killed"
echo "   • All related Node.js processes: Killed"
echo ""
echo "✅ Stock Analysis Application has been successfully stopped" 