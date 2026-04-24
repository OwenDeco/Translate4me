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

exec node server.js
