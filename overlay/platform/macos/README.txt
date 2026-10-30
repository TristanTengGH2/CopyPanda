CopyPanda macOS preview - Apple Silicon and Intel

Extract the ZIP, then move CopyPanda.app to Applications and open it.
This is an ad-hoc signed development preview, not an Apple-notarized release.
macOS may require you to approve it through its normal security interface.
Do not disable Gatekeeper or other system protections.

Use the Focus / Break toggle above the timer. Start, pause, resume, move,
resize, notes, calendar, leaves, and study rooms use the shared Godot app.
Hide minimizes the panda; restore with the CopyPanda menu-bar icon or the
Dock's Show overlay menu. Always-on-top applies to the current desktop;
visibility above other Spaces or full-screen apps is not yet guaranteed.

Local progress: ~/Library/Application Support/CopyPanda/
QA previews use a separate qa subfolder. Your .app bundle is never a save folder.
Email sign-in and cross-device leaves remain pending sender setup.

The session helper handles workspace sleep/wake, display sleep, and user-session
switches. A wake event leaves the timer paused until you resume. No keyboard,
location, app activity, camera, screen recording, or Accessibility access is used.
Locking without display sleep is not yet verified. Long unexplained scheduling
gaps still pause conservatively. Force Quit cannot show the optional bookmark.

Please test on your Mac: first launch, transparency, mode toggle, resizing,
menu-bar/Dock restore, Cmd+Q/bookmark, sleep/wake, screen lock, Retina scaling,
and external displays. Automated build checks do not replace these device tests.

Source: https://github.com/TristanTengGH2/CopyPanda
