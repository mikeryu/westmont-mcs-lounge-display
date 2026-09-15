#!/bin/sh
# Bookworm ydotool 0.1.x: two startup-only nudges, no clicks or key presses.
# The Pi account already has passwordless sudo; no new device permissions are added.
set -eu
for delay in 8 10; do
  sleep "$delay"
  if sudo -n timeout 5 /usr/bin/ydotool mousemove --delay 1000 1 1; then
    echo "Kiosk startup pointer nudged"
  else
    echo "Pointer nudge unavailable; kiosk continues normally" >&2
  fi
done
