# Godot QR encoder

Vendored from [Greaby/godot-qrcode-generator](https://github.com/Greaby/godot-qrcode-generator)
(MIT, license included), retrieved October 29, 2026. The source snapshot is
versioned here so runtime builds require no external download.

Local changes remove global `class_name` declarations and explicitly preload
the local utility and Reed–Solomon scripts. The caller adds three white modules
around the encoder's existing one-module border to provide a four-module quiet
zone, then uses nearest-neighbor display. No external QR service is contacted.
