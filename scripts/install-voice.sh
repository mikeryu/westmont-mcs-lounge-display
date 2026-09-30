#!/bin/sh
# Explicit opt-in only. Dependencies and model must already be installed; never downloads on boot.
set -eu
base="$HOME/.local/share/westmont-display"
[ -x "$base/voice-venv/bin/python" ] || { echo 'See docs/CONTROLS.md: install the voice environment first.' >&2; exit 1; }
[ -f "$HOME/.config/westmont-display/controls.json" ]
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/westmont-voice.service" <<'UNIT'
[Unit]
Description=Offline lounge microphone controls
After=westmont-display.service sound.target
StartLimitIntervalSec=0
[Service]
ExecStart=%h/.local/share/westmont-display/voice-venv/bin/python %h/.local/share/westmont-display/current/voice/listen.py --config %h/.config/westmont-display/controls.json
Restart=on-failure
RestartSec=15
NoNewPrivileges=yes
UMask=0077
[Install]
WantedBy=default.target
UNIT
systemctl --user daemon-reload
systemctl --user enable --now westmont-voice.service
