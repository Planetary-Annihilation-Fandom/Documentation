# Runtime and boundaries

## Execution model

`server.exe` hosts the game server and executes JavaScript from the game's server-script system. The shipped scripts use `require(...)` and CommonJS-style modules. The executable contains V8 runtime code; this is an embedded game runtime, not evidence that Node.js is present.

The runtime exposes game modules such as `server`, `sim`, `file`, and `env`. Shipped code also uses timers, `console`, and bundled libraries including Lodash and Q. `env` is used to read server command-line arguments. `file` is used to load game content through the game's virtual file system.

The executable's help lists `--scripturl` and `--debug-port`. A local directory passed to `--scripturl` mounts over `/server-script/` and replaces shipped files with matching names; an HTTP URL is rejected and is not fetched. The game client has separate UI/script debugging switches; do not confuse those with server-side debugging. See [Runtime API surface](Runtime%20API%20surface.md#how-the-dump-was-made).

The native executable embeds V8 statically in build `20261016195339`; no separate V8 DLL or V8 imports were found, while V8 API strings and RTTI are present in the PE. Eleven named `server.*` and `sim.*` callbacks were matched between static Ghidra call sites and runtime Frida observations. See [Reverse engineering native bindings](Reverse%20engineering%20native%20bindings.md).

No V8 version string was found in the executable's ASCII or UTF-16 strings. Runtime probes found `String.prototype.replaceAll`, nullish coalescing, optional chaining, and public/private class fields, but not `Array.prototype.at`, `Object.hasOwn`, `Array.prototype.findLast`, or class static blocks. On V8's feature timeline this is consistent with V8 8.5–9.1; it is a feature-based range, not an embedded version identifier. The probe also compiled and ran a minimal WebAssembly module. See the [V8 8.5 release](https://v8.dev/blog/v8-release-85), [V8 9.2 release](https://v8.dev/blog/v8-release-92), and [V8 9.4 release](https://v8.dev/blog/v8-release-94).

The main script and each required script were tested with top-level scope probes. In each tested file, `this === global`, `module` and `exports` exist, and `exports === module.exports`; top-level `arguments`, `__filename`, and `__dirname` do not. A `global` marker written by `main.js` was absent in a required module, and a marker from one required module was absent in a second required module. These files therefore do not use Node's five-argument CommonJS wrapper, and the tested files did not share their `global` objects. `eval` and `new Function` both executed successfully.

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

A separate helper process can perform host-side work through an experimental file-and-log bridge: a server script writes a request to the server log, Node.js watches that log, and the script reads the helper's response with `file.load`. This completed in both lobby and AI benchmark runs on build `20261016195339`, including a helper reading a file outside the game directory and making a loopback HTTP GET. Ordinary measured round trips took 133–175 ms, and a 1 MiB payload was read successfully. This is helper-mediated networking, not a socket opened by the server script. See [Unverified capabilities](Unverified%20capabilities.md).

## Network paths checked

| Path | Status | Check and limit |
|---|---|---|
| `file.load` with an `http://127.0.0.1` URL | **Absent** | The call returned without a synchronous exception, but its callback did not run and the local HTTP listener received no connection. An isolated probe made `server.exe` exit with `0x80000003` (reported location `0x1403F80C0`). |
| `file.load` with an `https://127.0.0.1` URL | **Absent** | The call returned without a synchronous exception, but its callback did not run and the local TLS listener received no connection. An isolated probe made `server.exe` exit with `0x80000003` (reported location `0x1403F80C0`). |
| `--scripturl http://127.0.0.1:.../` | **Absent** | The server logged `Failed mounting ... to /server-script/`; the local HTTP listener received no connection. Use a local directory path. |
| Caller-selected URL through `server.mountContent` | **Absent** at the script API | The shipped caller passes an array of content identifiers to `server.mountContent`; it does not pass an address. The native content transport behind that call was not traced. |
| Caller-selected URL through the community-server beacon | **Not verified** | With `--community-servers-url http://127.0.0.1:20604/`, the script started and updated its beacon, but the local HTTP listener received no request. The native beacon transport and its destination are not exposed by the inspected script code. |
| Caller-selected URL through replay operations | **Absent** at the script API | Shipped callers pass replay names and types to `server.writeReplay`; no address is supplied. Native replay path handling was not traced. |
| `client.message` and `server.broadcast` | **Confirmed** for game-client delivery | Shipped `server.broadcast` iterates connected clients and calls `client.message`. The message-size limit and whether a client can relay arbitrary data to other clients were not verified without a connected client. |

The Node helper bridge described above is **confirmed** for loopback HTTP GET in a separate process. It does not make direct HTTP or HTTPS available to `file.load`.

Later experiments registered a new global `native` object in a modified/instrumented copy of build `14190493`, with file operations and asynchronous TCP/HTTP. Those results describe an added native extension, not the stock script surface or `file.load`; see [Experimental native extensions](Experimental%20native%20extensions.md).

Do not probe URL schemes with `file.load` on this build: either HTTP or HTTPS URL call triggers a breakpoint and terminates the server before any network request reaches the supplied loopback host.

## Inspecting the executable

The installed `server.exe` is a native 64-bit executable. Its version metadata identifies build `20261016195339`; the executable also contains V8 symbols/strings. This lets us inspect its PE metadata, imports and strings, and use a native-code reverse-engineering tool such as [Ghidra](https://github.com/NationalSecurityAgency/ghidra) to disassemble and decompile functions. Decompiled output is an approximation of machine code, not source code or a complete API specification.

With `--debug-port 20607`, the current build logged `Enabling v8 debugger on port 20607`, but no listener appeared on `127.0.0.1:20607` and `/json/version` did not answer during the five-second check. The V8 inspector protocol could not be reached in that launch. The runtime surface was instead listed from inside the server with a script loaded from a local directory; see [Runtime API surface](Runtime%20API%20surface.md). See [Unverified capabilities](Unverified%20capabilities.md) for the limits of those observations.
