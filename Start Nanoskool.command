#!/bin/zsh
# Double-click this file to start Nanoskool. Keep the window open while you use it.
# Close the window (or press Ctrl+C) to stop everything.

cd "$(dirname "$0")"
source ~/.zprofile 2>/dev/null
source ~/.zshrc 2>/dev/null
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
mkdir -p logs

say_step() { echo ""; echo "▶ $1"; }

echo "========================================"
echo "        Starting Nanoskool LMS"
echo "========================================"

say_step "Checking the tools are installed…"
if ! command -v npm >/dev/null 2>&1; then
  echo "✖ Node.js is not installed. Install it from https://nodejs.org and try again."
  read -k1 "?Press any key to close…"; exit 1
fi

say_step "Starting the database (MongoDB)…"
brew services start mongodb-community >/dev/null 2>&1 && echo "  Database is running." || echo "  (Could not start MongoDB with Homebrew. If sign-in fails, tell Claude.)"

say_step "Stopping any old copy that is still running…"
lsof -ti tcp:4000 | xargs kill 2>/dev/null
lsof -ti tcp:5173 | xargs kill 2>/dev/null
sleep 1

# Install on first run, and again whenever an update adds new building blocks (package.json changed)
for part in server web; do
  if [ ! -d "$part/node_modules" ] || [ "$part/package.json" -nt "$part/node_modules/.package-lock.json" ]; then
    say_step "Installing updates for the $part (this can take a few minutes)…"
    (cd "$part" && npm install)
  fi
done

if [ ! -f logs/.demo-grades-done ]; then
  say_step "Adding the demo students for Grades 1–10 (first time only)…"
  (cd server && npm run demo:grades >> ../logs/server.log 2>&1) && touch logs/.demo-grades-done
fi
if [ ! -f logs/.demo-journey-done ]; then
  say_step "Adding the skills missions, learning objectives and demo tools (first time only)…"
  (cd server && npm run demo:journey >> ../logs/server.log 2>&1) && touch logs/.demo-journey-done
fi

say_step "Starting the server…"
(cd server && npm run dev > ../logs/server.log 2>&1) &
SERVER=$!
say_step "Starting the website…"
(cd web && npm run dev > ../logs/web.log 2>&1) &
WEB=$!

stop_all() {
  echo ""
  echo "Stopping Nanoskool…"
  kill $SERVER $WEB 2>/dev/null
  lsof -ti tcp:4000 | xargs kill 2>/dev/null
  lsof -ti tcp:5173 | xargs kill 2>/dev/null
  echo "Stopped. You can close this window."
  exit 0
}
trap stop_all INT TERM HUP

say_step "Waiting for everything to be ready…"
for i in {1..90}; do
  if curl -s http://localhost:4000/api/health | grep -q '"ok":true' && curl -s -o /dev/null http://localhost:5173; then
    READY=1; break
  fi
  sleep 1
done

if [ -z "$READY" ]; then
  echo ""
  echo "✖ Nanoskool did not start. The last lines of the server log:"
  tail -n 15 logs/server.log
  echo ""
  echo "Send a screenshot of this window to Claude."
  wait
  exit 1
fi

open http://localhost:5173
echo ""
echo "========================================"
echo "  ✔ Nanoskool is running"
echo "  Open: http://localhost:5173"
echo ""
echo "  Keep this window open while you use it."
echo "  To stop: close this window or press Ctrl+C."
echo "========================================"
wait
