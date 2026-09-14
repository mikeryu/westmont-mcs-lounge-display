#!/bin/sh
set -eu
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export WAYLAND_DISPLAY=wayland-0
until [ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ]; do sleep 2; done
# Wait for the server as well as the graphical desktop.
until python3 -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8080", timeout=2)' >/dev/null 2>&1; do sleep 2; done
exec chromium --ozone-platform=wayland --kiosk --password-store=basic --no-first-run --no-default-browser-check --noerrdialogs --disable-session-crashed-bubble --disable-infobars --autoplay-policy=no-user-gesture-required --user-data-dir="$HOME/.local/share/westmont-display/chromium" http://127.0.0.1:8080
