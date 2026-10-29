extends RefCounted

var directory: String
var last_error: String = ""

func _read_json(path: String) -> Variant:
	var parser := JSON.new()
	if parser.parse(FileAccess.get_file_as_string(path)) != OK:
		return null
	return parser.data

func _init(path: String = "user://") -> void:
	directory = path
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))

func load_into(model: RefCounted) -> bool:
	for name in ["state.json","state.backup.json"]:
		var path := directory.path_join(name)
		if not FileAccess.file_exists(path):
			continue
		var parsed = _read_json(path)
		if parsed is Dictionary and model.restore(parsed):
			if name.contains("backup"):
				last_error = "Recovered your last valid backup."
			return true
	last_error = "No valid save was found. A new local workspace was opened."
	return false

func save_model(model: RefCounted) -> bool:
	var text := JSON.stringify(model.snapshot(),"\t")
	var pending := directory.path_join("state.pending.json")
	var file := FileAccess.open(pending,FileAccess.WRITE)
	if file == null:
		last_error = "Could not write your local progress."
		return false
	file.store_string(text)
	file.flush()
	file.close()
	var check = _read_json(pending)
	if not check is Dictionary:
		last_error = "The save could not be validated."
		return false
	var current := ProjectSettings.globalize_path(directory.path_join("state.json"))
	var backup := ProjectSettings.globalize_path(directory.path_join("state.backup.json"))
	if FileAccess.file_exists(current):
		var previous = _read_json(current)
		if previous is Dictionary:
			if FileAccess.file_exists(backup):
				DirAccess.remove_absolute(backup)
			if DirAccess.rename_absolute(current,backup) != OK:
				last_error = "Could not rotate the save backup."
				return false
		else:
			DirAccess.remove_absolute(current)
	if DirAccess.rename_absolute(ProjectSettings.globalize_path(pending),current) != OK:
		last_error = "Could not finalize the local save. Your previous backup is intact."
		return false
	last_error = ""
	return true
