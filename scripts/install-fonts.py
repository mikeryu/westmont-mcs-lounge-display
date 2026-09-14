#!/usr/bin/env python3
"""Install the supplied desktop fonts locally; do not expose them through HTTP."""
from pathlib import Path
import platform
import subprocess
import zipfile
import sys
archive = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('public/assets/westmont/Typeface.zip')
if platform.system() == 'Darwin':
    destination = Path.home() / 'Library/Fonts/WestmontDisplay'
else:
    destination = Path.home() / '.local/share/fonts/westmont-display'
destination.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(archive) as fonts:
    for name in fonts.namelist():
        if name.endswith('.otf'):
            (destination / Path(name).name).write_bytes(fonts.read(name))
if platform.system() != 'Darwin':
    subprocess.run(['fc-cache', '-f', str(destination)], check=True)
print('Official fonts installed at', destination)
