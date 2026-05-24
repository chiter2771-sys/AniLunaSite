#!/bin/bash
set -e
export NODE_ENV=production
export BASE_PATH=/
echo "Building API..."
pnpm --filter @workspace/api-server run build
echo "Building frontend..."
PORT=5000 pnpm --filter @workspace/animestream run build
echo "Starting API on :8080..."
PORT=8080 pnpm --filter @workspace/api-server run start &
API_PID=$!
echo "Serving frontend on :5000..."
PORT=5000 pnpm --filter @workspace/animestream run serve &
FRONTEND_PID=$!
echo "AniLuna running:"
echo "  Frontend: http://localhost:5000"
echo "  API:      http://localhost:8080"
wait $API_PID $FRONTEND_PID
