# Update the department lounge display

This project runs the TV display for Westmont College’s Department of Mathematics and Computer Science. Most updates mean changing a few words in a file, checking the result, and sending it to the TV.

**Use a computer on the campus network or VPN.** The commands below run in a Terminal opened in this project’s folder, unless a step says otherwise. Open that folder in your text editor too.

Official images, logos, font archives, and display screenshots are kept out of this public repository. The Pi holds the private assets; the setup guide explains how authorized editors can copy them for local previews. Deployment preserves the Pi’s assets and installed fonts.

## 1. Preview on your computer

On a computer already set up for this project:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:8080** in Chrome. Leave the Terminal open while you preview. Press **Space** to pause the slides, **←/→** to move, and **Home** to return to the welcome.

After editing a file, save it. In a second Terminal in the same project folder, run `npm run build`, then refresh Chrome. If the build reports an error, fix the named file before continuing. Press **Ctrl+C** in the first Terminal when finished.

**First time on this computer?** Follow the short [computer setup guide](docs/SETUP.md) first. That includes installing Westmont’s supplied fonts.

## 2. Change a person or story

Open one of these files in your editor. Find the person or program and change the text between quotation marks.

| What you want to change | File | Text shown on the TV |
| --- | --- | --- |
| Faculty | `data/faculty.json` | `name`, `displayFocus`, `office` |
| Alumni | `data/alumni.json` | `name`, `classYear`, `displayStory` |
| Programs | `data/programs.json` | `name`, `shortName`, `headline` |
| CATLab | `data/features.json` | `name`, `displayStory` |
| Events | `data/events.json` | See step 3 |

For example, a faculty entry includes:

```json
"name": "Dr. Anna Aboud",
"displayFocus": "Mathematics that powers data science",
"office": "Winter 302"
```

Keep the short descriptions to one sentence. Long paragraphs are hard to read across the lounge. Longer `summary` and `role` fields are background records; they are not shown on the current faculty slide.

Keep **Dr.** before the six doctoral faculty members’ names. **Mike Ryu** has no prefix. `photo` points to an image in `public/assets/`. Keep existing photos unless replacing them with an approved image.

These files use **JSON**, a text format with quotation marks, commas, and brackets. Keep that punctuation in place. Do not add a comma after the last item in a list. `npm run build` checks for mistakes before anything reaches the TV.

## 3. Add or change an event

Open `data/events.json`. Fall Kickoff is already there. Edit that entry, or copy it to make another event. Separate two entries with a comma and give the new one a different `id`.

```json
{
  "id": "fall-kickoff-2026",
  "name": "Fall Kickoff",
  "kind": "Department dinner",
  "start": "2026-09-17T17:30:00-07:00",
  "hideAfter": "2026-09-18T00:00:00-07:00",
  "location": "Winter Lawn",
  "rsvpEmail": "sleyva@westmont.edu",
  "rsvpContact": "Ms. Susan Leyva",
  "source": "Department announcement provided by Mike Ryu",
  "sourceType": "user",
  "verifiedAt": "2026-09-13"
}
```

- `start` is the event’s date and time. Here, `17:30` means **5:30 PM** on **September 17, 2026**.
- `hideAfter` is when to remove the announcement. Here, midnight after Thursday ends. **It does not claim the dinner ends at midnight.** If you know the actual end time, replace `hideAfter` with `end` and enter that time. Use one or the other.
- The final `-07:00` means Pacific daylight time. Use `-08:00` during Pacific standard time. Take care with events near the March or November clock change.
- `source` says who confirmed the information; `verifiedAt` is when it was checked. `sourceType: "user"` means the details came from a person rather than a webpage.
- No RSVP deadline is shown because none was supplied. Email RSVP details are required by this event layout.

To remove all events, replace the file contents with `[]`. The other slides continue normally.

## 4. Check, save to Git, and send to the TV

These are three separate actions:

| Action | What it does |
| --- | --- |
| Save in your editor | Changes the files on your computer |
| Commit and push in Git | Records the changes and shares them with colleagues |
| Deploy | Sends your saved files to the Raspberry Pi and updates the TV |

First run `npm run build` and check your edits in the preview. Record your changes using your usual Git app, or these commands for content edits:

```sh
git add data/
git commit -m "Update lounge display content"
git push
```

Then update the TV:

```sh
sh scripts/deploy.sh
```

Enter the Pi’s password if prompted. Typing a password in Terminal normally shows no characters. The command finishes with two `active` lines when both services are running. Check the TV afterward. **Pushing to Git alone does not update the TV.**

The script currently uses `10.127.8.21`. Once IT confirms the new address, you can use `sh scripts/deploy.sh mcs-lounge@wmcs-lounge.westmont.edu` instead.

New to Git? See the [official Git beginner tutorial](https://git-scm.com/docs/gittutorial).

## 5. If the TV stops working

Start with the [short Pi recovery guide](docs/PI.md). It explains restarting the display and returning to the previous version.

For less common changes, data fields, weather details, font installation, and developer checks, see the [technical reference](docs/TECHNICAL.md).
