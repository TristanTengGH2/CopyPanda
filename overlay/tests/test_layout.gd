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
	print("CopyPanda proportional layout checks passed: 12")
	quit(0)
