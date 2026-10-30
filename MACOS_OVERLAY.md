# CopyPanda macOS overlay preview

Status: implementation and automated build validation in progress. First device
target is the user's Apple Silicon Mac; the app and helper both target Universal 2
(arm64 and Intel x86_64). Minimum deployment target: macOS 11.

## Shared experience

Use the existing Godot app, artwork, Focus / Break toggle, pause/resume, calendar,
notes, goals, leaves, bookmark, optional rooms, and layout editing. The Mac app
does not load a browser runtime or the full café background. Motion, contrast,
and text controls remain available. Email sign-in stays disabled pending sender
setup, matching the Windows preview.

macOS gets menu-bar recovery, a Dock **Show overlay** command, Retina-aware
rendering, macOS wording/system fonts, and native workspace sleep/session events.
The Dock remains visible for recovery; this is not an agent-only background app.
Always-on-top targets the current desktop. Other Spaces and full-screen apps
need device testing and are not yet promised.

## Sleep and privacy

The bundled Swift helper subscribes to public NSWorkspace sleep/wake, display
sleep, and user-session notifications. It writes small atomic events for Godot,
exits with its parent, and does not register to run at login. Those events pause
the timer; wake never resumes it automatically. Changing foreground apps does
not pause study. The existing long-gap fallback remains active.

No keyboard hooks, screen recording, Accessibility permission, location, camera,
or app monitoring are used. Screen locking without display sleep is not yet
verified. Do not describe this helper as complete screen-lock detection.

Normal saves use `~/Library/Application Support/CopyPanda/`. QA app runs use a
separate `qa/` folder there, never the signed `.app` bundle. Account caches stay
separate from guest saves. macOS and Windows local data do not sync until the
separate account rollout is enabled.

## Build on a Mac

Install Python 3.9+ and Apple's Xcode Command Line Tools. From this repository:

```sh
python3 overlay/scripts/install-macos-tools.py
export GODOT="$PWD/overlay/.build/godot-tools/Godot.app/Contents/MacOS/Godot"
python3 overlay/scripts/run-checks.py --godot "$GODOT"
bash overlay/scripts/build-macos.sh
python3 overlay/scripts/smoke-macos.py
```

The installer downloads Godot 4.7.2 and its matching official template archive,
verifies pinned SHA-256 hashes, and extracts the Mac template. The first download
includes the full export archive (about 1.3 GB); later builds reuse local tools.
The build compiles arm64 and x86_64 helper binaries, combines them, exports the
app, inserts/signs the helper, validates both Mach-O architectures and executable
permissions, and packages using `ditto`. No Windows binaries or QA data enter
the app. A checksum accompanies the ZIP in `overlay/.build/macos/`.

The **macOS overlay preview** GitHub Actions workflow performs these steps on
an Apple Silicon `macos-15` runner and uploads the ZIP as an artifact. It has
read-only repository permissions, needs no secrets, and does not deploy Pages
or automatically publish a release. Download the artifact from the successful
run, then extract the included native ZIP to get `CopyPanda.app` and its README.

## Distribution boundary

This first build uses an ad-hoc development signature. It is not a Developer ID
signature or an Apple-notarized release. macOS may require normal user approval
to launch it. Do not disable Gatekeeper or remove security protections. Production
distribution needs the developer's Apple signing/notarization setup, kept outside
the repository. Neither signing credentials nor a paid subscription are needed
to compile this preview.

Keep the website's Windows download accurate. Add a public Mac download after
the app has passed the first device smoke test; until then link to the build
workflow/source as an experimental preview.

## First Apple Silicon device check

1. Extract and move the app to Applications. Confirm the panda background is
   transparent and every visible control accepts clicks.
2. Start, pause, resume, and switch Focus / Break. Confirm a paused partial focus
   timer asks before switching and preserves earned full minutes.
3. Drag with the circular handle, resize in Adjust overlay, and test an external
   display and Retina scaling. Cancel must restore the previous layout.
4. Hide and recover from the menu-bar icon and Dock command. Check ordinary app
   switching, a second Space, and a full-screen app separately.
5. Sleep/wake, display sleep, and screen lock/unlock must not add unattended time.
   Confirm wake leaves the timer paused; report any lock-only gap.
6. Check Cmd+Q/bookmark, quit/relaunch recovery, notes, and optional code/QR rooms.
   Verify the app bundle signature remains valid after saving and QA use.

Automated headless tests and signatures cannot certify transparency, native
menus, permissions, Spaces behavior, accessibility, or physical sleep/lock events.

References: [Godot macOS export](https://docs.godotengine.org/en/4.7/tutorials/export/exporting_for_macos.html),
[window/input support](https://docs.godotengine.org/en/4.7/classes/class_displayserver.html),
[NSWorkspace session notifications](https://developer.apple.com/documentation/appkit/nsworkspace/sessiondidresignactivenotification).
