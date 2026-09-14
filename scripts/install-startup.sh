#!/bin/sh
# Run on the Pi. Requires desktop auto-login, npm, Python 3, and Chromium.
set -eu
npm_path=$(command -v npm) || { echo "Install npm first: sudo apt-get install npm" >&2; exit 1; }
command -v python3 >/dev/null
command -v chromium >/dev/null
base="$HOME/.local/share/westmont-display"
[ -f "$base/current/package.json" ]
# Preserve rollback compatibility with releases made before npm startup.
if [ -d "$base/previous" ] && [ ! -f "$base/previous/package.json" ]; then
  printf '%s\n' '{"private":true,"scripts":{"start":"python3 -m http.server 8080 --bind 127.0.0.1 --directory dist"}}' > "$base/previous/package.json"
fi
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/westmont-display.service" <<UNIT
[Unit]
Description=Westmont lounge npm server
StartLimitIntervalSec=0
[Service]
WorkingDirectory=%h/.local/share/westmont-display/current
ExecStart=$npm_path start
Restart=always
RestartSec=3
NoNewPrivileges=yes
[Install]
WantedBy=default.target
UNIT
cat > "$HOME/.config/systemd/user/westmont-kiosk.service" <<UNIT
[Unit]
Description=Westmont lounge browser window
After=westmont-display.service
Requires=westmont-display.service
StartLimitIntervalSec=0
[Service]
ExecStart=/bin/sh %h/.local/share/westmont-display/current/scripts/kiosk.sh
Restart=always
RestartSec=5
TimeoutStopSec=15
[Install]
WantedBy=default.target
UNIT
systemctl --user daemon-reload
systemctl --user enable westmont-display.service westmont-kiosk.service
systemctl --user restart westmont-display.service westmont-kiosk.service
systemctl --user --no-pager is-active westmont-display.service westmont-kiosk.service
