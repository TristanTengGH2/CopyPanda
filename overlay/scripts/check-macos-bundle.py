"""Check preview bundle structure before signing/packaging is declared successful."""
from pathlib import Path
import plistlib
import stat
import struct
import sys

def architectures(path):
    with path.open("rb") as source:
        header = source.read(8)
        magic, count = struct.unpack(">II", header)
        if magic not in (0xCAFEBABE, 0xCAFEBABF) or count > 16:
            raise ValueError(f"Expected Universal 2 Mach-O: {path.name}")
        entry_size = 32 if magic == 0xCAFEBABF else 20
        return {struct.unpack(">I", source.read(entry_size)[:4])[0] for _ in range(count)}

def check(app):
    with (app / "Contents/Info.plist").open("rb") as source:
        info = plistlib.load(source)
    assert info["CFBundleIdentifier"] == "io.github.tristantenggh2.copypanda"
    assert not info.get("LSUIElement", False), "Keep Dock recovery available"
    assert info.get("LSMinimumSystemVersion") == "11.0"
    main = app / "Contents/MacOS" / info["CFBundleExecutable"]
    helper = app / "Contents/Helpers/CopyPanda.SessionEvents"
    for binary in (main, helper):
        assert binary.stat().st_mode & stat.S_IXUSR, f"Missing executable bit: {binary}"
        assert {0x01000007, 0x0100000C} <= architectures(binary), "Both Intel and Apple Silicon must be present"
    assert list((app / "Contents/Resources").glob("*.pck")), "Project pack is missing"
    assert not list(app.rglob("*.exe")), "Windows binaries must not enter the Mac app"
    assert not list(app.rglob("qa-data")), "QA data must not enter the app"
    print("macOS bundle checks passed: identity, Dock, versions, architectures, executable modes, resources")

if __name__ == "__main__":
    check(Path(sys.argv[1]).resolve())
