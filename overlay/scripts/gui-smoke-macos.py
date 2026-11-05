"""Exercise the exported app with a real display, retaining render evidence."""
from pathlib import Path
import json
import plistlib
import subprocess
import sys

if sys.platform != "darwin":
    raise SystemExit("This graphical test requires macOS.")
project = Path(__file__).resolve().parents[1]
app = max((project / ".build/macos").glob("staging.*/CopyPanda.app"), key=lambda p: p.stat().st_mtime)
with (app / "Contents/Info.plist").open("rb") as source:
    info = plistlib.load(source)
binary = app / "Contents/MacOS" / info["CFBundleExecutable"]
output = project / ".build/macos/gui"
output.mkdir(parents=True, exist_ok=True)
log = output / "app.log"
command = [str(binary), "--log-file", str(log), "--", "--qa", "--desktop-smoke", "--desktop-smoke-output=" + str(output)]
try:
    result = subprocess.run(command, timeout=90, capture_output=True, text=True)
except subprocess.TimeoutExpired as error:
    if log.exists():
        print(log.read_text(encoding="utf-8", errors="replace"))
    if error.stdout:
        print(error.stdout)
    if error.stderr:
        print(error.stderr)
    raise SystemExit("The Mac graphical test did not finish; inspect its display/startup log.") from error
print(result.stdout)
print(result.stderr)
report_path = output / "report.json"
if result.returncode or not report_path.exists():
    raise SystemExit("Mac GUI launch/test failed; no passing graphical report was produced.")
report = json.loads(report_path.read_text())
if not report.get("passed"):
    raise SystemExit("Mac GUI checks failed: " + str(report.get("failures")))
subprocess.run(["/usr/bin/codesign", "--verify", "--deep", "--strict", str(app)], check=True)
print("Mac GUI test passed and the app bundle signature remains valid.")
