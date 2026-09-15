# Get the TV display working again

Try these steps in order. You do not need to edit the application code.

## 1. Check the screen and cables

Check that the TV is on, the correct HDMI input is selected, and the Pi has power. When moving it to the lounge, use the TV’s “Screen Fit” or “Just Scan” setting so the edges are not cut off. Use 1920×1080 resolution.

## 2. Restart the display

On your computer, open Terminal and connect to the Pi:

```sh
ssh mcs-lounge@10.127.8.21
```

Enter the password if prompted. You are now typing commands **on the Pi**. Run:

```sh
systemctl --user restart westmont-display westmont-kiosk
systemctl --user is-active westmont-display westmont-kiosk
```

You should see `active` twice. Check the TV, then type `exit` to return to your computer.

The two names refer to the small web server and a normal Chromium browser window. Both are set to start with the Pi’s desktop and restart if they crash.

## 3. Undo the last deployment

If a new version caused the problem, connect to the Pi as in step 2. Run:

```sh
base="$HOME/.local/share/westmont-display"
previous=$(readlink "$base/previous")
if [ -n "$previous" ] && [ -d "$previous" ]; then
  ln -sfn "$previous" "$base/current"
  systemctl --user restart westmont-display westmont-kiosk
else
  echo "No previous version was found. Ask the maintainer for help."
fi
```

This switches the TV back to its previous saved version. It does not undo your files or Git history. Correct those separately before deploying again. Type `exit` when finished.

## 4. Get useful information for IT

If it still does not work, run this **on the Pi** and copy the output into your request for help:

```sh
journalctl --user -u westmont-display -u westmont-kiosk -n 40 --no-pager
```

This shows recent service messages. Do not include password files.

If only weather is missing, the rest of the display should keep working. Check the Pi’s internet connection. Weather retries every 15 minutes; “Last known conditions” means it has older data.

For technical details, see [TECHNICAL.md](TECHNICAL.md). The planned hostname `wmcs-lounge.westmont.edu` should replace the IP in these commands only after IT confirms it is ready.

## Set up automatic startup again

Deploying installs startup automatically. To reinstall it yourself, connect to the Pi and run:

```sh
sh ~/.local/share/westmont-display/current/scripts/install-startup.sh
```

At boot, the Pi logs into its desktop, starts `npm start`, and opens the display in a full-screen kiosk window. The launcher waits until the desktop and webpage are ready. Both services restart if they stop. The service name `westmont-kiosk` is kept so the recovery commands above still work.

On a replacement Pi, install the prerequisites with `sudo apt-get install npm python3 chromium ydotool`. Enable **Desktop Autologin** in `sudo raspi-config`, then deploy. Build tools run on your editing computer; the Pi does not need `npm install`. `npm start` runs the Python static server already defined in this project.

At browser startup, `scripts/nudge-pointer.sh` moves the pointer one small step twice, about 9 and 20 seconds after launch. This lets Chromium apply the page’s invisible cursor after power recovery. The physical mouse still works. The helper uses Bookworm’s ydotool 0.1.x and the Pi account’s existing passwordless sudo; failures are logged but do not stop the display. No ongoing mouse movement is scheduled.
