#!/bin/sh
# SSH options (for example -L for a preview tunnel) may follow the script name.
set -eu
target=$(sh "$(dirname "$0")/pi-target.sh")
exec ssh "$@" "$target"
