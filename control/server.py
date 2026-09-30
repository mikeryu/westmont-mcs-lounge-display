#!/usr/bin/env python3
"""Local display server with a separate playback-only HTTP or HTTPS LAN listener."""
import argparse
import collections
import functools
import hashlib
import hmac
import http.server
import json
import os
from pathlib import Path
import secrets
import ssl
import subprocess
import threading
import time
import urllib.parse

BASIC = {'pause', 'resume', 'next', 'previous', 'controls', 'dismiss'}


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return salt + ':' + digest


def password_matches(password, stored):
    try:
        salt, digest = stored.split(':')
        return hmac.compare_digest(password_hash(password, salt), stored)
    except (ValueError, TypeError):
        return False


class State:
    def __init__(self, config, restart=None):
        self.config = config
        self.lock = threading.RLock()
        self.token = secrets.token_urlsafe(32)
        self.epoch = secrets.token_hex(8)
        self.sequence = 0
        self.commands = collections.deque(maxlen=64)
        self.status = {'paused': False, 'title': '', 'index': 0, 'count': 0, 'ack': 0}
        self.seen = 0
        self.sessions = {}
        self.failures = collections.deque(maxlen=10)
        self.rate = collections.deque(maxlen=30)
        self.last_restart = 0
        self.voice_seen = 0
        self.voice_mode = 'offline'
        self.restart = restart or self.restart_kiosk

    @staticmethod
    def restart_kiosk():
        subprocess.run(['systemctl', '--user', 'restart', 'westmont-kiosk.service'],
                       check=True, timeout=20, capture_output=True)

    def public(self):
        return {**self.status, 'online': time.monotonic() - self.seen < 6,
                'pending': self.sequence > self.status['ack'],
                'voiceOnline': time.monotonic() - self.voice_seen < 15,
                'voiceMode': self.voice_mode,
                'voicePhrase': self.config.get('voice_phrase', 'hey monty'),
                'adminConfigured': bool(self.config.get('admin_password_hash')),
                'restartEnabled': bool(self.config.get('allow_restart'))}

    def enqueue(self, command, source="remote"):
        now = time.monotonic()
        if self.rate and len(self.rate) == self.rate.maxlen and now - self.rate[0] < 10:
            raise ValueError('Too many commands. Wait a moment.')
        if now - self.seen >= 6:
            raise ValueError('Display is offline. No command was queued.')
        self.rate.append(now)
        self.sequence += 1
        self.commands.append({'id': self.sequence, 'action': command, 'created': now, 'source': source})
        return self.sequence


class Handler(http.server.SimpleHTTPRequestHandler):
    # No credentials, request bodies, paths, or audio in access logs.
    def log_message(self, *args):
        pass

    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    @property
    def state(self):
        return self.server.state

    def send_json(self, status, data):
        content = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(content)

    def end_headers(self):
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Frame-Options', 'SAMEORIGIN' if self.server.local else 'DENY')
        super().end_headers()

    def valid_host(self):
        try:
            host = urllib.parse.urlsplit('http://' + self.headers.get('Host', '')).hostname
            return host in self.state.config.get('allowed_hosts', ['localhost', '127.0.0.1'])
        except ValueError:
            return False

    def local_auth(self):
        return self.server.local and hmac.compare_digest(
            self.headers.get('Authorization', ''), 'Bearer ' + self.state.token)

    def do_GET(self):
        if not self.valid_host():
            return self.send_json(403, {'error': 'Host not allowed'})
        path = urllib.parse.urlsplit(self.path).path
        with self.state.lock:
            if path == '/api/state':
                status = self.state.public()
                if not self.server.local:
                    status.update(adminConfigured=False, restartEnabled=False)
                return self.send_json(200, status)
            if path == '/api/display/bootstrap':
                if not self.server.local:
                    return self.send_json(403, {'error': 'Local display only'})
                return self.send_json(200, {'token': self.state.token, 'epoch': self.state.epoch,
                                          'sequence': self.state.sequence,
                                          'url': self.state.config['public_url'],
                                          'qrEnabled': self.state.config.get('show_remote_qr', True),
                                          'phrase': self.state.config.get('voice_phrase', 'hey monty')})
            if path == '/api/display/commands':
                if not self.local_auth():
                    return self.send_json(403, {'error': 'Local display only'})
                try:
                    after = int(urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('after', ['0'])[0])
                except ValueError:
                    return self.send_json(400, {'error': 'Invalid sequence'})
                now = time.monotonic()
                commands = [{**c, 'age': now - c['created']} for c in self.state.commands if c['id'] > after and now - c['created'] < 10]
                return self.send_json(200, {'epoch': self.state.epoch, 'sequence': self.state.sequence,
                                          'commands': commands})
            if path.startswith('/api/'):
                return self.send_json(404, {'error': 'Not found'})
        if not self.server.local and path not in ('/control', '/control/', '/control/index.html', '/control/remote.css', '/control/remote.js'):
            return self.send_json(404, {'error': 'Not found'})
        # Serve the build directory; reject dot paths and directory listings.
        clean = urllib.parse.unquote(path)
        if any(p in ('.', '..') or p.startswith('.') for p in clean.split('/') if p):
            return self.send_json(404, {'error': 'Not found'})
        if clean == '/control':
            self.send_response(302)
            self.send_header('Location', '/control/')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        translated = Path(self.translate_path(self.path))
        if translated.is_dir() and not (translated / 'index.html').is_file():
            return self.send_json(404, {'error': 'Not found'})
        return super().do_GET()

    def do_POST(self):
        if not self.valid_host():
            return self.send_json(403, {'error': 'Host not allowed'})
        expected = ('https' if isinstance(self.connection, ssl.SSLSocket) else 'http') + '://' + self.headers.get('Host', '')
        origin = self.headers.get('Origin')
        if origin and origin != expected:
            return self.send_json(403, {'error': 'Cross-origin request blocked'})
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.send_json(415, {'error': 'JSON required'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 4096:
                raise ValueError()
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError()
        except (ValueError, json.JSONDecodeError):
            return self.send_json(400, {'error': 'Invalid request'})
        path = urllib.parse.urlsplit(self.path).path
        if path.startswith('/api/admin/') and not self.server.local:
            return self.send_json(403, {'error': 'Administration is available only through SSH'})
        with self.state.lock:
            now = time.monotonic()
            if path == '/api/display/status':
                if not self.local_auth():
                    return self.send_json(403, {'error': 'Local display only'})
                if not isinstance(data.get('title'), str) or type(data.get('ack')) is not int:
                    return self.send_json(400, {'error': 'Invalid display status'})
                self.state.status = {'title': data['title'][:120], 'paused': data.get('paused') is True,
                                     'index': data.get('index', 0), 'count': data.get('count', 0),
                                     'ack': min(max(data['ack'], 0), self.state.sequence)}
                self.state.seen = now
                return self.send_json(200, {'ok': True})
            if path == '/api/voice/status':
                if not self.local_auth():
                    return self.send_json(403, {'error': 'Local voice only'})
                self.state.voice_seen = now
                self.state.voice_mode = 'voice + tone' if data.get('tone') else 'voice'
                return self.send_json(200, {'ok': True})
            if path == '/api/voice/wake':
                if not self.local_auth():
                    return self.send_json(403, {'error': 'Local voice only'})
                try:
                    seq = self.state.enqueue('wake', 'voice')
                except ValueError as error:
                    return self.send_json(409, {'error': str(error)})
                return self.send_json(202, {'sequence': seq})
            if path in ('/api/command', '/api/voice/command'):
                if path.startswith('/api/voice/') and not self.local_auth():
                    return self.send_json(403, {'error': 'Local voice only'})
                if not isinstance(data.get('action'), str) or data['action'] not in BASIC:
                    return self.send_json(400, {'error': 'Unknown playback command'})
                try:
                    seq = self.state.enqueue(data['action'], 'voice' if path.startswith('/api/voice/') else 'remote')
                except ValueError as error:
                    return self.send_json(409, {'error': str(error)})
                return self.send_json(202, {'sequence': seq})
            if path == '/api/admin/login':
                self.state.sessions = {k:v for k,v in self.state.sessions.items() if v > now}
                if len(self.state.failures) >= 5 and now - self.state.failures[-5] < 60:
                    return self.send_json(429, {'error': 'Wait one minute before trying again'})
                password = data.get('password', '')
                if not isinstance(password, str) or len(password) > 256:
                    return self.send_json(400, {'error': 'Invalid password'})
                stored = self.state.config.get('admin_password_hash', '')
                if not stored or not password_matches(password, stored):
                    self.state.failures.append(now)
                    return self.send_json(403, {'error': 'Incorrect password or admin not configured'})
                token = secrets.token_urlsafe(32)
                self.state.sessions[token] = now + 600
                return self.send_json(200, {'token': token, 'expiresIn': 600})
            if path in ('/api/admin/restart', '/api/admin/logout'):
                token = self.headers.get('Authorization', '').removeprefix('Bearer ')
                if self.state.sessions.get(token, 0) <= now:
                    return self.send_json(403, {'error': 'Admin sign-in required'})
                if path.endswith('logout'):
                    self.state.sessions.pop(token, None)
                    return self.send_json(200, {'ok': True})
                if not self.state.config.get('allow_restart'):
                    return self.send_json(403, {'error': 'Restart disabled in this preview'})
                if now - self.state.last_restart < 60:
                    return self.send_json(429, {'error': 'Wait a minute between restarts'})
                self.state.last_restart = now
                try:
                    self.state.restart()
                except (subprocess.SubprocessError, OSError):
                    return self.send_json(503, {'error': 'Restart failed; use the Pi recovery guide'})
                return self.send_json(200, {'ok': True})
        self.send_json(404, {'error': 'Not found'})


def make_server(bind, port, state, directory, local=True):
    server = http.server.ThreadingHTTPServer((bind, port), functools.partial(Handler, directory=str(directory)))
    server.state, server.local = state, local
    return server


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', default=os.environ.get('DISPLAY_CONTROLS_CONFIG', 'config/controls.json'))
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--directory', default='dist')
    args = parser.parse_args()
    config = {'allowed_hosts': ['localhost', '127.0.0.1'], 'public_url': f'http://127.0.0.1:{args.port}/control/'}
    if Path(args.config).is_file():
        config.update(json.loads(Path(args.config).read_text()))
    if bool(config.get('tls_cert')) != bool(config.get('tls_key')):
        parser.error('Set both tls_cert and tls_key, or neither.')
    public = urllib.parse.urlsplit(config['public_url'])
    if public.username or public.password or public.path != '/control/' or public.query or public.fragment:
        parser.error('public_url must be a /control/ URL without credentials, query, or fragment.')
    if public.hostname not in config['allowed_hosts']:
        parser.error('The public_url hostname must be in allowed_hosts.')
    if public.scheme == 'https':
        if not config.get('tls_cert') or (public.port or 443) != config.get('lan_port', 8443):
            parser.error('HTTPS public_url requires TLS files and a matching lan_port.')
    elif public.scheme == 'http' and config.get('lan_http_enabled'):
        if (public.port or 80) != config.get('lan_port', 8081) or config.get('tls_cert'):
            parser.error('Campus HTTP requires matching lan_port and no TLS configuration.')
    elif public.scheme != 'http' or public.hostname not in ('localhost', '127.0.0.1') or (public.port or 80) != args.port:
        parser.error('Campus HTTP requires explicit lan_http_enabled configuration.')
    state = State(config)
    local = make_server('127.0.0.1', args.port, state, args.directory)
    lan = None
    if config.get('tls_cert') and config.get('tls_key'):
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.load_cert_chain(config['tls_cert'], config['tls_key'])
        lan = make_server(config.get('lan_bind', '0.0.0.0'), config.get('lan_port', 8443), state, args.directory, False)
        lan.socket = context.wrap_socket(lan.socket, server_side=True)
        threading.Thread(target=lan.serve_forever, daemon=True).start()
    elif config.get('lan_http_enabled'):
        lan = make_server(config.get('lan_bind', '0.0.0.0'), config.get('lan_port', 8081), state, args.directory, False)
        threading.Thread(target=lan.serve_forever, daemon=True).start()
    print(f'Local display/control preview: http://127.0.0.1:{args.port}/control/; LAN {"enabled (playback only)" if lan else "disabled"}', flush=True)
    try:
        local.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        local.server_close()
        if lan:
            lan.shutdown()
            lan.server_close()


if __name__ == '__main__':
    main()
