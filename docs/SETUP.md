# Set up a computer for editing

Do this once on the computer you will use to edit the display.

1. Get a copy of this repository using Git. Open its folder in a plain-text/code editor, not Word.
2. Install Node.js 22 or newer and Python 3 if they are not already installed. Campus IT can help with this step.
3. Open a Terminal in the project folder. Create your local Pi configuration:

```sh
cp config/pi-target.example config/pi-target
```

Open `config/pi-target` in your editor. Replace `REPLACE-WITH-PI-ADDRESS` with the current address supplied by the maintainer, keeping `mcs-lounge@` before it. Keep just that one line, with no quotes or password. This file stays on your computer and is ignored by Git. Once IT confirms the internal domain works, you can use `mcs-lounge@wmcs-lounge.westmont.edu` instead.

Then run:

```sh
npm ci
sh scripts/fetch-private-assets.sh
python3 scripts/install-fonts.py
```

The first command installs the tools used to check the project. The second copies private display assets from the Pi (campus network/VPN and SSH access required). The third installs the official fonts from the supplied Westmont archive into your user font folder. On Windows, unzip `public/assets/westmont/Typeface.zip` and install the `.otf` files using Windows’ font installer instead of the Python command.

4. Close and reopen Chrome so it finds the fonts.
5. Follow [Preview on your computer](../README.md#1-preview-on-your-computer).

You also need access to the campus network or VPN and the Pi’s SSH password or key to send changes to the TV. Get credentials directly from the department’s maintainer. Do not put passwords into the content files or Git.

The deployment commands are written for macOS/Linux. On Windows, use a compatible shell such as WSL, or ask IT to help with the first deployment.
