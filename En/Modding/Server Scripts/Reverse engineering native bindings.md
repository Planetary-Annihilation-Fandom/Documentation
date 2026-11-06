# Reverse engineering native bindings

This page records build-specific findings from `server.exe` build `20261016195339` (version `124685`). The executable contains statically linked V8 code, so the script-visible methods cannot be traced through a separate V8 DLL. Ghidra supplied static call sites; Frida confirmed callback addresses while the server ran.

## Findings

The executable is PE32+ x86-64. It has no V8 DLL import or neighboring PDB, but contains V8 API strings and RTTI. The string `v8::FunctionTemplate::New` points into a wrapper used when registering functions. Frida 16.7.19 hooked that wrapper and recorded the callback address at each call site. The callback RVAs below matched the static and runtime observations.

| Binding | Callback RVA | Confirmation |
|---|---:|---|
| `sim.create` | `0x88a80` | Static and runtime |
| `sim.prepareStartLocation` | `0x8a680` | Static and runtime |
| `sim.setDiplomaticState` | `0x89d00` | Static and runtime |
| `sim.step` | `0x8c2b0` | Static and runtime |
| `server.getGameConfig` | `0x72150` | Static and runtime |
| `server.setGameConfig` | `0x74bd0` | Static and runtime |
| `server.setGameState` | `0x74d10` | Static and runtime |
| `server.readReplay` | `0x748c0` | Static and runtime |
| `server.loadSave` | `0x72d60` | Static and runtime |
| `server.writeReplay` | `0x75540` | Static and runtime |
| `server.markLadderGameComplete` | `0x73520` | Static and runtime |

RVA means offset from the loaded `server.exe` base. These values apply only to build `20261016195339`; do not carry them over to another build without repeating the checks.

`server.broadcast` appeared in a runtime object dump but is not a native binding: `server_utils.js` defines it as a script function, and the PDB of build 14190493 has no native callback for it.

## Checked call behavior

The stock `main.js` called `server.setGameState` with one argument in the observed match. Static inspection of its callback found a minimum argument-count check before it reads argument 0.

Three diagnostic calls to `server.getGameConfig()` used zero arguments and each returned a JavaScript object. Static inspection found that its callback reads the current server configuration without checking the argument count.

## Repeating the investigation

1. Record the exact game build and inspect its PE metadata. The examined executable was x64 and had no adjacent PDB or V8 imports; V8 API strings and RTTI were present in the binary.
2. Import `server.exe` into Ghidra and run auto-analysis. For this build, Ghidra `12.1.4_PUBLIC` with Temurin JDK `21.0.13+9` completed the import in 32 minutes 33 seconds. The resulting project was about 649 MiB.
3. Search for binding-name strings and V8 registration strings such as `v8::FunctionTemplate::New`. Follow cross-references to identify registration call sites. Ghidra's generated function names are analysis labels, not original source names.
4. Use Frida 16.7.19 to observe registration in a running lobby and AI benchmark match. On this Windows setup, Frida 17.25.2 failed during spawn before loading its agent; Frida 16.7.19 worked with `device.spawn`.
5. Compare the callback found at each static registration call with the address recorded at runtime. Record unresolved names separately rather than assigning a callback by proximity.
6. For argument behavior, inspect the callback's checks and then observe a controlled stock or diagnostic call in a live server. Keep static findings separate from runtime observations.

Frida found no usable V8 symbols in the executable, so the static string references were needed to locate the registration wrapper. The check covered 12 names: 11 native bindings matched in both methods, and `server.broadcast` turned out to be a script function from `server_utils.js`. Later custom-binding implementations and their verification limits are described in [Experimental native extensions](Experimental%20native%20extensions.md).

## Shared tracing library

In pa-research-data, `analyze server/lib/frida_run.py` starts the selected build suspended through the headless launcher, attaches Frida 16.7.19, injects the symbol table and `v8.js`, then resumes. Use its `--build 14190493` or `--build current` switch to select the matching address set; it writes a fresh labelled run with server output, Frida messages and metadata.

```javascript
// Agent example for the shared V8 library.
V8.hookCallback('server.setGameState', function (info) {
    console.log(V8.argUtf8(info, 0));
});
```

Addresses come from `symbols/symbols.tsv`, with `DebugSymbol.fromName` as a fallback on the PDB build. The check-bindings example observed all 11 registrations on both builds and read `config` from the stock state-change callback. The string create/read round trip was verified on `14190493` only. The current-build `SetCallHandler` hook remains unverified, and the `14190493` UTF-8 argument helper does not free its small result buffer; repeated long-running use needs that lifetime issue resolved.

The current-build UTF-8 helper has a different signature from the PDB build's helper, so the shared library selects it by build. Older standalone agents still contain their own address/ABI copies; a successful run of the shared example does not validate those copies.

## Related pages

- [Runtime API surface](Runtime%20API%20surface.md) lists script-visible objects and describes the live object dumps.
- [Inspecting the server runtime](Inspecting%20the%20server%20runtime.md) explains how to run probes inside the server.
- [Recording the server with TTD](Recording%20the%20server%20with%20TTD.md) records a run once and queries calls and memory afterwards.
- [Unverified capabilities](Unverified%20capabilities.md) separates tested capabilities from unanswered questions.
