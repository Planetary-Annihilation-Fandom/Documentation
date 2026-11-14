# Unverified capabilities

This page separates tested behavior from questions that still lack a confirmed contract. Findings marked **Runtime** come from a running server, **Static** from shipped scripts or native-code inspection, and **Both** from both methods. Runtime and native-binding observations refer to build `20261016195339` unless stated otherwise.

## Network paths

| Path | Status | Check and remaining limit |
|---|---|---|
| `file.load` with `http://127.0.0.1:20604/probe.txt` | **Absent** | The call returned, but the callback did not run and the local HTTP server recorded no connection. An isolated call terminated `server.exe` with `0x80000003` (reported location `0x1403F80C0`). |
| `file.load` with `https://127.0.0.1:20605/probe.txt` | **Absent** | The call returned, but the callback did not run and the local TLS server recorded no connection. An isolated call terminated `server.exe` with `0x80000003` (reported location `0x1403F80C0`). |
| `--scripturl http://127.0.0.1:20604/` | **Absent** | The server logged `Failed mounting ... to /server-script/`; the local HTTP server recorded no request. `--scripturl` was confirmed with a local directory instead. |
| `server.mountContent` to a script-selected address | **Absent** at the script API | The shipped `content_manager.js` passes an array of content identifiers and no URL. The native content-loading transport was not traced. |
| Community-server beacon to a script-selected address | **Not verified** | A run with `--community-servers-url http://127.0.0.1:20604/` started and updated the beacon, but the local HTTP server received no request. The native beacon protocol and destination were not established. |
| Replay operations to a script-selected address | **Absent** at the script API | Shipped callers pass replay names and types to `server.writeReplay`; no URL is passed. Native path and transport handling were not traced. |
| `client.message` and `server.broadcast` | **Confirmed** for delivery to connected game clients | Static shipped code shows `server.broadcast` iterating connected clients and calling `client.message`. A connected client was unavailable, so message-size limits and client-to-client forwarding remain **not verified**. |
| Separate Node helper making a loopback HTTP request | **Confirmed** | The experimental file-and-log bridge completed a local HTTP GET in lobby and AI benchmark runs. This is a separate process, not direct server-script networking. |

| Capability | What is known | Confirmation | What would answer the remaining question |
|---|---|---|---|
| Add a fixed amount of metal or energy during a live match | Regular scripts configure an army's `econ_rate`. A live army dump showed no stockpile, income, or storage member. No direct stockpile-credit operation was found in the regular-match scripts. | Both: stock code inspection and runtime object dump | Test a native operation or a resource-granting unit/effect in a controlled match. |
| Write arbitrary persistent data to host disk | The runtime `file` object exposes `load`, `loadBlocking`, `mountMemoryFiles`, and `unmountAllMemoryFiles`; it has no observed write method. `server.writeReplay` is present, but is a replay operation. | Runtime inventory; static stock-script inspection | Inspect path handling in native file and replay callbacks, then test an isolated path. |
| Access arbitrary host files from the server script | `require('fs')` returns `undefined`. A separate Node helper read a file outside the game directory and returned its contents to the script through a file mounted in the game's virtual filesystem. This verifies helper-mediated access, not direct host-path access by `file.load`. | Both: runtime module probe and runtime bridge experiment | Test `file.load` path confinement in a disposable environment. |
| Make outbound network connections or open custom sockets from the script | No socket or HTTP object appeared in the runtime dump, `require` did not resolve `net`, `http`, `https`, or `dgram`, and direct `file.load` HTTP/HTTPS URLs produced no loopback connection. Either `file.load` URL probe separately terminated `server.exe` with `0x80000003` (reported location `0x1403F80C0`) before the local host received a request. A separate Node helper successfully made a loopback HTTP GET and returned the response through the file-and-log bridge. | Runtime; direct localhost probes and helper bridge | Inspect and test any specific native network binding before claiming another route. Avoid `file.load` URL probes on this build. |
| Launch operating-system processes from the script | No process API appeared in the runtime dump, and `require('child_process')` returned `undefined`. | Runtime | Inspect any suspected native binding and test it in an isolated server process. |
| Preserve arbitrary custom `server.setGameConfig` fields through every lifecycle path | Stock save/load code serializes and restores game configuration, but survival of arbitrary custom fields through lobby, save, replay, and reconnect paths was not checked end to end. | Static for stock serialization; custom-field behavior unverified | Add a disposable field and inspect it after each lifecycle transition. |
| Attach a V8 debugger in the current build | `--debug-port 20607` logged `Enabling v8 debugger on port 20607`, but no listener appeared on loopback and `/json/version` did not answer during the five-second check. The inspector protocol was not reached. | Runtime for the tested headless launch; Static for embedded V8 | Check another launch mode only if a debugger connection is needed. |
| Add a new native V8 binding | An ordinary server mod cannot do it: mods only replace files under `/server-script/`, while native functions are registered by the executable. The registration code and `v8::FunctionTemplate::New` are located for this build, so a binding can be added to a patched home build of `server.exe`. | Both: runtime mounting behavior and static/runtime binding trace | Add a test binding to a patched build and call it from a script ([issue #32](https://github.com/Planetary-Annihilation-Fandom/Documentation/issues/32)). |
| Use the experimental Node file-and-log bridge | In lobby and AI benchmark runs, Node watched the server log, handled requests, and wrote JSON responses that the script read with `file.load`. The helper read an outside file and made a loopback HTTP GET. Ordinary round trips took 133–175 ms; a 1 MiB payload was read successfully. | Runtime | Test other workloads and failure cases if they matter to a particular local setup. |

For the methods whose native callbacks were traced, build-specific evidence and addresses are in [Reverse engineering native bindings](Reverse%20engineering%20native%20bindings.md). Eleven of twelve examined names matched between Ghidra and Frida; the twelfth, `server.broadcast`, is a script function from `server_utils.js`, not a native binding.

## Safe investigation order

1. Read the matching stock script and list the native module calls it uses.
2. Record the exact executable build and inspect its PE metadata, imports, strings, and available symbols.
3. Use Ghidra cross-references to locate candidate registration paths, then compare them with observations from a live server using Frida.
4. Check suspected behavior with a small, isolated LAN server and disposable output directories.

Static decompilation identifies code paths but does not prove runtime preconditions. A controlled experiment is needed for behavior the scripts do not exercise.
