extends SceneTree

const Model = preload("res://study_model.gd")
const Store = preload("res://save_store.gd")

func _initialize() -> void:
	var path := "res://qa-data/store-test-"+str(Time.get_ticks_usec())
	var store = Store.new(path)
	var m = Model.new()
	m.notes = "first saved note"
	m.elapsed_ms = 61000
	m.start(100)
	assert(store.save_model(m),"First save must succeed")
	m.notes = "second saved note"
	assert(store.save_model(m),"Second save must rotate a backup")
	var loaded = Model.new()
	assert(store.load_into(loaded) and loaded.notes=="second saved note" and not loaded.running,"Load newest valid save, paused")
	var f := FileAccess.open(path.path_join("state.json"),FileAccess.WRITE)
	f.store_string("{interrupted write")
	f.close()
	loaded = Model.new()
	assert(store.load_into(loaded) and loaded.notes=="first saved note" and loaded.elapsed_ms==61000,"Corrupted primary must recover the previous backup")
	assert(store.save_model(loaded),"Saving after recovery must succeed")
	var again = Model.new()
	assert(store.load_into(again) and again.notes=="first saved note","Recovered data must remain readable")
	for name in ["state.json","state.backup.json","state.pending.json"]:
		DirAccess.remove_absolute(ProjectSettings.globalize_path(path.path_join(name)))
	DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
	print("CopyPanda persistence checks passed: 6")
	quit(0)
