[Debug index](../README.md)

## 2. Navigating the UI

### 2.1 Changing scene

Evaluate in the **current** scene's target:

```js
window.location.href = "coui://ui/main/game/<scene>/<scene>.html"; return "ok";
```

The whole UI is the `#game` panel in `main.html`; setting `src` fires `engine.call('panel.navigate')`.

**Reload the current scene in place** (picks up edited mod JS):
`api.game.debug.reloadScene(api.Panel.pageId);`

**You cannot enumerate scenes from the port.** A target appears only while PA is in that scene. The
tables below come from the install tree. Paths are relative to `coui://ui/main/game/`.

| Scene | Path | Notes |
| --- | --- | --- |
| `start` | `start/start.html` | PA boots here. Wait a few seconds after it loads before leaving ([§3.7](../Galactic%20War/README.md#37-co-op)). |
| `new_game` | `new_game/new_game.html` | Lobby. Also `new_game_ladder.html`, `new_game_cinematic.html`. |
| `live_game` | `live_game/live_game.html` | Battle. Composed of ~26 panel targets ([§4.1](../04-Battles-and-Skirmishes/README.md#41-live_game-targets-and-what-renders)). |
| `settings` | `settings/settings.html` | The only scene where mod-registered settings can be set ([§2.3](README.md#23-settings)). |
| `system_editor` | `system_editor/system_editor.html` | |
| `server_browser` | `server_browser/server_browser.html` | Enter with `model.navToServerBrowser()` from `start`. |
| `connect_to_game` | `connect_to_game/connect_to_game.html` | Transit scene; server-mod upload happens here. |
| `save_game_browser` | `save_game_browser/save_game_browser.html` | |
| `replay_browser` | `replay_browser/replay_browser.html` | plus `replay_loading/` |
| `load_planet` | `load_planet/load_planet.html` | |
| `building_planets` | `building_planets/building_planets.html` | |
| `transit` | `transit/transit.html` | |
| `game_over` | `game_over/game_over.html` | |
| `gamestats` | `gamestats/gamestats.html` | |
| `leaderboard` | `leaderboard/leaderboard.html` | |
| `matchmaking` | `matchmaking/matchmaking.html` | |
| `social` | `social/social.html` | |
| `armory` | `armory/armory.html` | |
| `guide` | `guide/guide.html` | |
| `community_tournaments` | `community_tournaments/community_tournaments.html` | |
| `community_mods` | `community_mods/community-mods.html` | Hyphen in the file name. Enter only via the `Mods` button ([§2.4](README.md#24-mods)). |

Galactic War, under `galactic_war/`:

| Scene | Path |
| --- | --- |
| `gw_start` | `galactic_war/gw_start/gw_start.html` |
| `gw_archive` | `galactic_war/gw_start/gw_archive.html` (in the `gw_start/` dir) |
| `gw_play` | `galactic_war/gw_play/gw_play.html` (co-op adds `?gw_campaign=1`) |
| `gw_lobby` | `galactic_war/gw_lobby/gw_lobby.html` |
| `gw_war_over` | `galactic_war/gw_war_over/gw_war_over.html` |
| `gw_coop_per_player_loadout` | `galactic_war/gw_coop_per_player_loadout/gw_coop_per_player_loadout.html` |
| `gw_campaign_loading` | `galactic_war/gw_campaign_loading/…` |
| `gw_campaign_restart_loading` | `galactic_war/gw_campaign_restart_loading/…` |
| `gw_reconnect_loading` | `galactic_war/gw_reconnect_loading/…` |

`galactic_war/cards/` and `galactic_war/shared/` are libraries. The three `*_loading` scenes exist at
the top level and under `galactic_war/`; GW uses the `galactic_war/` copies.

**Scene keys in `modinfo.json`** are names, not paths. `media/ui/mods/readme.txt` lists the legacy
keys (`connect_to_game`, `game_over`, `icon_atlas`, `live_game`, `load_planet`, `lobby`,
`matchmaking`, `new_game`, `server_browser`, `settings`, `special_icon_atlas`, `start`,
`system_editor`, `transit`). The list predates TITANS and is incomplete. Also working: `gw_start`,
`gw_play`, `gw_war_over`, `gw_coop_per_player_loadout`, the `live_game_*` panel keys, and
`shared_build`.

**Useful navigation calls** (all on `model` in the scene named):

| From | Call | Goes to |
| --- | --- | --- |
| `start` | `navToServerBrowser()` | `server_browser` |
| `start` | `navToAISkirmish()` | `connect_to_game` → `new_game` lobby ([§4.5](../04-Battles-and-Skirmishes/README.md#45-ai-skirmish)) |
| `start` | `exit()` | quits PA |
| `gw_start` | `navToNewGame()` | builds the war, then `gw_play` ([§3.1](../Galactic%20War/README.md#31-creating-a-war)) |
| `gw_play` | `openToCoop()` | starts a local server, co-op `gw_play?gw_campaign=1` ([§3.7](../Galactic%20War/README.md#37-co-op)) |
| `live_game` | `abandon()` | surrender (no dialog) |
| `live_game` | `navToGalacticWar()` / `menuReturnToWar()` | back to the war ([§3.8](../Galactic%20War/README.md#38-fighting-from-galactic-war)) |
| `live_game` | `exitGame()` | **quits PA** |

### 2.2 Clicking things

- Prefer calling the model function a button binds over clicking the button. Read the binding from
  the markup (`data-bind="click: fn"`) and call `model.fn()`.
- jQuery `.click()` on a **hidden** element is unreliable. It worked for GW's Cheat/Win/Lose buttons,
  which report `visible: false` even in devmode, but did nothing for the hidden `Browse Games`
  button (2026-08-07) and the hidden Explore button. When a click "does nothing", call the bound
  function or send a real mouse event ([§1.4](../01-Attaching/README.md#14-rules-that-will-bite-you)).
- **Never "restore" an element you showed with `.css("display", "")`.** That strips the inline
  `display: none` the markup put there and leaves it visible. Save and restore the original inline
  style.

**Globals in every scene** (stock and mod scripts share one scope per scene):

- **`model`**: the scene's view model. Observables: call with no args to read, pass a value to write.
  `ko.computed`s with no write option throw `Cannot write a value to a ko.computed` (for example
  `gw_start`'s `selectedNames`, `gw_play`'s `showSystemCard`).
- **`api`**: the engine bridge. `api.settings`, `api.game`, `api.mods`, `api.file`, `api.debug`,
  `api.camera`, `api.unit`, `api.select`, `api.steam`, `api.net`, `api.content`, `api.Panel`,
  `api.panels`, `api.time`, `api.getWorldView`.
- **`engine`**: the raw Coherent bridge under `api` (`engine.call`, `engine.on`).
- **`ko`**, **`$`** (jQuery 2.1.4), **`_`** (lodash **3.9.3**, [§5.3](../05-Engine-Facts/README.md#53-libraries-and-language)).

RequireJS-scoped modules are not global. Hoist them in one eval and read them in a later one:
`requireGW(["shared/gw_common"], function (GW) { window.__GW = GW; });`.

### 2.3 Settings

```js
api.settings.getSynchronous(group, key);   // also .get / .set / .save / .restoreDefaults / .isSet
```

Groups: `user, graphics, audio, camera, ui, server, keyboard, hotbuild`.

- **A setting a mod registers can only be read or set in the `settings` scene** (2026-09-19). Mods
  register definitions in a `settings.js` that runs only there, and `set`/`getSynchronous` check
  that the definition exists. Elsewhere they return null and do nothing. Recipe: navigate to
  `settings/settings.html`, `api.settings.set(group, key, value); api.settings.save();`, navigate
  back. Other scenes then read it with `api.settings.isSet(group, key, true)`.
- Alternative without leaving the scene: edit `localStorage[api.settings.localStorageKey()]` (the key
  is `<uberName>.paSettings`, JSON `{group: {key: value}}`), then `reloadScene`.
- Mod state usually lives in `localStorage`, not settings.

### 2.4 Mods

**What reloads when.**

| Change | Takes effect |
| --- | --- |
| Edit to an existing mod file | Next scene load or `reloadScene`. Files are read live, no cache. |
| New or deleted file in a mod | **Client restart.** The VFS file table is built at launch; a new file 404s. This includes `git checkout` of a branch that adds or deletes files. |
| `modinfo.json` edit | Restart, or Community Mods' *Reload File System Mods* (`reloadFileSystemMods()`). |
| Enable/disable a **folder** mod | **Restart.** `reloadFileSystemMods()` does not mount a newly enabled folder mod (2026-08-06). |
| Enable/disable a **zip server** mod | No restart: changes `activeServerModsToMount()` at once (2026-08-28). |
| Replaced client zip on disk | `CommunityModsManager.remountClientMods()` (2026-09-18). |

**Exception: co-op `gw_play?gw_campaign=1` does not reload code on `model.move()`** (2026-09-23).
After swapping code on disk, always `reloadScene`, and prove which code ran (a temporary log line)
before trusting an A/B.

**Enablement model.**

- **`api.mods` has no enable/disable method.** Its surface is `getMounted`, `getAvailableMods`,
  `mountModFileData`, `sendModFileDataToServer`, `publishServerMods` (+ deprecated
  `getMountedMods`). Toggling lives in `CommunityModsManager`
  (`media/ui/main/game/community_mods/community-mods-manager.js`).
- **Community Mods (CMM), built into the game, is the only mod manager.** PAMM no longer exists, so
  `CommunityModsManager` is the single source of truth.
- `CommunityModsManager` is loaded only in scenes whose HTML includes it: `start`, `new_game`,
  `gw_play`, `system_editor`, `server_browser`, and the loading scenes. **Not `gw_start`.**
- State lives in IndexedDB, database `installed_mods`, store `installed_mods`: one record whose
  `.value` is the array of modinfo objects with `enabled`, `context`, `installedPath`
  (`/download/<id>.zip` or `/server_mods/<dir>/`), `mountPath`, and `unitList`.
  `localStorage.installedModsDB` is only the key name. Read it anywhere with
  `ko.observableArray([]).extend({ db: { local_name: "installedModsDB", db_name: "installed_mods" } })`
  and `.ready`; never write through that.
- **`enableMod(id)` / `disableMod(id)` do not persist on their own.** Follow with
  `CommunityModsManager.installedMods.valueHasMutated()`, or the toggle reverts on the next scene
  load. Verified 2026-08-06: that pair survived a restart.
- **Two signatures, and the wrong one fails silently.** `enableMod`/`disableMod` take the
  **identifier string**. `activateModWithDependencies(mod, deps, true)` and
  `disableModWithConsumers` take the **mod object** (`installedModsIndex()[id]`). Passing a string
  enables nothing and throws nothing.
- **Apply with the scene's Back (`<`) button**, or call
  `CommunityModsManager.updateActiveZipMods(true, true)`, which is what it runs.

**Install and enable cached zips from `start`** (2026-08-25; avoids the community-mods scene):

```js
var id = "com.example.mod";
CommunityModsManager.loadAvailableMods(false).always(function () {
  CommunityModsManager.ready().always(function () {
    var mod = CommunityModsManager.installedModsIndex()[id] || CommunityModsManager.availableModsIndex()[id];
    window.__touched = CommunityModsManager.activateModWithDependencies(mod, CommunityModsManager.evaluateDependencies(mod), true);
    CommunityModsManager.installedMods.valueHasMutated();
    CommunityModsManager.updateActiveZipMods(true, true);
  });
});
return "queued";
```

Then restart for client mods. `__touched` lists every identifier enabled, dependencies included.
Enabling a zip server mod from `start` once failed to persist across a restart; from `gw_play` it
did.

**The community-mods scene.**

- **Enter it only through the `Mods` button in `start`.** Navigated to directly, it renders but never
  populates: no installed mods, and `selectedMod` (a computed) never resolves.
- The user's stated rule: drive the scene's own functions (`installSelectedMod`,
  `uninstallSelectedMod`, `enableSelectedMod`, `disableSelectedMod`, gated by `canInstall` etc.),
  not the manager, because they pass dependency lists and refresh observables. Select with
  `model.showTabKey('<key>')` then `model.selectMod(row)`. Tab keys: `units`, `active-server-mods`,
  `active-client-mods`, `installed`, `recommended-mods`, `available-mods`, `maps`.
- **Unresolved (2026-08-07):** with the `community-mods-client` mod mounted, the running scene is
  that mod's variant, and selection over CDP did not stick, so install could not be scripted there.
  Use the `start` recipe above.

**Traps.**

- **`download/community-mods-client.zip` is shared by every profile** and carries
  `ui/mods/ui_mod_list.js`, the list every scene loads mod scripts from. `updateActiveZipMods`
  rewrites it from the **calling** profile's mods. Applying mods on one profile mid-session changes
  what the other profile's next scene loads (2026-08-28). Finish every profile's mod changes before a
  co-op session. Signature: `loadSceneMods for scene:X` followed by unexpected `status.js` 404s.
- **CMM re-downloads `download/<id>.zip` whenever its md5 differs from the published one**, at client
  startup and on `updateActiveZipMods`. A hand-built test zip written before either is replaced
  within a second. Back up the release zip and restore it afterwards.
- **CMM merges every active server mod's `unit_list.json` into
  `download/community-mods-server.zip`** during `updateActiveZipMods`. A test zip written after that
  plays with the release unit list. To test a changed unit list, use a folder mod ([§4.5](../04-Battles-and-Skirmishes/README.md#45-ai-skirmish)).
- **A folder mod with the same identifier as an installed zip shadows the zip** in CMM's index.
  Give a working copy a `-dev` identifier while the release zip is in use.
- **A test mod whose `dependencies` names the release identifier** of a mod you run as a `-dev`
  folder makes `activateModWithDependencies` enable the release zip beside the dev folder, and the
  UI hides the duplicate.
- Mutating a CMM record's `version` does not survive a restart; it is re-read from the zip.
- CMM's daily update runs at 22:33 local time. Published zips are at
  `https://mods.planetaryannihilation.net/community-mods/downloads/<identifier>.zip`; compare the
  `ETag` with `curl -s -I` to detect a release without PA. A mod repo's default branch is not proof
  of what was released.
- `--nomods` is the clean way to test whether a bug is mod-caused.
- `com.wondible.pa.no_gw_video` suppresses the GW intro video. Enable it on any test profile before
  entering a war; the user hears it otherwise.

**What a scene is actually running.** Check `api.mods.getMounted("client", true)` (and `"server"`
in a lobby) before trusting any test. Which build of a mod the default profile mounts (release zip
or `-dev` folder) has changed between days. `api.mods.getMounted('server', true)` returns `[]`
unless a server is running.

---
