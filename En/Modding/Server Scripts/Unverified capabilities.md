# Unverified capabilities

This page lists questions that the installed regular-match scripts and the launch experiments did not answer. “Unverified” does not mean impossible; it means a custom server script has not yet been shown to have a supported contract for it.

| Capability | What is known | What would confirm it |
|---|---|---|
| Add a fixed amount of metal or energy during a live match | Regular scripts configure army `econ_rate`; no direct stockpile grant was found. | Identify a native `sim` method/property and exercise it in an isolated LAN match. |
| Arbitrary persistent data written to host disk | Server scripts use `file.load`/`loadBlocking` for virtual game files; no write API was found. | Inspect native `file` bindings or run a contained write/read probe. |
| Arbitrary host filesystem access | No Node.js `fs` use or equivalent visible API was found in shipped scripts. | Inspect native bindings and test path confinement in a disposable environment. |
| Outbound network connections or custom sockets | Confirmed messaging uses game server/client APIs; no script socket API was found. | Inspect native exports or test a documented network binding. |
| Launching operating-system processes | No `child_process` or visible process-launch API was found. | Inspect native bindings; do not infer access from the V8 runtime alone. |
| Lifetime and reconnect semantics of custom `server.setGameConfig` fields | The match config is serialized and restored by stock save/load code. Exact survival of arbitrary custom fields through every lobby, save, replay, and reconnect path was not tested. | Add a disposable custom field and verify each lifecycle path. |
| Full V8 debugger attach in the current build | The executable accepts `--debug-port`, but a headless launch did not open an attachable listener on the requested port. | Check the exact required launch mode/protocol or inspect the native debugger setup. |
| Custom `--scripturl` end-to-end loading | The option is listed by server help; a custom probe was not completed. | Serve a minimal harmless script and confirm load logs and state behavior in an isolated server. |

## Safe investigation order

1. Read the matching stock script and enumerate its native module calls.
2. Inspect `server.exe` metadata, imports, strings, and symbols.
3. Use a native decompiler such as Ghidra to locate V8 bindings and trace the methods exposed to scripts.
4. Validate a suspected method with a small, isolated LAN server and disposable user-data/output directories.

Static decompilation can reveal code paths but cannot prove their runtime preconditions or safety. A controlled in-game experiment is still needed for the items above.
