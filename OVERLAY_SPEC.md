# CopyPanda — Windows overlay specification

Status: first implementation draft, for review. Updated October 29, 2026.

This document develops the native overlay described in [SPEC.md](SPEC.md). Confirmed product decisions remain authoritative. Proposed defaults below are implementation recommendations to review, not additional user-approved requirements.

## 1. Confirmed direction

- Windows is the first desktop release target. macOS and Linux come later.
- Godot 4 with GDScript is the intended engine.
- The minimum overlay is your red panda and a timer, sitting beside your work.
- Your panda represents you. It studies with you, rests during breaks, and never becomes unhappy because you miss a day.
- Keep the warm, rough, hand-drawn panda style selected in the web mockup.
- Optional reminders suggest water, eye rest, or an appropriate stretch during breaks.
- Pausing preserves progress and freezes active-time earnings. Ending early keeps full-minute base rewards; finishing adds the small completion bonus.
- Study history and chosen commitments support self-accountability. Missing a day preserves challenge progress.
- Solo operation must be useful offline. Online body doubling and in-person QR check-in remain part of the broader product plan.
- Accessibility and lightweight operation are core features.
- The website links to the GitHub repository and the eventual overlay downloads.

## 2. First release scope

The first native milestone is a reliable personal companion, not a port of the entire café webpage into a desktop window.

Include:

- Transparent panda window with a timer bubble.
- Start, pause, resume, end early, focus duration, and explicit break start.
- Position and size controls, optional always-on-top behavior, and reliable hide/show recovery.
- Expandable controls for intention, study commitment, journal, notes, settings, and leaving a bookmark.
- Local currency, completed-session history, manual journal entries, forgiving commitment progress, and saved preferences.
- Focus, pause, break, and completion states; optional page-turn animation with consistent book/arm placement.
- Skippable first-use tutorial and accessible motion/text/contrast controls.
- GitHub release packaging and an honest website download entry.

Defer from this milestone: full-room rendering, furniture editor, wardrobe shop, payments, gacha, cloud accounts, live friends, real synchronized timers, and QR-token infrastructure. Their later integration must use the same session/reward rules rather than create a separate timer implementation.

## 3. Default presentation

Proposed default: a borderless transparent window with the panda studying at its small book and a timer bubble immediately below or beside it. The full café background is optional future presentation and is not loaded by the default overlay.

The resting footprint contains:

1. Panda artwork.
2. Remaining time in readable text.
3. One start/pause/resume control.
4. A clear expand/menu control, available by mouse, touch, and keyboard.

The timer and controls use small warm bubble panels. Do not make every feature a permanently visible bubble. Expand secondary controls when requested, and preserve timer state when collapsing them.

Proposed size presets: Small, Medium, and Large, with an initial footprint around 320 × 240 logical pixels. Final dimensions follow the actual character art and readable control sizes. Text size can change independently of panda size.

## 4. Window interaction and recovery

### Position and size

- Drag using a visible move handle or the non-control part of the panda. Clicking start/pause must not drag the window.
- Offer a keyboard-accessible position menu with corner presets and a "Reset position" action.
- Save monitor identity, position, size preset, and always-on-top preference.
- Constrain restored bounds to a current monitor's usable work area. Never restore the only controls off-screen.
- Recheck bounds after monitor disconnects, resolution changes, or display scaling changes.
- Test multiple monitors and mixed DPI settings. Desktop coordinates and logical UI scale must not be treated as interchangeable.

### Always on top and transparency

- Proposed default: always on top enabled, with a persistent toggle.
- Do not steal keyboard focus when a countdown updates, a panda animates, or a break begins.
- Transparent surroundings should not create a large invisible rectangle that blocks other apps. Define and test the interactive silhouette/control region.
- Full click-through is an optional follow-up. Keep it off in the first milestone unless a separate recovery control is already verified.
- Never make click-through the only way to avoid blocking the user's work.
- Topmost behavior is intended for ordinary desktop windows; behavior over exclusive fullscreen or protected OS surfaces requires separate testing.

### Hide, minimize, and quit

- "Hide overlay" hides the window without ending or pausing an active study session. It must explain that the timer continues.
- Provide a taskbar or tray recovery path with "Show overlay", "Pause/resume", "Reset position", and "Quit". Do not ship a hide action before recovery works.
- Hiding, minimizing, and quitting are distinct actions.
- Quitting after study opens the optional bookmark flow. A force-close or OS shutdown saves recoverable state without relying on a dialog being shown.
- Starting with Windows is optional, explicitly enabled, and off by default.

## 5. Session states and controls

| State | Panda and UI | Available main action |
| --- | --- | --- |
| Ready | Reading/idle pose and chosen duration | Start focus |
| Focusing | Calm study behavior; occasional page turn | Pause |
| Paused | Still or relaxed pose; clearly labeled paused time | Resume |
| Focus complete | Brief, optional acknowledgment; reward summary | Start break or choose next action |
| Break ready | Rest pose; break has not started | Start break |
| On break | Optional gentle reminder; no study rewards | Pause break |
| Recovery | Restored elapsed time; no unattended time credited | Resume explicitly |

Keep the current prototype's 25-minute focus / 5-minute break defaults. Proposed adjustable focus range: 1–120 minutes. Challenges can require a longer or particular completed session; shortening a timer does not rewrite an active commitment.

Focus and break starts always require an explicit action. Reaching zero does not silently start the next timer. Ending a session credits only its eligible effort; it does not delete a day from the calendar.

## 6. Timekeeping and interruption policy

These are proposed native defaults to review before implementation:

- Use monotonic elapsed time for active focus. Wall-clock timestamps are for records, local dates, and display, not countdown accuracy.
- Being unfocused or covered by another application does not pause the timer. Studying in other applications is the purpose of the overlay.
- Normal desktop background operation and hiding the overlay keep an active timer running.
- Locking the workstation or suspending the computer pauses the session. Unlocking or waking restores it paused and asks the user to resume.
- Quit, crash, and relaunch restore the saved elapsed duration paused. Closed-app time earns nothing.
- Do not infer sleep from ordinary keyboard/mouse inactivity. Reading and handwriting are legitimate study.
- Use supported Windows session/power events where needed. A large update gap is only a fallback signal and must not grant unverified elapsed time.
- Test clock changes, sleep, lock, hibernation, process termination, and relaunch. Engine behavior alone is not proof of correct recovery on Windows.

## 7. Rewards, journal, and commitments

Inherit the rules in the main specification:

- One leaf per completed active focus minute, provisionally.
- On completion, an additional 10% of base session leaves, rounded up.
- Pause time and breaks earn nothing. Ending early skips the completion bonus and keeps base earnings.
- Session and reward events have unique IDs so relaunching or recovering cannot grant the same bonus twice.
- Manual journal entries document outside study without currency or timer-commitment credit.
- Commitments count qualifying study days toward the chosen total. A gap never resets completed challenge days or removes the eventual reward.

Show current intention and pending session earnings in expanded controls. Keep the compact overlay focused on remaining time and the main action.

The expanded journal offers calendar history, completed and early-ended sessions, study intentions, manual entries, and bookmarks. Keep notes and full history private by default when social features arrive.

Native storage and browser local storage are separate. The first download must not imply automatic browser-to-desktop migration or shared accounts. Define an explicit export/import or account-sync feature before advertising continuity between them.

## 8. Leaving a bookmark

Intentional quit after studying asks, optionally:

- "What were you working on?" Prefill the current or last session intention.
- "Where would you like to pick up?"
- Actions: "Save & quit", "Skip & quit", and "Keep studying".

Pause the active session while this dialog is open. If the user quits, finalize earned active-time rewards once. If they stay, leave the session paused until they explicitly resume.

On return, offer "Continue this goal" or "Start something new". Neither starts the timer automatically. Save drafts as they type. Do not require a written explanation to exit.

## 9. Panda art and animation acceptance

- Use the selected rough, flat red-panda style, with consistent identity across overlay, tutorial, and website.
- The book remains grounded. The visible page pivots about the existing spine, and the paw stays connected to the sleeve and arm throughout.
- Register frame origins, character scale, contact points, and book placement before integration. Inspect the full loop and loop boundary, not just individual frames.
- Do not solve alignment by sliding a detached paw or drawing a different book over the existing one.
- Do not introduce a fixed-book mask if it clips the turning page; this approach was rejected in the prototype.
- The current generated sheet is a prototype reference. Small frame-shape differences remain; production art needs better frame consistency or a properly prepared rig.
- Preserve foreground depth ordering if props or environments are added. The mug, flowers, and plant sit above the character where appropriate.
- Page turns are occasional, not a constant loop. Do not make animation progress depend on keystrokes.
- Reduced motion and Still mode use a static pose. Decorative animation stops while hidden, and automatic study movement stops when paused.

## 10. Accessibility and reminders

- All core controls are reachable by keyboard, with visible focus and meaningful accessible names/states.
- Do not require hover, dragging, right-click, color perception, sound, or a global shortcut to operate the app.
- Keep app-level shortcuts scoped to the focused overlay. Do not intercept typing in other applications.
- Provide independent text/timer scaling, high contrast, reduced motion, and an opaque-panel fallback if transparency reduces readability.
- Prefer 44-logical-pixel pointer targets where practical; smaller visual icons can have larger hit areas.
- Announce session changes to screen readers without announcing each countdown second.
- Offer optional visual and sound notifications. Reminders never seize focus.
- Include seated, non-movement, and eye-rest options alongside standing suggestions. Dismissing a reminder has no penalty.
- A skippable/replayable tutorial demonstrates movement, recovery after hiding, timer pause, journal, bookmark, and accessibility settings.
- Test with Windows keyboard navigation and a screen reader on the pinned engine build. A checked setting alone is not an accessibility acceptance test.

## 11. Data and lightweight implementation

- Pin a tested Godot 4 release, GDScript, and the Compatibility renderer for the initial implementation.
- Keep the session/reward model separate from windows and animation so native and future networked clients follow the same rules.
- Store versioned local data under the app's user-data directory. Checkpoint periodically and on important transitions; keep a validated backup and recover gracefully from interrupted writes.
- Load only the current character assets in compact mode. Do not load the full café, all environments, or the wardrobe at startup.
- Use low-rate 2D animation and avoid per-frame work when nothing changes. Update the displayed countdown once per second.
- Use low-processor/on-demand refresh where compatible with the active animation; stop decorative animation when hidden.
- Expanded tools open on demand and release unnecessary assets when closed.
- First-release personal features work without a network connection.

Provisional performance targets for an exported compact build, to validate in the first technical spike: idle CPU around 1% or less of total system capacity, active CPU under 3% on the agreed reference laptop, and steady-state memory around 200 MB or less. These are proposed budgets, not measured claims or published minimum requirements. Record CPU model, RAM, integrated GPU, display scaling, test duration, and whether animation is on. Revise based on measurements before promising device compatibility.

Intended first architecture: Windows x64. Test Windows 11 first; Windows 10 support and exact minimum hardware remain to be validated before release claims. macOS/Linux support is a later milestone.

## 12. Website, GitHub, and downloads

Repository: https://github.com/TristanTengGH2/CopyPanda

Release listing: https://github.com/TristanTengGH2/CopyPanda/releases

Current state: no published releases were present when this draft was written. The website can link to source and releases now, but must say the Windows overlay is in development rather than present a nonexistent installer as downloadable.

Proposed first package: a versioned portable Windows x64 ZIP, with a short run guide and release notes. Installer format, signing, automatic updates, and additional architectures are open decisions. Do not build an automatic updater into the initial scope by implication.

Before activating a "Download for Windows" button:

1. Publish an actual exported native build with a versioned release asset. GitHub's source-code ZIP is not the overlay executable.
2. Verify the asset downloads and runs on a clean supported Windows machine without the Godot editor installed.
3. Show version, tested OS/architecture, and release notes beside the download entry.
4. Point to the exact release asset or release page; preserve a separate GitHub source link.
5. If the first build is a prerelease, link to the release listing or its explicit tag. Do not assume `/releases/latest` selects alpha builds.

The website's browser timer and native overlay continue to be distinct until an explicit data-sync/migration feature exists.

## 13. First-release acceptance checklist

- A new user can start, pause, resume, and finish study without opening the full website or creating an account.
- The panda/timer window can be moved, resized, hidden, recovered, and reset onto a visible screen.
- Topmost, transparency, input region, mixed DPI, and monitor removal behave correctly on tested Windows systems.
- Working in another app does not pause the timer or steal focus.
- Lock, sleep, crash, and relaunch do not fabricate study time or duplicate rewards.
- Manual entries, study commitments, and calendar history follow the agreed forgiving rules.
- Quit bookmarks are optional and reappear without starting a timer.
- Animations have no detached arm, page clipping, unintended book jump, or moving-room background.
- Reduced motion, keyboard operation, high contrast, text scaling, and hide recovery work together.
- The exported compact build is benchmarked alongside browser tabs and a lecture/video.
- A real GitHub release asset exists before the website advertises an available download.

## 14. Decisions still to review

- Default overlay size and timer-bubble placement.
- Default topmost setting and exact tray/taskbar recovery design.
- Whether lock/sleep should always pause, as proposed, or allow an explicit alternative.
- First supported Windows versions, reference test laptop, and final performance budgets.
- Portable ZIP versus installer, and later update/signing strategy.
- Whether local backup/export ships in the first native build or immediately after it.
- When to bring online rooms, QR check-in, and synchronized timers into the native app after the solo milestone.

## Technical references

Implementation references, not evidence that the overlay already exists:

- [Godot Window](https://docs.godotengine.org/en/stable/classes/class_window.html) — native window properties, transparency, focus, and close handling.
- [Godot DisplayServer](https://docs.godotengine.org/en/stable/classes/class_displayserver.html) — display/window integration and input-region capabilities; verify platform-specific behavior.
- [Godot Time](https://docs.godotengine.org/en/stable/classes/class_time.html) — monotonic tick measurements versus adjustable system-clock timestamps.
