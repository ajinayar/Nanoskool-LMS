#!/bin/zsh
# Double-click to stop Nanoskool if it is still running.
lsof -ti tcp:4000 | xargs kill 2>/dev/null
lsof -ti tcp:5173 | xargs kill 2>/dev/null
echo "Nanoskool has been stopped. You can close this window."
