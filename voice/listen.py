#!/usr/bin/env python3
"""Offline USB-mic listener: transient PCM only, no audio/transcript files or logs."""
import argparse
import array
import json
from pathlib import Path
import signal
import subprocess
import sys
import time
import urllib.request
from detector import ACTIONS, PhraseGate, ToneGate


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True)
    parser.add_argument('--url', default='http://127.0.0.1:8080')
    parser.add_argument('--wav', help='Process a test WAV instead of a microphone; prints accepted actions only')
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    if not config.get('voice_enabled') and not args.wav:
        print('Voice disabled in configuration.', flush=True)
        return
    from vosk import Model, KaldiRecognizer, SetLogLevel
    SetLogLevel(-1)
    model = Model(config['voice_model'])
    phrase = config.get('voice_phrase', 'hey monty').lower()
    # Reject unknown wake words rather than silently dropping them from the grammar.
    vocabulary = set(phrase.split()) | set(ACTIONS)
    if any(model.vosk_model_find_word(word) < 0 for word in vocabulary):
        raise SystemExit('Wake phrase contains a word absent from the model; choose a supported phrase.')
    recognizer = KaldiRecognizer(model, 16000, json.dumps([phrase]+list(ACTIONS)+[f'{phrase} {a}' for a in ACTIONS]+['[unk]']))
    recognizer.SetWords(True)
    gate, tone = PhraseGate(phrase), ToneGate()
    token = ''
    last_status = 0

    def call(path, data=None):
        nonlocal token
        if not token:
            with urllib.request.urlopen(args.url+'/api/display/bootstrap', timeout=3) as response:
                token = json.load(response)['token']
        headers = {'Authorization': 'Bearer '+token}
        if data is not None:
            headers['Content-Type'] = 'application/json'
        request = urllib.request.Request(args.url+path, data=json.dumps(data).encode() if data is not None else None, headers=headers)
        with urllib.request.urlopen(request, timeout=3) as response:
            return json.load(response)

    def dispatch(action):
        nonlocal token
        if args.wav:
            print(action, flush=True)
            return
        try:
            call('/api/voice/wake' if action == 'wake' else '/api/voice/command', {'action': action})
        except Exception:
            token = ''  # Retry bootstrap on next command. Never replay delayed voice commands.

    process = None
    if args.wav:
        import wave
        stream = wave.open(args.wav, 'rb')
        if (stream.getnchannels(), stream.getsampwidth(), stream.getframerate()) != (1, 2, 16000):
            raise SystemExit('Test WAV must be mono, signed 16-bit PCM, 16000 Hz')
        read = lambda: stream.readframes(1600)
    else:
        # Stable ALSA card name, not the USB enumeration number, configurable for replacement mics.
        process = subprocess.Popen(['arecord', '-q', '-D', config.get('voice_device', 'plughw:CARD=Device,DEV=0'),
                                    '-t', 'raw', '-f', 'S16_LE', '-r', '16000', '-c', '1'], stdout=subprocess.PIPE)
        read = lambda: process.stdout.read(3200)
        stream = process.stdout
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    print('Offline listener ready; audio is not saved.', file=sys.stderr, flush=True)
    try:
        frames = 0
        while True:
            chunk = read()
            if not chunk:
                if not args.wav:
                    raise RuntimeError('Microphone disconnected; service will retry')
                break
            frames += len(chunk)//2
            now = frames/16000 if args.wav else time.monotonic()
            samples = array.array('h', chunk)
            if sys.byteorder != 'little':
                samples.byteswap()
            if config.get('tone_enabled') and tone.accept(samples, now):
                dispatch('controls')
            if recognizer.AcceptWaveform(chunk):
                action = gate.accept(json.loads(recognizer.Result()), now)
                if action:
                    dispatch(action)
            if not args.wav and now-last_status >= 5:
                last_status = now
                try:
                    call('/api/voice/status', {'tone': bool(config.get('tone_enabled'))})
                except Exception:
                    token = ''
        if args.wav:
            action = gate.accept(json.loads(recognizer.FinalResult()), frames/16000)
            if action:
                dispatch(action)
    finally:
        stream.close()
        if process:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == '__main__':
    main()
