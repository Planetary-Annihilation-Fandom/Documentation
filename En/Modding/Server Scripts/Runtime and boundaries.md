# Runtime and boundaries

## Execution model

`server.exe` hosts the game server and executes JavaScript from the game's server-script system. The shipped scripts use `require(...)` and CommonJS-style modules. The executable contains V8 runtime code; this is an embedded game runtime, not evidence that Node.js is present.

The runtime exposes game modules such as `server`, `sim`, `file`, and `env`. Shipped code also uses timers, `console`, and bundled libraries including Lodash and Q. `env` is used to read server command-line arguments. `file` is used to load game content through the game's virtual file system.

The executable's help lists a `--scripturl` option for a server script source and a `--debug-port` option. `--scripturl` takes a local directory and mounts it over `/server-script/`, so its files replace shipped files of the same name; see [Runtime API surface](Runtime%20API%20surface.md#how-the-dump-was-made). The game client has separate UI/script debugging switches; do not confuse those with server-side debugging.

The native executable embeds V8 statically in build `20261016195339`; no separate V8 DLL or V8 imports were found, while V8 API strings and RTTI are present in the PE. Eleven named `server.*` and `sim.*` callbacks were matched between static Ghidra call sites and runtime Frida observations. See [Reverse engineering native bindings](Reverse%20engineering%20native%20bindings.md).

## Available game-facing APIs

| Module or API | Confirmed role | Source examples |
|---|---|---|
| `server` | Connected clients, message handlers, broadcasts, state changes, replay/config operations | `server_utils.js`, `main.js`, `states/playing.js` |
| `sim` | Authoritative match simulation: armies, players, planets, units, effects, and simulation time | `sim_utils.js`, `states/playing_shared.js`, `states/playing.js` |
| `file` | Asynchronous or blocking reads and mounting in-memory game content | `file_utils.js`, `states/lobby.js` |
| `env` | Server command-line arguments | `main.js` |

The full list of members observed in a running server is in [Runtime API surface](Runtime%20API%20surface.md).

For example, `server_utils.js` implements `server.broadcast` by iterating connected clients and calling `client.message`. `main.js` changes the server state and sends each connected client the state payload.

## Process and filesystem boundary

The shipped scripts examined here do not use Node.js `fs`, `child_process`, browser `window`/DOM APIs, or Coherent UI APIs. The `file` module calls seen in server code load game virtual files; they do not establish arbitrary host filesystem access. This is evidence about the visible script surface, not proof that every native binding is unavailable.

No supported arbitrary socket API or operating-system process API was found in the shipped scripts or in the objects exposed to a running server, and `require` does not resolve Node.js module names such as `fs`, `net` or `child_process`. Server/client communication in the confirmed examples goes through the game's `server` and `client.message` APIs. Treat OS access, external network calls, and persistent arbitrary file writes as unavailable until a native API or a controlled runtime experiment proves otherwise.

A separate helper process can perform host-side work through an experimental file-and-log bridge: a server script writes a request to the server log, Node.js watches that log, and the script reads the helper's response with `file.load`. This completed in both lobby and AI benchmark runs on build `20261016195339`, including a helper reading a file outside the game directory and making a loopback HTTP GET. Ordinary measured round trips took 133–175 ms, and a 1 MiB payload was read successfully. See [Unverified capabilities](Unverified%20capabilities.md).

## Inspecting the executable

The installed `server.exe` is a native 64-bit executable. Its version metadata identifies build `20261016195339`; the executable also contains V8 symbols/strings. This lets us inspect its PE metadata, imports and strings, and use a native-code reverse-engineering tool such as [Ghidra](https://github.com/NationalSecurityAgency/ghidra) to disassemble and decompile functions. Decompiled output is an approximation of machine code, not source code or a complete API specification.

Runtime inspection is possible in principle, but the current build's `--debug-port` did not expose a listener during the observed headless launch. The `--waitForDebugger` launch also did not produce an attachable listener in that check. The runtime surface was instead listed from inside the server with a script loaded through `--scripturl`; see [Runtime API surface](Runtime%20API%20surface.md). See [Unverified capabilities](Unverified%20capabilities.md) for the limits of those observations.
