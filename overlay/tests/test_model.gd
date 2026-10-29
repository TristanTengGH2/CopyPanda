extends SceneTree

const Model = preload("res://study_model.gd")
var checks := 0

func expect(value: bool, message: String) -> void:
	checks += 1
	if not value:
		push_error(message)
		quit(1)

func _initialize() -> void:
	var m = Model.new()
	m.planned_ms = 60000
	m.start(0)
	m.tick(20000)
	m.pause()
	m.tick(900000)
	expect(m.elapsed_ms == 20000,"Paused time must not count")
	m.start(900000)
	expect(m.tick(940000) == "complete","Resume must finish the original plan")
	var r = m.finalize(true)
	expect(r.base == 1 and r.bonus == 1 and m.balance == 2,"Completion reward must be credited once")
	m.finalize(true)
	expect(m.balance == 2 and m.sessions.size() == 1,"Recovery must not duplicate a reward")
	m.new_session()
	m.elapsed_ms = 15 * 60000 + 59999
	r = m.finalize(false)
	expect(r.base == 15 and r.bonus == 0,"Ending early keeps full active minutes only")
	m.new_session()
	m.start(0)
	m.tick(10000)
	expect(m.tick(500000) == "interrupted" and m.elapsed_ms == 10000,"A sleep gap must pause, not mint time")
	m.new_session("focus",true)
	m.start(0)
	m.tick(10000)
	r = m.finalize(true)
	expect(r.total == 0,"Demo must not grant leaves")
	var snapshot = m.snapshot()
	var recovered = Model.new()
	expect(recovered.restore(snapshot) and not recovered.running,"Restored session must require explicit resume")
	expect(not recovered.restore({"schema":900}),"Unknown save schema must not be loaded")
	var c = Model.new()
	c.challenge = {"id":"test","minutes":25,"daily":1,"days":14,"started_at":0}
	for day in ["2026-10-01","2026-10-04"]:
		c.sessions.append({"id":day,"day":day,"completed":true,"manual":false,"planned_ms":1500000,"ended_unix":1})
	c.sessions.append({"id":"manual","day":"2026-10-08","completed":true,"manual":true,"planned_ms":1500000,"ended_unix":1})
	expect(c.challenge_progress().count == 2,"Gaps preserve progress; manual entries do not qualify")
	print("CopyPanda model checks passed: ",checks)
	quit(0)
