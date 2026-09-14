#!/bin/sh
set -eu
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export WAYLAND_DISPLAY=wayland-0
until [ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ]; do sleep 2; done
exec chromium --ozone-platform=wayland --kiosk --password-store=basic --no-first-run --no-default-browser-check --noerrdialogs --disable-session-crashed-bubble --disable-infobars --autoplay-policy=no-user-gesture-required --user-data-dir="$HOME/.local/share/westmont-display/chromium" http://127.0.0.1:8080
