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
		assert(is_equal_approx(app.mode_buttons.focus.get_global_transform().get_scale().x,factor),"Mode toggle must scale with the overlay")
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
	assert(app.mode_buttons.focus.get_global_rect().end.y<=app.digits.get_global_rect().position.y+0.01,"Mode toggle must stay above the timer: %s / %s"%[app.mode_buttons.focus.get_global_rect(),app.digits.get_global_rect()])
	app.model.new_session("focus")
	app.model.elapsed_ms = 61000
	var old_balance: int = app.model.balance
	app._switch_kind("break")
	assert(app.model.kind=="focus" and app.model.elapsed_ms==61000,"Mode change must wait for confirmation without losing elapsed study")
	assert(app.tools.title=="CopyPanda · Switch to break?","Paused study must offer an explicit mode switch")
	app._finish_mode_switch("break")
	assert(app.model.kind=="break" and app.model.planned_ms==300000 and not app.model.running,"Break starts ready with the correct duration")
	assert(app.model.balance==old_balance+1 and not app.model.sessions[-1].completed,"Switching retains full minutes but cannot award a completion bonus")
	assert(app.atlas.atlas.resource_path.ends_with("panda-break-sheet.png"),"Confirmed mode switch must swap panda artwork immediately")
	assert(app.mode_buttons["break"].button_pressed and not app.mode_buttons.focus.button_pressed,"Only the active mode is selected")
	app._switch_kind("focus")
	assert(app.model.kind=="focus" and app.model.elapsed_ms==0,"Idle mode changes need no confirmation")
	print("CopyPanda layout and mode checks passed: 29")
	quit(0)
