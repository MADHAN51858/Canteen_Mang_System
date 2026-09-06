#!/bin/bash

# Navigate to the project directory regardless of how the script is executed
cd "$(dirname "$0")"

echo "=================================================="
echo "      Canteen Management System - Quick Start     "
echo "=================================================="

# Check and free port 3000 if already occupied
PORT_3000_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_3000_PID" ]; then
  echo "⚠️  Freeing port 3000 (killing process $PORT_3000_PID)..."
  kill -9 $PORT_3000_PID 2>/dev/null
fi

# Check and free port 5173 if already occupied
PORT_5173_PID=$(lsof -ti:5173 2>/dev/null)
if [ -n "$PORT_5173_PID" ]; then
  echo "⚠️  Freeing port 5173 (killing process $PORT_5173_PID)..."
  kill -9 $PORT_5173_PID 2>/dev/null
fi

echo "🚀 Starting both Backend (Port 3000) and Frontend (Port 5173)..."
echo "👉 Backend:  http://localhost:3000"
echo "👉 Frontend: http://localhost:5173"
echo "=================================================="
echo "Press Ctrl + C anytime to stop both servers."
echo ""

# Open browser after a slight delay in the background
(sleep 2 && open "http://localhost:5173" 2>/dev/null) &

# Run concurrently (starts nodemon server and vite client)
npm run dev
