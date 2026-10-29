extends SceneTree

func _initialize() -> void:
	call_deferred("_check_layout")

func _check_layout() -> void:
	var app = load("res://main.tscn").instantiate()
	root.add_child(app)
	await process_frame
	for factor in [0.8,1.0,1.8]:
		app.model.settings.scale = factor
		app._build_compact()
		await process_frame
		var button: Button = app.start_button
		var rect := button.get_global_rect()
		assert(is_equal_approx(rect.size.x,80*factor),"Button width must scale with the panda")
		assert(is_equal_approx(rect.size.y,42*factor),"Button height must scale with the panda")
		assert(is_equal_approx(button.get_global_transform().get_scale().x,factor),"Text and icons must inherit the same scale")
		assert(rect.end.x<=root.size.x and rect.end.y<=root.size.y,"Timer controls must stay within the window")
	app.model.settings.reduced_motion = true
	app.model.kind = "break"
	app._render()
	assert(app.atlas.atlas.resource_path.ends_with("panda-break-sheet.png"),"Break must show the new resting artwork immediately")
	assert(app.animation_timer.is_stopped(),"Reduced motion must keep the break pose still")
	app._turn_page(true)
	assert(app.animation_timer.is_stopped(),"Manual preview must respect reduced motion")
	app.model.kind = "focus"
	app._render()
	assert(app.atlas.atlas.resource_path.ends_with("panda-page-turn-sheet.png"),"Focus must restore the reading artwork")
	app._notify("Try a gentle seated stretch, if you like. A longer reminder must never cover the timer.")
	app._render()
	await process_frame
	assert(app.reminder_panel.visible,"Reminder must remain visible in a separate area")
	assert(not app.reminder_panel.get_global_rect().intersects(app.digits.get_global_rect()),"Reminder must not overlap the timer")
	assert(app.status_label.autowrap_mode==TextServer.AUTOWRAP_OFF,"Status cannot wrap over the digits")
	print("CopyPanda layout and mode checks passed: 19")
	quit(0)
