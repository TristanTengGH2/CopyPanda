"""Run Godot checks with bounded time and fail on assertions even if Godot exits 0."""
import argparse
from pathlib import Path
import re
import subprocess

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--godot", required=True)
    args = parser.parse_args()
    project = Path(__file__).resolve().parents[1]
    logs = project / ".build/checks"
    logs.mkdir(parents=True, exist_ok=True)
    checks = {
        "test_model": "CopyPanda model checks passed",
        "test_store": "CopyPanda persistence checks passed",
        "test_layout": "CopyPanda layout and mode checks passed",
        "test_network": "CopyPanda network mapping, invite, QR, and requested live checks passed",
        "test_desktop": "CopyPanda desktop platform checks passed",
    }
    for script, marker in checks.items():
        log = logs / (script + ".log")
        result = subprocess.run([args.godot, "--headless", "--path", str(project), "--script", f"res://tests/{script}.gd", "--quit-after", "300", "--log-file", str(log), "--", "--qa"], timeout=45, capture_output=True, text=True)
        text = (log.read_text(encoding="utf-8", errors="replace") if log.exists() else "") + result.stdout + result.stderr
        if result.returncode or marker not in text or re.search(r"SCRIPT ERROR:|^ERROR:", text, re.M):
            print(text)
            raise SystemExit(f"{script} failed")
        print(next(line for line in text.splitlines() if marker in line))

if __name__ == "__main__":
    main()
