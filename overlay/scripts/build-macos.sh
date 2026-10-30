#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != Darwin ]]; then
  echo 'Build this app on macOS with Xcode Command Line Tools installed.' >&2
  exit 1
fi
project="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
godot_bin="${GODOT:-$(command -v godot || true)}"
if [[ -z "$godot_bin" || ! -x "$godot_bin" ]]; then
  echo 'Set GODOT to the Godot 4.7.2 executable.' >&2
  exit 1
fi
if [[ "$("$godot_bin" --version)" != 4.7.2.stable* ]]; then
  echo 'Godot 4.7.2 and its matching export template are required.' >&2
  exit 1
fi
if [[ ! -f "$project/.build/macos.zip" ]]; then
  echo 'Missing template: run python3 overlay/scripts/install-macos-tools.py first.' >&2
  exit 1
fi
output="$project/.build/macos"
mkdir -p "$output" "$project/.build/mac-helper" "$project/platform/macos"
# A fresh staging folder avoids carrying QA saves or old executables into a ZIP.
staging="$(mktemp -d "$output/staging.XXXXXX")"
helper="$project/platform/macos/CopyPanda.SessionEvents"
for arch in arm64 x86_64; do
  xcrun --sdk macosx swiftc -swift-version 5 -O -target "$arch-apple-macos11.0" \
    "$project/platform/macos/SessionEvents.swift" -o "$project/.build/mac-helper/$arch"
done
xcrun lipo -create "$project/.build/mac-helper/arm64" "$project/.build/mac-helper/x86_64" -output "$helper"
"$helper" --self-test "$project/.build/mac-helper/protocol.json"
"$godot_bin" --headless --editor --path "$project" --quit --log-file "$output/import.log"
"$godot_bin" --headless --path "$project" --export-release 'macOS Universal' "$staging/CopyPanda.app" --log-file "$output/export.log"
app="$staging/CopyPanda.app"
mkdir -p "$app/Contents/Helpers"
install -m 755 "$helper" "$app/Contents/Helpers/CopyPanda.SessionEvents"
chmod 755 "$app/Contents/MacOS/CopyPanda"
/usr/libexec/PlistBuddy -c 'Set :LSMinimumSystemVersion 11.0' "$app/Contents/Info.plist"
cp "$project/platform/macos/README.txt" "$staging/README.txt"
# This is a local preview identity, not a Developer ID or notarized release.
/usr/bin/codesign --force --sign - "$app/Contents/Helpers/CopyPanda.SessionEvents"
/usr/bin/codesign --force --sign - "$app"
/usr/bin/codesign --verify --deep --strict "$app"
xcrun lipo -verify_arch arm64 x86_64 "$app/Contents/MacOS/CopyPanda"
xcrun lipo -verify_arch arm64 x86_64 "$app/Contents/Helpers/CopyPanda.SessionEvents"
python3 "$project/scripts/check-macos-bundle.py" "$app"
version="$(python3 -c 'import re,sys; print(re.search(r"config/version=\"([^\"]+)\"",open(sys.argv[1]).read()).group(1))' "$project/project.godot")"
archive="$output/CopyPanda-overlay-$version-macos-universal.zip"
# ditto preserves bundle permissions and the executable bits required by macOS.
/usr/bin/ditto -c -k --sequesterRsrc "$staging" "$archive"
shasum -a 256 "$archive" > "$archive.sha256"
printf 'macOS preview: %s\n' "$archive"
