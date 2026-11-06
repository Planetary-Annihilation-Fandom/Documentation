# Experimental native extensions

These prototypes extend a local server executable; they are not APIs supplied by a server mod. The file-and-log bridge was tested on build `20261016195339` (`124685`); the new `native` object was tested on the PDB build `14190493` (`120799.20240426195444`). Addresses and ABI details below belong to the named build.

## Three different mechanisms

| Mechanism | Script-visible result | Boundary |
|---|---|---|
| File-and-log helper | A request in the server log, followed by a JSON response read with `file.load` | Node performs host file reads and loopback HTTP; the stock executable is unchanged. |
| Earlier callback swap | An existing callback returns its incoming string | The Frida host performs the helper exchange; an echoed command does not establish delivery of an arbitrary helper response to JavaScript. The no-Frida patch is echo-only. |
| New global `native` object | File operations and asynchronous TCP/HTTP responses as JSON text | Frida or a DLL registers new V8 templates before context construction. This is additional native registration, not a renamed stock callback. |

The helper experiment read a file outside the game directory, performed a loopback GET, and delivered both results in lobby and AI benchmark runs. Updating the same reply file produced fresh IDs and payloads; a 1,048,576-character payload was read successfully. Ordinary request/response cycles took 133–175 ms with 100 ms polling, while the first lobby cycle took 8,013 ms. The latter coincided with startup/UPnP work; that coincidence alone does not prove causality or a general delay bound.

## Registration and callback ABI

For `14190493`, registration hooks `v8::Context::New` at RVA `0x53af30`, takes its global `ObjectTemplate`, and adds `native` through `Template::Set` (`0x53ea30`). Nested objects use `ObjectTemplate::New` (`0x53b6e0`); methods use `FunctionTemplate::New` (`0x53b2a0`). Existing `server.*` callbacks remain available.

The shared Frida library reads `FunctionCallbackInfo` with argument storage at `+0x08` and length at `+0x10`; argument `i` is at `values - 8*i`. The isolate is at `implicit + 8` and the return slot at `implicit + 0x18`. These offsets were exercised on both researched server builds. They do not establish compatibility with other V8 versions or permit treating SpiderMonkey values as V8 handles.

The no-Frida implementation imports `pa-native.dll!PAInstallHook` into a copied executable, adds a `.pabind` section, and installs a 14-byte trampoline at `Context::New`. The selected prologue consists of whole instructions of lengths 2, 4 and 8 bytes. File operations use WinAPI; a DLL worker uses Winsock and WinHTTP. The Frida implementation delegates networking to a Python worker. Both use one TCP connection per request, with no listening or persistent-socket API.

## Prototype API

All callback results are JSON strings, including errors; parse them before reading their fields. File paths must be absolute Windows paths, and text operations use UTF-8.

| Call | Purpose |
|---|---|
| `native.ping()` | Returns a result containing `PONG`. |
| `native.files.readText(path)` | Reads text. |
| `native.files.writeText(path, text)` / `appendText(path, text)` | Writes or appends text. |
| `native.files.exists(path)` / `list(path)` / `mkdir(path)` | Tests existence, lists a directory, or creates one. |
| `native.tcp.send(jsonText)` | Enqueues a JSON request and returns an ID. |
| `native.http.get(url)` / `post(url, body)` | Enqueues HTTP work and returns an ID. |
| `native.tcp.poll()` | Drains completed TCP and HTTP replies as JSON text. |

For example, the prototype's ping can be consumed with `JSON.parse(native.ping())`. A request ID means work was submitted, not that a remote response has arrived; collect replies through `poll()`.

## Build and run

In a checkout of [pa-research-data](https://github.com/Planetary-Annihilation-Fandom/pa-research-data), the implementation is under `analyze server/native-binding`, with shared V8 wrappers in `analyze server/lib/v8.js` and addresses in `analyze server/symbols/symbols.tsv`. From that checkout's root:

```powershell
# Frida 16.7.19: lobby or match (AI benchmark).
& 'tools/ReverseEngineering/frida16-venv/Scripts/python.exe' 'analyze server/native-binding/run_native_api.py' lobby
& 'tools/ReverseEngineering/frida16-venv/Scripts/python.exe' 'analyze server/native-binding/run_native_api.py' match

# DLL: Visual Studio 2022 Build Tools; argument is poll timer delay in ms.
cmd /c '"analyze server\native-binding\dll\build.cmd"'
python 'analyze server/native-binding/dll/run_native_dll.py' 5
```

The runners create fresh output directories and launch copied servers through `tools/headless-server/run_server.py`; the installed executable and `bins/14190493` are inputs. Consult the implementation README for port selection before a concurrent run.

## Evidence and measurement limits

The following run identifiers are relative to `analyze server/runs/` in pa-research-data. They identify the local evidence checked for this reference on 2026-11-06; retain the underlying evidence independently of old task reports.

| Evidence | Established result |
|---|---|
| `native-api-lobby-20261105-210516` | Files, TCP echo, HTTP GET/POST and reply polling passed; exit 0. |
| `native-api-match-20261105-210120` and `native-api-match-20261105-214349` | The same checks passed after reaching `valgrind_playing` with units; exit 0. |
| `native-dll-lobby-20261105-214236` | DLL file/TCP/HTTP checks passed; `setTimeout(5)` produced a 31 ms mean poll interval, 32 ms TCP and combined cycles. |
| `native-dll-lobby-20261105-214318` | DLL checks passed; `setTimeout(0)` produced a 0.13 ms mean poll interval, 2 ms TCP and 32 ms combined cycle. |
| `native-api-lobby-20261105-215244` | `send/get/post` together took 3,889 ms; polling began immediately afterwards. The worker's TCP exchange took 1.956 ms. |

The last diagnostic localizes the multi-second Frida delay to synchronous callback-to-host dispatch in this setup, rather than to the later poll timer. It does not divide the cost among Frida's internal operations. These short runs are not a general throughput benchmark, and timings from the file/log, Frida and DLL paths measure different work.

UPnP discovery independently occupied about eight seconds in multiple startup logs, including 8.016 s in the second DLL run. Start a measured API cycle after initialization if startup is outside the question being measured.

The DLL was verified in lobby only; its match behavior and a port of the new object to build `20261016195339` remain unverified. The absolute-path requirement is an input format constraint, not a filesystem sandbox. See [Runtime and boundaries](Runtime%20and%20boundaries.md) for the stock runtime's separate limits.
