#!/bin/sh
# Uses normal SSH authentication. Never package credentials or the repository.
set -eu
target=${1:-mcs-lounge@10.127.8.21}
npm run build
release="$(date -u +%Y%m%dT%H%M%SZ)"
archive=$(mktemp)
trap 'rm -f "$archive"' EXIT HUP INT TERM
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$archive" --exclude=dist/assets dist scripts/kiosk.sh scripts/install-pi.sh
ssh "$target" "mkdir -p ~/.local/share/westmont-display/releases/$release"
scp "$archive" "$target:.local/share/westmont-display/releases/$release/release.tgz"
ssh "$target" "cd ~/.local/share/westmont-display/releases/$release && tar -xzf release.tgz && rm release.tgz && sh scripts/install-pi.sh"
