extends RefCounted
const DesktopPlatform = preload("res://desktop_platform.gd")
var pid := -1
var ready := false
var event_path := ""
var last_serial := ""

func start(platform: String, directory: String, executable: String, editor: bool, headless: bool) -> void:
	if headless:
		return
	var helper := DesktopPlatform.helper_path(platform,executable,editor)
	if helper.is_empty() or not FileAccess.file_exists(helper):
		return
	event_path = ProjectSettings.globalize_path(directory.path_join("session-events.json"))
	if FileAccess.file_exists(event_path):
		DirAccess.remove_absolute(event_path)
	pid = OS.create_process(helper,[str(OS.get_process_id()),event_path],false)

func poll() -> String:
	if pid>0 and not OS.is_process_running(pid):
		ready = false
	if event_path.is_empty() or not FileAccess.file_exists(event_path):
		return ""
	var file := FileAccess.open(event_path,FileAccess.READ)
	if not file or file.get_length()>2048:
		return ""
	var parser := JSON.new()
	if parser.parse(file.get_as_text())!=OK or not parser.data is Dictionary:
		return ""
	return consume(parser.data)

func consume(event: Dictionary) -> String:
	var serial := str(event.get("serial",""))
	var kind := str(event.get("kind",""))
	if serial.is_empty() or serial==last_serial or (kind!="ready" and not DesktopPlatform.should_pause(kind)):
		return ""
	last_serial = serial
	ready = true
	return kind

func stop() -> void:
	if pid>0 and OS.is_process_running(pid):
		OS.kill(pid)
	pid = -1
	ready = false
