extends Node
const Client = preload("res://cloud_client.gd")
const Mapping = preload("res://cloud_mapping.gd")
const QR = preload("res://vendor/qr/qr_code.gd")
var client = Client.new()
var app
var device_id := ""
var room_id := ""
var room_state: Dictionary = {}
var invitation: Dictionary = {}
var scheduled: Dictionary = {}
var clock_offset := 0.0
var last_pause := ""
var busy := false
var sync_busy := false
var account_id := ""
var revision := 0
var baseline := ""
var conflict: Dictionary = {}
var candidate: Dictionary = {}
var status := "Local only"
var presence: Label
var qr_texture: ImageTexture
var pulse: Timer

func setup(owner_app: Control) -> void:
	app = owner_app
	device_id = app.model.make_id()
	add_child(client)
	client.auth_lost.connect(func():
		room_id = ""
		room_state = {}
		scheduled = {}
		if not account_id.is_empty():
			_switch_account("")
		app._notify("Sign-in expired. Local study is available."))
	pulse = Timer.new()
	pulse.wait_time = 10
	pulse.timeout.connect(_poll)
	add_child(pulse)
	pulse.start()
	set_process(true)

func _process(_delta: float) -> void:
	if scheduled.is_empty():
		return
	var now := Time.get_unix_time_from_system()+clock_offset
	var starts := _timestamp(scheduled.startsAt)
	if now < starts:
		return
	var next := scheduled.duplicate()
	scheduled = {}
	if now-starts>5 or app.model.running or app.model.elapsed_ms>0:
		app._notify("Shared start missed. Start independently when ready.")
		return
	app.model.focus_minutes = int(next.minutes)
	app.model.new_session("focus")
	app.model.elapsed_ms = int(maxf(0,now-starts)*1000)
	app.model.start(Time.get_ticks_msec())
	app._save()
	app._render()
	app._notify("Shared study session started.")

func _timestamp(value: Variant) -> float:
	var text := str(value).replace("+00:00","").trim_suffix("Z")
	return Time.get_unix_time_from_datetime_string(text)

func _accept(result: Dictionary) -> bool:
	if not result.get("ok",false):
		status = str(result.get("message","Could not connect."))
		app._notify(status)
		return false
	return true

func _room_call(operation: String, payload: Dictionary = {}) -> bool:
	payload.roomId = room_id
	payload.deviceId = device_id
	var result: Dictionary = await client.api(operation,payload)
	if not _accept(result):
		if result.get("code") == "room_closed":
			room_id = ""
			room_state = {}
			scheduled = {}
		return false
	var previous_sync := JSON.stringify(room_state.get("sync"))
	room_state = result
	clock_offset = _timestamp(result.serverNow)-Time.get_unix_time_from_system()
	if result.get("invitation") is Dictionary:
		invitation = result.invitation
	var shared = result.get("sync")
	if shared is Dictionary and shared.get("pauseAppliedAt") and str(shared.pauseId)!=last_pause:
		for member in result.members:
			if member.self and member.get("joinedSync")==shared.id:
				last_pause = str(shared.pauseId)
				app.model.pause()
				app._save()
				app._notify("Everyone agreed to pause.")
	_update_presence()
	if operation=="room.heartbeat" and previous_sync!=JSON.stringify(result.get("sync")) and is_instance_valid(app.tools) and app.tools.visible and app.tools.title=="CopyPanda · Study together":
		call_deferred("show_room")
	return true

func _poll() -> void:
	if busy:
		return
	busy = true
	if not room_id.is_empty():
		var model = app.model
		await _room_call("room.heartbeat",{"status":model.kind if model.running else ("paused" if model.elapsed_ms>0 else "idle"),"remainingMs":maxi(0,model.planned_ms-model.elapsed_ms)})
	if client.permanent() and not account_id.is_empty():
		await sync()
	busy = false

func show_room() -> void:
	app._open_tools("Study together")
	if room_id.is_empty() or room_state.is_empty():
		app._label("Create a room or join with a code. Your timer stays independent unless you join a shared start.",app.tools_box)
		var name_edit = app._input_field("Name shown to the room","Study panda",app.tools_box)
		app._button("Create online room",func():_create("online",name_edit.text),app.tools_box)
		app._button("Create in-person room",func():_create("inperson",name_edit.text),app.tools_box)
		var code = app._input_field("Room code or invite link","",app.tools_box)
		app._button("Join room",func():_join(code.text,name_edit.text),app.tools_box)
		app._label("No location tracking. Scan the host’s QR with a phone, or enter the same code here. In-person check-in is honor based.",app.tools_box)
		return
	app._label("Only room names and study status are shared. Notes, email, and calendar stay private.",app.tools_box)
	presence = app._label("",app.tools_box)
	_update_presence()
	if not invitation.is_empty():
		var code := str(invitation.code)
		app._label("Room code: "+code.substr(0,4)+"-"+code.substr(4),app.tools_box,22)
		app._label("Invitation expires at "+str(invitation.expiresAt).substr(11,5)+" UTC",app.tools_box)
		var link := str(client.config.appUrl)+"#join="+str(invitation.token)
		var generator = QR.new()
		var original: Image = generator.get_texture(link).get_image()
		generator.free()
		var image := Image.create(original.get_width()+6,original.get_height()+6,false,Image.FORMAT_RGBA8)
		image.fill(Color.WHITE)
		image.blit_rect(original,Rect2i(Vector2i.ZERO,original.get_size()),Vector2i(3,3))
		qr_texture = ImageTexture.create_from_image(image)
		var display := TextureRect.new()
		display.texture = qr_texture
		display.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		display.custom_minimum_size = Vector2(200,200)
		display.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		display.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		app.tools_box.add_child(display)
		app._button("Copy invite link",func():DisplayServer.clipboard_set(link);app._notify("Invite copied."),app.tools_box)
	if bool(room_state.host):
		app._button("New invitation (expires in 10 minutes)",func():if await _room_call("room.rotate"):show_room(),app.tools_box)
	var shared = room_state.get("sync")
	var now := Time.get_unix_time_from_system()+clock_offset
	if not shared is Dictionary or _timestamp(shared.startsAt)+float(shared.minutes)*60<=now:
		var minutes = app._spinner("Shared focus minutes",25,120,app.tools_box)
		app._button("Propose shared start",func():if await _room_call("sync.propose",{"minutes":int(minutes.value)}):show_room(),app.tools_box)
	else:
		app._label(str(shared.minutes)+"-minute shared start · "+str(shared.startsAt).substr(11,8)+" UTC",app.tools_box)
		var joined := false
		for member in room_state.members:
			if member.self:
				joined = member.get("joinedSync")==shared.id
		if not joined and _timestamp(shared.startsAt)>now:
			app._button("Join shared start",func():_join_sync(shared),app.tools_box)
		if joined:
			app._button("Pause for me",func():app.model.pause();app._save();app._render(),app.tools_box)
			app._button("Request group pause",func():if await _room_call("sync.pause_request"):show_room(),app.tools_box)
			app._button("Continue independently",func():scheduled={};if await _room_call("sync.leave"):show_room(),app.tools_box)
		if shared.get("pauseId") and not shared.get("pauseAppliedAt") and _timestamp(shared.pauseExpiresAt)>now:
			app._button("Agree to group pause",func():if await _room_call("sync.pause_vote",{"pauseId":shared.pauseId}):show_room(),app.tools_box)
	app._button("Refresh room",func():if await _room_call("room.get"):show_room(),app.tools_box)
	app._button("Close room and leave" if room_state.host else "Leave room",_leave,app.tools_box)

func _update_presence() -> void:
	if not is_instance_valid(presence) or room_state.is_empty():
		return
	var lines := PackedStringArray()
	for member in room_state.members:
		lines.append(str(member.name)+(" (you)" if member.self else "")+" · "+str({"focus":"Studying","break":"On a break","idle":"Ready","paused":"Paused","away":"Away"}.get(member.status,"Ready")))
	presence.text = "\n".join(lines)

func _create(mode: String, name_text: String) -> void:
	if not _accept(await client.guest()):
		return
	var result: Dictionary = await client.api("room.create",{"mode":mode,"name":name_text,"deviceId":device_id})
	if _accept(result):
		room_id = str(result.roomId)
		room_state = result
		invitation = result.invitation
		show_room()

func _join(code: String, name_text: String) -> void:
	var parsed: Dictionary = client.parse_invite(code)
	if parsed.is_empty():
		app._notify("Enter an eight-character code or CopyPanda invite link.")
		return
	if not _accept(await client.guest()):
		return
	parsed.name = name_text
	var result: Dictionary = await client.api("room.join",parsed)
	if _accept(result):
		room_id = str(result.roomId)
		room_state = result
		invitation = {}
		show_room()

func _join_sync(shared: Dictionary) -> void:
	if app.model.running or app.model.elapsed_ms>0:
		app._notify("Finish or end your current timer first.")
		return
	if await _room_call("sync.accept",{"syncId":shared.id}):
		scheduled = shared.duplicate()
		show_room()

func leave_shared_timer() -> void:
	scheduled = {}
	if room_id.is_empty():
		return
	for member in room_state.get("members",[]):
		if member.self and member.get("joinedSync"):
			await _room_call("sync.leave")
			return

func _leave() -> void:
	var result: Dictionary = await client.api("room.leave",{"roomId":room_id})
	if _accept(result) or result.get("code")=="room_closed":
		room_id = ""
		room_state = {}
		invitation = {}
		scheduled = {}
		show_room()

func show_account() -> void:
	app._open_tools("Account")
	if not client.permanent():
		if not bool(client.config.get("emailEnabled",false)):
			app._label("Email sign-in is being set up. Your leaves and history currently stay on this device. Study rooms already work without an account.",app.tools_box)
			return
		app._label("Sign in with an email code to share leaves and study history. You will sign in again after closing this preview; credentials are not saved on disk.",app.tools_box)
		var email = app._input_field("Email","",app.tools_box)
		app._button("Send sign-in code",func():_send_code(email.text),app.tools_box)
		return
	app._label("Signed in as "+str(client.session.user.get("email","")),app.tools_box)
	app._label(status,app.tools_box)
	app._button("Sync now",func():await sync();show_account(),app.tools_box)
	if not candidate.is_empty():
		app._label("Local study is available to import. Repeated sessions cannot earn leaves twice.",app.tools_box)
		app._button("Import local study records",_import_guest,app.tools_box)
	if not conflict.is_empty():
		app._label("Notes or goals changed on another device. Choose which version to keep.",app.tools_box)
		app._button("Use cloud notes and goal",func():Mapping.apply_private(app.model,conflict.data);revision=int(conflict.revision);conflict={};baseline=JSON.stringify(Mapping.private_data(app.model));_save_metadata();app._save();show_account(),app.tools_box)
		app._button("Use this device’s notes and goal",func():revision=int(conflict.revision);conflict={};baseline="";await sync();show_account(),app.tools_box)
	app._button("Sign out",_sign_out,app.tools_box)

func _send_code(email: String) -> void:
	if not _accept(await client.send_code(email)):
		return
	app._open_tools("Check your email")
	var token = app._input_field("Code sent to "+email,"",app.tools_box)
	app._button("Verify and sign in",func():
		if not _accept(await client.verify_code(email,token.text)):
			return
		candidate = app.model.snapshot()
		_switch_account(str(client.session.user.id))
		await sync()
		show_account(),app.tools_box)

func _switch_account(id: String) -> void:
	app.model.pause()
	app._save()
	var settings: Dictionary = app.model.settings.duplicate(true)
	account_id = id
	var base := "res://qa-data/" if app.qa else "user://"
	app.store = app.SaveStore.new(base if id.is_empty() else base.path_join("accounts/"+id))
	app.model = app.StudyModel.new()
	app.store.load_into(app.model)
	app.model.settings = settings
	revision = 0
	baseline = ""
	conflict = {}
	var path: String = app.store.directory.path_join("sync.json")
	if FileAccess.file_exists(path):
		var meta = JSON.parse_string(FileAccess.get_file_as_string(path))
		if meta is Dictionary:
			revision = int(meta.get("revision",0))
			baseline = str(meta.get("baseline",""))
	app._render()

func _save_metadata() -> void:
	var file := FileAccess.open(app.store.directory.path_join("sync.json"),FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify({"revision":revision,"baseline":baseline}))

func sync() -> void:
	if not client.permanent() or account_id.is_empty():
		return
	if sync_busy:
		return
	sync_busy = true
	await _sync_impl()
	sync_busy = false

func _sync_impl() -> void:
	for row in app.model.sessions.duplicate(true):
		if not row.get("cloud_synced",false):
			var result: Dictionary = await client.api("record.import",{"record":Mapping.to_record(row)})
			if not _accept(result):
				return
			for index in app.model.sessions.size():
				if app.model.sessions[index].id==row.id:
					app.model.sessions[index] = Mapping.from_record(result.record)
	var current := JSON.stringify(Mapping.private_data(app.model))
	var dirty := not baseline.is_empty() and current!=baseline
	if conflict.is_empty() and (dirty or baseline.is_empty() and revision>0):
		var saved: Dictionary = await client.api("state.put",{"revision":revision,"data":Mapping.private_data(app.model)})
		if saved.get("code")=="conflict":
			conflict = saved
		elif not _accept(saved):
			return
		else:
			revision = int(saved.revision)
			baseline = current
	var snapshot: Dictionary = await client.api("bootstrap")
	if not _accept(snapshot):
		return
	var records: Array = snapshot.records.duplicate(true)
	var page := snapshot
	while page.get("hasMore",false):
		var last: Dictionary = page.records[-1]
		page = await client.api("history.list",{"cursor":{"endedAt":last.endedAt,"id":last.id}})
		if not _accept(page):
			return
		records.append_array(page.records)
	var merged := {}
	for row in app.model.sessions:
		merged[row.id] = row
	for row in records:
		merged[row.id] = Mapping.from_record(row)
	app.model.sessions = merged.values()
	app.model.balance = int(snapshot.balance)
	if conflict.is_empty():
		Mapping.apply_private(app.model,snapshot.data)
		revision = int(snapshot.revision)
		baseline = JSON.stringify(Mapping.private_data(app.model))
	_save_metadata()
	app._save()
	app._render()
	status = "Synced" if conflict.is_empty() else "Choose which notes and goal to keep."
	if room_id.is_empty() and snapshot.get("roomId"):
		room_id = str(snapshot.roomId)
		await _room_call("room.get")

func _import_guest() -> void:
	var seen := {}
	for row in app.model.sessions:
		seen[row.id] = true
	for row in candidate.get("sessions",[]):
		if not seen.has(row.id):
			var imported: Dictionary = row.duplicate(true)
			imported.cloud_synced = false
			app.model.sessions.append(imported)
	candidate = {}
	app._save()
	await sync()
	show_account()

func _sign_out() -> void:
	if busy or sync_busy:
		app._notify("Please wait for the current sync to finish.")
		return
	if not room_id.is_empty():
		if not _accept(await client.api("room.leave",{"roomId":room_id})):
			return
	room_id = ""
	room_state = {}
	scheduled = {}
	await client.sign_out()
	_switch_account("")
	candidate = {}
	status = "Local only"
	show_account()

