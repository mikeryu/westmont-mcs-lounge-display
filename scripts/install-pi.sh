#!/bin/sh
# Run on the Pi after extracting dist/ and scripts/ into a release directory.
set -eu
command -v chromium >/dev/null
command -v python3 >/dev/null
release=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
base="$HOME/.local/share/westmont-display"
# Assets and installed fonts persist independently of application releases.
[ -f "$base/private-assets/westmont-signature.png" ] || {
  echo "Missing private assets; ask the maintainer to restore the Pi asset backup." >&2
  exit 1
}
rm -rf "$release/dist/assets"
ln -s "$base/private-assets" "$release/dist/assets"
mkdir -p "$base" "$HOME/.config/systemd/user"
if [ -L "$base/current" ] && [ "$(readlink "$base/current")" != "$release" ]; then
  ln -sfn "$(readlink "$base/current")" "$base/previous"
fi
ln -sfn "$release" "$base/current"
chmod +x "$release/scripts/kiosk.sh"
cat > "$HOME/.config/systemd/user/westmont-display.service" <<UNIT
[Unit]
Description=Westmont lounge static web server
[Service]
ExecStart=/usr/bin/python3 -m http.server 8080 --bind 127.0.0.1 --directory %h/.local/share/westmont-display/current/dist
Restart=always
RestartSec=3
NoNewPrivileges=yes
[Install]
WantedBy=default.target
UNIT
cat > "$HOME/.config/systemd/user/westmont-kiosk.service" <<UNIT
[Unit]
Description=Westmont lounge Chromium kiosk
After=westmont-display.service
Requires=westmont-display.service
StartLimitIntervalSec=0
[Service]
ExecStart=%h/.local/share/westmont-display/current/scripts/kiosk.sh
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
