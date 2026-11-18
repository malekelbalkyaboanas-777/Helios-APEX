#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Install Node.js LTS from https://nodejs.org/ first."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies for first launch..."
  npm install
fi

echo "Starting HELIOS APEX at http://localhost:3000 ..."
if command -v open >/dev/null 2>&1; then
  (sleep 2 && open "http://localhost:3000") &
elif command -v xdg-open >/dev/null 2>&1; then
  (sleep 2 && xdg-open "http://localhost:3000") &
fi

npm run dev
