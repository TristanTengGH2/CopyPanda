# CopyPanda improvement log

## November 8 2026

### Batch 1 Typography and controls

- Replaced inconsistent tiny interface type with a local system font stack and a shared type scale.
- Increased primary controls, menu rows, timer modes, close buttons, and month navigation targets.
- Added stronger keyboard focus rings and darker selected/primary colors.
- Reworked phone header spacing and bottom controls, including safe areas and scrollable expanded panels.
- Kept the existing artwork and desktop scene layout.
- Added DESIGN_GUIDELINES.md with source links and explicit small-calendar target limitations.

Validation: desktop and 390px phone visual review, touch-target measurements, expanded timer and calendar interactions. Further responsive checks are tracked in subsequent batches.

### Batch 2 Responsive and session flow repairs

- Short windows switch to document scrolling so navigation and timer actions remain reachable.
- Calendar month changes select a date within the displayed month and retain keyboard focus on the month control.
- Date labels use readable month names and identify today with aria-current.
- Replaced the misleading reset arrow with a stop icon; idle end controls are disabled.
- Break mode hides the unrelated study-task field and clearly identifies its fixed duration.
- Moved the returning bookmark away from the desktop navigation rail.
- Updated tutorial and bookmark wording to match the working room system and current button names.

### Batch 3 Local data backups

- Added Settings → Data & backups to download saved history, private notes, bookmark, and current goal.
- Restore validates the file, previews the new-entry and leaf totals, skips repeated IDs, and preserves existing entries.
- Restoring private notes and the goal is an explicit optional choice.
- Restoring requires an idle timer and local mode. Backups exclude sign-in tokens, room invitations, and active timers.
- Added regression tests for duplicate imports, reward recalculation, invalid dates, malformed formats, and private data boundaries.

Validation: all 16 automated tests passed. In the isolated QA browser, a 25-minute backup restored as one calendar entry and 28 leaves; selecting it again previewed zero additional entries and zero leaves. Opt-in private restoration showed the saved notes correctly. Dialog replacements now retain keyboard focus inside the dialog.

### Batch 4 Accessibility and release checks

- Fixed the phone app menu stacking behind bottom navigation, which could send clicks to the wrong control.
- Added a visible mode/status label to the collapsed phone timer.
- Extended the compact control layout to tablets, where the full desktop timer covered the panda. CSS and timer disclosure now share the same 1024px breakpoint.
- Corrected low-contrast settings help text and inherited bold styling on descriptions.
- Improved bookmark label readability and made demo actions close the menu and focus the timer.
- Used direct completion headings instead of vague slogans.
- Added the automated test suite as a gate before GitHub Pages publication.

Validation: reviewed desktop (1280×720), tablet (768×1024), phone (390×844 and 320×568), and landscape (844×390). Checked expanded/collapsed timer states, calendar month navigation, settings, larger text/high contrast/reduced motion, backup download and restore, demo completion, and break start/pause/end. The demo left the QA balance unchanged at 28 leaves. Corrected settings help text resolves to #715238 on #fff4dc. This is a focused usability review, not a full WCAG conformance certification or physical-device test.

Remaining product work: email delivery and verified account sync are still pending; native mobile is a saved idea, not an implemented release. The changes here apply to the website and mirrored web source, not a rebuilt native overlay.

### Batch 5 Protection against stale browser tabs

- Stopped idle tabs from repeatedly writing unchanged snapshots.
- Added a check against newer saved data before writing a changed snapshot.
- When another tab saves changes, the older tab pauses its timer and local saving, exposes a recovery warning, and offers backup/reload options.
- Recovery can end the paused timer so its study time is included in the backup. Cloud pushes and new shared starts are suspended while the tab needs recovery.
- Added isolated tests for stale writes, unchanged snapshots, account scope separation, and storage failures.
- Fixed backup validation for real browser timers with fractional milliseconds; exported elapsed time is normalized to whole milliseconds without changing earned full-minute leaves.

Validation: 21 automated tests passed. Two isolated QA tabs verified that a stale draft did not replace newer saved notes, reload recovered the newer notes, and incoming changes paused an active timer with a recovery path. No production notes or study history were edited during these checks.

### Starter wardrobe

- Added Menu → Wardrobe with five free sweater colors and a page-turn/stretch preview.
- Kept original artwork, book illustrations, silhouettes, and animation registration; recoloring uses pose-specific connected fabric masks.
- Saved the choice locally and included it in optional private-data backup restoration. Older backups remain valid.
- Applied the same clothing choice to focus/break animation atlases, compact and lightweight companions, local portraits, and the user's own room-member preview.
- Added cancellation for outdated color requests, texture cleanup, and a reviewed source-art contract.
- Checked small-screen touch targets, rapid color changes, saved selection, unchanged leaf balance, and reduced-motion behavior. Also repaired bookmark wrapping exposed by the visual checks.
- Documented the path to actual garment layers and a Godot cutout rig in WARDROBE.md. The shipped native overlay is unchanged.

Validation: 27 automated tests pass, including mask/alpha preservation and backup compatibility. All twelve source poses have reviewed clothing coverage. New clothing shapes, cross-device wardrobe sync, and the native wardrobe remain future work.

## 2026-11-09 — First leaf shop, tutorial, and visible mobile companion

- Added Rust beanie (40 leaves), Rainy library (120), and Moonlit café (160), with preview, fixed prices, saved ownership, and free re-equipping. Starter colors and original rooms remain free.
- Attached the transparent cap to every focus/break pose without altering source atlases; new room plates retain the tabletop framing.
- Added purchase-aware backups: restore preserves spending, skips duplicates, and rejects conflicting spend. Failed persistence does not report a completed purchase/restore.
- Added optional first-visit welcome and four-step tutorial with skip/replay and Shop introduction. Email signup remains pending.
- Reserved a visible mobile scene above controls; expanded timer scrolls, and short phones use document scrolling.

Validation: 33 automated tests pass. Isolated browser QA bought all three items from 330 synthetic leaves, retained 10 after reload and old-backup restore, and checked 390×844 / 320×568 layouts. Website implementation only; no new native binaries or cloud inventory sync.

## 2026-11-09 — Beanie fit and QR upload follow-up

- Widened and flattened the cap, with ear contours drawn in front for a fitted silhouette across study/break poses.
- Replaced the native nested Choose File widget with Choose QR image and a separate wrapping filename.
- Added an explicit one-time local 500-leaf test credit through ?test-shop=1; no fake study sessions or streaks. Backups preserve the credit and its spending.
- Fixed a race where finishing an async clothing equip could reopen a shop dialog after it was closed.

Validation: 34 automated tests pass, including test-credit backup coverage. Browser checks cover cap previews, actual local purchase, credit persistence, keyboard/file chooser activation, and 390px QR layout.
