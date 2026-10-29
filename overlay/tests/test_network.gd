extends SceneTree
const Client = preload("res://cloud_client.gd")
const Mapping = preload("res://cloud_mapping.gd")
const Model = preload("res://study_model.gd")
const QR = preload("res://vendor/qr/qr_code.gd")

func _initialize() -> void:
	call_deferred("_check")

func _check() -> void:
	var client = Client.new()
	root.add_child(client)
	assert(client.parse_invite("ABCD-EF23").code=="ABCDEF23")
	assert(client.parse_invite("https://evil.org/#join="+"ab".repeat(32)).is_empty())
	var model = Model.new()
	model.notes = "Private mapping test"
	var original := Mapping.private_data(model)
	Mapping.apply_private(model,original)
	assert(Mapping.private_data(model)==original,"Goal formats must round-trip across clients")
	model.elapsed_ms = 60000
	model.finalize(false)
	var record := Mapping.to_record(model.sessions[0])
	var restored := Mapping.from_record(record)
	assert(restored.active_ms==60000 and restored.id==model.sessions[0].id)
	assert(restored.cloud_synced)
	var token := "ab".repeat(32)
	var link := str(client.config.appUrl)+"#join="+token
	assert(client.parse_invite(link).token==token)
	var generator = QR.new()
	var image: Image = generator.get_texture(link).get_image()
	generator.free()
	var padded := Image.create(image.get_width()+6,image.get_height()+6,false,Image.FORMAT_RGBA8)
	padded.fill(Color.WHITE)
	padded.blit_rect(image,Rect2i(Vector2i.ZERO,image.get_size()),Vector2i(3,3))
	padded.resize(padded.get_width()*6,padded.get_height()*6,Image.INTERPOLATE_NEAREST)
	DirAccess.make_dir_recursive_absolute("res://qa-data")
	assert(padded.save_png("res://qa-data/network-qr.png")==OK)
	if OS.get_cmdline_user_args().has("--live"):
		assert((await client.guest()).get("ok",false),"Native anonymous sign-in")
		var result: Dictionary = await client.api("bootstrap")
		assert(result.get("ok",false),"Native authenticated API")
		var room: Dictionary = await client.api("room.create",{"mode":"online","name":"Native QA"})
		assert(room.get("ok",false),"Native room creation")
		assert(client.parse_invite(str(room.invitation.code)).has("code"))
		result = await client.api("room.leave",{"roomId":room.roomId})
		assert(result.get("ok",false))
		await client.sign_out()
	print("CopyPanda network mapping, invite, QR, and requested live checks passed")
	quit(0)
