extends RefCounted
## Platform wording and bundle paths, kept testable without faking the OS.
static func label(platform: String) -> String:
	return "macOS" if platform=="macOS" else ("Windows" if platform=="Windows" else "Desktop")

static func helper_path(platform: String, executable: String, editor := false) -> String:
	if platform not in ["Windows","macOS"]:
		return ""
	var name := "CopyPanda.SessionEvents"+(".exe" if platform=="Windows" else "")
	if editor:
		return ProjectSettings.globalize_path("res://platform/"+("macos/" if platform=="macOS" else "windows/")+name)
	if platform=="macOS":
		return executable.get_base_dir().get_base_dir().path_join("Helpers").path_join(name)
	return executable.get_base_dir().path_join(name)

static func recovery_hint(platform: String, has_indicator: bool) -> String:
	if platform=="macOS":
		return "Show your panda from the CopyPanda menu-bar icon or the Dock’s Show overlay menu." if has_indicator else "Show your panda from the Dock’s Show overlay menu or its minimized window."
	return "Show your panda from the Windows notification-area icon or its taskbar window." if platform=="Windows" else "Restore the panda from its desktop status icon or minimized window."

static func should_pause(kind: String) -> bool:
	return kind in ["lock","unlock","logoff","suspend","resume","display_sleep","session_inactive","session_active"]

static func event_label(kind: String) -> String:
	return {"lock":"Screen locked","unlock":"Screen unlocked","logoff":"Signing out","suspend":"Computer sleeping","resume":"Computer woke","display_sleep":"Display sleeping","session_inactive":"User session inactive","session_active":"User session restored"}.get(kind,"Session changed")

static func data_directory(platform: String, editor: bool, qa: bool) -> String:
	if not qa:
		return "user://"
	# Adding QA saves inside a signed .app would invalidate its resource seal.
	return "user://qa/" if platform=="macOS" and not editor else "res://qa-data/"
