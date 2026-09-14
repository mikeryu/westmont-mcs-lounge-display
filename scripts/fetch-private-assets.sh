#!/bin/sh
# Authorized editors only: private files remain ignored by Git.
set -eu
target=${1:-mcs-lounge@10.127.8.21}
mkdir -p public/assets/westmont
scp -r "$target:.local/share/westmont-display/private-assets/." public/assets/
scp -r "$target:.local/share/westmont-display/private-sources/." public/assets/westmont/
echo "Private preview assets copied. Do not force-add them to Git."
