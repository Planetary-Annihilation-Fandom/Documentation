# Runtime and boundaries

## Execution model

`server.exe` hosts the game server and executes JavaScript from the game's server-script system. The shipped scripts use `require(...)` and CommonJS-style modules. The executable contains V8 runtime code; this is an embedded game runtime, not evidence that Node.js is present.

The runtime exposes game modules such as `server`, `sim`, `file`, and `env`. Shipped code also uses timers, `console`, and bundled libraries including Lodash and Q. `env` is used to read server command-line arguments. `file` is used to load game content through the game's virtual file system.

The executable's help lists a `--scripturl` option for a server script source and a `--debug-port` option. The game client has separate UI/script debugging switches; do not confuse those with server-side debugging.

## Available game-facing APIs

| Module or API | Confirmed role | Source examples |
|---|---|---|
| `server` | Connected clients, message handlers, broadcasts, state changes, replay/config operations | `server_utils.js`, `main.js`, `states/playing.js` |
| `sim` | Authoritative match simulation: armies, players, planets, units, effects, and simulation time | `sim_utils.js`, `states/playing_shared.js`, `states/playing.js` |
| `file` | Asynchronous or blocking reads and mounting in-memory game content | `file_utils.js`, `states/lobby.js` |
| `env` | Server command-line arguments | `main.js` |

For example, `server_utils.js` implements `server.broadcast` by iterating connected clients and calling `client.message`. `main.js` changes the server state and sends each connected client the state payload.

## Process and filesystem boundary

The shipped scripts examined here do not use Node.js `fs`, `child_process`, browser `window`/DOM APIs, or Coherent UI APIs. The `file` module calls seen in server code load game virtual files; they do not establish arbitrary host filesystem access. This is evidence about the visible script surface, not proof that every native binding is unavailable.

No supported arbitrary socket API or operating-system process API was found in the shipped scripts. Server/client communication in the confirmed examples goes through the game's `server` and `client.message` APIs. Treat OS access, external network calls, and persistent arbitrary file writes as unavailable until a native API or a controlled runtime experiment proves otherwise.

## Inspecting the executable

The installed `server.exe` is a native 64-bit executable. Its version metadata identifies build `20261016195339`; the executable also contains V8 symbols/strings. This lets us inspect its PE metadata, imports and strings, and use a native-code reverse-engineering tool such as [Ghidra](https://github.com/NationalSecurityAgency/ghidra) to disassemble and decompile functions. Decompiled output is an approximation of machine code, not source code or a complete API specification.

Runtime inspection is possible in principle, but the current build's `--debug-port` did not expose a listener during the observed headless launch. The `--waitForDebugger` launch also did not produce an attachable listener in that check. Static analysis and the shipped JavaScript therefore remain the primary evidence so far. See [Unverified capabilities](Unverified%20capabilities.md) for the limits of those observations.
