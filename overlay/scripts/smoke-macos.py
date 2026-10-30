"""Start the exported native binary headlessly and verify its resource seal survives."""
from pathlib import Path
import plistlib
import re
import subprocess
import sys

if sys.platform != "darwin":
    raise SystemExit("This smoke test requires macOS.")
project = Path(__file__).resolve().parents[1]
app = max((project / ".build/macos").glob("staging.*/CopyPanda.app"), key=lambda p: p.stat().st_mtime)
with (app / "Contents/Info.plist").open("rb") as source:
    info = plistlib.load(source)
binary = app / "Contents/MacOS" / info["CFBundleExecutable"]
log = project / ".build/macos/native-smoke.log"
result = subprocess.run([str(binary), "--headless", "--quit-after", "60", "--log-file", str(log), "--", "--qa"], timeout=45, capture_output=True, text=True)
text = (log.read_text(encoding="utf-8", errors="replace") if log.exists() else "") + result.stdout + result.stderr
if result.returncode or re.search(r"SCRIPT ERROR:|^ERROR:", text, re.M):
    print(text)
    raise SystemExit("Exported Mac app failed to start cleanly")
subprocess.run(["/usr/bin/codesign", "--verify", "--deep", "--strict", str(app)], check=True)
print("Exported macOS app started and retained a valid ad-hoc resource seal")
