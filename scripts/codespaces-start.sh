#!/bin/bash
# EMBERFALL Codespaces Startup Script
# Runs both the netplay server and the frontend dev server

set -e

echo "🚀 Starting EMBERFALL development environment..."

# Start the netplay server in background
echo "Starting netplay server on port 8787..."
cd server
npm install --silent 2>/dev/null
node server.mjs &
SERVER_PID=$!
cd ..

# Give server a moment to start
sleep 2

# Start the frontend dev server
echo "Starting frontend dev server..."
echo ""
echo "=========================================="
echo "📦 Frontend: http://localhost:5173"
echo "⚔  Netplay Server: http://localhost:8787"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all servers"

# Run frontend in foreground
npm run dev

# Cleanup on exit
trap "kill $SERVER_PID 2>/dev/null" EXIT
