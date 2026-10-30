"""Install pinned official Godot tools for the macOS preview build; no credentials."""
import hashlib
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request
import zipfile

VERSION = "4.7.2-stable"
BASE = f"https://github.com/godotengine/godot-builds/releases/download/{VERSION}/"
ASSETS = {
    "editor": (f"Godot_v{VERSION}_macos.universal.zip", "c58a24e31d720be9d62f60cb5627c4e695fb72f21b0cfe1bc9ccaa9a3b3ba63e"),
    "templates": (f"Godot_v{VERSION}_export_templates.tpz", "f298490b8d44d934be425a5a65a51bf15f422428b229a06a6e11d9ffea248011"),
}

def download(kind, cache):
    name, expected = ASSETS[kind]
    target = cache / name
    if not target.exists():
        pending = target.with_suffix(target.suffix + ".pending")
        with urllib.request.urlopen(BASE + name, timeout=120) as source, pending.open("wb") as dest:
            shutil.copyfileobj(source, dest)
        pending.replace(target)
    digest = hashlib.sha256()
    with target.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    actual = digest.hexdigest()
    if actual != expected:
        raise RuntimeError(f"Official {kind} download checksum mismatch")
    return target

def main():
    if sys.platform != "darwin":
        raise SystemExit("Run this installer on macOS.")
    project = Path(__file__).resolve().parents[1]
    cache = project / ".build" / "godot-tools"
    cache.mkdir(parents=True, exist_ok=True)
    editor = cache / "Godot.app/Contents/MacOS/Godot"
    if not editor.exists():
        archive = download("editor", cache)
        # ditto restores the official archive's bundle modes and symlinks.
        subprocess.run(["/usr/bin/ditto", "-x", "-k", str(archive), str(cache)], check=True)
    template = project / ".build/macos.zip"
    if not template.exists():
        with zipfile.ZipFile(download("templates", cache)) as archive:
            with archive.open("templates/macos.zip") as source, template.open("wb") as dest:
                shutil.copyfileobj(source, dest)
    editor.chmod(editor.stat().st_mode | 0o111)
    print(editor)
    # The CI cache contains only the extracted tool bundle/template, not 1.5 GB of downloads.

if __name__ == "__main__":
    main()
