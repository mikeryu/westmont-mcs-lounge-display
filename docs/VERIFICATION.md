# Design iteration verification — September 13, 2026

## Checked locally

- Production build succeeds; eight focused Node test groups pass.
- Browser check passes across 16 views at 1920×1080: no missing images, no tested text overflowing its region, correct Dr. prefixes, Mike Ryu without a prefix, official rendered fonts, pause/wrap/timed rotation, event removal while paused, stale/unavailable weather, and empty categories.
- Every view was visually inspected. Six category previews at 640×360 were also inspected as distance-reading proxies. Faculty, alumni, event, program, CATLab, and conditions views have distinguishable layouts.
- Fall Kickoff uses the confirmed September 17, 2026, 5:30 PM Pacific start, Winter Lawn location, and Susan Leyva RSVP email. Its September 18 midnight cutoff is a visibility setting, not an invented end time.
- Official Font Awesome Free 7.3.1 icons are stored locally. Tests cover all supported WMO codes, night variants, and unknown conditions. The date precedes the time; that group is aligned toward the footer divider.

## Checked on the Pi

- Deployed with the official font installation step. Chromium’s rendered-font inspection reports **ITC Stone Serif Std** and **Museo Sans** for the heading/clock elements throughout the rotation. Evidence: `screenshots/v2/pi-font-check.json`.
- A live compositor screenshot verifies the actual full-screen kiosk, official signature/fonts, corrected faculty names, current weather, and final footer/icon arrangement: `screenshots/v2/pi-live-final.png`.
- Both services are enabled and active with `Restart=always`. Automatic process recovery was tested in v1; this iteration preserves those restart settings and the kiosk launcher.
- The previous release contains a valid site for rollback. Reinstalling an already selected release no longer overwrites the previous-release pointer.
- All deployed production file hashes match the local production build.
- Temporary browser inspection used a loopback-only port through SSH. The inspection browser was stopped afterward; the actual signage kiosk remains running.

## Maintenance handoff

README now leads with preview, editing people/stories, adding events, saving to Git, deployment, and recovery. SETUP covers first-time tools/fonts. PI contains the short recovery steps. TECHNICAL holds less common fields and implementation details. Westmont assets and screenshots are excluded from Git; private originals are retained on the Pi; fonts are installed locally rather than served over HTTP. Credentials were never printed or packaged.

The 640×360 previews are only a proxy: verify the physical lounge TV’s readability from normal seating, overscan, brightness, and sleep settings in person. No full-device reboot or long-duration hardware soak was performed. Screenshots outside the `v2/` folder document the earlier design.

Private-asset separation: build and all eight unit test groups pass. Pi images now live outside releases; both services remain active and the live logo URL responds successfully. Screenshot paths above refer to ignored local evidence, not files available in this public repository.

## QR and rotation update (local verification)

Removed the dedicated conditions slide; 15 views remain before the event cutoff. Faculty office names now use Winter Hall. Build and eight unit test groups pass. Chrome checks pass across all 15 slides, including decoding each rendered QR code to its expected URL/email destination, font use, image loading, text overflow, rotation, event expiry, and weather fallbacks. Faculty and event screenshots were visually reviewed. Office layout was clarified by the user: TV between the first and second office rows, facing south. Faculty slides now show viewer-relative arrows and a highlighted top-down office map. The final browser checks pass; the Patti slide was visually reviewed. Deployed successfully: both Pi services are active and the map module and faculty QR respond over the local display server.

## Automatic startup update

Installed npm on the Pi and deployed `scripts/install-startup.sh`. Shell syntax checks pass. Both services are enabled and active; the server runs `/usr/bin/npm start` with zero automatic restarts during verification, HTTP responds successfully, and Chromium launches with `--new-window` rather than kiosk mode. Desktop auto-login and graphical boot target are configured. No reboot was performed at the user’s request, so a full boot-cycle test is deferred until the static IP is assigned.

## Content and sequence refinement

Nine unit test groups pass, including the exact requested slide sequence and visibility of newly added content. All 15 browser views pass layout, official font, QR decoding, rotation, and weather checks. Math/CS/DA program slides and Prof. Mike Ryu’s faculty slide were visually inspected at 1080p. They include degree/minor lists, original gold subject illustrations, a subtle footer chapter indicator, and the map to the left of office directions below the tagline.

## Alumni and progression strip update

Added John Panos and Valentina Costarelli using Westmont biographies and the user-supplied LinkedIn QR destinations. Bailey 2023 and Valentina 2022 follow the user’s explicit confirmation. Nine tests and all 17 browser views pass, including QR decoding. The office label, separate progression strip above weather/time, and larger/heavier program emblems were visually reviewed.

## Poster events

Transcribed four user-supplied photos and incorporated the confirmed tutoring correction. Nine unit test groups and 20-view browser checks pass. Talk, Tea Time, and tutoring layouts were visually reviewed. Recurring announcements persist until removed; one-time event expiry is tested. No posters are committed to Git.

## Startup pointer nudge

Installed Bookworm ydotool and deployed a bounded startup helper. Pi journal confirms both nudges succeeded, the helper exited, and both display services stayed active. A compositor screenshot captured with `grim -c` (include cursor) was visually checked and showed no pointer. Tested by service restart, not a power-cycle or reboot.

## Cached release fix

Chromium was displaying older application code alongside current event data, preventing the weekly event slides from rendering correctly. Versioned the entry page, JavaScript imports, and stylesheet URLs. Build, nine unit test groups, and all 20 browser views pass. After deployment, Pi HTTP logs confirm requests for the versioned files; actual compositor screenshots verify both Tea Time and CS-10 Tutoring with their correct schedules and layouts. Both services remain active. No Pi reboot or network changes were performed.

## Local controls prototype — September 25, 2026

Not deployed. Pi inspection was read-only; USB PnP microphone enumerated, no capture attempted.

- Content build and all 10 existing Node tests passed. The existing browser suite also passed all 20 views, official-font checks, slide layout checks, rotation, expiry, and weather fallbacks.
- All 7 control/audio Python tests passed (authentication, authorization, rate limits, expiry, command delivery, exact phrases, tone gating).
- Headless Chrome: phone next/previous, pause/resume, five-minute expiry, QR open/close and decoding, 390px phone layout, footer spacing, and denied admin login passed without JavaScript errors.
- Temporary local HTTPS listener: certificate validation using a test CA passed; LAN bootstrap rejected; static responses require cache revalidation. Temporary test keys were removed automatically.
- Real Vosk small English model, synthetic speech: all six command phrases accepted; three negatives rejected. This is not a measurement of lounge recognition reliability or Pi CPU use.
- Preview screenshots are in ignored `docs/screenshots/controls/`; private visual assets remain out of Git.

Real microphone acoustics, campus phone reachability, TLS provisioning, and startup/recovery on the Pi remain deployment-trial checks; see [CONTROLS.md](CONTROLS.md).

## Pi trial — September 28, 2026

Deployed release `20260928T190705Z`, without rebooting. Live content confirms RAM and Recursion on October 27, noon–1 PM, and the challenge deadline October 26 at 9 PM.

- All 10 content tests and 7 control tests passed before deployment.
- Live Pi acknowledged pause, next, previous, and resume through an SSH tunnel.
- Admin login, protected kiosk restart, reconnection, and logout passed. Password was never printed; private local password file is ignored by Git.
- USB microphone captured two seconds to `/dev/null`; no audio file was saved.
- Vosk 0.3.45 installed in the private Pi environment; model ZIP checksum matched the locally tested model.
- Display, kiosk, and voice services active; voice heartbeat confirmed, zero listener restarts at inspection.
- HTTP listens on `127.0.0.1:8080` only. No campus HTTP/HTTPS listener was enabled. Phone QR suppressed pending TLS/network configuration; laptop trial uses SSH forwarding to port 18080.

Human speech recognition in the lounge remains an in-person test. Tone fallback remains off. The installer enabled voice for future desktop logins, but boot behavior was not tested by rebooting.

## Campus HTTP phone remote — September 28, 2026

Deployed release `20260928T191403Z` without reboot. Playback-only HTTP listens on port 8081; local kiosk/voice stays on loopback 8080. The TV QR now points to http://wmcs-lounge.westmont.edu:8081/control/.

All 10 content tests and 8 API/audio tests passed. A real Chrome mobile viewport connected directly from the laptop to the campus hostname, with no SSH tunnel: pause, next, previous, large QR open/close, and resume were acknowledged by the Pi. No password field, horizontal overflow, or JavaScript errors. All three admin endpoints and privileged display bootstrap were denied on the campus listener. Unit tests also verified denial with an otherwise valid admin token. Display, kiosk, and microphone services remain active. Other campus Wi-Fi networks may have different access policies.

## Voice UX design revision — September 29, local only

Removed persistent control QR; added the mic hint, eight-second listening overlay, opacity-animated edge glow, and 2.8-second command confirmation. Hidden controls still open the QR on demand. Reduced motion disables animation. Localhost-only `/voice-preview.html` simulates idle/listening/heard/offline without connecting to the Pi.

All 10 content and 10 control/audio tests passed. The browser check exercised wake and command endpoints to show the overlay and confirmation, alongside existing playback/QR checks. Synthetic speech using the real Vosk model recognized “Hey Monty” followed by silence and “Next” as `wake`, then `next`. Screenshots live in ignored `docs/screenshots/voice/`. Lounge acoustics remain untested for the two-step interaction; nothing deployed in this revision.

## Pre-deployment self-review — September 29

Fixed fresh wake commands being rejected by a previous command's cooldown, unbounded QR-settings fetch blocking control polling, malformed action payloads crashing a request handler, and `/control` without its trailing slash breaking relative assets. Listening expiry now includes transition time. Mic status DOM updates occur only when status changes. Replaced manually repeated character markup and removed superseded animation styles.

10 content and 12 API/audio tests passed. The control browser check passed; a new repeatable design check covers wake/confirmation transitions, timeout, rapid re-wake, the hidden QR command, offline state, and reduced motion. This remains local pending the user's final test.

## Approved deployment — September 29, 2026

Application commit `1ae5c81` was pushed to main and installed as Pi release `20260930T034437Z` (UTC timestamp). The approved voice UI, darkened background, animated phrase/edges, and delayed QR modal with Campus Wi-Fi instruction and a 60-second countdown are deployed. Earlier “local only” entries above describe historical stages.

Final checks passed: 10 content tests, 12 API/audio tests, control browser tests, and voice-preview transition/countdown tests. Live display, kiosk, and microphone services were active with zero voice restarts at inspection. The live kiosk acknowledged injected wake, controls, and dismiss commands. The campus phone page connected successfully; privileged wake and admin routes were rejected. No reboot occurred. Human speech accuracy and motion smoothness in the lounge still need in-person observation.
