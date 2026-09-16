#!/bin/sh
# Authorized editors only: private files remain ignored by Git.
set -eu
target=$(sh "$(dirname "$0")/pi-target.sh" "${1:-}")
mkdir -p public/assets/westmont
scp -r "$target:.local/share/westmont-display/private-assets/." public/assets/
scp -r "$target:.local/share/westmont-display/private-sources/." public/assets/westmont/
echo "Private preview assets copied. Do not force-add them to Git."
