// Public workspace sleep/session notifications only. No input, screen capture,
// location, Accessibility access, startup registration, or app monitoring.
import AppKit
import Foundation
import Darwin

func emit(_ kind: String, to output: URL) throws {
    let record = ["kind": kind, "serial": UUID().uuidString]
    let data = try JSONSerialization.data(withJSONObject: record)
    try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
    try data.write(to: output, options: .atomic)
}

let arguments = CommandLine.arguments
if arguments.count == 3, arguments[1] == "--self-test" {
    do {
        let output = URL(fileURLWithPath: arguments[2])
        try emit("ready", to: output)
        let data = try Data(contentsOf: output)
        let event = try JSONSerialization.jsonObject(with: data) as? [String: String]
        guard event?["kind"] == "ready", !(event?["serial"] ?? "").isEmpty else { exit(1) }
        print("macOS session helper protocol check passed")
        exit(0)
    } catch { fputs("Session helper self-test failed\n", stderr); exit(1) }
}
guard arguments.count == 3, let parent = Int32(arguments[1]), parent > 1 else { exit(2) }
let output = URL(fileURLWithPath: arguments[2])
let center = NSWorkspace.shared.notificationCenter
let events: [(Notification.Name, String)] = [
    (NSWorkspace.willSleepNotification, "suspend"),
    (NSWorkspace.didWakeNotification, "resume"),
    (NSWorkspace.screensDidSleepNotification, "display_sleep"),
    (NSWorkspace.sessionDidResignActiveNotification, "session_inactive"),
    (NSWorkspace.sessionDidBecomeActiveNotification, "session_active")
]
var observers: [NSObjectProtocol] = []
for (notification, kind) in events {
    observers.append(center.addObserver(forName: notification, object: nil, queue: .main) { _ in
        try? emit(kind, to: output)
    })
}
let watchdog = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { _ in
    // Reparenting detects the app exiting even if its process ID is reused.
    if getppid() != parent || kill(parent, 0) != 0 {
        for observer in observers { center.removeObserver(observer) }
        exit(0)
    }
}
try? emit("ready", to: output)
RunLoop.main.run()
