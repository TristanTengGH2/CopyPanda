extends RefCounted
## Pure study state. UI, Windows events, and persistence are separate.

const SCHEMA := 1
var balance: int = 0
var focus_minutes: int = 25
var intention: String = ""
var notes: String = ""
var bookmark: Dictionary = {}
var bookmark_draft: Dictionary = {}
var sessions: Array = []
var awards: Array = []
var archive: Array = []
var challenge: Dictionary
var settings: Dictionary = {"topmost":true,"reduced_motion":false,"high_contrast":false,"large_text":false,"reminders":true,"size":1,"tutorial_done":false,"position":[],"monitor":0}
var session_id: String
var planned_ms: int = 1500000
var elapsed_ms: int = 0
var kind: String = "focus"
var running: bool = false
var demo: bool = false
var last_tick_ms: int = 0

func _init() -> void:
	challenge = new_challenge(25, 1, 14)
	session_id = make_id()

func make_id() -> String:
	return Crypto.new().generate_random_bytes(16).hex_encode()

func local_day() -> String:
	return Time.get_date_string_from_system()

func utc_stamp() -> String:
	return Time.get_datetime_string_from_system(true) + "Z"

func new_challenge(minutes: int, daily: int, days: int) -> Dictionary:
	return {"id":make_id(),"minutes":clampi(minutes,1,120),"daily":clampi(daily,1,8),"days":clampi(days,1,365),"started_at":Time.get_unix_time_from_system()}

func set_challenge(minutes: int, daily: int, days: int) -> void:
	archive.append(challenge.duplicate(true))
	challenge = new_challenge(minutes,daily,days)

func new_session(next_kind: String = "focus", is_demo: bool = false) -> void:
	session_id = make_id()
	kind = next_kind
	demo = is_demo
	planned_ms = 10000 if demo else (focus_minutes if kind == "focus" else 5) * 60000
	elapsed_ms = 0
	running = false
	last_tick_ms = 0

func start(now_ms: int) -> void:
	if elapsed_ms < planned_ms:
		running = true
		last_tick_ms = now_ms

func pause() -> void:
	running = false
	last_tick_ms = 0

func tick(now_ms: int) -> String:
	if not running:
		return "paused"
	var delta := maxi(0, now_ms - last_tick_ms)
	last_tick_ms = now_ms
	if delta > 90000:
		pause()
		return "interrupted"
	elapsed_ms = mini(planned_ms, elapsed_ms + delta)
	if elapsed_ms >= planned_ms:
		pause()
		return "complete"
	return "running"

func remaining_seconds() -> int:
	return maxi(0, ceili(float(planned_ms - elapsed_ms) / 1000.0))

func reward(completed: bool) -> Dictionary:
	if demo or kind != "focus":
		return {"base":0,"bonus":0,"total":0}
	var base := floori(float(mini(elapsed_ms, planned_ms)) / 60000.0)
	var bonus := ceili(base * 0.1) if completed and elapsed_ms >= planned_ms else 0
	return {"base":base,"bonus":bonus,"total":base+bonus}

func finalize(completed: bool) -> Dictionary:
	pause()
	var earned := reward(completed)
	var duplicate := false
	for entry in sessions:
		if entry.get("id", "") == session_id:
			duplicate = true
	if kind == "focus" and not demo and elapsed_ms > 0 and not duplicate:
		sessions.append({"id":session_id,"day":local_day(),"ended_at":utc_stamp(),"ended_unix":Time.get_unix_time_from_system(),"active_ms":elapsed_ms,"planned_ms":planned_ms,"completed":completed and elapsed_ms >= planned_ms,"intention":intention,"manual":false,"earned":earned.total})
		balance += int(earned.total)
	if duplicate:
		earned = {"base":0,"bonus":0,"total":0}
	var progress := challenge_progress()
	if progress.count >= int(challenge.days) and not awards.has(challenge.id):
		awards.append(challenge.id)
	return earned

func add_manual(day: String, minutes: int, topic: String) -> void:
	sessions.append({"id":make_id(),"day":day,"ended_at":utc_stamp(),"ended_unix":Time.get_unix_time_from_system(),"active_ms":clampi(minutes,1,720)*60000,"planned_ms":0,"completed":false,"intention":topic,"manual":true,"earned":0})

func challenge_progress() -> Dictionary:
	var counts := {}
	for entry in sessions:
		if not entry.get("completed",false) or entry.get("manual",false):
			continue
		if int(entry.get("planned_ms",0)) < int(challenge.minutes)*60000 or float(entry.get("ended_unix",0)) < float(challenge.started_at):
			continue
		var day := str(entry.get("day",""))
		if day.is_empty():
			continue
		counts[day] = int(counts.get(day,0)) + 1
	var days: Array = []
	for day in counts:
		if int(counts[day]) >= int(challenge.daily):
			days.append(day)
	days.sort()
	return {"count":mini(days.size(),int(challenge.days)),"days":days,"today":mini(int(counts.get(local_day(),0)),int(challenge.daily))}

func snapshot() -> Dictionary:
	return {"schema":SCHEMA,"balance":balance,"focus_minutes":focus_minutes,"intention":intention,"notes":notes,"bookmark":bookmark,"bookmark_draft":bookmark_draft,"sessions":sessions,"awards":awards,"archive":archive,"challenge":challenge,"settings":settings,"session":{"id":session_id,"kind":kind,"planned_ms":planned_ms,"elapsed_ms":elapsed_ms,"demo":demo}}

func restore(data: Dictionary) -> bool:
	if int(data.get("schema",0)) != SCHEMA:
		return false
	for key in ["sessions","awards","archive"]:
		if not data.get(key,[]) is Array:
			return false
	for key in ["settings","challenge","bookmark","bookmark_draft","session"]:
		if not data.get(key,{}) is Dictionary:
			return false
	for entry in data.get("sessions",[]):
		if not entry is Dictionary:
			return false
	var c: Dictionary = data.get("challenge",{})
	if not c.has_all(["id","minutes","daily","days","started_at"]):
		return false
	if int(c.minutes)<1 or int(c.minutes)>120 or int(c.daily)<1 or int(c.daily)>8 or int(c.days)<1 or int(c.days)>365:
		return false
	balance = maxi(0,int(data.get("balance",0)))
	focus_minutes = clampi(int(data.get("focus_minutes",25)),1,120)
	intention = str(data.get("intention",""))
	notes = str(data.get("notes",""))
	bookmark = data.get("bookmark",{}).duplicate(true)
	bookmark_draft = data.get("bookmark_draft",{}).duplicate(true)
	sessions = data.get("sessions",[]).duplicate(true)
	awards = data.get("awards",[]).duplicate(true)
	archive = data.get("archive",[]).duplicate(true)
	challenge = c.duplicate(true)
	settings.merge(data.get("settings",{}),true)
	var s: Dictionary = data.get("session",{})
	session_id = str(s.get("id",make_id()))
	kind = "break" if s.get("kind","focus") == "break" else "focus"
	demo = bool(s.get("demo",false))
	planned_ms = clampi(int(s.get("planned_ms",focus_minutes*60000)),1000,7200000)
	elapsed_ms = clampi(int(s.get("elapsed_ms",0)),0,planned_ms)
	pause() # Never credit time while the process was closed.
	return true
