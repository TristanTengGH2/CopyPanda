extends RefCounted
## Canonical cloud records use the same format in Godot and the browser.
static func to_record(row: Dictionary) -> Dictionary:
	var end := str(row.get("ended_at",""))
	var ended := float(row.get("ended_unix",Time.get_unix_time_from_system()))
	var active := int(row.get("active_ms",0))
	return {"id":row.id,"day":row.day,"endedAt":end,"startedAt":Time.get_datetime_string_from_unix_time(int(ended)-ceili(active/1000.0))+"Z","activeMs":active,"plannedMs":row.get("planned_ms",0),"completed":row.get("completed",false),"manual":row.get("manual",false),"demo":false,"intention":row.get("intention",""),"earned":row.get("earned",0)}

static func from_record(row: Dictionary) -> Dictionary:
	return {"id":row.id,"day":row.day,"ended_at":row.endedAt,"ended_unix":Time.get_unix_time_from_datetime_string(str(row.endedAt).trim_suffix("Z")),"active_ms":row.activeMs,"planned_ms":row.plannedMs,"completed":row.completed,"manual":row.manual,"intention":row.intention,"earned":row.earned,"cloud_synced":true}

static func private_data(model: RefCounted) -> Dictionary:
	var ch: Dictionary = model.challenge
	return {"notes":model.notes,"bookmark":model.bookmark,"challenge":{"id":ch.id,"minutes":ch.minutes,"sessionsPerDay":ch.daily,"targetDays":ch.days,"startedAt":Time.get_datetime_string_from_unix_time(int(ch.started_at))+"Z"}}

static func apply_private(model: RefCounted, data: Dictionary) -> void:
	model.notes = str(data.get("notes",""))
	model.bookmark = data.get("bookmark",{}) if data.get("bookmark") is Dictionary else {}
	var ch = data.get("challenge")
	if ch is Dictionary and ch.has("id"):
		model.challenge = {"id":ch.id,"minutes":clampi(int(ch.get("minutes",25)),1,120),"daily":clampi(int(ch.get("sessionsPerDay",1)),1,8),"days":clampi(int(ch.get("targetDays",14)),1,365),"started_at":Time.get_unix_time_from_datetime_string(str(ch.get("startedAt","")).trim_suffix("Z"))}
