extends Node
## Public-key REST client. Tokens live in memory; never in the study save.
var config: Dictionary = {}
var session: Dictionary = {}
var refreshing := false
signal refreshed
signal auth_lost

func _init() -> void:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://cloud-config.json"))
	if parsed is Dictionary:
		config = parsed

func _failure(message: String, code: String = "offline") -> Dictionary:
	return {"ok":false,"message":message,"code":code}

func permanent() -> bool:
	return not session.is_empty() and not bool(session.get("user",{}).get("is_anonymous",true))

func request(path: String, payload: Dictionary, authenticated := false, method := HTTPClient.METHOD_POST, retry := true) -> Dictionary:
	if not str(config.get("url","")).begins_with("https://") or str(config.get("key","")).begins_with("sb_secret_"):
		return _failure("Cloud setup is unavailable.","configuration")
	if authenticated:
		var ready := await refresh()
		if not ready.get("ok",false):
			return ready
	var headers := PackedStringArray(["Content-Type: application/json","apikey: "+str(config.key)])
	if authenticated:
		headers.append("Authorization: Bearer "+str(session.access_token))
	var http := HTTPRequest.new()
	http.timeout = 15
	add_child(http)
	var error := http.request(str(config.url)+path,headers,method,JSON.stringify(payload))
	if error != OK:
		http.queue_free()
		return _failure("Could not connect. Your local study is saved.")
	var response: Array = await http.request_completed
	http.queue_free()
	if response[0] != HTTPRequest.RESULT_SUCCESS:
		return _failure("Could not connect. Your local study is saved.")
	if int(response[1]) == 401 and authenticated and retry:
		var renewed := await refresh(true)
		if not renewed.get("ok",false):
			return renewed
		return await request(path,payload,true,method,false)
	var raw: String = response[3].get_string_from_utf8()
	var data = JSON.parse_string(raw) if not raw.is_empty() else {}
	if not data is Dictionary:
		data = {}
	if int(response[1]) < 200 or int(response[1]) >= 300:
		return _failure(str(data.get("msg",data.get("message",data.get("error_description","Request failed.")))),str(data.get("error_code",response[1])))
	if not data.has("ok"):
		data.ok = true
	return data

func refresh(force := false) -> Dictionary:
	if session.is_empty():
		return _failure("Join as a guest or sign in first.","unauthorized")
	if refreshing:
		await refreshed
		return {"ok":not session.is_empty()}
	if not force and float(session.get("expires_at",0)) > Time.get_unix_time_from_system()+60:
		return {"ok":true}
	refreshing = true
	var result := await request("/auth/v1/token?grant_type=refresh_token",{"refresh_token":session.get("refresh_token","")})
	if result.get("ok",false):
		set_session(result)
	elif result.get("code") != "offline":
		session = {}
		auth_lost.emit()
	refreshing = false
	refreshed.emit()
	return result

func set_session(data: Dictionary) -> void:
	session = data.duplicate(true)
	if not session.has("expires_at"):
		session.expires_at = Time.get_unix_time_from_system()+float(session.get("expires_in",3600))

func guest() -> Dictionary:
	if not session.is_empty():
		return {"ok":true}
	var result := await request("/auth/v1/signup",{"data":{}})
	if result.get("ok",false):
		set_session(result)
	return result

func api(operation: String, payload: Dictionary = {}) -> Dictionary:
	return await request("/rest/v1/rpc/cp_api",{"operation":operation,"payload":payload},true)

func send_code(email: String) -> Dictionary:
	return await request("/auth/v1/otp",{"email":email.strip_edges(),"create_user":true})

func verify_code(email: String, token: String) -> Dictionary:
	var result := await request("/auth/v1/verify",{"email":email.strip_edges(),"token":token.strip_edges(),"type":"email"})
	if result.get("ok",false):
		set_session(result)
	return result

func sign_out() -> void:
	if not session.is_empty():
		await request("/auth/v1/logout",{},true)
	session = {}

func parse_invite(value: String) -> Dictionary:
	var text := value.strip_edges()
	var regex := RegEx.new()
	regex.compile("^[2-9A-HJ-NP-Z]{8}$")
	var code := text.replace("-","").replace(" ","").to_upper()
	if regex.search(code):
		return {"code":code}
	var base := str(config.get("appUrl",""))+"#join="
	if text.begins_with(base):
		text = text.trim_prefix(base)
	regex.compile("^[0-9a-fA-F]{64}$")
	if regex.search(text):
		return {"token":text.to_lower()}
	return {}

