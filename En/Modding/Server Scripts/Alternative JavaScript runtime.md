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

## Script compatibility host

The standalone test uses `compat-lobby.js` to implement a module loader and JavaScript stubs for game modules. Both jsshell ESR 153.6.0 and a Rust host using `mozjs 0.26.14` compiled 56 server-script files (28,232 lines), loaded 28 modules and constructed a lobby `server_state` payload with a stub owner. This confirms syntax and the tested loader/state path, not file, network or simulation behavior in the actual server.

The Rust host creates a SpiderMonkey runtime/global and registers native `print` and `read` functions. `read` reads source and inventory files for the test loader; it is host functionality, not a newly discovered stock game API. Its return value needs the `mozjs::rust::MutableHandleValue` wrapper around the marked raw return pointer; passing the raw mozjs_sys handle directly caused Rust error `E0308` in the earlier build.

The standalone host project contains the loader `compat-lobby.js` and the inventory generator `scan-scripts.py`. With the matching prebuilt SpiderMonkey archive available, set `MOZJS_ARCHIVE` to its absolute path and run `cargo build --release --offline` in the host directory. Execute the host with the loader path through the timeout launcher; the loader expects the working directory and paths recorded in `compat-lobby.js` and `script-inventory.json`.

Five paired, alternating-order runs produced startup-plus-probe medians of 314.672 ms for jsshell and 309.418 ms for the Rust host. Measurement included the launcher, process startup, reads and probe execution. It compares two SpiderMonkey hosts, not SpiderMonkey against V8 or game simulation performance.

## In-process probe

The embedding project builds a `cdylib` using `mozjs 0.26.14`. The Frida driver loads it at `ServerScriptEnv::load`; the DLL initializes SpiderMonkey and invokes a test Rust native function while the original server continues using V8. That demonstrates coexistence inside a process, not replacement of server scripts.

A later driver, `sm_native_callback_trace.py`, attempts to call `ConsoleModule::js_console_info` (RVA `0x677d0`) while handling `ServerModule::js_setGameState` (`0x93d70`). Its direct-callback and `v8::Function::Call` (`0x532ae0`) routes are diagnostic experiments. Logging text from SpiderMonkey or stopping at callback entry does not establish successful return, stack unwinding, handle lifetime or subsequent execution. Existing cdb captures stop at entry; the callback-return ABI and reported system error remain unresolved.

For this diagnostic, select the build root as the working directory and ensure that `icudtl.dat` is beside the executable. A quoted executable-path failure or a debugger usage banner is not a server run. TTD recording may require elevation; an `0x80070005` refusal without a `.run` file is not a trace.

## Baseline and content consistency

The copied `14190493` server was checked against `bins/14190493` by SHA-256 (`5D6C9065D1C7422F62A20B354032BD0B7FD0A1F83F3A85FD61961C13E3CDD617`). Its file version is `120799.20240426195444`; without adjacent `buildid.txt` it logs fallback build ID `20181219120799` and version `unknown`. A fallback log label does not identify the actual binary.

The V8 baseline reached lobby and emitted `server_state`. A separate benchmark reached `valgrind_playing` with eight AI armies and exited on `--time-limit`; it did not establish a `game_over` transition. A shorter timeout expired during planet generation. Later lobby smoke runs reached lobby and then failed with Winsock error 10106; their listener failure remains unexplained.

The original baseline mounted the installed game's newer media through a junction. Missing `land_scout_tool_dummy_weapon.json` and zero-position navigation errors therefore need a version-consistent reproduction before attributing them to a runtime change. No full match or matched V8/SpiderMonkey performance comparison is established by these runs.
