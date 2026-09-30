import json
import math
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from control.server import State, make_server, password_hash
from voice.detector import PhraseGate, ToneGate


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        Path(self.temp.name, 'index.html').write_text('display')
        Path(self.temp.name, 'private').mkdir()
        self.restarts = []
        self.state = State({'public_url': 'http://127.0.0.1/control/',
                            'admin_password_hash': password_hash('a good test password'),
                            'allow_restart': True}, restart=lambda: self.restarts.append(True))
        self.server = make_server('127.0.0.1', 0, self.state, self.temp.name)
        self.url = 'http://127.0.0.1:'+str(self.server.server_port)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path, data=None, headers=None):
        h = {'Content-Type': 'application/json', **(headers or {})}
        req = urllib.request.Request(self.url+path, data=json.dumps(data).encode() if data is not None else None, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=3) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.load(error)

    def connect_display(self):
        code, boot = self.request('/api/display/bootstrap')
        self.assertEqual(code, 200)
        auth = {'Authorization': 'Bearer '+boot['token']}
        self.request('/api/display/status', {'title':'Test slide', 'ack':0, 'count':3}, auth)
        return auth

    def test_commands_delivered_and_acknowledged(self):
        auth = self.connect_display()
        code, result = self.request('/api/command', {'action':'next'})
        self.assertEqual(code, 202)
        commands = self.request('/api/display/commands?after=0', headers=auth)[1]['commands']
        self.assertEqual(commands[0]['action'], 'next')
        self.request('/api/display/status', {'title':'Next slide','ack':result['sequence']}, auth)
        self.assertFalse(self.request('/api/state')[1]['pending'])
        self.assertEqual(self.request('/api/display/commands?after=1', headers=auth)[1]['commands'], [])

    def test_expiry_offline_and_limits(self):
        self.assertEqual(self.request('/api/command', {'action':'pause'})[0], 409)
        auth = self.connect_display()
        self.request('/api/command', {'action':'pause'})
        self.state.commands[0]['created'] -= 11
        self.assertEqual(self.request('/api/display/commands', headers=auth)[1]['commands'], [])
        for i in range(29):
            self.request('/api/command', {'action':'next'})
        self.assertEqual(self.request('/api/command', {'action':'next'})[0], 409)

    def test_boundaries(self):
        self.connect_display()
        self.assertEqual(self.request('/api/command', {'action':'reboot'})[0], 400)
        self.assertEqual(self.request('/api/command', {'action':'next'}, {'Origin':'https://evil.example'})[0], 403)
        self.assertEqual(self.request('/api/command', {'action':'next'}, {'Content-Type':'text/plain'})[0], 415)
        self.assertEqual(self.request('/api/state', headers={'Host':'evil.example'})[0], 403)
        self.assertEqual(self.request('/api/display/commands')[0], 403)
        self.assertEqual(self.request('/api/voice/command', {'action':'next'})[0], 403)
        self.assertEqual(self.request('/private/')[0], 404)
        self.server.local = False
        self.assertEqual(self.request('/api/display/bootstrap')[0], 403)

    def test_malformed_actions_are_rejected_without_breaking_server(self):
        self.connect_display()
        for action in ([], {}, None, 42):
            self.assertEqual(self.request('/api/command', {'action':action})[0], 400)
        self.assertEqual(self.request('/api/command', {'action':'next'})[0], 202)

    def test_wake_is_local_only_and_marks_voice_source(self):
        auth = self.connect_display()
        self.assertEqual(self.request('/api/voice/wake', {})[0], 403)
        self.assertEqual(self.request('/api/command', {'action':'wake'})[0], 400)
        self.assertEqual(self.request('/api/voice/wake', {}, auth)[0], 202)
        self.assertEqual(self.request('/api/voice/command', {'action':'next'}, auth)[0], 202)
        commands = self.request('/api/display/commands', headers=auth)[1]['commands']
        self.assertEqual([c['action'] for c in commands], ['wake','next'])
        self.assertTrue(all(c['source']=='voice' and c['age']>=0 for c in commands))
        self.server.local = False
        self.assertEqual(self.request('/api/voice/wake', {}, auth)[0], 403)

    def test_lan_playback_only(self):
        self.connect_display()
        token = self.request('/api/admin/login', {'password':'a good test password'})[1]['token']
        self.server.local = False
        origin = {'Origin':self.url}
        self.assertEqual(self.request('/api/command', {'action':'next'}, origin)[0], 202)
        for action in ('login', 'restart', 'logout'):
            self.assertEqual(self.request('/api/admin/'+action, {'password':'a good test password'}, {**origin, 'Authorization':'Bearer '+token})[0], 403)
        self.assertEqual(self.request('/api/display/bootstrap')[0], 403)
        self.assertEqual(self.request('/index.html')[0], 404)
        self.assertFalse(self.request('/api/state')[1]['adminConfigured'])
        self.assertEqual(self.restarts, [])

    def test_admin_auth_logout_expiry_and_disabled(self):
        self.assertEqual(self.request('/api/admin/restart', {})[0], 403)
        token = self.request('/api/admin/login', {'password':'a good test password'})[1]['token']
        auth = {'Authorization':'Bearer '+token}
        self.state.config['allow_restart'] = False
        self.assertEqual(self.request('/api/admin/restart', {}, auth)[0], 403)
        self.state.config['allow_restart'] = True
        self.assertEqual(self.request('/api/admin/restart', {}, auth)[0], 200)
        self.assertEqual(len(self.restarts), 1)
        self.assertEqual(self.request('/api/admin/restart', {}, auth)[0], 429)
        self.state.sessions[token] = time.monotonic()-1
        self.assertEqual(self.request('/api/admin/restart', {}, auth)[0], 403)
        token = self.request('/api/admin/login', {'password':'a good test password'})[1]['token']
        self.assertEqual(self.request('/api/admin/logout', {}, {'Authorization':'Bearer '+token})[0], 200)
        self.assertNotIn(token, self.state.sessions)

    def test_login_throttled(self):
        for i in range(5):
            self.assertEqual(self.request('/api/admin/login', {'password':'wrong'})[0], 403)
        self.assertEqual(self.request('/api/admin/login', {'password':'a good test password'})[0], 429)


class AudioTests(unittest.TestCase):
    @staticmethod
    def result(text, conf=1):
        return {'text': text, 'result':[{'word':w,'conf':conf} for w in text.split()]}

    def test_phrase_is_exact_confident_and_debounced(self):
        gate = PhraseGate()
        for text in ['next','monty next','hey monty restart','please hey monty next','hey monty next please']:
            self.assertIsNone(gate.accept(self.result(text), 10))
        self.assertIsNone(gate.accept(self.result('hey monty next', .8), 10))
        self.assertEqual(gate.accept(self.result('hey monty next'), 10), 'next')
        self.assertIsNone(gate.accept(self.result('hey monty next'), 11))
        self.assertEqual(gate.accept(self.result('hey monty management'), 14), 'controls')

    def test_wake_window_is_bounded_and_single_use(self):
        gate = PhraseGate()
        self.assertIsNone(gate.accept(self.result('next'), 1))
        self.assertIsNone(gate.accept(self.result('hey monty', .5), 2))
        self.assertEqual(gate.accept(self.result('hey monty'), 3), 'wake')
        self.assertEqual(gate.accept(self.result('next'), 4), 'next')
        self.assertIsNone(gate.accept(self.result('previous'), 8))
        self.assertEqual(gate.accept(self.result('hey monty'), 10), 'wake')
        self.assertIsNone(gate.accept(self.result('pause'), 19))
        self.assertEqual(gate.accept(self.result('hey monty controls'), 20), 'controls')

    def test_fresh_wake_allows_command_during_previous_cooldown(self):
        gate = PhraseGate()
        self.assertEqual(gate.accept(self.result('hey monty next'), 10), 'next')
        self.assertEqual(gate.accept(self.result('hey monty'), 11), 'wake')
        self.assertEqual(gate.accept(self.result('pause'), 12), 'pause')
        self.assertIsNone(gate.accept(self.result('resume'), 13))

    def test_sustained_tone_and_rearm(self):
        def chunk(hz):
            return [int(4000*math.sin(2*math.pi*hz*i/16000)) for i in range(1600)]
        gate=ToneGate()
        for i in range(20):
            self.assertFalse(gate.accept(chunk(1200), i*.1))
        for i in range(14):
            self.assertFalse(gate.accept(chunk(1800), 3+i*.1))
        self.assertTrue(gate.accept(chunk(1800), 4.5))
        for i in range(20):
            self.assertFalse(gate.accept(chunk(1800), 20+i*.1))
        for i in range(6):
            gate.accept([0]*1600, 25+i*.1)
        results=[gate.accept(chunk(1800), 30+i*.1) for i in range(20)]
        self.assertEqual(sum(results), 1)


if __name__ == '__main__':
    unittest.main()
