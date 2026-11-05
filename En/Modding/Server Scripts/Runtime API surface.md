# Runtime API surface

This page lists the objects and functions that `server.exe` exposes to server scripts, as observed in a running server. It complements [Runtime and boundaries](Runtime%20and%20boundaries.md), which is based on the shipped scripts.

Build: `20261016195339`. The dump was taken in two states:

- **Lobby**: before any match exists. Collections such as `sim.units` are empty.
- **Match**: an AI-only match started with `--state benchmark`, once units exist. No human players were connected, so `sim.players` and `server.clients` were empty.

The native binding investigation also traced 11 named callbacks between Ghidra and Frida on this build. Their callback RVAs and evidence are listed in [Reverse engineering native bindings](Reverse%20engineering%20native%20bindings.md). `server.broadcast` remains unresolved.

## How the dump was made

A script mounted over `/server-script/` with `--scripturl` walks every object reachable from the global object with `Object.getOwnPropertyNames`, which also returns non-enumerable properties. It logs each property's path, type and descriptor flags to the server log. The game installation is not modified: only files with the same name are replaced, and the other shipped modules load as usual.

```text
server.exe --headless --no-players --disable-replays --scripturl C:\path\to\script\
server.exe --headless --no-players --disable-replays --scripturl C:\path\to\script\ --state benchmark
```

`--scripturl` takes a plain directory path; spaces and non-ASCII characters are fine. A `file:///` URL failed to mount.

### Limits of the dump

- The list is a lower bound. Engine objects can serve properties that `getOwnPropertyNames` does not report: for example, `sim.units` reports a `length` but does not list its elements, and `env` lists no own properties at all even though `env[0]` works.
- Functions are listed by name only. Native functions report `length` 0 whatever arguments they take, and `Function.prototype.toString` returns `[native code]` for every function, including script-defined ones, so neither can describe a signature.
- Player and client objects were not observed, because no client was connected. Their members below come from the shipped scripts.

## Globals

| Global | Contents |
|---|---|
| `console` | The full V8 console: `log`, `info`, `warn`, `error`, `debug`, `assert`, `trace`, `time`/`timeEnd`, `table`, `group`, and others. Output goes to the server log. |
| `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval` | Timers. |
| `env` | Array-like list of the server's command-line arguments, including `env[0]`, the executable path. |
| `file` | `load`, `loadBlocking`, `mountMemoryFiles`, `unmountAllMemoryFiles`. |
| `server` | Server, replay and client management (below). |
| `sim` | The simulation (below). |
| `v8` | `collect` (presumably a garbage-collection trigger; not tested). |
| `require`, `module`, `exports`, `global` | Module system (below). |

Everything else on the global object is standard JavaScript: `Object`, `JSON`, `Math`, `Promise`, typed arrays, `Intl`, `WebAssembly` and so on.

## Modules

`require(name)` resolves `/server-script/<name>.js` in the game's virtual file system. `console`, `env`, `file`, `server` and `sim` return the same objects as the globals.

`require` returns `undefined` for a name that does not exist; it does not throw. None of these names resolve: `fs`, `net`, `http`, `https`, `os`, `process`, `child_process`, `path`, `timers`, `util`, `crypto`, `socket`, `dgram`, `buffer`, `events`, `stream`, `url`, `zlib`. There is no Node.js runtime.

Modules run in a second context. Its global object is reachable as `global` from `main.js`, and it is shared by all modules: a top-level `var` in one module becomes a global property visible to every other module. Wrap module code in a function to keep helper variables private.

## `server`

Native members present in both states:

| Area | Members |
|---|---|
| Lifecycle | `exit`, `setGameState`, `setGameConfig`, `getGameConfig`, `time`, `maxClients`, `beacon`, `onConnect` |
| Clients | `clients` |
| Content and mods | `mountContent`, `getMods`, `resetModUpdateAuthToken` |
| Replays and saves | `writeReplay`, `readReplay`, `checkReplayReady`, `disableWriteReplay`, `setReplayConfig`, `getFullReplayConfig`, `getReplayConfigSummary`, `createSimFromReplay`, `trimHistoryAndStartSim`, `loadSave` |
| Ladder and statistics | `getLadderMaps`, `markLadderGameComplete`, `markLadderGameAbandoned`, `markLadderPlayersDisconnected`, `onLadderGameMarkedComplete`, `incrementTitleStatistic`, `recordGameEvent` |
| Networking status | `steam_id`, `steam_networking_enabled`, `uPNPStatus` |

The shipped scripts, mainly `server_utils.js`, add more members at startup, so these appear only in the match dump: `broadcast`, `broadcastEventMessage`, `broadcastCountdownEvent`, `respond`, `rejectClient`, `setHandlers`, `handlers`, `connected`, `close`, `closed`, `getModsForBeacon`, `getModsPayload`, `uuid`, and the community-server beacon functions.

For two native methods, argument handling was checked directly on build `20261016195339`: the stock `main.js` called `server.setGameState` with one argument, and three diagnostic calls to `server.getGameConfig()` used zero arguments and returned JavaScript objects. Static inspection found that `setGameState` requires at least one argument before reading argument 0; `getGameConfig` reads the current configuration without checking the argument count.

Client objects were not observed. The shipped scripts use `id`, `name`, `uberid`, `connected`, `data`, `message`, `kill`, `onDisconnect`, `setVisionBits`, `setControlBits`, `giveFullVision`, `incrementStatistic`, `validateItem` and `downloadModsFromServer`.

## `sim`

| Member | Notes |
|---|---|
| `armies`, `players`, `planets`, `units`, `effects` | Engine collections with `length`, `push`, `indexOf`, `lastIndexOf`. `armies` also has `getArmy`, `getVisionBits`, `setVisionBits`, `setControlBits`. `planets` has `ready` and `onReady`. |
| `create`, `step`, `shutdown`, `ready`, `onReady`, `onShutdown` | Simulation lifecycle. |
| `paused`, `speed`, `time`, `getValidTimeRange` | Time control. |
| `systemName`, `prepareStartLocation`, `initAlliances`, `setDiplomaticState` | Match setup. |
| `enableSave`, `disableSave` | Saving. |
| `initDropletTest`, `navDebugEnabled` | **Reading either property crashes `server.exe`.** |

### Army (`sim.armies[i]`)

| Kind | Members |
|---|---|
| Data | `id`, `index`, `name`, `ai`, `alliance_group`, `econ_rate`, `defeated`, `spec_tag`, `primary_color`, `secondary_color` |
| Statistics | `stats.units_created`, `stats.units_lost`, `stats.enemy_units_destroyed`, `stats.commands_given` |
| Methods | `getDiplomaticState`, `hasUnitOfAnyType`, `award_bounty_to_killer`, `finalizeEconomy`, `createAIBrain`, `aiSpawnLocation` |

No metal or energy stockpile, income or storage member was found on an army.

### Unit (`sim.units[i]`)

`id`, `spec`, `army` (the army object), `dead`, `isCommander`, `isUnitType`. No position, health or order members were found.

### Planet (`sim.planets[i]`)

`name`, `mass`, `position`, `velocity`, `generator` (`biome`, `radius`, `seed`, `heightRange`, `waterHeight`, `temperature`, `biomeScale`, `metalClusters`, `metalDensity`), `starting_planet`, `required_thrust_to_move`, `valid`, `genMetalSpots`, `genMetalAndLandingSpots`.

## Crashes found

These reads end the process immediately, without a JavaScript exception that `try`/`catch` could handle:

- reading `sim.initDropletTest` or `sim.navDebugEnabled`;
- calling `Object.prototype.toString` on `env`, for example `Object.prototype.toString.call(env)` or a library's type check that uses it.

Avoid generic object inspectors (such as deep-printing `sim` or `env`) in server scripts.
