// pa.js - launch and close Planetary Annihilation test clients. Windows, Node 18+, no dependencies.
// Uses cdp.js from the same folder.
//
//   node pa.js start <profile> <port> [--devmode] [--ai-log] [--no-content] [--windowed] [--extra "<more flags>"]
//   node pa.js stop <profile>
//   node pa.js list
//
// start  refuses the default profile ("localstorage"), a profile that is already running, and a port
//        that already answers. It waits 1.1 s first (two launches in one second share a log file),
//        launches PA detached with stdout in %TEMP%\pa-stdout-<profile>.txt, and returns once the
//        `start` scene has a model. Prints the PID, the client log, and the session identity.
// stop   finds that profile's PA.exe by command line (never the PID that owns the port: that is the
//        Coherent host), sends the game view to `start` and calls model.exit() (the Quit button),
//        waits for the process to end, force-stops it only if it does not, then stops any server.exe
//        that client started. It never touches a PA.exe launched without --localstorageurl.
// list   shows every running PA.exe with its profile, port and current scene.

"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const cdp = require("./cdp.js");

const EXE = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Planetary Annihilation Titans\\bin_x64\\PA.exe";
const USERDATA = path.join(process.env.LOCALAPPDATA || "", "Uber Entertainment", "Planetary Annihilation");
const GAME_VIEW = "coui://ui/main/game/";
const START_URL = "coui://ui/main/game/start/start.html";

function fail(message) { const e = new Error(message); e.exitCode = 1; return e; }

function processes(name) {
  const cmd = "Get-CimInstance Win32_Process -Filter \"Name='" + name + "'\" | " +
    "Select-Object ProcessId, ParentProcessId, CommandLine, @{n='Started';e={$_.CreationDate.ToString('o')}} | ConvertTo-Json -Compress";
  const out = childProcess.execFileSync("powershell", ["-NoProfile", "-Command", cmd], { encoding: "utf8" }).trim();
  if (!out) return [];
  const parsed = JSON.parse(out);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return false; }
}

function profileOf(cmdLine) {
  const m = /--localstorageurl[= ]"?([^"\s]+)/.exec(cmdLine || "");
  return m ? m[1] : null;
}

function portOf(cmdLine) {
  const m = /--coherent_port[= ](\d+)/.exec(cmdLine || "");
  return m ? m[1] : null;
}

function clientFor(profile) {
  return processes("PA.exe").filter(function (p) { return profileOf(p.CommandLine) === profile; })[0] || null;
}

// The scene document of the game view: <dir>/<dir>.html, so panels such as live_game_econ.html never match.
function sceneTarget(targets) {
  const game = targets.filter(function (t) { return (t.url || "").indexOf(GAME_VIEW) === 0 && t.webSocketDebuggerUrl; });
  const scene = game.filter(function (t) { return /\/([^/?]+)\/\1\.html(\?|$)/.test(t.url); });
  return scene[0] || game[0] || null;
}

async function portAnswers(port) {
  try { await cdp.listTargets(port); return true; } catch (e) { return false; }
}

async function start(profile, port, flags) {
  if (!profile || !port) throw fail("usage: node pa.js start <profile> <port> [--devmode] [--ai-log] [--no-content] [--extra \"...\"]");
  if (profile === "localstorage") throw fail("refusing the default profile: it is the user's own; use a test profile");
  if (clientFor(profile)) throw fail("profile " + profile + " already has a running PA.exe (one profile, one client)");
  if (await portAnswers(port)) throw fail("port " + port + " already answers CDP; pick another or close that client");

  const args = ["--coherent_port=" + port, "--localstorageurl=" + profile];
  if (flags.devmode) args.push("--devmode");
  if (flags.aiLog) args.push("--ai-log");
  if (flags.noContent) args.push("--no-content");
  if (flags.extra) args.push.apply(args, flags.extra.split(/\s+/).filter(Boolean));

  await cdp.sleep(1100);
  const stdoutFile = path.join(os.tmpdir(), "pa-stdout-" + profile + ".txt");
  const fd = fs.openSync(stdoutFile, "w");
  const launchedAt = Date.now();
  const child = childProcess.spawn(EXE, args, { detached: true, stdio: ["ignore", fd, fd], cwd: path.dirname(EXE) });
  child.unref();
  fs.closeSync(fd);
  const pid = child.pid;

  const deadline = Date.now() + 120000;
  for (;;) {
    if (!alive(pid)) {
      throw fail("PA.exe exited during startup. stdout (" + stdoutFile + "):\n" + fs.readFileSync(stdoutFile, "utf8"));
    }
    try {
      const ready = await cdp.evaluate(port, "game/start/", "return typeof model !== 'undefined' && typeof model.exit === 'function';");
      if (ready === "true") break;
    } catch (e) { /* not up yet */ }
    if (Date.now() > deadline) throw fail("start scene not ready after 120 s (pid " + pid + " still running; stop it with: node pa.js stop " + profile + ")");
    await cdp.sleep(1000);
  }

  // A new TITANS profile shows a tutorial popup instead of navigating on the first start-menu action.
  let prep = "model.showTutorialPopup(false); model.doShowTutorialPopup(false);";
  if (flags.windowed) {
    prep += " api.settings.set('graphics', 'display_mode', 'WINDOWED'); api.settings.save(); api.settings.apply(['graphics']);";
  }
  const prepped = await cdp.evaluate(port, "game/start/", prep + " return api.settings.value('graphics', 'display_mode');");

  const identity = await cdp.evaluate(port, "game/start/",
    "return { uberId: ko.observable().extend({ session: 'uberId' })() || null, displayName: ko.observable().extend({ session: 'displayName' })() || null, devMode: typeof DEV_MODE !== 'undefined' ? DEV_MODE : null };");
  const logDir = path.join(USERDATA, "log");
  const logs = fs.readdirSync(logDir).map(function (f) { return path.join(logDir, f); })
    .filter(function (f) { return fs.statSync(f).birthtimeMs >= launchedAt - 1000; });
  return [
    "started " + profile + " on port " + port + ", pid " + pid + " (stop with: node pa.js stop " + profile + ")",
    "identity " + identity,
    "display mode " + prepped + (flags.windowed ? "" : " (pass --windowed to switch a fullscreen profile)") + "; tutorial popup suppressed",
    "client log " + (logs.length === 1 ? logs[0] : "(" + logs.length + " new logs; pick by launch time)"),
    "stdout " + stdoutFile,
    "Wait a few seconds in start before leaving it: start.js seeds session vars that co-op needs."
  ].join("\n");
}

async function stop(profile) {
  if (!profile) throw fail("usage: node pa.js stop <profile>");
  if (profile === "localstorage") throw fail("refusing the default profile: close the user's own client by hand");
  const client = clientFor(profile);
  if (!client) return "no PA.exe running for profile " + profile;
  const pid = client.ProcessId, port = portOf(client.CommandLine);
  const lines = [];
  let servers = processes("server.exe").filter(function (s) { return s.ParentProcessId === pid; });

  if (port && await portAnswers(port)) {
    try {
      const target = sceneTarget(await cdp.listTargets(port));
      if (target && target.url.indexOf("game/start/") < 0) {
        lines.push("leaving " + target.url);
        await cdp.evaluate(port, target.url, "window.location.href = '" + START_URL + "'; return 'ok';");
      }
      await cdp.waitFor(port, "game/start/", "return typeof model !== 'undefined' && typeof model.exit === 'function';", 30, 500);
      servers = servers.concat(processes("server.exe").filter(function (s) { return s.ParentProcessId === pid; }));
      await cdp.evaluate(port, "game/start/", "setTimeout(function () { model.exit(); }, 0); return 'exiting';");
      lines.push("model.exit() sent");
    } catch (e) {
      lines.push("clean exit failed: " + e.message);
    }
  } else {
    lines.push("no CDP port answering; cannot exit cleanly");
  }

  const deadline = Date.now() + 30000;
  while (alive(pid) && Date.now() < deadline) await cdp.sleep(500);
  if (alive(pid)) {
    process.kill(pid);
    lines.push("PA.exe " + pid + " did not exit in 30 s: force-stopped");
  } else {
    lines.push("PA.exe " + pid + " exited");
  }

  const seen = {};
  servers.forEach(function (s) {
    if (seen[s.ProcessId]) return;
    seen[s.ProcessId] = true;
    if (alive(s.ProcessId)) {
      try { process.kill(s.ProcessId); lines.push("stopped its server.exe " + s.ProcessId); }
      catch (e) { lines.push("could not stop server.exe " + s.ProcessId + ": " + e.message); }
    }
  });
  return lines.join("\n");
}

async function list() {
  const rows = processes("PA.exe");
  if (!rows.length) return "no PA.exe running";
  const out = [];
  for (const p of rows) {
    const port = portOf(p.CommandLine);
    let scene = "(no CDP)";
    if (port && await portAnswers(port)) {
      const t = sceneTarget(await cdp.listTargets(port));
      scene = t ? t.url.replace(GAME_VIEW, "") : "(no game view)";
    }
    out.push("pid " + p.ProcessId + "  profile " + (profileOf(p.CommandLine) || "localstorage (default: the user's own)") +
      "  port " + (port || "-") + "  scene " + scene + "  started " + p.Started);
  }
  return out.join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = { devmode: false, aiLog: false, noContent: false, windowed: false, extra: "" };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--devmode") flags.devmode = true;
    else if (argv[i] === "--ai-log") flags.aiLog = true;
    else if (argv[i] === "--no-content") flags.noContent = true;
    else if (argv[i] === "--windowed") flags.windowed = true;
    else if (argv[i] === "--extra") flags.extra = argv[++i] || "";
    else pos.push(argv[i]);
  }
  if (pos[0] === "start") return start(pos[1], pos[2], flags);
  if (pos[0] === "stop") return stop(pos[1]);
  if (pos[0] === "list") return list();
  throw fail("usage: node pa.js start <profile> <port> [flags] | stop <profile> | list");
}

main().then(function (out) { console.log(out); process.exit(0); },
            function (e) { console.error(e.message); process.exit(e.exitCode || 1); });
