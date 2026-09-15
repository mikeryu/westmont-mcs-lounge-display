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
