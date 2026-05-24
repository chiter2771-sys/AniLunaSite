#!/bin/bash
set -e
export NODE_ENV=development
export BASE_PATH=/
PORT=8080 pnpm --filter @workspace/api-server run dev &
API_PID=$!
PORT=5000 pnpm --filter @workspace/animestream run dev &
FRONTEND_PID=$!
wait $API_PID $FRONTEND_PID
