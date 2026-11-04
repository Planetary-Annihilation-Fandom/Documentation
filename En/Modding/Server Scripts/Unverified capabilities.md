# Unverified capabilities

This page lists questions that the installed regular-match scripts and the launch experiments did not answer. “Unverified” does not mean impossible; it means a custom server script has not yet been shown to have a supported contract for it.

| Capability | What is known | What would confirm it |
|---|---|---|
| Add a fixed amount of metal or energy during a live match | Regular scripts configure army `econ_rate`. The runtime dump of a live army shows no stockpile, income or storage member. | Look for hidden members in the native army binding (Frida/Ghidra, #25) or for a resource-granting unit or effect spec. |
| Arbitrary persistent data written to host disk | The runtime `file` object has only `load`, `loadBlocking`, `mountMemoryFiles` and `unmountAllMemoryFiles`; none writes to disk. `server.writeReplay` writes replays only. | Inspect the native `file` and replay bindings for path handling. |
| Arbitrary host filesystem access | `require('fs')` returns `undefined`, and no exposed object offers file access outside the virtual file system. Whether `file.load` accepts host paths was not tested. | Test `file.load` path confinement in a disposable environment. |
| Outbound network connections or custom sockets | No socket or HTTP object is exposed, and `require` does not resolve `net`, `http`, `https` or `dgram`. | Inspect native bindings for hidden members (#25). |
| Launching operating-system processes | No process API is exposed, and `require('child_process')` returns `undefined`. | Inspect native bindings for hidden members (#25). |
| Lifetime and reconnect semantics of custom `server.setGameConfig` fields | The match config is serialized and restored by stock save/load code. Exact survival of arbitrary custom fields through every lobby, save, replay, and reconnect path was not tested. | Add a disposable custom field and verify each lifecycle path. |
| Full V8 debugger attach in the current build | The executable accepts `--debug-port`, but a headless launch did not open an attachable listener on the requested port. | Check the exact required launch mode/protocol or inspect the native debugger setup. |

## Safe investigation order

1. Read the matching stock script and enumerate its native module calls.
2. Inspect `server.exe` metadata, imports, strings, and symbols.
3. Use a native decompiler such as Ghidra to locate V8 bindings and trace the methods exposed to scripts.
4. Validate a suspected method with a small, isolated LAN server and disposable user-data/output directories.

Static decompilation can reveal code paths but cannot prove their runtime preconditions or safety. A controlled in-game experiment is still needed for the items above.
