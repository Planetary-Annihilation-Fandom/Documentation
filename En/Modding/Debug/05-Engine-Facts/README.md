[Debug index](../README.md)

## 5. Engine facts for code written against PA

### 5.1 File system

- **Mount order: `pa`, then `pa_ex1` over it, then mods.** `coui://pa_ex1/...` does not resolve.
  There is **no unshadowed path** to a base-game file once a mod shadows it; read it before the mod
  mounts and keep it.
- `pa_ex1/units/unit_list.json` is 207 units, a superset of `pa/`'s 173.
- **`spec://<path>` is cached for the life of the process after its first read** (2026-08-28). A
  memory file mounted later is visible through `coui://` but not `spec://`. A scene reload does not
  clear it. Never read through `spec://` a path you will mount over later.
- **`api.file.mountMemoryFiles`** (measured 2026-10-03 on `gwo_host` with Community Mods loaded,
  async `coui://` reads; corrects this packet's 2026-10-01 text):

  | Path mounted | Served at `coui://` |
  | --- | --- |
  | A path no mod ships | the memory file |
  | A base-game file | the memory file |
  | A file a mounted folder client mod ships | the mod's file |
  | A file a mounted zip client mod ships | the mod's file |

  - **Memory files survive scene changes** (`start` → `settings` → `start` → `gw_start` checked;
    another mod author saw them hold from `connect_to_game` through `new_game` and `live_game`).
    Stock `start.js` calls `unmountAllMemoryFiles()` on load, but Community Mods replaces that with
    a no-op ("Community Mods is preventing unmountAllMemoryFiles"). Under `--nomods` the stock call
    would run (from source).
  - **Only an explicit `api.file.unmountAllMemoryFiles()` clears them.** The GW referee hire,
    replay loading, and the Community Mods manager call it.
  - **Community Mods' zip client mods are memory mounts too.** An explicit unmount in `gw_start`,
    where Community Mods is not loaded to remount them, made a zip mod's file 404 while a folder
    mod's survived. Never call it in a scene without Community Mods' hook.
  - Against GWSM's `api.file.zip.mount` root mounts, the later mount wins.
  - So a memory mount works for a new path or to override the base game. To override a file a
    mounted mod ships, change the mod on disk.
- **Mounting a zip blocks the next `coui:` read**, and `loadScript` uses a synchronous XHR, so the
  stall lands on whatever loads next.
- **Server-mod files are not in the client VFS.** Mount the zip at `/server_mods/<id>/` with
  `api.file.zip.mount(installedPath, mountPath, false)` and read with **`spec:`** (`coui:` 404s).
  `api.file.zip.catalog(path)` lists `[{name, crc32, size}]`. In a live game, wrapping
  `handlers.unit_specs` gives the complete spec set with names resolved.
- Companion zips mount at `/` in ascending CMM `priority`; the later mount wins.
- **`server.exe` gets server zip mods only through the client zip-mounting them before spawn**, and
  CMM's `startGame` wrapper skips that for GW. A GW local server sees base game + what the client
  zip-mounted itself + `config.files`. A biome the server cannot load hangs every player at loading
  with no error.

### 5.2 Promises

- **`$.when(api.something())` does not wait.** Engine promises (and native promises) have no
  `.promise` method, so jQuery 2.1.4 treats them as plain values and resolves at once, with no
  error. Use `.then(ok, fail)` and resolve your own `$.Deferred`.
- Anything a mod hands to other code must be a jQuery promise; stock, CMM and other mods wait with
  `$.when`/`.always`. jQuery 2.1.4 does not turn a fail handler's return into a resolution.
- **RequireJS (`requireGW` = context `gw`, `waitSeconds: 0`):** an errback catches a module that 404s
  or throws in its factory; it never fires for a module that never arrives, nor for a throw in the
  success callback. An errback can run twice for one require. A define-time throw in any module
  stock `gw_play.js` loads before `loadMods` (GWO shadows `gw_per_player_tech_referee` and pulls in
  ~28 modules) means the scene never starts, with only an `Uncaught Error` line.

### 5.3 Libraries and language

- **lodash 3.9.3** in every scene (the v4 file in `thirdparty/` is unused). v4 names
  (`_.keyBy`, `_.padStart`, `_.fromPairs`) are absent. **`_.where(coll, fn)` with a predicate
  filters nothing.** `_.cloneDeep` is quadratic: 9,800 objects took 136 s.
- **`ko.toJS` copies methods**, so a `GWInventory.save()` carries `getTag` and duck-types as a live
  inventory. JSON round-trip a save before storing it.
- **Chromium 40:** `for...of` and `Promise` work, `const` loosely; `let`, arrows, template literals,
  `class` do not parse. `el.style.cssText = "..."` silently does nothing; use
  `style.setProperty`. `:not(a, b)` lists are unsupported. **Tab never moves focus** and there is no
  accessibility tree, so keyboard and ARIA criteria are out of scope. IndexedDB: use a cursor, not
  `getAll`.
- Bootstrap 3.0.3 `tooltip("hide")` often leaves the element attached with only `.in` removed; test
  `.hasClass("in")`. Stock `.tooltip` has `pointer-events: none`.
- **Mod CSS does not reliably load after the scene's CSS.** Beat stock by specificity, not order.
- `api.youtube.launchPage(id)` opens an embed YouTube rejects (Error 153); use
  `engine.call("web.launchPage", "https://www.youtube.com/watch?v=<id>")`.

### 5.4 Server messages

- **The server drops a message its current state has no handler for**: no reply, and the
  `send_message` callback never fires. Example: `upnp_status` exists only in the lobby state.
- Scene mods load before `app.registerWithCoherent` defines `model.send_message` (`new_game`,
  `gw_play`); defer load-time sends.
- Replay save is gated server-side on one connected client, client-side on `singleHumanPlayer()`.
  Treat "player plus spectators" and "lone spectator of an AI-only match" as separate cases.

### 5.5 Specs and AI data

- **`base_spec` overrides, never merges.** A key the unit redeclares replaces the base value whole,
  arrays and objects included. Walk the chain and take the nearest declaration.
- Unit Cannon, Nuke Silo and Anti-Nuke Silo are `Factory & Advanced`. An AI condition
  `Factory & Advanced - Orbital` counts them.
- Stock orbital platoon templates lack `& Mobile`; immobile units with those types freeze the
  platoon. A same-named file in a **subdirectory** does not shadow; it merges alongside.
- **`server.exe` (124680) reads nine stock unit-map keys by name** (`BasicMetalExtractor`,
  `AdvancedMetalExtractor`, `BasicVehicleFactory`, `BasicBotFactory`, `BasicAirFactory`,
  `BasicNavalFactory`, `OrbitalLauncher`, `AntiNukeSilo`, `ControlModule`). Only the extractor keys
  have a per-faction hook (`ai_metal_extractor_names`). A faction army whose keys name units it
  cannot build grows poorly (measured 2026-09-28; mechanism inferred from strings).
- `.pfx` keys belong at exactly one level (emitter or `spec`); wrong-level keys are discarded
  silently.
- Papa files: header `apaP`, then nine uint16 counts. Textures are found by model name
  (`<stem>_diffuse/_mask/_material.papa`), not by reference.
- The strategic icon atlas holds ~99,000 icons; a fallback dot is never a capacity problem.

### 5.6 Reading third-party mods

`https://mods.planetaryannihilation.net/community-mods/mods` is a public JSON index of every
published mod (`url` is the zip). Faction repos readable with `gh api` without cloning: Legion
`Legion-Expansion/Legion-Expansion` (`develop`, `src/server/pa/units/`), Bugs
`Ferret-Master/Bug-Faction` (`main`), Exiles `NikolaMX/Exiles-Faction` (`main`).

---
