# Lounge remote and “Hey Monty”

The campus playback remote uses **http://wmcs-lounge.westmont.edu:8081/control/**. Scan the TV's QR while connected to a campus network that can reach the Pi. No password is requested. Playback requests use plain HTTP; all admin API routes are denied on campus listeners, even with valid credentials. The phone page has no administration section.

For maintenance, use `sh scripts/ssh-pi.sh`, then `systemctl --user restart westmont-kiosk`. The local admin API remains restricted to loopback/SSH. HTTPS can be added later without changing the playback controls.

## Everyday use

Say “Hey Monty, controls” to reveal the phone QR. The phone page can pause for five minutes, resume, move forward or backward, or show a larger QR code. Pauses end automatically so the display is not accidentally left stopped. Anyone who can reach the page on the campus network can use playback controls.

Say “Hey Monty,” then a command within eight seconds, or use a complete phrase:

- “Hey Monty, controls” — show the large QR for one minute.
- “Hey Monty, pause” or “Hey Monty, resume.”
- “Hey Monty, next” or “Hey Monty, previous.”
- “Hey Monty, management” — also show the QR.

The section bar shows a subtle mic prompt, or “Voice unavailable” if the listener stops. Wake recognition brings up a glowing command overlay; accepted commands show confirmation. The unlisted controls command opens the QR after confirmation fades, then counts down 60 seconds before automatically closing. Connect the phone to “Campus” Wi-Fi. There is no recording archive: audio is processed in memory on the Pi, with no cloud speech service or transcript logging. Voice never restarts anything. Restarting the browser is handled through SSH; it is not a phone control. Event editing remains a future feature.

If a command is missed, try once more or scan the QR. The remote continues working without a microphone. If the phone cannot connect, campus network isolation may be blocking it; the QR itself cannot bypass that.

## Why this approach

| Option | Decision |
| --- | --- |
| Vosk small English model | Selected. Offline, constrained vocabulary, no account or per-minute charge. Model is about 40 MB; the published small-model memory estimate is roughly 300 MB. |
| openWakeWord | Useful for a future custom Monty detector, but a custom phrase needs training and evaluation. Bundled pretrained models carry noncommercial/share-alike terms, separate from the code license. |
| Porcupine | Offline and purpose-built, but requires an account AccessKey and platform-specific custom models. More dependency on an external vendor for this small project. |
| On-demand QR | Phone fallback, revealed by the unlisted controls command. The URL can also be opened directly if voice is unavailable. No app installation. |
| Sustained tone | Experimental, off by default. A dominant 1,800 Hz tone for 1.5 seconds opens the QR only. The phone can play a two-second test tone. |

“Hey Monty” is more distinctive than “Monty” alone. Vosk is a speech recognizer with a limited phrase list, **not a specially trained Monty wake-word model**. Only exact final results with sufficient word confidence are accepted. A standalone wake opens an eight-second, single-command window; command words outside it are rejected. An unknown-word alternative, a three-second cooldown, and a ten-second command expiry reduce accidental/repeated actions. These safeguards do not establish an acoustic false-positive rate; that needs a real lounge trial. No LLM or GPU is involved.

The tone requires silence before it can retrigger and has a ten-second cooldown. Speakers, room reflections, and other sounds can affect it. It is not a password, and should remain off unless testing shows it helps.

Sources: [Vosk models and licenses](https://alphacephei.com/vosk/models), [Vosk installation](https://alphacephei.com/vosk/install), [Vosk microphone example](https://github.com/alphacep/vosk-api/blob/master/python/example/test_microphone.py), [openWakeWord and licensing](https://github.com/dscripka/openWakeWord), [Porcupine documentation](https://picovoice.ai/docs/porcupine/).

## Local preview

The normal `npm run build` and `npm start` commands work without voice dependencies. Open the display in one tab and `http://127.0.0.1:8080/control/` in another. Keep the display tab open. A localhost QR is only a desktop preview; a phone needs the Pi's campus URL.

For another port, put the matching `public_url` in ignored `config/controls.json`, rebuild, and run `python3 control/server.py --port 8090`. The review preview used port 8090. `DISPLAY_CONTROLS_CONFIG` can select a separate build/runtime config, allowing the Pi build to use port 8080 without changing the laptop preview settings. Build copies **only the public URL**, never passwords or private TLS material, into the website.

## Campus setup and optional HTTPS

The Pi private config is `~/.config/westmont-display/controls.json`. For the current playback-only setup, set `lan_http_enabled: true`, `lan_port: 8081`, `show_remote_qr: true`, and `public_url: "http://wmcs-lounge.westmont.edu:8081/control/"`. Include the hostname in `allowed_hosts`. The kiosk and voice listener keep using loopback port 8080.

The build must use the same public URL to generate its QR. Select a local build config using `DISPLAY_CONTROLS_CONFIG=PATH sh scripts/deploy.sh`. Private config, admin hashes, and TLS files are never shipped in the website. Ask IT to allow TCP 8081 from the intended campus phone networks; no public internet exposure is needed.

For HTTPS later, obtain a trusted certificate from IT, set absolute `tls_cert` and `tls_key` paths, turn `lan_http_enabled` off, set `lan_port: 8443`, and change the public URL to HTTPS on that port. Rebuild and deploy the QR. Keep the key and private config readable only by the Pi account. This implementation still denies administration on the campus listener; enabling phone administration would be a separate change.

## Optional microphone setup on the Pi

The read-only hardware check found a USB PnP Sound Device. Its proposed stable ALSA name is `plughw:CARD=Device,DEV=0`; verify with `arecord -l` if the microphone changes. The trial checks capture without saving audio. Room acoustics still require an in-person test.

After deploying the approved release:

```sh
sudo apt-get install python3-venv alsa-utils unzip
mkdir -p ~/.local/share/westmont-display/models
python3 -m venv ~/.local/share/westmont-display/voice-venv
~/.local/share/westmont-display/voice-venv/bin/pip install -r ~/.local/share/westmont-display/current/voice/requirements.txt
```

Download the **vosk-model-small-en-us-0.15** ZIP from the official [model list](https://alphacephei.com/vosk/models), then extract it under that `models` folder. Model license: Apache 2.0; retain its license files. The ZIP tested locally had SHA-256 `30f26242c4eb449f948e42cb302dd7a686cb29a3423a8367f99ff41780942498`. Models and the Python environment stay outside release folders and are not committed or downloaded at boot.

In the Pi's private config, set `voice_model` to the **absolute path** of the extracted model directory, `voice_enabled` to `true`, and `voice_device` to the ALSA name. Keep `voice_phrase` as `hey monty` and `tone_enabled` as `false` for the first trial. Then:

```sh
sh ~/.local/share/westmont-display/current/scripts/install-voice.sh
systemctl --user status westmont-voice
```

The listener retries after 15 seconds if the microphone disappears. Signage and phone controls operate independently. Later deployments restart the listener only if it was explicitly enabled before.

To stop listening now and after future boots:

```sh
systemctl --user disable --now westmont-voice
```

To re-enable it, use `systemctl --user enable --now westmont-voice`. Unplugging the mic also stops capture, although the service will keep retrying. Check errors with `journalctl --user -u westmont-voice -n 30`; logs omit recognized speech and audio.

## Verification and trial checklist

Local checks cover command delivery/acknowledgement, offline and expired commands, rate limits, origin and Host restrictions, admin authentication/expiry/logout, restart permissions, exact phrase gating, and sustained-tone gating. Browser checks cover phone navigation, five-minute automatic resume, QR decoding, overlay dismissal, mobile layout, and footer spacing. Commands use one shared state across the local and HTTPS listeners; microphone commands can only use the local listener.

The actual Vosk model accepted all six supported synthetic spoken phrases and rejected three negative examples, including “Hey Monty, restart.” This demonstrates wiring, not real-room dependability or Pi performance. The deployment trial reads microphone audio into memory without saving it. Real-room command accuracy is not established by these synthetic checks.

Before calling the feature ready:

- Try all commands from the seating area with several people, first quietly and then with normal conversation.
- Leave it through a busy lounge period and count accidental activations. If too frequent, disable voice and keep the QR while tuning or considering a trained detector.
- Check CPU/memory use and slide smoothness on the Pi.
- Unplug/replug the microphone; verify recovery and uninterrupted slides.
- Verify the QR and protected restart from intended campus phone networks.
- Test startup during an approved reboot window; do not reboot just for installation.

Developer commands: `npm test`, `npm run test:controls`, and (with the 8090 preview running) `node scripts/controls-browser-check.mjs`. `voice/listen.py --config PATH --wav FILE` accepts mono 16-bit 16 kHz test WAVs and prints accepted actions only.

## Final local review

The design preview at `/voice-preview.html` includes a fifth button for the unlisted QR command. Buttons simulate recognition; they do not activate a microphone or send commands to the Pi. Use it to review wake, recognition, timeout dismissal, offline, and QR states. `node scripts/voice-preview-check.mjs` checks transitions, rapid re-wake during dismissal, timeout, QR countdown and automatic close, and reduced motion.
