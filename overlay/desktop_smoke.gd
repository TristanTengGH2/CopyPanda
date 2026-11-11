extends Node
## Opt-in exported-app GUI check. Requires both --qa and --desktop-smoke.
## Uses this app's controls and viewport; no desktop capture or input monitoring.
var app
var output := ""
var report := {"checks":[],"failures":[],"physical_sleep_tested":false,"physical_pointer_input_tested":false}

func start(owner_app: Control) -> void:
	app = owner_app
	output = ProjectSettings.globalize_path("user://qa/gui")
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--desktop-smoke-output="):
			output = argument.trim_prefix("--desktop-smoke-output=")
	DirAccess.make_dir_recursive_absolute(output)
	call_deferred("_run")

func check(condition: bool, name: String) -> void:
	report.checks.append({"name":name,"passed":condition})
	print("GUI check "+("PASS: " if condition else "FAIL: ")+name)
	if not condition:
		report.failures.append(name)

func settle(seconds := 0.3) -> void:
	await get_tree().create_timer(seconds).timeout
	await get_tree().process_frame
	# Still mode can leave an idle window with no pending render event.
	RenderingServer.force_draw()

func capture(name: String, viewport: Viewport) -> Image:
	print("GUI capture: "+name)
	RenderingServer.force_draw()
	var image: Image = viewport.get_texture().get_image()
	check(image!=null and not image.is_empty(),name+" rendered pixels")
	if image!=null and not image.is_empty():
		check(image.save_png(output.path_join(name+".png"))==OK,name+" image saved")
	return image

func _run() -> void:
	print("GUI driver entered")
	report.platform = OS.get_name()
	report.display_server = DisplayServer.get_name()
	report.processor = OS.get_processor_name()
	report.renderer = RenderingServer.get_current_rendering_driver_name()
	report.adapter = RenderingServer.get_video_adapter_name()
	report.data_directory = ProjectSettings.globalize_path(app.save_root)
	if DisplayServer.get_name()=="headless":
		check(false,"A real graphical display is required")
		finish()
		return
	app.model.settings.tutorial_done = true
	app.model.settings.reduced_motion = true
	app.model.settings.scale = 1.0
	app.model.new_session("focus")
	app._build_compact()
	app._ensure_visible_bounds()
	await settle(0.5)
	check(app.get_window().transparent and app.get_viewport().transparent_bg,"Transparent native window configured")
	check(app.get_window().always_on_top,"Always-on-top enabled")
	var image := await capture("focus",app.get_viewport())
	var transparent_pixels := 0
	var opaque_pixels := 0
	if image!=null:
		for y in range(0,image.get_height(),4):
			for x in range(0,image.get_width(),4):
				var alpha := image.get_pixel(x,y).a
				if alpha<0.01:
					transparent_pixels+=1
				elif alpha>0.95:
					opaque_pixels+=1
	check(transparent_pixels>20 and opaque_pixels>20,"Rendered overlay contains transparent background and opaque UI")
	app._show_home()
	await settle()
	await capture("timer-ready",app.tools)
	app.start_button.pressed.emit()
	await settle(0.6)
	check(app.model.running and app.model.elapsed_ms>0,"Start control runs timer")
	await capture("timer-active",app.tools)
	app.start_button.pressed.emit()
	await settle()
	check(not app.model.running and app.model.elapsed_ms>0,"Pause control preserves elapsed time")
	check(app.compact_state.text.contains("Paused"),"Compact status explicitly shows paused")
	await capture("timer-paused",app.tools)
	app.mode_buttons["break"].pressed.emit()
	await settle()
	check(app.model.kind=="focus" and app.tools.visible,"Unfinished mode switch asks before ending")
	await capture("switch-confirmation",app.tools)
	var confirmed := false
	for button in app.tools.find_children("*","Button",true,false):
		if button.text=="End session & switch to break":
			button.pressed.emit()
			confirmed = true
			break
	check(confirmed,"Mode confirmation control exists")
	await settle()
	check(app.model.kind=="break" and app.model.planned_ms==300000,"Break control switches timer mode")
	check(app.mode_buttons["break"].button_pressed and not app.mode_buttons.focus.button_pressed,"Mode toggle selection follows timer")
	check(app.atlas.atlas.resource_path.ends_with("panda-break-sheet.png"),"Break pose is selected")
	await capture("break",app.get_viewport())
	app.mode_buttons.focus.pressed.emit()
	await settle()
	check(app.model.kind=="focus" and app.model.elapsed_ms==0,"Idle toggle returns to focus")
	var original_position: Vector2i = app.get_window().position
	app.get_window().position += Vector2i(-24,-24)
	await settle()
	check(app.get_window().position!=original_position,"Native window can move")
	for factor in [0.8,1.0,1.8]:
		app.model.settings.scale = factor
		app._build_compact()
		app._ensure_visible_bounds()
		await settle()
		var rect: Rect2 = app.start_button.get_global_rect()
		check(is_equal_approx(rect.size.x,80*factor) and rect.end.x<=app.get_window().size.x,"Controls scale and fit at "+str(factor))
		await capture("scale-"+str(factor),app.get_viewport())
	app.model.settings.scale = 1.0
	app._build_compact()
	app._ensure_visible_bounds()
	app.start_button.pressed.emit()
	await settle()
	app._hide_overlay()
	await get_tree().create_timer(0.5).timeout
	check(app.get_window().mode==Window.MODE_MINIMIZED,"Hide minimizes native window")
	check(app.model.running,"Hiding keeps study running")
	app._show_overlay()
	await settle(0.5)
	check(app.get_window().mode==Window.MODE_WINDOWED and app.get_window().visible,"Show restores native window")
	check(app.get_window().borderless and app.get_viewport().transparent_bg,"Restored overlay stays borderless and transparent")
	await capture("restored",app.get_viewport())
	app._handle_session_event("suspend")
	await settle()
	check(not app.model.running,"Simulated sleep notification pauses timer")
	app._handle_session_event("resume")
	check(not app.model.running,"Wake notification does not resume automatically")
	if OS.get_name()=="macOS":
		for _attempt in 12:
			if app.session_bridge.ready:
				break
			await get_tree().create_timer(0.25).timeout
		check(app.session_bridge.ready,"macOS session helper connected")
		check(app.tray_id>=0,"macOS menu-bar status icon created")
		check(app.dock_menu.is_valid(),"macOS Dock recovery menu created")
	app.model.settings.high_contrast = true
	app.model.settings.large_text = true
	app._apply_theme()
	app._build_compact()
	await settle()
	check(app.compact_state.get_global_rect().end.y<=app.digits.get_global_rect().position.y,"Large-text status does not overlap timer")
	await capture("large-text-contrast",app.get_viewport())
	app._show_settings()
	await settle()
	await capture("settings",app.tools)
	finish()

func finish() -> void:
	report.passed = report.failures.is_empty()
	var file := FileAccess.open(output.path_join("report.json"),FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(report,"\t"))
	if report.passed:
		print("CopyPanda graphical smoke passed: "+str(report.checks.size())+" checks")
	else:
		printerr("CopyPanda graphical smoke failed: "+str(report.failures))
	app.model.pause()
	app._save()
	get_tree().quit(0 if report.passed else 1)
