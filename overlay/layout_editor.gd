extends Control
## Temporary dimmed desktop canvas. No desktop capture or input monitoring.
signal finished(rect: Rect2i, accepted: bool)
var bounds := Rect2i()
var preview := Rect2()
var texture: Texture2D
var clock := "25:00"
var leaves := 0
var dragging := false
var resizing := false
var anchor := Vector2.ZERO
var initial := Rect2()
var bar: PanelContainer
var done := false

func setup(source: Window, image: Texture2D, time: String, balance: int) -> void:
	var source_position := source.position
	var source_size := source.size
	texture = image
	clock = time
	leaves = balance
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bounds = DisplayServer.screen_get_usable_rect(source.current_screen)
	get_window().position = bounds.position
	# Keep a one-pixel edge so Windows keeps desktop composition active.
	get_window().size = bounds.size-Vector2i.ONE
	get_window().transparent = true
	get_window().transparent_bg = true
	preview = Rect2(Vector2(source_position-bounds.position),Vector2(source_size))
	bar = PanelContainer.new()
	bar.position = Vector2(24,20)
	bar.size = Vector2(640,90)
	add_child(bar)
	var stack := VBoxContainer.new()
	bar.add_child(stack)
	var help := Label.new()
	help.text = "Adjust overlay · Drag the panda to move it. Drag a corner to resize."
	stack.add_child(help)
	var row := HBoxContainer.new()
	stack.add_child(row)
	var monitor := OptionButton.new()
	for i in DisplayServer.get_screen_count():
		monitor.add_item("Screen %d"%(i+1))
	monitor.selected = source.current_screen
	monitor.item_selected.connect(_screen_changed)
	row.add_child(monitor)
	var save := Button.new()
	save.text = "Save position"
	save.pressed.connect(func():finish(true))
	row.add_child(save)
	var cancel := Button.new()
	cancel.text = "Cancel"
	cancel.pressed.connect(func():finish(false))
	row.add_child(cancel)
	var reset := Button.new()
	reset.text = "Reset"
	reset.pressed.connect(func():preview=Rect2(Vector2(bounds.size)-Vector2(384,344),Vector2(360,320));queue_redraw())
	row.add_child(reset)
	queue_redraw()

func _screen_changed(index: int) -> void:
	bounds = DisplayServer.screen_get_usable_rect(index)
	get_window().position = bounds.position
	get_window().size = bounds.size-Vector2i.ONE
	get_window().transparent = true
	get_window().transparent_bg = true
	preview.position = (Vector2(bounds.size)-preview.size)/2
	_clamp_preview()
	queue_redraw()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO,size),Color(0.15,0.15,0.15,0.26))
	var scale := preview.size.x/360.0
	var origin := preview.position
	draw_texture_rect(texture,Rect2(origin+Vector2(28,35)*scale,Vector2(304,193)*scale),false)
	var cream := StyleBoxFlat.new()
	cream.bg_color = Color("fff7e8")
	cream.set_corner_radius_all(int(18*scale))
	draw_style_box(cream,Rect2(origin+Vector2(15,228)*scale,Vector2(330,78)*scale))
	var font := ThemeDB.fallback_font
	draw_string(font,origin+Vector2(30,250)*scale,"Focus",HORIZONTAL_ALIGNMENT_LEFT,-1,int(13*scale),Color("645039"))
	draw_string(font,origin+Vector2(30,289)*scale,clock,HORIZONTAL_ALIGNMENT_LEFT,-1,int(32*scale),Color("645039"))
	draw_string(font,origin+Vector2(175,288)*scale,"Start    Menu",HORIZONTAL_ALIGNMENT_LEFT,-1,int(14*scale),Color("645039"))
	draw_rect(preview,Color("e7e9e3"),false,2)
	for corner in _corners():
		draw_rect(Rect2(corner-Vector2(7,7),Vector2(14,14)),Color("fff7e8"))
	draw_string(font,origin+Vector2(8,-12),"%d × %d"%[preview.size.x,preview.size.y],HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color.WHITE)

func _corners() -> Array[Vector2]:
	return [preview.position,preview.position+Vector2(preview.size.x,0),preview.end,preview.position+Vector2(0,preview.size.y)]

var resize_corner := 2
func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
		if event.pressed:
			anchor = event.position
			initial = preview
			for i in 4:
				if event.position.distance_to(_corners()[i])<20:
					resizing = true
					resize_corner = i
					break
			dragging = not resizing and preview.has_point(event.position)
		else:
			dragging = false
			resizing = false
	elif event is InputEventMouseMotion:
		if dragging:
			preview.position = initial.position+event.position-anchor
		elif resizing:
			var direction := -1 if resize_corner in [0,3] else 1
			var width := clampf(initial.size.x+(event.position.x-anchor.x)*direction,288,minf(648,bounds.size.x))
			preview.size = Vector2(width,width*320.0/360.0)
			if resize_corner in [0,3]:
				preview.position.x = initial.end.x-preview.size.x
			if resize_corner in [0,1]:
				preview.position.y = initial.end.y-preview.size.y
		else:
			mouse_default_cursor_shape = Control.CURSOR_ARROW
			if preview.has_point(event.position):
				mouse_default_cursor_shape = Control.CURSOR_MOVE
			for corner in _corners():
				if event.position.distance_to(corner)<20:
					mouse_default_cursor_shape = Control.CURSOR_FDIAGSIZE
		_clamp_preview()
		queue_redraw()

func _clamp_preview() -> void:
	preview.position.x = clampf(preview.position.x,0,maxf(0,bounds.size.x-preview.size.x))
	preview.position.y = clampf(preview.position.y,0,maxf(0,bounds.size.y-preview.size.y))

func _unhandled_key_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		finish(false)
	elif event is InputEventKey and event.pressed and event.keycode==KEY_ENTER:
		finish(true)
	elif event is InputEventKey and event.pressed:
		var movement := Vector2.ZERO
		match event.keycode:
			KEY_LEFT: movement.x=-1
			KEY_RIGHT: movement.x=1
			KEY_UP: movement.y=-1
			KEY_DOWN: movement.y=1
		if event.shift_pressed:
			preview.size.x=clampf(preview.size.x+movement.x*10,288,648)
			preview.size.y=preview.size.x*320/360
		else:
			preview.position+=movement*10
		_clamp_preview()
		queue_redraw()

func finish(accepted: bool) -> void:
	if done:
		return
	done=true
	finished.emit(Rect2i(Vector2(bounds.position)+preview.position,preview.size),accepted)
