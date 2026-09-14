# Technical reference

## App and data

Plain JavaScript and CSS; no runtime npm dependencies. `npm run build` validates `data/*.json`, then copies `src/` and the public files into `dist/`. ZIP archives are excluded. The browser reads `dist/content.json` once on startup; deploy restarts it to load changes. No database or write endpoints exist.

The stage is 1920×1080, scaled uniformly to fit smaller preview windows. Faculty and alumni have distinct treatments; program names lead their slides. The persistent status bar uses 86 px time and 52 px weather text. A dedicated conditions slide appears every rotation. Main content text is normally 40–166 px. Long background biographies remain in data, not on screen.

The rotation starts with welcome and active events, then interleaves programs, faculty, alumni, and features. The dedicated clock/weather slide follows the first group. Empty categories are skipped; welcome and conditions remain. Space pauses/resumes, arrows change slides, Home returns to welcome. The clock and expiry logic continue while paused. `config.slideSeconds` controls dwell time (default 18 seconds; timer granularity one second).

### Less common fields

- `photo`: existing local path, e.g. `assets/anna-aboud.jpg`. Add approved photos to `public/assets/`; keep the source and date in `data/assets.json`.
- `source`: HTTPS source URL for published information, or a description of the person providing it together with `sourceType: "user"`.
- `verifiedAt`: date the information was checked, `YYYY-MM-DD`.
- Faculty `availability`: `null` by default. To show a manually confirmed temporary label, use `{"text":"Office hours today, 2–3 PM", "until":"2026-09-17T15:00:00-07:00"}`. The label expires automatically. Never infer presence from an online profile.
- Event `publishAt`: optional offset-bearing timestamp; hide the event until that instant. Without it, the event appears immediately.
- Event `end` or `hideAfter`: exactly one required, later than `start`. `end` is a known end time; `hideAfter` is only an announcement cutoff. Expiry is checked each second. Fall Kickoff has no invented end time or RSVP deadline.
- Keep short faculty focus text under 75 characters, alumni stories under 110, and CATLab feature text under 100. Always preview edits; character limits alone cannot prove a good layout.

## Official identity and fonts

The unmodified primary signature comes from the user-supplied `public/assets/westmont/Primary Signature.zip`. Official maroon `#9D2235`, gray `#63666A`, gold `#CEB888`, white, and secondary navy `#004F71` anchor the design.

The supplied `Typeface.zip` contains Museo Sans and ITC Stone Serif desktop fonts. `scripts/install-fonts.py` installs original OTF files into the current user’s fonts directory. CSS references **local** `MuseoSans-500`, `MuseoSans-700`, and `StoneSerifStd-Medium`. Fonts are not linked for HTTP download. On the Pi they live in `~/.local/share/fonts/westmont-display`; on macOS in `~/Library/Fonts/WestmontDisplay`. The supplied font license/archive remains intact. The code license does not relicense fonts or College imagery.

Deployment uploads the font archive outside `dist/` and installs the fonts before activating the new release. To check installation on the Pi, use `fc-match 'Museo Sans'` and `fc-match 'ITC Stone Serif Std'`. Browser verification also checks the actual rendered font families through Chromium’s font inspection API, since fontconfig alone is not proof of browser use.

## Sources and weather

Existing faculty/program/alumni facts were checked September 13, 2026 against the official Westmont pages and linked profiles, recorded in each entry. CATLab’s feature is based on its [official overview](https://www.westmont.edu/center-applied-technology/catlab): summer internships, professional mentorship, and practical experience. Fall Kickoff was confirmed by Mike Ryu in the September 13 request. Faculty honorifics follow his explicit correction.

Weather queries use exactly **34.449789, -119.659331**, a Westmont campus reference point from [Wikidata](https://www.wikidata.org/wiki/Q3444458). This converts 34°26′59.240″N, 119°39′33.592″W; it is not a surveyed lounge location. [Open-Meteo](https://open-meteo.com/en/docs) may return the coordinates of a nearby model grid cell. Its conditions are modeled, not readings from a campus sensor.

Refresh every 15 minutes, timeout 10 seconds. Cache observations in localStorage. Label them “Last known conditions” after 30 minutes without a successful fetch or when the observation is over an hour old. Hide after 24 hours. No network is needed for core content, even following a restart. The clock uses the device’s system clock, formatted in `America/Los_Angeles`. Keep NTP enabled on the Pi.

## Deployment internals

The inspected Pi is a Raspberry Pi 5 running Bookworm, labwc/Wayland, Chromium, and Python 3. Existing desktop autologin starts its user services. `scripts/deploy.sh` builds locally, creates a dated release under `~/.local/share/westmont-display/releases/`, installs fonts, updates `current` and `previous` symlinks, and restarts the services.

The Python server listens on loopback port 8080. Chromium has a dedicated profile at `~/.local/share/westmont-display/chromium`, uses Wayland, and waits for the compositor socket. `--password-store=basic` avoids the initial keyring dialog; this profile does not store login credentials. Its browser sandbox remains enabled. Server and kiosk exits restart after three and five seconds respectively.

Service files are under `~/.config/systemd/user/`. To pause the kiosk for maintenance, run `systemctl --user stop westmont-kiosk`; to resume, use `start`. To disable both at login, use `systemctl --user disable --now westmont-kiosk westmont-display`. Existing desktop files and unrelated services are preserved.

For SSH-tunneled viewing from your computer: `ssh -L 8081:127.0.0.1:8080 mcs-lounge@10.127.8.21`, then open http://127.0.0.1:8081. No campus-facing web listener is required. The requested new DNS name is not assumed active.

Rollback in PI.md switches app and launcher files. If a future release changes service definitions, run the selected release’s `scripts/install-pi.sh` to restore those definitions. The installer does not overwrite `previous` when reinstalling the already selected release. Keep older releases until the new version is accepted.

## Developer checks

```sh
npm ci
npm run build
npm test
# With the preview server running and Chrome installed:
npm run test:browser
```

The browser check fixes time before Fall Kickoff, inspects all 16 views at 1080p, checks actual official font use and image loading, captures 640×360 distance proxies, tests rotation/pause/wrap, advances past the event cutoff while paused, and exercises stale/unavailable weather and empty categories. Screenshots are in `docs/screenshots/v2/`.

Remote screenshots cannot prove physical TV brightness, overscan, viewing distance, cable quality, sleep settings, or long-running hardware stability. Check those in the lounge after installation.

`SSHPW.key` and `*.key` are ignored by Git and excluded from deployment. Never put credentials in content, commands, logs, or screenshots.

### Weather icons

Ten locally bundled **Font Awesome Free 7.3.1** SVGs provide clear, partly cloudy, cloudy, fog, rain, snow, storm, and unknown-condition icons. Clear and partly cloudy conditions use day/night variants from Open-Meteo’s `is_day` value. Text labels remain visible; icons are decorative for accessibility. No CDN, icon font, or external icon request is used.

The unmodified paths are in `src/weather-icon-paths.js`, generated by `node scripts/generate-weather-icons.mjs` from the pinned official npm package. Keep the attribution comments and `public/fontawesome-LICENSE.txt` (CC BY 4.0 for icons). The package is development-only; production includes only the selected paths. Source: https://github.com/FortAwesome/Font-Awesome.

## Private College assets

`public/assets/` and `docs/screenshots/` are ignored by Git, including original archives and screenshots containing College imagery. Authorized editors run `sh scripts/fetch-private-assets.sh` once before building. Builds validate the local asset copies. Releases exclude `dist/assets`; the Pi installer links it to `~/.local/share/westmont-display/private-assets`. Original archives live separately in `~/.local/share/westmont-display/private-sources` and are never served over HTTP. Installed fonts remain in the user font directory. Back up both private directories and the installed fonts before replacing the Pi. New or replacement approved images must be copied to the Pi’s private-assets directory separately before deploying content that references them.
