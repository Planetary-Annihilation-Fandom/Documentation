[Debug index](../README.md)

## 1. Attaching

### 1.0 Where things are (Windows)

| What | Path |
| --- | --- |
| Install root | `C:\Program Files (x86)\Steam\steamapps\common\Planetary Annihilation Titans\` |
| Executable (**real binary**) | `<install>\bin_x64\PA.exe` (the one in the install root is a 425 KB shim) |
| Local server | `<install>\bin_x64\server.exe` (one per local game) |
| Game data (read-only reference) | `<install>\media\` (`pa\`, `pa_ex1\`, `ui\`, `server-script\`, `shaders\`) |
| Coherent UI host | `<install>\bin_x64\host\CoherentUI_Host.exe` |
| Build number | `<install>\version.txt` and `build.txt` (`124680` on 2026-10-01) |
| User data root | `%LOCALAPPDATA%\Uber Entertainment\Planetary Annihilation\` |
| Client / server folder mods | `<userdata>\client_mods\<dir>\`, `<userdata>\server_mods\<dir>\` |
| Community-mod zips | `<userdata>\download\<identifier>.zip` (+ `.dlmeta` holding the md5) |
| Client logs | `<userdata>\log\PA-<YYYY-MM-DD_HHMMSS>.txt` |
| Server logs | `<userdata>\server-<ts>.txt` (userdata **root**, not `log\`) |
| Saves / GW wars | `<userdata>\localstore\` and each profile's IndexedDB (not hand-editable) |
| Profile folders | `<userdata>\<localstorageurl name>\` (default `localstorage`) |
| Boot content selection | `<userdata>\boot_settings.json` |

Steam app id **386070** (PA Classic is 233250); media depot **386074**, binaries depot **386071**.

`boot_settings.json`:

```json
{ "content": ["PAExpansion1"], "active_content": "BEST", "locale": "en" }
```

`PAExpansion1` is TITANS. Without it the `pa_ex1/` overlay is not mounted and the game runs as base
PA.

### 1.1 Launching PA

Use `pa.js`:

```bash
node pa.js start gwo_host 9998 --devmode [--ai-log] [--no-content] [--windowed] [--extra "<more flags>"]
node pa.js list                     # every PA.exe: pid, profile, port, current scene
node pa.js stop gwo_host            # [§1.7](README.md#17-closing-clients)
```

`start` refuses the default profile (`localstorage`), a profile that already has a client, and a
port that already answers. It waits 1.1 s (see the log-name rule below), launches PA detached with
stdout in `%TEMP%\pa-stdout-<profile>.txt`, and returns once the `start` scene has a model (about
15 s). It prints the PID, the new client log, and the session identity (`uberId`, `displayName`,
`devMode`). If PA exits during startup, it prints the redirected stdout, which is where a bad flag
shows. It does not wait out the few seconds `start.js` needs before co-op can work ([§3.7](../Galactic%20War/README.md#37-co-op)).

Once `start` is up, `pa.js` also turns off the TITANS tutorial popup on that profile
(`model.showTutorialPopup(false); model.doShowTutorialPopup(false);`). With `--windowed` it sets
`graphics.display_mode` to `WINDOWED`, saves, and applies it. It prints the resulting display mode.
Verified 2026-10-03 on `gwo_host`.

The equivalent by hand:

```powershell
$p = Start-Process "C:\Program Files (x86)\Steam\steamapps\common\Planetary Annihilation Titans\bin_x64\PA.exe" `
  -ArgumentList "--coherent_port=9998","--localstorageurl=gwo_host","--devmode" `
  -RedirectStandardOutput "$env:TEMP\pa-stdout-9998.txt" -PassThru
$p.Id   # keep it: you must close this client yourself
```

- The process outlives the tool call and does not need Steam as its parent.
- **`steam://rungameid/386070//<args>` drops the args.** But `steam://rungameid/386070` with no
  args is **the way to get an authenticated client** (signed in to Ubernet). The user's Steam launch
  options carry `--coherent_port=9999`, so that launch is the default profile on 9999.
- **Identity on a direct launch** (verified 2026-09-28): a profile that was once signed in through
  Steam keeps only its `displayName`. `uberId` is empty and `signedInToUbernet` is false. A profile
  that was never signed in reports as `Player`. Anything keyed on identity (co-op records,
  per-player tech) then needs the fake-identity workaround in [§3.7](../Galactic%20War/README.md#37-co-op). Check
  `ko.observable().extend({ session: 'uberId' })()` before relying on an identity.
- **`--devmode`** is one word; `--dev-mode` is rejected. It sets the global `DEV_MODE`, which enables
  the cheat panels and the sandbox lobby option. A war created by a `--devmode` client is marked
  `gwaio.cheatsUsed` under GWO and never records badges ([§3.8](../Galactic%20War/README.md#38-fighting-from-galactic-war)).
- **`--no-content`** is the classic (no TITANS) launch (verified 2026-09-17):
  `api.content.usingTitans()` false, `activeContent()` `""`, no Cluster faction in GW, mods still
  mount. `start` settles slowly there: `model.exit()` threw for about 15 s after the target appeared.
- **`--localstorageurl=<name>`** picks the profile folder. Any string works. A new name creates a
  fresh default-settings profile with **no mods enabled** (enablement is per-profile IndexedDB) and
  with no `no_gw_video` mod, so it plays the GW intro video. Prefer reusing an existing test profile.
  A new profile also has two traps (reported by another mod author 2026-10-02, confirmed in source;
  `pa.js` handles both):
  - **It starts fullscreen.** The stock default of `graphics.display_mode` is `FULLSCREEN`
    (`ui/main/shared/js/api/settings.js`). Switch it from `start`:
    `api.settings.set("graphics", "display_mode", "WINDOWED"); api.settings.save(); api.settings.apply(["graphics"]);`
  - **The first start-menu action shows the TITANS tutorial popup instead of navigating, and logs
    nothing.** `navToAISkirmish`, new game, load game, multiplayer and other entries all check
    `maybeShowTutorialPopup` (`start.js`), gated by the `do_show_tutorial_popup` localStorage key
    (default true, TITANS only). That first call already stores false, so a scripted call looks
    like a silent failure once. Fix: `model.showTutorialPopup(false);` then repeat the call.
- **One profile, one client.** A second launch on a profile in use exits with `Fatal error: Another
  copy of PA using the same localstore is already running`. `Stop-Process -Force` returns before the
  lock is released; wait for the old `PA.exe` to disappear before relaunching.
- **Launch two clients at least one second apart.** Logs are named to the second; two launches in
  the same second share one file, and the second client logs nowhere (2026-09-23).
- **A bad flag exits 1 before any log is written.** Only the redirected stdout shows
  `ERROR Unknown command line option ...`. Do not diagnose an instant exit from the log directory:
  the newest `PA-*.txt` may belong to an earlier session.

**Profile and port convention on this machine:**

| Profile | Port | Use |
| --- | --- | --- |
| `gwo_host` | 9998 | Test host. Was signed in once, so it carries a display name. GWO dev folder mod. |
| `gwo_viewer` | 9999 | Test co-op viewer. Never signed in: joins as `Player` unless given a fake identity. |
| default (`localstorage`) | 9999 | **The user's own profile.** Launched from Steam. Never test on it. |

The viewer and the user's own client both use 9999. Before attaching to 9999, find out which
`PA.exe` owns it ([§1.2](README.md#12-confirming-the-port-and-finding-the-process)).

**Flags.** `PA.exe --help` prints every flag (65 on build 124670), exits 0, and opens no window.
Spelling is inconsistent: `--coherent_port` has an underscore, nearly everything else is hyphenated.

| Flag | Effect |
| --- | --- |
| `--coherent_port` | Coherent debugger port. The one that matters. |
| `--devmode` | Dev features: cheat panels, vision toggles, sandbox lobby. Sets `DEV_MODE`. |
| `--localstorageurl` | Which profile folder under `<userdata>\` the client reads. |
| `--userdatadir` | Different directory for preferences and downloads (broader than a profile). |
| `--nomods` | Engine-level switch: mount no mods. Leaves the user's choices intact. |
| `--no-content` | Classic content, no TITANS. |
| `--offline` | Request offline mode. |
| `--server-debug-port` | Server-side (sim) debugging, separate from Coherent. |
| `--ai-log`, `--ai-debug` | AI logging (forwarded to the local server) / AI debugging. `--ai-debug`'s output is unverified. |
| `--log-threshold` | Logging level, `1 : LOG_Test , LOG_Trace : 6`. |
| `--coherent-log-level` | `TRACE\|DEBUG\|INFO\|WARNING\|ASSERTFAILURE\|ERROR`. |
| `--disable-ui-cache` | Never return 304 to Coherent. |
| `--forwardlogs`, `--log-window` | Forward engine logs into the UI / open a log window. |
| `--software-ui` | Render the UI without the GPU. |
| `--no-audio`, `--no-planets`, `--no-sun`, `--nofeatures` | Strip subsystems. |
| `--nomouselock` | Don't capture the mouse. |
| `--steam` | Initialise the Steam API on a direct launch. |
| `--uiurl`, `--shaderurl`, `--scripturl` | Serve UI / shaders / server scripts from a custom URL. |
| `--waitForDebugger` | Spin-wait until a native debugger attaches. |

### 1.2 Confirming the port and finding the process

```powershell
Get-NetTCPConnection -State Listen -LocalPort 9998 -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='PA.exe'" | Select-Object ProcessId, CommandLine
```

- A refused connection usually means `--coherent_port` was not passed, not that PA is closed.
- **The PID listening on the port is the CoherentUI host helper, not `PA.exe`.** Killing it takes the
  port down and leaves `PA.exe` running, holding its profile lock, unreachable. Find the real process
  by command line (`CommandLine -like "*gwo_host*"`).

### 1.3 The driver (`cdp.js`)

`GET http://127.0.0.1:<port>/json` lists targets. Open the target's `webSocketDebuggerUrl`, send
`{id, method: "Runtime.evaluate", params: {expression}}`, and match the reply by `id`. Node 18+ has a
global `WebSocket` and `fetch` that work against it. `cdp.js` (verified 2026-10-01, Node 26.7.0)
wraps that:

```bash
node cdp.js 9998 --list                               # "*" marks a busy target
node cdp.js 9998 game/start/ smoke.js                 # evaluate a file once
node cdp.js 9998 gw_play.html -e 'return model.game().currentStar();'

node cdp.js 9998 wait gw_play.html -e 'return model.fighting();'          # re-evaluate until truthy
node cdp.js 9998 wait-target gw_play.html --timeout 120                   # until a free target matches
node cdp.js 9998 wait-target live_game/live_game.html --gone              # until none matches
node cdp.js 9998 input live_game/live_game_menu.html click 120 340        # real mouse click
node cdp.js 9998 input game/start/ move 30 30                             # real hover
node cdp.js 9998 input live_game/live_game.html key =                     # real key press
```

- The script is a **function body**: end it with `return`. The driver JSON-encodes the result
  in-page and returns a throw as `THROW: <stack>`, so errors come back as values. A missing return
  prints `undefined`.
- It refuses an ambiguous match and skips `atlas://`, `main.html` and `uberbar` unless the
  substring names them.
- **`wait`** re-resolves the target on every try, so it survives the scene reloads that
  `model.move()` and navigation cause. It counts `""`, `false`, `null`, `undefined`, `0` and
  `THROW` results as "not yet". Default timeout 30 s, interval 500 ms (`--timeout <s>`,
  `--interval <ms>`, before `-e`). This replaces stash-and-poll for engine promises: start the call
  and store the result on `window` in one eval, then `wait` on `return window.__x;`.
- **`wait-target`** polls `/json` and tolerates a port that is not up yet. Default timeout 60 s. Use
  it for war creation (`gw_play.html`), Fight (`live_game/live_game.html`), and the lobby
  (`new_game/new_game.html`).
- **`input`** sends `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent`. Coordinates are in that
  target's own viewport (a panel's, for a panel target). `click` sends move, press and release;
  `move` alone is a hover. `key` takes `=`, `-`, `pause`, `enter`, `esc`, `tab`, `space`,
  `backspace`, a letter or digit, or a numeric virtual key code (`--char c` sets the typed
  character). Verified 2026-10-01 in `start`: `mouseover`, `click`, `keydown`/`keypress` for `a`
  and `=`, and `keydown` for Pause all reached the page.
- Exit codes: 0 ok, 2 no CDP on the port, 3 no free or unique target, 4 socket timeout, 5 socket
  error, 6 wait timed out, 64 usage.
- `require("./cdp.js")` exposes the same functions (`evaluate`, `waitFor`, `waitTarget`, `input`,
  `listTargets`) for a Node script that chains steps.

**Smoke test on arrival** (`smoke.js`):

```js
return {
  href: location.href,
  hasModel: typeof model !== "undefined",
  lodash: typeof _ !== "undefined" ? _.VERSION : null,
  devMode: typeof DEV_MODE !== "undefined" ? DEV_MODE : "undefined",
  uberId: ko.observable().extend({ session: "uberId" })(),
  displayName: ko.observable().extend({ session: "displayName" })(),
  gwActiveGame: localStorage.getItem("gw_active_game")
};
```

A non-null `gwActiveGame` means a war is in progress on that profile.

> **Read dev mode from `DEV_MODE`, not settings.** `api.settings.getSynchronous("user", "dev_mode")`
> returns `null` whether or not `--devmode` was passed. `dev_mode` is a Knockout **session** var
> seeded from `DEV_MODE` (`ui/main/shared/js/boot_suffix.js:25-26`). `DEV_MODE`,
> `ko.observable().extend({session: "dev_mode"})()` and `model.devMode()` agree.

**Session vars vs profile storage.** `ko.observable().extend({ session: '<key>' })` reads and writes
per-process session state (`uberId`, `displayName`, `dev_mode`, `gw_campaign_role`, …).
`ko.observable().extend({ local: '<key>' })` reads `localStorage` with JSON encoding
(`gw_active_game`).

### 1.4 Rules that will bite you

- **Target ids change on every navigation.** Match by URL substring; never cache an id.
- **Match the scene, not a sibling.** `/json` also lists `coui://ui/main/main.html`,
  `atlas://icon_atlas/...`, `atlas://special_icon_atlas/...` and `uberbar.html`, in varying order.
  - **Never set `location.href` in an atlas view** (2026-09-07). A `start` or `gw_start` scene then
    runs there as a second tree (log lines tagged `[JS/IconAtlas]`), creates wars, and reloads on
    every filesystem refresh. Symptoms: `loadSceneMods for scene:start` or `startup battleResult=`
    every ~5 s, duplicate `gw_start` targets. Recovery: `engine.call('exit')` in any game target
    and relaunch; the stray tree survives scene changes.
  - `start` also matches `gw_start`; use `game/start/`. `live_game` matches ~25 panel targets; use
    `live_game/live_game.html`. `new_game` can match `new_game_cinematic.html`, where every eval
    throws; use `new_game/new_game.html`.
  - **`start` is `coui://ui/main/game/start/start.html`.** Without the `game/` segment you get a
    blank page with no `model` that still matches "start". Navigate that target to the right path.
- **One client per target.** A target with no `webSocketDebuggerUrl` is busy: the user has devtools
  on it, you left a socket open, or the previous eval has not released yet (wait a second and retry).
- **Do not stream the console.** A long-lived `Runtime.consoleAPICalled` listener locks the target
  and later evals fail with a bare `ws error`. Read the log file ([§1.6](README.md#16-logs)), or wrap `console.*` in-page
  to push into `window.__cap` and read that.
- **CDP 1.1.** `/json/version` reports `Chrome/40.0.2214.28`. JSON-encode deep objects in-page
  rather than relying on `returnByValue`.
- **`api.*` calls return engine promises; `Runtime.evaluate` is synchronous.** They return
  `{emitter, state, result}`. Stash on `window` and read in a second eval:

  ```js
  api.mods.getMounted("client", true).then(function (m) { window.__m = m; }); return "ok";
  // next eval:
  return window.__m;
  ```

  The same applies to `requireGW` callbacks and anything async. A throw inside a jQuery `.then`
  callback is swallowed, so guard probe callbacks with try/catch or the promise looks like it
  never settled.
- **`window` does not survive a scene change.** Snapshot anything you need to restore to a file,
  not to `window`.
- **Screenshots do not work.** `Page.captureScreenshot` is unsupported on Coherent (it fails or times
  out; it has never crashed a client). Verify visuals from the DOM and computed style, or ask the
  user to look. That is not proof of rendering either: see [§4.1](../04-Battles-and-Skirmishes/README.md#41-live_game-targets-and-what-renders) on what composites.
- **Real input works.** `Input.dispatchMouseEvent` (`mousePressed`/`mouseReleased`) fires Knockout
  `click` handlers and hit-tests like a real pointer, including in panel targets, with coordinates in
  that panel's viewport (2026-09-27). `Input.dispatchKeyEvent` (`rawKeyDown`, `char`, `keyUp` with
  `windowsVirtualKeyCode`) fires PA's Mousetrap keybindings (2026-09-28). Test hover with real
  `mouseMoved` events, not `$(el).trigger("mouseenter")`.
- **Unit selection does not register while PA's window is unfocused** (2026-09-19).
  `api.select.commander()`, `api.select.unitsById([id], true)` and `engine.call('select.commander')`
  return, but `model.hasSelection()` stays false while `document.hasFocus()` is false. Anything that
  depends on a selection (build bar, selection panel) cannot be verified unattended.
- **CDP keeps working while the PC is locked** (2026-09-17): launches, evals, scene changes and a
  live battle at full rate. `requestAnimationFrame` is not throttled. Only OS screenshots are lost.
  Lock detector: ``[bool](Get-Process LogonUI -ErrorAction SilentlyContinue)``.
- **`engine.call` is an own, writable property of `engine`**, so it can be spied on. Wrap it in the
  scene whose model makes the call and swallow `web.launchPage` to prove a call without opening a
  browser tab (2026-09-27).
- **Etiquette:** note the scene on arrival and return to it when done.

### 1.5 Shell traps (Windows, Git Bash and PowerShell)

- **Never build the expression inside a shell double-quoted string.** Bash treats `$(...)` as
  command substitution, so `$('.btn_hero')` arrives truncated. PowerShell expands `$('body')` to
  nothing. Put any jQuery in a file, or use single quotes in Bash.
- **Git Bash rewrites an argument that starts with `/`** into a Windows path:
  `/pa/ai_queller/` reaches the program as `C:/Program Files/Git/pa/ai_queller/`, and
  `/start/start.html` likewise. Prefix the command with `MSYS_NO_PATHCONV=1`, or drop the leading
  slash (`game/start/`). `taskkill /PID` is mangled the same way; use PowerShell `Stop-Process -Id`.
- **A doubled backslash in a Bash heredoc arrives as one.** Write files that contain backslashes
  with a real editor or file-writing tool, not a heredoc.
- `powershell -File` is blocked by execution policy on this machine; run scripts inline.
- **Prettier on a copy of mod code must use the repo's config.** The default
  `trailingComma: all` adds commas in calls, which Chromium 40 cannot parse.

### 1.6 Logs

- client: `<userdata>\log\PA-<ts>.txt`: all UI console output, tagged `[JS/<scene>]`.
- server: `<userdata>\server-<ts>.txt`. With `--ai-log`, AI lines appear here ([§4.4](../04-Battles-and-Skirmishes/README.md#44-observing-ai)).

Reading rules:

- **Two clients write to one log directory.** "Newest by mtime" is whichever wrote last; pick the
  file by its launch timestamp.
- **The log keeps only the first argument of a `console.*` call.** `error loading spec:` with no path
  has lost its other arguments. A multi-line first argument is kept whole, so code that logs one
  string ending in `e.stack` keeps the whole stack.
- JS lines lag engine lines by up to ~1 s, and JS timestamps are not monotonic across a second
  boundary. Trust line order for sequence.
- `loadMods` logs `<src> loaded in N seconds` per script. That is the **fetch** time, logged before
  the script runs ([§6](../06-Measuring/README.md#6-measuring)).

Harmless noise, all stock:

- `ERROR [JS/<view>] :1: Uncaught TypeError: undefined is not a function` on every scene and view
  load (200+ per session). `CoherentUI_Host.exe` injects `engine._trigger("_Result",N);` into each
  new document before `engine._trigger` exists: a late reply to a call made by the replaced page.
  Never a mod bug; unfixable from mod JS.
- `Failed loading coui://download/community-mods-<scene>.js with 404`.
- Server, `--ai-log`: `.json.ai0.ai0` and `.player.player` UnitMapSpec misses; `l_*.json.player`
  UnitSpec bursts; `metal spot not pathable` at spawn; `Control module name did not resolved to a
  spec. This is bad!` every ~10 s per allied army when the player does not hold the Catalyst.
- Server without `--ai-log`: `The AI has ancountered an error. Please enable AI logging` is not a
  failure.
- First game of a client session: texture `Failed to load` lines (cache warm-up).

### 1.7 Closing clients

- **Close every client you launched, pass or fail, and only those.** Leftover clients hold ports,
  the profile lock, and the shared `ui_mod_list` ([§2.4](../02-Navigating-the-UI/README.md#24-mods)).
- **`node pa.js stop <profile>`** does it all (verified 2026-10-01 from an AI-skirmish lobby, 10 s).
  It finds the profile's `PA.exe` by command line, sends the game view to `start`, calls
  `model.exit()` (the Quit button), and waits up to 30 s for the process to end. Only if it does not
  end is it force-stopped. Then it stops any `server.exe` that client started (local servers are
  child processes of their `PA.exe`). It refuses the default profile and never touches a `PA.exe`
  launched without `--localstorageurl`.
- By hand: navigate to `start` and call `model.exit()`, then wait for that `PA.exe` to disappear.
- **In `live_game`, `model.exitGame()` quits PA outright** (2026-08-31). The war survives in
  IndexedDB.
- **Leaving a battle by setting `location.href` to `start.html` leaves the local `server.exe`
  running.** Stop it by PID afterwards (`Get-Process server`). A client crash can also orphan one.
- If you close the user's own client by accident, relaunch it with `steam://rungameid/386070`.

---
