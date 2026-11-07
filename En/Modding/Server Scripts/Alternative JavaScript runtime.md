# Alternative JavaScript runtime

SpiderMonkey has been used to check the shipped server scripts and embedded as a separate runtime inside a running V8 server process. Neither experiment establishes a replacement for the server's V8 runtime or a complete match with real game bindings.

## Integration boundary

The server links V8 statically. Its game code uses contexts, handles, strings, objects, arrays, templates, accessors and callbacks, in addition to compilation and execution. Replacing only script compilation leaves the game-facing object and callback ABI unresolved.

For build `14190493`, PDB/Ghidra identifies these initialization anchors:

| Function | RVA | Role |
|---|---:|---|
| `ServerScriptEnv::ServerScriptEnv` | `0x6c250` | Runtime/environment initialization |
| `ServerScriptEnv::load` | `0x6cb50` | Script loading |
| `ServerScriptEnv::setModule` | `0x6ccf0` | Module registration |
| `ServerScriptEnv::createGlobalTemplate` | `0x6e9c0` | Global template construction |
| `ServerScriptEnv::js_require` | `0x6f7d0` | Module loading callback |
| `ServerModule::init` | `0x8ff10` | Server API registration |
| `SimModule::init` | `0x74780` | Simulation API registration |

PDB types describe `Local<Value>` as an 8-byte pointer, `FunctionCallbackInfo<Value>` as a 24-byte structure with two pointers and a length, and `PropertyCallbackInfo<Value>` as an 8-byte pointer container. `Value`, `FunctionTemplate`, `ObjectTemplate` and `Isolate` have incomplete PDB layouts. These facts do not supply a complete ABI implementation.

The [V8 integration inventory](V8%20integration%20inventory.md) records 99 named API functions with direct static references from game code among 352 inspected public names. Static reference counts describe code locations, not runtime frequency. Separately, the `lobby-2c` TTD trace recorded 722 `String::NewFromUtf8` calls and 97 calls to one `Object::Set` overload; see [Recording the server with TTD](Recording%20the%20server%20with%20TTD.md).

## Replacement recommendation (PAR-52)

Use a replacement **script environment and binding layer**, with SpiderMonkey behind an explicit native adapter. This is a recommended direction, conditional on the first native-call experiment below; it is not an implemented replacement. Keep the simulation, networking and game object owners in `server.exe`. Replace the script-facing responsibilities of `ServerScriptEnv`, `ServerModule`, `SimModule`, the other binding modules and `ScriptArray` together as coverage grows. Replacing `load` alone cannot isolate V8.

| Approach | Change cost and constraint | Decision |
|---|---|---|
| Binary-compatible V8 shim over mozjs | Preserves existing binding bodies only if handles, inline object access, templates, callback frames, exceptions and persistent lifetimes all match the compiled code. The 99 referenced functions are an inventory, not a complete patch list or ABI specification. | Do not make this the primary route; a small experiment cannot establish whole-ABI compatibility. |
| Environment replacement plus native bindings | Requires recovering native receiver/layout, calling convention and ownership per operation, and rebuilding JS wrappers. Progress is measurable per binding and lifecycle transition without emulating V8 object internals. | Preferred, subject to proving a usable boundary below the V8 wrappers. |
| SpiderMonkey scripts calling existing wrappers through a retained V8 isolate | Can reuse V8's genuine handles and callback machinery, but retains V8 conversion, lifetime and reentrancy obligations. Current callback experiments have not proved a successful round trip. | Possible temporary comparison bridge; label it dual-runtime, not V8 replacement. |
| Separate process with RPC | Isolates runtimes, but requires the same native adapters plus transport, object identity and asynchronous ordering rules. | Defer unless process isolation becomes a requirement. |

Proposed component boundaries:

- **Build-specific hook adapter:** verifies executable hash and expected instruction bytes, installs reversible hooks, and maps original environment/module identities to sidecar state. Owns native thread entry and shutdown ordering; do not reinterpret the existing V8 fields as mozjs storage.
- **SpiderMonkey environment:** owns runtime, globals, rooted values, module cache/loading, exceptions and queued callbacks. Reproduce the observed main/module global separation, loader behavior and timers; drain asynchronous work at verified server-loop points on the runtime's owning thread.
- **Game binding adapter:** exposes explicit operations below `js_*` wrappers using recovered native receivers and signatures. Wrap native objects with identity and invalidation rules, including indexed `ScriptArray` access, getters/setters and destruction. V8 `Local` values and callback frames must not cross this boundary. A raw `js_*` address is not an engine-neutral entry point.
- **Validation harness:** runs the same script/content fixtures against stock V8 and the replacement, recording native effects and lifecycle events. Stubs remain useful for loader tests but cannot satisfy binding acceptance.

Execute these gates in order; keep stock V8 available as a launch-time fallback until acceptance:

1. **Establish the baseline.** Pin binary hash, matching media/mods and launch settings. Reproduce lobby, a real match ending in `game_over`, and clean shutdown on V8. Resolve the existing listener/content failures first; timeout exit and `valgrind_playing` do not establish completion.
2. **Prove one native round trip.** Recover a simple `ServerModule` operation below its V8 argument/result conversion. Invoke it from a SpiderMonkey native function on the correct server thread with a genuine receiver. Require an observable game effect, return to JS, a subsequent callback and clean teardown; include repeated calls and invalid arguments. A console message or callback-entry breakpoint is insufficient. If no separable native operation can be demonstrated, revisit the choice with that evidence before expanding bindings; do not silently fall back to fabricated V8 frames.
3. **Replace environment lifecycle.** Route loading, module registration, timers, game-to-JS callbacks and destruction through the new environment. Verify module/global behavior, timer cancellation, exception propagation, nested callbacks, forced GC and shutdown with pending callbacks. Instrument the old script execution path to demonstrate that these fixtures execute in SpiderMonkey.
4. **Expand real binding coverage.** Add server/client messaging and lobby first, then simulation objects, indexed collections and mutation. Verify each against V8 for return values, native side effects, object identity, invalidated objects and GC across callbacks. Derive required coverage from scripts and traces through match completion and the selected mods, not just startup enumeration; fail visibly on unsupported operations.
5. **Accept a complete replacement.** Demonstrate client join, lobby configuration, match start, real simulation progress, natural or explicitly triggered game completion, result delivery and clean exit, then repeat with a server mod exercising bindings and queued callbacks. Require evidence that no server JS or binding marshalling uses the old V8 path. Only then compare matched workloads for performance and memory; exact simulation equality needs a separately controlled determinism baseline.

The largest uncertainty is availability of a callable boundary below every required V8 wrapper. Other major risks are hidden inline V8 accesses, native object destruction, server-thread affinity, reentrant callbacks and differing JS coercion/property semantics. This route trades whole-V8 ABI emulation for explicit per-binding work; the first gate that calls real game logic determines whether that trade is viable. The next implementation step belongs to PAR-45: the bounded native round-trip experiment, alongside a reproducible V8 baseline.

## Script compatibility host

The standalone test uses `compat-lobby.js` to implement a module loader and JavaScript stubs for game modules. Both jsshell ESR 153.6.0 and a Rust host using `mozjs 0.26.14` compiled 56 server-script files (28,232 lines), loaded 28 modules and constructed a lobby `server_state` payload with a stub owner. This confirms syntax and the tested loader/state path, not file, network or simulation behavior in the actual server.

The Rust host creates a SpiderMonkey runtime/global and registers native `print` and `read` functions. `read` reads source and inventory files for the test loader; it is host functionality, not a newly discovered stock game API. Its return value needs the `mozjs::rust::MutableHandleValue` wrapper around the marked raw return pointer; passing the raw mozjs_sys handle directly caused Rust error `E0308` in the earlier build.

The standalone host project contains the loader `compat-lobby.js` and the inventory generator `scan-scripts.py`. With the matching prebuilt SpiderMonkey archive available, set `MOZJS_ARCHIVE` to its absolute path and run `cargo build --release --offline` in the host directory. Execute the host with the loader path through the timeout launcher; the loader expects the working directory and paths recorded in `compat-lobby.js` and `script-inventory.json`.

Five paired, alternating-order runs produced startup-plus-probe medians of 314.672 ms for jsshell and 309.418 ms for the Rust host. Measurement included the launcher, process startup, reads and probe execution. It compares two SpiderMonkey hosts, not SpiderMonkey against V8 or game simulation performance.

## In-process probe

The embedding project builds a `cdylib` using `mozjs 0.26.14`. The Frida driver loads it at `ServerScriptEnv::load`; the DLL initializes SpiderMonkey and invokes a test Rust native function while the original server continues using V8. That demonstrates coexistence inside a process, not replacement of server scripts.

On build `14190493`, `sm_replay_probe.py` captures the genuine `ServerModule::Host` during module initialization and runs SpiderMonkey on the thread entering the original `js_setGameState` callback. Its `replayEnabled(boolean)` invokes the host's virtual slot `0x58`, resolving to `ServerGame::ServerModuleAdaptor::setWriteReplayEnabled` (RVA `0x23a40`), below V8 conversion. The adapter reads back the value with `getWriteReplayEnabled` (RVA `0x23a90`) and returns it to SpiderMonkey. The fixture rejects missing, extra and invalid arguments, checks the sequence false/true/false in JS, observes subsequent server callbacks and exits normally. This build-specific experiment keeps the receiver only during the call; it is not a complete binding or runtime replacement.

Two otherwise equivalent automated two-AI matches request an unnamed replay after simulation starts. With the switch disabled, the stock `server.writeReplay()` callback returns without dispatching to the replay writer and no replay file appears. With the switch enabled, it dispatches to `ServerModuleAdaptor::writeReplay` (RVA `0x27090`) and writes a nonempty, readable gzip replay. Both processes exit with code 0. The control demonstrates the game effect of the switch; it does not validate every replay or the full SpiderMonkey lifecycle.

A later driver, `sm_native_callback_trace.py`, calls `ConsoleModule::js_console_info` (RVA `0x677d0`) while handling `ServerModule::js_setGameState` (`0x93d70`). The `v8::Function::Call` (`0x532ae0`) route creates a V8 string and function template, logs `from SpiderMonkey` through the real callback, returns from `Function::Call` and SpiderMonkey evaluation, and resumes the original server callback through the lobby transition. Two runs without cdb each verified three consecutive calls and returns. The driver checks those markers and then forcibly stops the server. This is a dual-runtime experiment, not a V8 replacement or a clean-shutdown test.

Run the diagnostic with the existing Frida environment after building the DLLs described in the embed README:

```powershell
& tools/frida/frida16-venv/Scripts/python.exe server/spidermonkey/embed/tools/sm_native_callback_trace.py --mode function-call
```

The earlier Frida `Error: system error` occurred at an address in `KERNELBASE.dll` after the log message. The driver had passed its exception options as a fifth argument to `NativeFunction`, leaving Frida's default exception handling in effect. Passing `{exceptions: 'propagate'}` as the fourth argument allowed the call to return without cdb. The underlying Windows exception code was not identified. The direct route reuses a different callback's captured frame and is diagnostic only; its observed return is not proof that this frame is valid for arbitrary callbacks.

For this diagnostic, select the build root as the working directory and ensure that `icudtl.dat` is beside the executable. A quoted executable-path failure or a debugger usage banner is not a server run. TTD recording may require elevation; an `0x80070005` refusal without a `.run` file is not a trace.

## Baseline and content consistency

The copied `14190493` server was checked against `bins/14190493` by SHA-256 (`5D6C9065D1C7422F62A20B354032BD0B7FD0A1F83F3A85FD61961C13E3CDD617`). Its file version is `120799.20240426195444`; without adjacent `buildid.txt` it logs fallback build ID `20181219120799` and version `unknown`. A fallback log label does not identify the actual binary.

The V8 baseline reached lobby and emitted `server_state`. A separate benchmark reached `valgrind_playing` with eight AI armies and exited on `--time-limit`; it did not establish a `game_over` transition. A shorter timeout expired during planet generation. A controlled lobby reproduction isolated Winsock error 10106 to the child environment: removing both `SystemRoot` and `WINDIR` produced `socket() failed, err=10106` in `GameServerImpl::setListenerState` immediately after entering the lobby. With both variables present, the same build and launch settings remained in the lobby for 20 seconds without that error. This does not distinguish which variable is required.

The original baseline mounted the installed game's newer media through a junction. Missing `land_scout_tool_dummy_weapon.json` and zero-position navigation errors therefore need a version-consistent reproduction before attributing them to a runtime change. Those earlier runs did not establish a full match or a matched V8/SpiderMonkey performance comparison.

A follow-up lobby run used the `bins/14190493` media directory with the matching executable, `--headless --no-players --disable-replays --port 20731`, and no `--scripturl` override. It entered `config` and `lobby`, emitted `server_state`, and reported that no UPnP gateway was found; the launcher killed it after 20 seconds, so this is not a completed match or clean shutdown. `valgrind_playing` exits directly when at most one army remains, rather than transitioning to `game_over`; the normal `playing` state is required for this gate.

A fixture at `server/v8/baseline/run.py` runs the stock V8 executable with generated lobby, landing and playing script overrides. It creates two idle AI armies on a radius-450 planet, chooses an existing landing zone directly for each, and explicitly defeats one army after simulation time exceeds 10 seconds. The checked run reached `lobby`, `landing`, `playing`, `game_over`, script-environment shutdown and server shutdown with exit code 0; each army's statistics reported one unit created. This is a simulated lobby with forced defeat, not a network-client test or natural victory.

Run `python server/v8/baseline/run.py --output <empty-directory>` from the repository root. It checks the executable and full media-tree SHA-256, validates ordered lifecycle markers, both spawn markers and unit statistics, checks selected content errors and requires exit code 0. The generated script overrides and server log are saved in the output directory. No third-party mods are selected; the script rejects a nonempty Windows PA Server `download` directory before and after the run. The server still mounts that directory, so do not add files during a run. SystemRoot and WINDIR must both be present.

The matching media contains the previously missing `pa_ex1/units/land/land_scout/land_scout_tool_dummy_weapon.json`; the checked fixture did not report a missing file. `NavWorld::snapPosToGround() recieved zero pos!` recurred in the stock landing path during `aiSpawnLocation`: its input zones and returned locations were nonzero in the instrumented run. The fixture avoids that call by using a generated zone directly and reported no zero-position error. This is a test workaround, not a diagnosis or repair of the native function. `{idle: true}` avoids invalid AI personality errors. UPnP discovery and removal failed on this host; the headless, no-client fixture completed despite those messages.

### Stock listener probe (PAR-59, partial)

Run `python server/v8/baseline/listener_probe.py --output <empty-directory>` on Windows. With the pinned server, matching media and no script overrides, the checked run printed `LISTENER_PASS lobby=True owned=True tcp=True`: the server reached `lobby`, its PID owned the loopback TCP listener, and a TCP connection succeeded. The probe terminates the server; it checks neither clean shutdown nor the PA handshake, lobby configuration, match or result delivery. It uses `--no-players`, so this is a listener diagnostic rather than a client scenario. The server download directory must be empty, and the output directory retains the log.

An isolated hidden-desktop launch of `bins/14190493/bin_x64/PA.exe` with a separate profile exposed a Coherent debug listener but logged missing `bin_x64/host/icudtl.dat` and resource packs, including an ICU initialization failure in host processes. No usable client-to-server session was demonstrated. The installed game has a different media version; compatibility with the pinned server has not been established. The next step is to supply a complete version-matched client and host runtime or establish the native TCP handshake, then drive stock lobby messages and verify a result received by the client.
