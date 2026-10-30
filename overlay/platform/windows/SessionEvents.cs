// Windows lock/suspend events only. No input hooks, application inspection, or startup registration.
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

internal sealed class SessionEvents : ApplicationContext {
    private readonly string output;
    private readonly int parentId;
    private readonly Timer timer = new Timer();
    private long serial = DateTime.UtcNow.Ticks;
    private bool exited;

    private SessionEvents(int parent, string path) {
        parentId = parent; output = path;
        SystemEvents.SessionSwitch += OnSession;
        SystemEvents.PowerModeChanged += OnPower;
        timer.Interval = 2000;
        timer.Tick += delegate {
            try { using (Process p = Process.GetProcessById(parentId)) { if (p.HasExited) Stop(); } }
            catch { Stop(); }
        };
        timer.Start();
        Emit("ready");
    }

    private void OnSession(object sender, SessionSwitchEventArgs e) {
        if (e.Reason == SessionSwitchReason.SessionLock) Emit("lock");
        if (e.Reason == SessionSwitchReason.SessionUnlock) Emit("unlock");
        if (e.Reason == SessionSwitchReason.SessionLogoff) Emit("logoff");
    }
    private void OnPower(object sender, PowerModeChangedEventArgs e) {
        if (e.Mode == PowerModes.Suspend) Emit("suspend");
        if (e.Mode == PowerModes.Resume) Emit("resume");
    }
    private readonly object writeLock = new object();
    private void Emit(string kind) {
        lock (writeLock) {
            try {
                Directory.CreateDirectory(Path.GetDirectoryName(output));
                string pending = output + ".pending";
                string json = "{\"kind\":\"" + kind + "\",\"serial\":\"" + (++serial) + "\"}";
                File.WriteAllText(pending, json);
                if (File.Exists(output)) File.Replace(pending, output, null);
                else File.Move(pending, output);
            } catch { /* The main app reports unavailable event detection if no ready event arrives. */ }
        }
    }
    private void Stop() {
        if (exited) return; exited = true;
        timer.Stop();
        SystemEvents.SessionSwitch -= OnSession;
        SystemEvents.PowerModeChanged -= OnPower;
        ExitThread();
    }
    [STAThread]
    private static void Main(string[] args) {
        int parent;
        if (args.Length != 2 || !Int32.TryParse(args[0], out parent)) return;
        Application.Run(new SessionEvents(parent, Path.GetFullPath(args[1])));
    }
}
