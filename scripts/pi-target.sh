#!/bin/sh
# Read a plain-text SSH destination; never execute configuration as shell code.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
config="$root/config/pi-target"
target=${1:-}
if [ -z "$target" ]; then
  if [ ! -f "$config" ]; then
    echo 'Create config/pi-target with the Pi login and address on one line (see docs/SETUP.md).' >&2
    exit 1
  fi
  target=$(cat "$config")
fi
case "$target" in
  ''|-*|*[!a-zA-Z0-9._@-]*) echo 'Pi target must be a hostname, IPv4 address, or user@host, without spaces or options.' >&2; exit 1 ;;
esac
printf '%s\n' "$target"
