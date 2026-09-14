#!/bin/sh
# Run on the Pi after extracting dist/ and scripts/ into a release directory.
set -eu
command -v chromium >/dev/null
command -v python3 >/dev/null
command -v npm >/dev/null
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
sh "$release/scripts/install-startup.sh"
