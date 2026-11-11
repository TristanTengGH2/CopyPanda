# CopyPanda Windows overlay

Godot 4.7.2 / GDScript native alpha. Open `project.godot` in Godot or run
`godot --path overlay`. Windows 10/11 x64 is the initial target.

The compact transparent window reuses the approved six-frame panda artwork.
It has a monotonic focus/break timer, pause/resume, full-minute leaves plus
a small completion bonus, local notes, journal, forgiving commitments,
optional exit bookmarks, positioning, tray recovery, and accessibility settings.
Settings > Adjust overlay opens a lightly dimmed, transparent desktop editing
layer. Drag the preview to move it or a corner to resize it proportionally;
buttons, text, and icons scale with the panda. Save applies the layout;
Cancel/Escape restores the previous layout. The old CopyPanda drag bar and
size/corner presets are removed. Calendar uses month names, outlines today,
and places a dot below dates with study records. Navigation uses labeled icons,
and balances have a leaf icon.
An active timer continues while other apps have focus and while hidden.
Recovered timers start paused. Reduced motion freezes the panda.

## Build

Use the official Godot 4.7.2 Windows x86_64 release template from the
[Godot release](https://github.com/godotengine/godot/releases/tag/4.7.2-stable).
The editor and template versions must match. With .NET Framework's C# compiler
available on Windows:

```powershell
./overlay/scripts/build.ps1 -Godot 'C:\path\Godot.exe' -WindowsTemplate 'C:\path\windows_release_x86_64.exe'
```

The portable folder contains the executable, PCK, session helper, and instructions.
Build outputs, QA data, and templates are ignored by Git. Keep all portable files together.
No full cafe background or browser runtime is loaded by the overlay.

## Verify

```powershell
godot --headless --path overlay --script tests/test_model.gd
godot --headless --path overlay --script tests/test_store.gd
godot --headless --path overlay --script tests/test_layout.gd -- --qa
godot --headless --path overlay --script tests/test_network.gd
godot --headless --path overlay --script tests/test_network.gd
godot --path overlay -- --qa
```

`--qa` uses `overlay/qa-data` instead of personal progress. The 10-second demo
exercises completion without currency or challenge credit. Test native transparency,
dragging, hiding/recovery, keyboard navigation, pause, save/relaunch, and settings
on the exported application before publishing a release. Real Windows lock/sleep
and mixed-DPI behavior require hardware testing; passing model tests does not
verify those integrations. Study together now provides real guest rooms, expiring QR/code invitations, independent timers, and optional shared starts/group pauses. Email sign-in and browser/native progress sync remain disabled pending sender setup. Customization, single-instance enforcement, and signed installation remain future work. See [network spec](../NETWORK_SPEC.md) and [backend setup](../backend/README.md).

The native helper uses Windows session and power events only. The app pauses
on those events and on unexplained monotonic gaps over 90 seconds. A helper
status is shown in Settings; that fallback cannot detect a brief lock if the helper
is unavailable. No input hooks, location, camera, or activity monitoring are used.

Use the Focus / Break toggle above the compact timer to choose a mode. Switching an unfinished session pauses it and asks before ending it; full studied minutes remain credited without a completion bonus. Idle mode changes are immediate and swap the panda pose.

## macOS preview

The shared app now has a macOS Universal 2 preset, native Swift sleep/session helper, menu-bar/Dock recovery, and a Mac build workflow. See [MACOS_OVERLAY.md](../MACOS_OVERLAY.md) for the preview build, signing boundary, and Apple Silicon device checklist. No public Mac download is advertised until device verification.

## Shared interface refresh — 1.3.0-preview.2

Windows and macOS use one scene-first interface. Persistent controls use evergreen surfaces, pale text, a gold Start/Pause action, thin borders and system fonts. The panda stays above the controls. Focus/Break, circular Move/Hide, the leaf balance and Menu keep consistent positions; a separate status line names Ready, In progress or Paused. All controls scale with the panda. The reference canvas is now 360×354; old scale and position preferences remain valid and are clamped to the screen.

The tools window has one fixed navigation header (Timer, Calendar, Notes, Goals, Menu). Study together, Account, Settings, Move & resize, Hide, demo and Quit live in Menu. The timer shows setup when ready, then collapses to task, time and Pause/Resume when started; Session settings reopens setup. Existing confirmation protects unfinished sessions when switching modes. The resizing preview follows the new proportions.

Validation on Windows: all five headless QA suites and 47 exported-app graphical checks passed, including scaling, transparency, pause/resume, hidden timer continuity, recovery and larger-text label separation. Sleep events were simulated; physical sleep/lock and pointer tests remain separate. Mac validation runs through the existing Apple Silicon workflow; physical Mac/Intel checks remain pending. This UI refresh adds no startup service, browser runtime, input monitoring or extra scene assets.
