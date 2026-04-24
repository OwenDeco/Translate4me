#!/bin/bash
set -e

# Find node in common Codespace locations
if ! command -v node &>/dev/null; then
  for dir in /opt/node*/bin /usr/local/bin /usr/bin ~/.nvm/versions/node/*/bin; do
    if [ -x "$dir/node" ]; then
      export PATH="$dir:$PATH"
      break
    fi
  done
fi

# Last resort: install node if still not found
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - 2>/dev/null
  sudo apt-get install -y nodejs 2>/dev/null
fi

cd /workspaces/Translate4me

git pull origin main --quiet 2>/dev/null || true

npm install --silent 2>/dev/null

# Kill any previous instance
pkill -f "node server.js" 2>/dev/null || true

# Start in background, log to server.log
nohup node server.js > server.log 2>&1 &
echo "Server started (PID $!). Logs: tail -f server.log"
