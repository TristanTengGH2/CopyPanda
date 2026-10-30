extends Control

const StudyModel = preload("res://study_model.gd")
const SaveStore = preload("res://save_store.gd")
const SHEET = preload("res://assets/panda-page-turn-sheet.png")
const BREAK_SHEET = preload("res://assets/panda-break-sheet.png")
const ICON = preload("res://assets/icon.svg")
const LayoutEditor = preload("res://layout_editor.gd")
const DesktopPlatform = preload("res://desktop_platform.gd")
const SessionBridge = preload("res://session_bridge.gd")
var session_bridge = SessionBridge.new()
var dock_menu := RID()
const DOCK_SHOW_TAG := "copypanda-show-overlay"
const NetworkUI = preload("res://network_ui.gd")
var network
const MONTHS := ["January","February","March","April","May","June","July","August","September","October","November","December"]
var layout_editor: Control
var layout_original := Rect2i()
var icon_cache := {}
const VERSION := "1.3.0-preview.1"
var model = StudyModel.new()
var store
var save_root := "user://"
var qa := false
var ui_scale := 1.0
var panda: TextureRect
var atlas := AtlasTexture.new()
var digits: Label
var mode_buttons := {}
var balance_label: Label
var start_button: Button
var reminder_panel: PanelContainer
var reminder_label: Label
var tools: Window
var tools_box: VBoxContainer
var toast_text := ""
var toast_until := 0
var heartbeat_count := 0
var last_display := ""
var last_panda_kind := ""
var animation_timer: Timer
var animation_frame := 0
var next_page_ms := 0
var tray_id := -1
var tray_menu := RID()
var save_timer: Timer
var journal_month := 0
var journal_year := 0
var tool_clock: Label

func _ready() -> void:
	qa = OS.get_cmdline_user_args().has("--qa")
	save_root = DesktopPlatform.data_directory(OS.get_name(),OS.has_feature("editor"),qa)
	store = SaveStore.new(save_root)
	store.load_into(model)
	network = NetworkUI.new()
	add_child(network)
	network.setup(self)
	get_tree().auto_accept_quit = false
	get_viewport().transparent_bg = true
	get_viewport().gui_embed_subwindows = false
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	get_window().title = "CopyPanda Overlay" + (" · QA" if qa else "")
	get_window().close_requested.connect(_request_quit)
	atlas.atlas = SHEET
	_apply_theme()
	_build_compact()
	_setup_tray()
	_setup_dock_menu()
	_start_desktop_events()
	_restore_position()
	save_timer = Timer.new()
	save_timer.one_shot = true
	save_timer.wait_time = 0.5
	save_timer.timeout.connect(_save)
	add_child(save_timer)
	var heartbeat := Timer.new()
	heartbeat.wait_time = 0.25
	heartbeat.timeout.connect(_heartbeat)
	add_child(heartbeat)
	heartbeat.start()
	animation_timer = Timer.new()
	animation_timer.wait_time = 0.3
	animation_timer.timeout.connect(_advance_page)
	add_child(animation_timer)
	next_page_ms = Time.get_ticks_msec() + 8000
	var date := Time.get_date_dict_from_system()
	journal_year = int(date.year)
	journal_month = int(date.month)
	if model.elapsed_ms >= model.planned_ms:
		_complete_session()
	_render()
	if model.elapsed_ms > 0:
		_notify("Session restored paused. Resume when you’re ready.")
	if not bool(model.settings.tutorial_done):
		call_deferred("_show_tutorial")

func _style(color: Color, radius: int = 16) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = color
	s.set_corner_radius_all(radius)
	s.set_border_width_all(1)
	s.border_color = Color("d8c9ad")
	s.set_content_margin_all(10)
	return s

func _apply_theme() -> void:
	var t := Theme.new()
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Helvetica Neue","Arial"]) if OS.get_name()=="macOS" else PackedStringArray(["Segoe UI","Arial"])
	t.default_font = font
	t.default_font_size = 17 if bool(model.settings.large_text) else 14
	var ink := Color("2c241b") if bool(model.settings.high_contrast) else Color("645039")
	for type in ["Label","Button","CheckButton","LineEdit","TextEdit","OptionButton"]:
		t.set_color("font_color",type,ink)
	for type in ["Button","OptionButton"]:
		t.set_stylebox("normal",type,_style(Color("f8f0df")))
		t.set_stylebox("hover",type,_style(Color("eadcc1")))
		t.set_stylebox("pressed",type,_style(Color("dfcaac")))
		t.set_stylebox("focus",type,_style(Color(0.96,0.91,0.8,0.25)))
	t.set_stylebox("panel","PanelContainer",_style(Color("fff7e8"),22))
	t.set_stylebox("normal","LineEdit",_style(Color("fffaf0"),10))
	t.set_stylebox("normal","TextEdit",_style(Color("fffaf0"),10))
	t.set_color("font_placeholder_color","LineEdit",Color("8b7c65"))
	theme = t
	if is_instance_valid(tools):
		tools.theme = t

func _button(text: String, action: Callable, parent: Node, min_width: float = 0) -> Button:
	var b := Button.new()
	b.text = text
	b.tooltip_text = text
	b.custom_minimum_size = Vector2(min_width,40)
	b.pressed.connect(func():action.call_deferred())
	parent.add_child(b)
	return b

func _label(text: String, parent: Node, font_size: int = 0) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if font_size > 0:
		label.add_theme_font_size_override("font_size",font_size)
	parent.add_child(label)
	return label

func _build_compact() -> void:
	for child in get_children():
		if child is Control:
			remove_child(child)
			child.queue_free()
	ui_scale = clampf(float(model.settings.get("scale",[0.9,1.0,1.2][clampi(int(model.settings.size),0,2)])),0.8,1.8)
	get_window().size = Vector2i(Vector2(360,320)*ui_scale)
	get_window().always_on_top = bool(model.settings.topmost)
	reminder_panel = PanelContainer.new()
	reminder_panel.position = Vector2(15,0)
	reminder_panel.size = Vector2(330,32)
	var reminder_style := _style(Color("fff7e8"),12)
	reminder_style.set_content_margin_all(5)
	reminder_panel.add_theme_stylebox_override("panel",reminder_style)
	reminder_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(reminder_panel)
	reminder_label = _label("",reminder_panel,15 if bool(model.settings.large_text) else 12)
	reminder_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	reminder_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	reminder_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panda = TextureRect.new()
	panda.texture = atlas
	panda.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	panda.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	panda.position = Vector2(28,35)
	panda.size = Vector2(304,193)
	panda.mouse_filter = Control.MOUSE_FILTER_STOP
	panda.tooltip_text = "Your study panda. Click to preview a page turn."
	panda.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			_turn_page(true))
	add_child(panda)
	var panel := PanelContainer.new()
	panel.position = Vector2(15,228)
	panel.size = Vector2(330,78)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(panel)
	var move := _compact_icon_button("move","Drag to move overlay",Vector2(25,233),24)
	move.mouse_default_cursor_shape = Control.CURSOR_MOVE
	move.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT and event.pressed:
			get_window().start_drag())
	mode_buttons = {}
	for index in 2:
		var kind := "focus" if index==0 else "break"
		var mode := _button("Focus" if index==0 else "Break",_switch_kind.bind(kind),self)
		mode.position = Vector2(56+index*94,232)
		mode.custom_minimum_size = Vector2.ZERO
		mode.add_theme_font_size_override("font_size",13)
		for color_name in ["font_color","font_hover_color","font_pressed_color","font_hover_pressed_color","font_focus_color"]:
			mode.add_theme_color_override(color_name,theme.get_color("font_color","Button"))
		mode.toggle_mode = true
		for state in ["normal","hover","pressed","hover_pressed","focus","disabled"]:
			var selected: bool = state in ["pressed","hover_pressed"]
			var mode_style := _style(Color("d6dfbf") if selected else Color("f8f0df"),9)
			mode_style.set_content_margin_all(1)
			if state=="focus":
				mode_style.bg_color = Color(0,0,0,0)
				mode_style.border_color = Color("a45c37")
			mode.add_theme_stylebox_override(state,mode_style)
		mode.size = Vector2(90,23)
		mode_buttons[kind] = mode
	balance_label = _label("",self,12)
	var leaf := TextureRect.new()
	leaf.texture = _icon("leaf")
	leaf.position = Vector2(267,236)
	leaf.size = Vector2(18,18)
	leaf.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	leaf.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(leaf)
	balance_label.position = Vector2(287,237)
	balance_label.size = Vector2(36,18)
	balance_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	digits = _label("25:00",self,32 if not bool(model.settings.large_text) else 36)
	digits.position = Vector2(30,256)
	digits.size = Vector2(125,44)
	start_button = _button("Focus",_toggle_session,self)
	start_button.position = Vector2(158,257)
	start_button.size = Vector2(80,42)
	var more := _button("Menu",_show_home,self)
	more.position = Vector2(244,257)
	more.size = Vector2(57,42)
	more.custom_minimum_size = Vector2.ZERO
	var hide_button := _compact_icon_button("hide","Hide overlay — your timer keeps running",Vector2(307,264),28)
	hide_button.pressed.connect(_hide_overlay)
	# This polygon includes the panda and visible controls; empty exterior pixels pass through.
	var shape := PackedVector2Array([Vector2(27,35),Vector2(337,35),Vector2(337,190),Vector2(346,195),Vector2(346,310),Vector2(14,310),Vector2(14,229),Vector2(27,222)])
	for i in shape.size():
		shape[i] *= ui_scale
	get_window().mouse_passthrough_polygon = shape
	# A single canvas scales artwork, control hit areas, icons, and fonts equally.
	var canvas := Control.new()
	canvas.name = "CompactCanvas"
	canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(canvas)
	for child in get_children():
		if child is Control and child!=canvas:
			child.reparent(canvas,false)
	canvas.scale = Vector2.ONE*ui_scale
	_set_frame(0)
	last_display = ""
	_render()

func _compact_icon_button(symbol: String, description: String, point: Vector2, diameter: float) -> Button:
	var b := _button("",func():pass,self)
	b.icon = _icon(symbol)
	b.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
	b.vertical_icon_alignment = VERTICAL_ALIGNMENT_CENTER
	b.tooltip_text = description
	b.custom_minimum_size = Vector2.ZERO
	for state in ["normal","hover","pressed","focus","disabled"]:
		var style := _style(Color("f8f0df") if state=="normal" else Color("e5d8bd"),99)
		style.set_content_margin_all(2)
		if state=="focus":
			style.bg_color = Color(0,0,0,0)
			style.border_color = Color("a45c37")
		b.add_theme_stylebox_override(state,style)
	b.position = point
	b.size = Vector2.ONE*diameter
	return b

func _set_frame(frame: int) -> void:
	var sheet: Texture2D = BREAK_SHEET if model.kind=="break" else SHEET
	atlas.atlas = sheet
	var cell := Vector2(sheet.get_width()/3.0,sheet.get_height()/2.0)
	atlas.region = Rect2(Vector2(frame%3,frame/3)*cell,cell)
	# Match the upper-head registration corrections measured in the browser prototype.
	var offsets := [Vector2.ZERO,Vector2(-1,0),Vector2(-2,0),Vector2(0,2),Vector2(-1,3),Vector2(-1,3)]
	panda.position = Vector2(28,35) + (Vector2.ZERO if model.kind=="break" else offsets[frame]*Vector2(304/cell.x,193/cell.y))

func _turn_page(manual: bool = false) -> void:
	if is_instance_valid(layout_editor):
		return
	if bool(model.settings.reduced_motion) or not get_window().visible:
		return
	if not manual and not model.running and model.elapsed_ms>0:
		return
	animation_frame = 0
	_set_frame(0)
	animation_timer.wait_time = 0.8 if model.kind=="break" else 0.3
	animation_timer.start()

func _advance_page() -> void:
	if bool(model.settings.reduced_motion) or not get_window().visible or (not model.running and model.elapsed_ms>0):
		animation_timer.stop()
		_set_frame(0)
		return
	animation_frame += 1
	if animation_frame >= 6:
		animation_timer.stop()
		_set_frame(0)
		next_page_ms = Time.get_ticks_msec()+22000
	else:
		_set_frame(animation_frame)

func _heartbeat() -> void:
	_poll_desktop_events() # Handle sleep/session changes before crediting another interval.
	var result: String = model.tick(Time.get_ticks_msec())
	if result == "complete":
		_complete_session()
	elif result == "interrupted":
		_notify("Long interruption detected. Your timer is paused.")
		_save()
	heartbeat_count += 1
	if heartbeat_count%40 == 0 and not is_instance_valid(layout_editor):
		_capture_position()
		_save()
		_ensure_visible_bounds()
	if not animation_timer.is_stopped() and (not model.running and model.elapsed_ms>0):
		animation_timer.stop()
		_set_frame(0)
	if animation_timer.is_stopped() and Time.get_ticks_msec() >= next_page_ms:
		next_page_ms = Time.get_ticks_msec()+22000
		_turn_page()
	_render()

func _render() -> void:
	if not is_instance_valid(digits):
		return
	if last_panda_kind!=model.kind:
		last_panda_kind=model.kind
		if is_instance_valid(animation_timer):
			animation_timer.stop()
		_set_frame(0)
		panda.tooltip_text="Your resting panda. Click to preview a stretch." if model.kind=="break" else "Your studying panda. Click to preview a page turn."
	var seconds: int = model.remaining_seconds()
	var state := "DEMO · no rewards" if model.demo else ("Focus" if model.kind=="focus" else "Short break")
	if model.running:
		state += " · studying" if model.kind=="focus" else " · rest"
	elif model.elapsed_ms>0:
		state += " · paused"
	var reminder := toast_text if Time.get_ticks_msec()<toast_until else ""
	var key := "%s|%d|%d|%s|%s"%[state,seconds,model.balance,str(model.running),reminder]
	if key == last_display:
		return
	last_display = key
	reminder_panel.visible = not reminder.is_empty()
	reminder_label.text = reminder
	reminder_label.tooltip_text = reminder
	_update_input_region(not reminder.is_empty())
	digits.text = "%02d:%02d"%[seconds/60,seconds%60]
	if is_instance_valid(tool_clock):
		tool_clock.text = digits.text
	for kind in mode_buttons:
		mode_buttons[kind].set_pressed_no_signal(kind==model.kind)
		mode_buttons[kind].tooltip_text = state if kind==model.kind else ("Switch to focus" if kind=="focus" else "Switch to a five-minute break")
	balance_label.text = str(model.balance)
	balance_label.tooltip_text = "%d leaves"%model.balance
	start_button.text = "Pause" if model.running else ("Resume" if model.elapsed_ms>0 else "Start")
	if tray_id>=0:
		DisplayServer.status_indicator_set_tooltip(tray_id,"CopyPanda · %s · %s"%[digits.text,state])

func _notify(message: String) -> void:
	toast_text = message
	toast_until = Time.get_ticks_msec()+6000
	last_display = ""

func _update_input_region(with_reminder: bool) -> void:
	if is_instance_valid(layout_editor):
		return
	var shape := PackedVector2Array([Vector2(27,35),Vector2(337,35),Vector2(337,190),Vector2(346,195),Vector2(346,310),Vector2(14,310),Vector2(14,229),Vector2(27,222)])
	if with_reminder:
		shape = PackedVector2Array([Vector2(14,0),Vector2(346,0),Vector2(346,310),Vector2(14,310)])
	for i in shape.size():
		shape[i] *= ui_scale
	get_window().mouse_passthrough_polygon = shape

func _toggle_session() -> void:
	if model.running:
		var result: String = model.tick(Time.get_ticks_msec())
		if result=="complete":
			_complete_session()
			return
		model.pause()
	else:
		model.start(Time.get_ticks_msec())
		if model.kind=="break" and bool(model.settings.reminders):
			_notify(["Time for some water?","Rest your eyes for a moment.","Try a gentle seated stretch, if you like."].pick_random())
	_save()
	_render()

func _complete_session() -> void:
	var was_demo: bool = model.demo
	var was_focus: bool = model.kind=="focus"
	var earned: Dictionary = model.finalize(true)
	model.new_session("break" if was_focus else "focus")
	_save()
	if is_instance_valid(tools) and tools.visible and tools.title=="CopyPanda · Study timer":
		_show_home()
	_notify("Demo complete · no rewards" if was_demo else ("Finished! +%d leaves · choose your break"%earned.total if was_focus else "Break complete · ready when you are"))

func _schedule_save() -> void:
	if is_instance_valid(save_timer):
		save_timer.start()

func _save() -> void:
	if not store.save_model(model):
		_notify(store.last_error)

func _capture_position() -> void:
	model.settings.position = [get_window().position.x,get_window().position.y]
	model.settings.monitor = get_window().current_screen

func _restore_position() -> void:
	var saved = model.settings.get("position",[])
	if saved is Array and saved.size()==2:
		get_window().position = Vector2i(int(saved[0]),int(saved[1]))
	else:
		_position_corner("Bottom right")
	_ensure_visible_bounds()

func _ensure_visible_bounds() -> void:
	if is_instance_valid(layout_editor):
		return
	if DisplayServer.get_name()=="headless":
		return
	var area := Rect2i()
	for screen in DisplayServer.get_screen_count():
		var usable := DisplayServer.screen_get_usable_rect(screen)
		if usable.intersects(Rect2i(get_window().position,get_window().size)):
			area = usable
			break
	if area.size==Vector2i.ZERO:
		area = DisplayServer.screen_get_usable_rect(0)
	var maximum := area.end-get_window().size
	get_window().position = Vector2i(clampi(get_window().position.x,area.position.x,maxi(area.position.x,maximum.x)),clampi(get_window().position.y,area.position.y,maxi(area.position.y,maximum.y)))

func _position_corner(corner: String) -> void:
	var screen := clampi(get_window().current_screen,0,maxi(0,DisplayServer.get_screen_count()-1))
	var area := DisplayServer.screen_get_usable_rect(screen)
	var point := area.position+Vector2i(24,24)
	if corner.contains("right"):
		point.x = area.end.x-get_window().size.x-24
	if corner.contains("Bottom"):
		point.y = area.end.y-get_window().size.y-24
	get_window().position = point
	_capture_position()
	if store!=null:
		_save()

func _setup_tray() -> void:
	if DisplayServer.get_name()=="headless" or not DisplayServer.has_feature(DisplayServer.FEATURE_STATUS_INDICATOR):
		return
	tray_id = DisplayServer.create_status_indicator(ICON,"CopyPanda",_tray_clicked)
	if tray_id<0:
		return
	tray_menu = NativeMenu.create_menu()
	for item in ["Show overlay","Pause / resume","Reset position","Quit"]:
		NativeMenu.add_item(tray_menu,item,_tray_action,Callable(),item)
	DisplayServer.status_indicator_set_menu(tray_id,tray_menu)

func _tray_clicked(_button: int, _point: Vector2i) -> void:
	_show_overlay()

func _tray_action(tag: Variant) -> void:
	match str(tag):
		"Show overlay": _show_overlay()
		"Pause / resume": _toggle_session()
		"Reset position":
			_position_corner("Bottom right")
			_show_overlay()
		"Quit":
			_show_overlay()
			_request_quit()

func _show_overlay() -> void:
	get_window().show()
	get_window().mode = Window.MODE_WINDOWED
	get_window().grab_focus()
	_ensure_visible_bounds()

func _hide_overlay() -> void:
	get_window().mode = Window.MODE_MINIMIZED
	animation_timer.stop()
	_set_frame(0)
	_capture_position()
	_save()

func _open_tools(title: String) -> void:
	if is_instance_valid(tools):
		remove_child(tools)
		tools.queue_free()
	tools = Window.new()
	tools.title = "CopyPanda · "+title
	tools.size = Vector2i(560,680)
	tools.min_size = Vector2i(520,420)
	tools.always_on_top = bool(model.settings.topmost)
	tools.theme = theme
	tools.close_requested.connect(func(): tools.hide())
	add_child(tools)
	var panel := PanelContainer.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	tools.add_child(panel)
	var margin := MarginContainer.new()
	for side in ["left","right","top","bottom"]:
		margin.add_theme_constant_override("margin_"+side,16)
	panel.add_child(margin)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	margin.add_child(scroll)
	tools_box = VBoxContainer.new()
	tools_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tools_box.add_theme_constant_override("separation",12)
	scroll.add_child(tools_box)
	var nav := HBoxContainer.new()
	nav.add_theme_constant_override("separation",4)
	tools_box.add_child(nav)
	var items := [["Timer","timer",_show_home,"Study timer"],["Calendar","calendar",_show_journal,"Calendar"],["Notes","notes",_show_notes,"Notes"],["Goals","goals",_show_challenge,"Study goals"],["Settings","settings",_show_settings,"Settings"]]
	for item in items:
		var b := _button(item[0],item[2],nav)
		b.icon = _icon(item[1])
		b.add_theme_font_size_override("font_size",13)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.add_theme_stylebox_override("normal",_style(Color("e5d8bd") if title==item[3] else Color(0,0,0,0),10))
		b.tooltip_text = item[0]
	var social_nav := HBoxContainer.new()
	tools_box.add_child(social_nav)
	_button("Study together",network.show_room,social_nav)
	_button("Account",network.show_account,social_nav)
	_label(title,tools_box,25)
	if DisplayServer.get_name() != "headless":
		var area := DisplayServer.screen_get_usable_rect(get_window().current_screen)
		tools.size = Vector2i(mini(560,area.size.x),mini(680,area.size.y))
		tools.position = area.position+(area.size-tools.size)/2
		tools.show()

func _input_field(label: String, value: String, parent: Node) -> LineEdit:
	_label(label,parent)
	var edit := LineEdit.new()
	edit.text = value
	edit.custom_minimum_size.y = 40
	parent.add_child(edit)
	return edit

func _spinner(label: String, value: int, maximum: int, parent: Node) -> SpinBox:
	_label(label,parent)
	var spin := SpinBox.new()
	spin.min_value = 1
	spin.max_value = maximum
	spin.step = 1
	spin.value = value
	spin.custom_minimum_size.y = 40
	parent.add_child(spin)
	return spin

func _show_home() -> void:
	_open_tools("Study timer")
	var modes := HBoxContainer.new()
	tools_box.add_child(modes)
	for pair in [["focus","Focus"],["break","Break"]]:
		var mode := _button(pair[1],_switch_kind.bind(pair[0]),modes)
		mode.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		mode.disabled = pair[0]==model.kind
		if model.kind==pair[0]:
			mode.add_theme_stylebox_override("normal",_style(Color("e0d9bf"),12))
	var topic := _input_field("What are you studying?",model.intention,tools_box)
	topic.placeholder_text = "e.g. Biology — chapter 3"
	topic.max_length = 120
	topic.text_changed.connect(func(value: String): model.intention=value;_schedule_save())
	if model.kind=="focus":
		var duration := _spinner("Session length (minutes)",model.focus_minutes,120,tools_box)
		duration.editable = not model.running and model.elapsed_ms==0
		duration.value_changed.connect(func(value: float):model.focus_minutes=int(value);model.new_session();_save();_render())
	else:
		_label("5-minute break",tools_box)
	var remaining: int = model.remaining_seconds()
	var clock := _label("%02d:%02d"%[remaining/60,remaining%60],tools_box,44)
	tool_clock = clock
	clock.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var action := "Pause" if model.running else ("Resume" if model.elapsed_ms>0 else ("Start focus" if model.kind=="focus" else "Start break"))
	var primary := _button(action,func():_toggle_session();_show_home(),tools_box)
	primary.add_theme_stylebox_override("normal",_style(Color("d6dfbf"),12))
	primary.icon = _icon("pause" if model.running else "play")
	if model.elapsed_ms>0 or model.running:
		_button("Finish early",_confirm_end,tools_box)
	_balance_row(tools_box)
	if not model.bookmark.is_empty():
		_label("A note from last time",tools_box,18)
		_label(str(model.bookmark.get("next",model.bookmark.get("working",""))),tools_box)
		_button("Continue this goal",func():model.intention=str(model.bookmark.get("next",model.bookmark.get("working","")));_save();_show_home(),tools_box)
	_label("Demo: try the flow in 10 seconds. No leaves or study credit.",tools_box)
	var demo_button := _button("Try a 10-second demo",func():model.new_session("focus",true);model.start(Time.get_ticks_msec());_save();_render();tools.hide(),tools_box)
	demo_button.disabled = model.running or model.elapsed_ms>0
	_button("Quit CopyPanda…",_request_quit,tools_box)

func _switch_kind(kind: String) -> void:
	# Restore the selected segment while an unfinished timer awaits confirmation.
	for current in mode_buttons:
		mode_buttons[current].set_pressed_no_signal(current==model.kind)
	if kind==model.kind:
		return
	if model.running:
		model.tick(Time.get_ticks_msec())
		model.pause()
	if model.elapsed_ms>=model.planned_ms:
		_complete_session()
		_render()
		if is_instance_valid(tools):
			tools.hide()
		return
	if model.elapsed_ms>0:
		_save()
		_render()
		var next := "break" if kind=="break" else "focus"
		_open_tools("Switch to "+next+"?")
		_label("Your current timer is paused. Switching ends this session. You’ll keep %d leaves for completed study minutes; there’s no completion bonus."%int(model.reward(false).total),tools_box)
		_button("Keep current session",_show_home,tools_box)
		_button("End session & switch to "+next,_finish_mode_switch.bind(kind),tools_box)
		return
	_finish_mode_switch(kind)

func _finish_mode_switch(kind: String) -> void:
	if model.elapsed_ms>0:
		model.finalize(false)
	model.new_session(kind)
	if is_instance_valid(network):
		network.leave_shared_timer()
	_save()
	_render()
	if is_instance_valid(tools):
		tools.hide()

func _confirm_end() -> void:
	if model.running:
		model.tick(Time.get_ticks_msec())
	model.pause()
	_save()
	_open_tools("End this session?")
	_label("You’ll keep %d leaves for the time you studied. Ending early skips the completion bonus. Your timer is paused while you decide."%int(model.reward(false).total),tools_box)
	_button("Keep this session",_show_home,tools_box)
	_button("End session",func():model.finalize(false);model.new_session();_save();_render();_show_home(),tools_box)

func _show_notes() -> void:
	_open_tools("Notes")
	_label("Private notes · saved on this device as you write.",tools_box)
	var edit := TextEdit.new()
	edit.text = model.notes
	edit.custom_minimum_size.y = 280
	edit.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	tools_box.add_child(edit)
	edit.text_changed.connect(func():model.notes=edit.text;_schedule_save())

func _show_challenge() -> void:
	_open_tools("Study goals")
	var p: Dictionary = model.challenge_progress()
	_label("%d / %d study days · %d / %d sessions today"%[p.count,model.challenge.days,p.today,model.challenge.daily],tools_box,19)
	_label("Your goal: %d completed %d-minute session(s) per day. Missing a day never resets your progress."%[model.challenge.daily,model.challenge.minutes],tools_box)
	var minutes := _spinner("Minutes per session",int(model.challenge.minutes),120,tools_box)
	var daily := _spinner("Sessions per study day",int(model.challenge.daily),8,tools_box)
	var days := _spinner("Study days to aim for",int(model.challenge.days),365,tools_box)
	_label("Starting a new goal saves your previous goal in your history. You keep your study records and leaves.",tools_box)
	_button("Start a new goal",func():model.set_challenge(int(minutes.value),int(daily.value),int(days.value));_save();_show_challenge(),tools_box)

func _show_journal(selected_day: String = "") -> void:
	_open_tools("Calendar")
	var total := 0
	for entry in model.sessions:
		total += int(entry.get("active_ms",0))
	_label("%d minutes studied"%[total/60000],tools_box,18)
	_balance_row(tools_box)
	var row := HBoxContainer.new()
	tools_box.add_child(row)
	_button("←",func():_change_month(-1),row,45)
	var title := _label("%s %d"%[MONTHS[journal_month-1],journal_year],row,20)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_button("→",func():_change_month(1),row,45)
	var grid := GridContainer.new()
	grid.columns = 7
	grid.add_theme_constant_override("h_separation",5)
	grid.add_theme_constant_override("v_separation",5)
	tools_box.add_child(grid)
	var chosen := model.local_day() if selected_day.is_empty() else selected_day
	for day_name in ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]:
		var heading := _label(day_name,grid)
		heading.custom_minimum_size.x = 58
		heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		heading.add_theme_font_size_override("font_size",12)
		heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var first := "%04d-%02d-01"%[journal_year,journal_month]
	var stamp := Time.get_unix_time_from_datetime_string(first+"T12:00:00")
	var weekday: int = Time.get_date_dict_from_unix_time(stamp).weekday
	for _i in (weekday+6)%7:
		_label("",grid)
	for day_num in 31:
		var day := "%04d-%02d-%02d"%[journal_year,journal_month,day_num+1]
		var date := Time.get_date_dict_from_unix_time(stamp+day_num*86400)
		if int(date.month)!=journal_month:
			break
		var studied := false
		for entry in model.sessions:
			if entry.get("day","")==day:
				studied=true
		_calendar_cell(day,day_num+1,studied,day==model.local_day(),day==chosen,grid)
	_label(_friendly_date(chosen),tools_box,18)
	_label("Outlined date: today · Dot: study recorded",tools_box,12)
	var found := false
	for entry in model.sessions:
		if entry.get("day","")==chosen:
			found=true
			_label("%s\n%d min · %s · +%d leaves"%[entry.get("intention","A little focus"),int(entry.get("active_ms",0))/60000,"manual entry" if entry.get("manual",false) else ("completed" if entry.get("completed",false) else "ended early"),int(entry.get("earned",0))],tools_box)
	if not found:
		_label("No study sessions recorded for this day.",tools_box)
	_button("Add study session",_manual_entry,tools_box)
	if model.awards.size()>0:
		_label("Goals completed: %d"%model.awards.size(),tools_box)

func _change_month(delta: int) -> void:
	journal_month += delta
	if journal_month<1:
		journal_month=12
		journal_year-=1
	if journal_month>12:
		journal_month=1
		journal_year+=1
	_show_journal()

func _manual_entry() -> void:
	_open_tools("Add a study session")
	var topic := _input_field("What did you work on?","",tools_box)
	var date := _input_field("Study date · YYYY-MM-DD",model.local_day(),tools_box)
	var minutes := _spinner("Focused minutes",25,720,tools_box)
	var error := _label("Manually added sessions appear in your history. They do not earn leaves or count toward your goal.",tools_box)
	_button("Save study entry",func():
		var regex := RegEx.new()
		regex.compile("^\\d{4}-\\d{2}-\\d{2}$")
		var valid := regex.search(date.text)!=null
		if valid:
			var parsed := Time.get_unix_time_from_datetime_string(date.text+"T12:00:00")
			valid = Time.get_date_string_from_unix_time(parsed)==date.text and date.text<=model.local_day()
		if not valid or topic.text.strip_edges().is_empty():
			error.text="Enter a topic and a valid study date no later than today."
			return
		model.add_manual(date.text,int(minutes.value),topic.text.strip_edges())
		_save()
		_show_journal(date.text),tools_box)

func _show_settings() -> void:
	_open_tools("Settings")
	for pair in [["topmost","Always on top"],["reduced_motion","Still panda / reduced motion"],["high_contrast","Higher contrast"],["large_text","Larger text"],["reminders","Gentle break reminders"]]:
		var check := CheckButton.new()
		check.text=pair[1]
		check.button_pressed=bool(model.settings[pair[0]])
		tools_box.add_child(check)
		check.toggled.connect(_setting_changed.bind(str(pair[0])))
	var adjust := _button("Adjust overlay",_adjust_overlay,tools_box)
	adjust.icon = _icon("move")
	_label("Move and resize your panda on a dimmed screen. Save when it looks right.",tools_box)
	_label(DesktopPlatform.label(OS.get_name())+" sleep/session detection: "+("connected" if session_bridge.ready else "unavailable; long interruptions still pause the timer"),tools_box)
	_label("Hiding keeps an active timer running. "+DesktopPlatform.recovery_hint(OS.get_name(),tray_id>=0),tools_box)
	_button("Show tutorial",_show_tutorial,tools_box)
	_button("Open GitHub",func():OS.shell_open("https://github.com/TristanTengGH2/CopyPanda"),tools_box)
	_button("Open local save folder",func():OS.shell_open(ProjectSettings.globalize_path(store.directory)),tools_box)
	_label("CopyPanda "+VERSION+" · "+DesktopPlatform.label(OS.get_name())+" preview\nBrowser progress and native progress are separate.",tools_box)

func _setting_changed(enabled: bool, key: String) -> void:
	model.settings[key]=enabled
	_apply_theme()
	if is_instance_valid(animation_timer):
		animation_timer.stop()
	_build_compact()
	_ensure_visible_bounds()
	_save()

func _show_tutorial(step: int = 0) -> void:
	var pages := [
		["Welcome to CopyPanda","Choose how long you want to study, then press Start. Your panda stays on screen while you work. Open Menu to change the timer or add what you’re studying."],
		["Pause and take breaks","Press Pause whenever you need to stop. Paused time does not count toward your session. You earn leaves for each full minute studied, plus a small bonus for finishing. Use the Focus / Break toggle to choose a break, then press Start."],
		["Move or hide the overlay","Open Settings → Adjust overlay to move or resize your panda on a dimmed screen. Hide keeps the timer running. "+DesktopPlatform.recovery_hint(OS.get_name(),tray_id>=0)],
		["Set a study goal","Open Goals to choose your session length, sessions per day, and number of study days. Missing a day keeps your progress. Open Calendar to see your study history."],
		["Save where you left off","When you quit, you can write what you were studying and what to do next. This is optional. Settings also has reduced motion, larger text, and contrast options."]]
	_open_tools(str(pages[step][0]))
	_label(str(pages[step][1]),tools_box,17)
	_button("Next →" if step<4 else "Get started",func():
		if step<4:
			_show_tutorial(step+1)
		else:
			model.settings.tutorial_done=true
			_save()
			tools.hide(),tools_box)
	_button("Skip for now",func():model.settings.tutorial_done=true;_save();tools.hide(),tools_box)

func _request_quit() -> void:
	if is_instance_valid(layout_editor):
		layout_editor.finish(false)
		return
	if model.running:
		var outcome: String = model.tick(Time.get_ticks_msec())
		if outcome=="complete":
			_complete_session()
	model.pause()
	_save()
	if model.elapsed_ms==0 and model.sessions.is_empty():
		_quit_app()
		return
	_open_tools("Leave a bookmark for next time")
	_label("Your timer is paused. You’ll keep leaves earned for full minutes studied. You can leave a note to help you continue next time, or skip it.",tools_box)
	var working := _input_field("What were you working on?",str(model.bookmark_draft.get("working",model.intention)),tools_box)
	var next := _input_field("Where would you like to pick up?",str(model.bookmark_draft.get("next","")),tools_box)
	var draft_save := func(_value: String):model.bookmark_draft={"working":working.text,"next":next.text};_schedule_save()
	working.text_changed.connect(draft_save)
	next.text_changed.connect(draft_save)
	_button("Save & quit",func():model.bookmark={"working":working.text.strip_edges(),"next":next.text.strip_edges(),"saved_at":model.utc_stamp()};model.bookmark_draft={};_quit_app(),tools_box)
	_button("Skip & quit",_quit_app,tools_box)
	_button("Keep studying",func():tools.hide(),tools_box)

func _quit_app() -> void:
	if model.elapsed_ms>0:
		model.finalize(false)
		model.new_session()
	_capture_position()
	_save()
	get_tree().quit()

func _start_desktop_events() -> void:
	session_bridge.start(OS.get_name(),store.directory,OS.get_executable_path(),OS.has_feature("editor"),DisplayServer.get_name()=="headless")

func _poll_desktop_events() -> void:
	_handle_session_event(session_bridge.poll())

func _handle_session_event(kind: String) -> void:
	if DesktopPlatform.should_pause(kind) and model.running:
		model.pause()
		_save()
		_notify(DesktopPlatform.event_label(kind)+" · timer paused. Resume when ready.")

func _setup_dock_menu() -> void:
	if OS.get_name()!="macOS" or DisplayServer.get_name()=="headless" or not NativeMenu.has_system_menu(NativeMenu.DOCK_MENU_ID):
		return
	dock_menu = NativeMenu.get_system_menu(NativeMenu.DOCK_MENU_ID)
	NativeMenu.add_item(dock_menu,"Show overlay",func(_tag: Variant):_show_overlay(),Callable(),DOCK_SHOW_TAG)

func _exit_tree() -> void:
	session_bridge.stop()
	if dock_menu.is_valid():
		var item := NativeMenu.find_item_index_with_tag(dock_menu,DOCK_SHOW_TAG)
		if item>=0:
			NativeMenu.remove_item(dock_menu,item)
	if tray_id>=0:
		DisplayServer.delete_status_indicator(tray_id)
	if tray_menu.is_valid():
		NativeMenu.free_menu(tray_menu)

func _icon(name: String) -> Texture2D:
	if icon_cache.has(name):
		return icon_cache[name]
	var paths := {
		"timer":"<circle cx='12' cy='13' r='8'/><path d='M9 2h6M12 5v2m0 2v5l3 2'/>",
		"calendar":"<rect x='3' y='5' width='18' height='16' rx='3'/><path d='M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2'/>",
		"notes":"<rect x='5' y='3' width='14' height='18' rx='2'/><path d='M9 8h6m-6 4h6m-6 4h4'/>",
		"goals":"<circle cx='12' cy='12' r='9'/><circle cx='12' cy='12' r='5'/><circle cx='12' cy='12' r='1'/>",
		"settings":"<path d='M4 6h16M4 12h16M4 18h16'/><circle cx='9' cy='6' r='2' fill='#fff7e8'/><circle cx='15' cy='12' r='2' fill='#fff7e8'/><circle cx='9' cy='18' r='2' fill='#fff7e8'/>",
		"leaf":"<path d='M20 3C9 2 3 7 5 14c2 7 13 7 15-11Z' fill='#7e925e' stroke='#607847'/><path d='M4 21 15 9' stroke='#50683b'/>",
		"play":"<path d='m9 5 11 7-11 7Z'/>",
		"pause":"<path d='M9 5v14m6-14v14'/>",
		"hide":"<path d='M5 12h14'/>",
		"move":"<path d='M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4m12-8 4 4-4 4'/>"
	}
	var image := Image.new()
	image.load_svg_from_string("<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'><g fill='none' stroke='#645039' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'>"+str(paths.get(name,""))+"</g></svg>")
	var texture := ImageTexture.create_from_image(image)
	icon_cache[name]=texture
	return texture

func _balance_row(parent: Node) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",6)
	parent.add_child(row)
	var leaf := TextureRect.new()
	leaf.texture = _icon("leaf")
	leaf.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	row.add_child(leaf)
	var text := _label("%d leaves"%model.balance,row)
	text.size_flags_horizontal = Control.SIZE_EXPAND_FILL

func _friendly_date(day: String) -> String:
	var parts := day.split("-")
	if parts.size()!=3:
		return day
	return "%s %d, %s"%[MONTHS[clampi(int(parts[1])-1,0,11)],int(parts[2]),parts[0]]

func _calendar_cell(day: String, number: int, studied: bool, today: bool, selected: bool, parent: Node) -> void:
	var b := _button("",_show_journal.bind(day),parent,58)
	b.custom_minimum_size.y = 50
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.tooltip_text = _friendly_date(day)+(" · Today" if today else "")+(" · Study recorded" if studied else "")
	var normal := _style(Color("e1e6d2") if selected else Color(0,0,0,0),16)
	normal.set_border_width_all(2 if today else 0)
	normal.border_color = Color("a45c37")
	b.add_theme_stylebox_override("normal",normal)
	var label := _label(str(number),b,15)
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	label.offset_bottom = -10
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if studied:
		var dot := _label("●",b,8)
		dot.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		dot.offset_top = 28
		dot.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		dot.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		dot.add_theme_color_override("font_color",Color("748253"))
		dot.mouse_filter = Control.MOUSE_FILTER_IGNORE

func _adjust_overlay() -> void:
	if is_instance_valid(layout_editor):
		return
	if is_instance_valid(tools):
		tools.hide()
	animation_timer.stop()
	_set_frame(0)
	layout_original = Rect2i(get_window().position,get_window().size)
	for child in get_children():
		if child is Control:
			child.hide()
	get_window().mouse_passthrough_polygon = PackedVector2Array()
	get_window().always_on_top = true
	layout_editor = LayoutEditor.new()
	add_child(layout_editor)
	layout_editor.setup(get_window(),atlas,digits.text,model.balance)
	layout_editor.finished.connect(func(rect: Rect2i, accepted: bool):_finish_adjustment.call_deferred(rect,accepted))
	get_window().show()
	get_window().mode = Window.MODE_WINDOWED

func _finish_adjustment(rect: Rect2i, accepted: bool) -> void:
	if accepted:
		model.settings.scale = float(rect.size.x)/360.0
	get_window().position = rect.position if accepted else layout_original.position
	layout_editor = null
	_build_compact()
	_ensure_visible_bounds()
	_capture_position()
	_save()
	_show_settings()
