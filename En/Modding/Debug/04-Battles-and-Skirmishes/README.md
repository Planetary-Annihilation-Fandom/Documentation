[Debug index](../README.md)

## 4. Battles and skirmishes

### 4.1 `live_game` targets and what renders

`live_game` composes ~26 panels, each its own target and scene:

```text
live_game_header        live_game_footer         live_game_players       live_game_chat
live_game_build_bar     live_game_build_hover    live_game_econ          live_game_selection
live_game_planets       live_game_celestial_control  live_game_time_bar  live_game_time_bar_alerts
live_game_unit_alert    live_game_menu           live_game_popup         live_game_world_popup
live_game_paused_popup  live_game_message        live_game_options_bar   live_game_control_group_bar
live_game_action_bar    live_game_pip_tl         live_game_pip_tr        live_game_sandbox
live_game_devmode       live_game_tutorial
```

- Match the root as `live_game/live_game.html`. A bare `live_game` hits a panel first, and panels
  have their own `model`.
- **The root `live_game.html` document is never drawn on screen** (2026-08-24). Its DOM and model are
  live, so DOM checks pass while nothing renders. Visible UI must live in a panel; of header, footer
  and options bar, only `live_game_options_bar` showed injected content. Verify placement visually.
- A panel's view is sized from its `.body-dock` element (call `api.Panel.onBodyResize()` after
  changes) and is capped by its `<panel>` box in the parent: the battle menu is held to 300 px by
  `live_game.css` `.div_game_menu` (2026-09-27). `window.innerWidth` inside a panel target is its
  view width.
- Cross-panel messaging: root → panel with `api.panels.<name>.message("name", payload)`; panel → root
  with `api.Panel.query(api.Panel.parentId, "panel.invoke", ["fnName"])`.
- Sim time: `model.endOfTimeInSeconds()` in `live_game_options_bar.html`.

### 4.2 Landing

- **Landing cannot be scripted.** Synthetic clicks never targeted a position, and
  `model.spawnCommander()` without a target sends a zero vector ("Invalid spawn point"). **The
  server force-lands everyone at 2:00 sim time** (`FORCE_START_TIMEOUT`,
  `server-script/states/landing.js`). Just wait; `model.showLanding()` goes false ~115 s after
  `live_game` appears.
- AI armies act during the landing phase whether or not the human has landed.
- The `playing` state starts 5 s after the last human lands (or after the forced landing); with no
  human armies, about 5 s in.

### 4.3 Sim speed and pause (2026-09-28)

From `live_game/live_game.html`:

```js
model.send_message("set_sim_speed_multiplier", { sim_speed_multiplier: 5 }, function (ok, r) { window.__ss = [ok, r]; });
model.pauseSim(); model.playSim(); model.togglePause();   // read model.paused()
```

- Any value 0.5–5.0 works. `increaseSimSpeed()`/`decreaseSimSpeed()` step by 0.5.
  `simSpeedMultiplier()` updates about a second later.
- **Both are ignored until the landing phase ends** (no handler in `landing`, no reply).
- **Speed is refused** (`Changing sim speed not allowed`) with more than one human player (two-human
  co-op GW battles run at real time), in a replay, in ranked games, or for a client with the `isUbernetUser` flag (from source; never
  seen set on a test client, and the user's signed-in Steam client can change speed).
  **A lone spectator can pause and change speed**, though the menu hides those options.
- Keys via `Input.dispatchKeyEvent` on the root target: `=` (187) faster, `-` (189) slower,
  Pause/Break (19, no `char`) pause.
- **5x is a request, not a rate.** In a ~1,500-unit battle the multiplier stayed 5 while sim time
  ran at ~1x. Measure sim time, not the label.

### 4.4 Observing AI

- Launch with `--ai-log` (the client forwards it to the local server). Evidence is in
  `server-<ts>.txt`:
  - `Army: <name> - Loading unit map /pa/.../<file>.json` per army: which maps loaded.
  - Only **refused** orders are logged: `FactoryManager: Attempted to order a factory [x] to build
    [y]` / `FabberManager: ...`. A refusal proves the named builder exists. A unit-map key naming a
    unit the army cannot build is re-ordered every few seconds (log volume, not a stall).
  - `Creating a new base with id N` every second plus `StrategicManager: No presence on planet` = an
    AI with nothing it can build.
  - The first `recvCmd msg` line (~11 MB of JSON in GW) carries the full referee payload: race trees,
    tagged unit maps and unit lists, tagged specs. Enough for an offline audit of every build item.
- **Counting units:** `api.getWorldView(0).getArmyUnits(armyIndex, planetIndex)` → `{spec: [ids]}`;
  `getUnitState(ids)` → `{planet, unit_spec, pos, army, orient}`.
  - It returns `{}` for every army until the human has landed; a spectator can read at once.
  - The army index is the position in `model.players()` (humans first, then the host's Sub
    Commanders, enemies, the viewer's Sub Commanders), not the army id.
  - For other armies, enable vision first from `live_game_devmode.html` (needs `--devmode`):
    `model.send_message('change_vision_flags', {vision_flags: [true, true, ...]})` with **one flag per
    army**, and `api.Panel.message(api.Panel.parentId, 'panel.invoke', ['playerVisionFlags', flags])`.
    Re-send right before each count; a count that repeats exactly between samples is stale.
  - Index 0 is the human, and the user may be playing it. Ask before attributing its builds to an AI.
- Orbital fabbers often go to gas giants, where they can build little. Check
  `s.system().planets[i].generator.biome` and `.metalDensity` when picking a test star.

### 4.5 AI skirmish

From `start`: `model.navToAISkirmish()`; the lobby is `new_game/new_game.html`. On a profile that has
never seen the TITANS tutorial popup, the first call shows the popup and does not navigate ([§1.1](../01-Attaching/README.md#11-launching-pa)):
call `model.showTutorialPopup(false); model.navToAISkirmish();`.

```js
$.getJSON("coui://ui/main/shared/systems/duelist.pas").then(model.updateSystem);  // a lobby can open with no system
model.spectatorLimit(1); model.changeSettings(); model.leaveArmy({ force: true });  // to spectate
model.previousAIPersonality("Absurd"); model.targetAIArmyIndex(0); model.targetAISlotIndex(0); model.addAI();
model.armies()[1].slots()[0].aiPersonality("Idle");
model.setAICommander("2", "<commander spec>");   // player ids are strings
// wait for model.serverReady(), then:
model.startGame();
```

- **The first `startGame()` in a fresh lobby is often dropped silently** (3 of 3 on 2026-09-19, but
  not on 2026-09-27). Poll `/json` for `live_game` targets for ~20 s; call it again if none appear.
- **AI faction = AI commander.** The server accepts only a commander in the `commander_list.json`
  that won the mount order ("Failed to locate item"); with several faction mods on, one list wins.
- Vanilla personalities read `/pa/ai`; Queller personalities read `/pa/ai_queller/*` and never see a
  mod's `pa/ai/` files.
- `connect_to_game` can sit on "UPLOADING SERVER MODS" for ~90 s with many zip server mods; give it
  two minutes. If it stalls for good after a `SocketMsgPipe ... err=10055`, re-send the handshake:
  `model.send_message('mod_data_available', {}, function (ok, r) { if (ok) api.mods.sendModFileDataToServer(r.auth_token); })`.
- **Folder server mods work in skirmishes** (not in GW, [§5.1](../05-Engine-Facts/README.md#51-file-system)). To test a changed `unit_list.json`,
  put the build in `server_mods/<folder>/` with the release identifier, restart, `enableMod` it,
  `updateActiveZipMods(true, true)`. Deleting that folder later removes the mod record entirely;
  reinstall the zip from `start`.
- The local `server.exe` is passed every client zip too, so a local game cannot prove a dedicated
  server does not need a file.
- Systems: Duelist (one start planet each), Annihilator (two), Pacific (`pacific.pas`, water: Absurd
  AI builds naval units within ~14 sim minutes).
- **A commander whose model no installed mod ships crashes every client** ~10 s after it lands.
  Owning a commander does not mean its model is mounted.

### 4.6 Sandbox: spawning units

For a mod with no AI data. Launch with `--devmode` (the lobby then sets `sandbox(true)` for the
creator). Make the other army `Idle`, load a system, start, and wait for the forced landing.

- **Do not use `unit.debug.setSpecId` + `api.unit.debug.paste`** over CDP: with the cursor off the
  planet it pastes at the planet core and the first air unit crashes the server.
- Send `create_unit` yourself with a real position taken from the commander:

  ```js
  model.send_message("create_unit", { what: spec, planet: 0, location: [x, y, z], orientation: orient, army: model.armyId() });
  ```

  Spread units out (radius 25 + 3k around the commander) and space calls ~2 s apart with an
  in-page `setTimeout` chain.

---
