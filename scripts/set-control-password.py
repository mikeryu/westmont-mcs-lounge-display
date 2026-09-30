#!/usr/bin/env python3
"""Set an admin password hash in a private settings file, never in argv or logs."""
import getpass
import json
import os
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from control.server import password_hash
path = Path(sys.argv[1] if len(sys.argv)>1 else 'config/controls.json')
config = json.loads(path.read_text())
password = getpass.getpass('New display admin password (at least 12 characters): ')
if len(password)<12:
    raise SystemExit('Use at least 12 characters.')
if password != getpass.getpass('Repeat password: '):
    raise SystemExit('Passwords did not match.')
config['admin_password_hash'] = password_hash(password)
os.chmod(path, 0o600)
path.write_text(json.dumps(config, indent=2)+'\n')
print('Password hash saved. Restart the control server to use it.')
