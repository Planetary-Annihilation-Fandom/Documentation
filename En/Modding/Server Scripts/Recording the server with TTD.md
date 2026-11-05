# Recording the server with TTD

This page shows how to record a `server.exe` run with WinDbg Time Travel Debugging (TTD) and query the trace afterwards. The worked example is a 40-second lobby trace of build 14190493 (a build with a PDB, so names resolve). Only function names and RVAs are given; no decompiled game code.

## What TTD gives

TTD records the whole process once. Afterwards you can ask which functions were called, with which arguments and on which thread, and who accessed a memory range, and you can step forward and backward through the run. No new run is needed for a new question.

Prefer it over:

- **Frida**, when you need every call of a function (a hook sees only what you instrumented before the run) or want to answer a new question without restarting the server.
- **Ghidra**, when you need runtime facts: real arguments, call counts, threads, order. Ghidra gives static structure only. The two combine well: Ghidra finds the candidate RVA, the trace tells you what really happens at it.

The cost is speed and size: the recorded server runs about 10-20 times slower, and a trace is about 1-5 GB for a few seconds of such a run.

## Requirements

- The TTD recorder (`ttd.exe`, package `Microsoft.TimeTravelDebugging`, downloadable from `https://aka.ms/ttd/download`). It asks once per user for licence acceptance: `ttd.exe -acceptEula`. You must accept it yourself.
- WinDbg (package `Microsoft.WinDbg`, for example `winget install Microsoft.WinDbg`) for replay and queries. Its console debugger `cdb.exe` is used below.
- Administrator rights for recording, if `ttd.exe` reports that it needs elevation.
- The server executable and, for readable names, its PDB. The Steam build ships no PDB, so function names are available only for builds that have one.
- Python, and the headless launcher from the project tools (`run_server.py`).

### Elevated recording through a scheduled task

Instead of running the whole toolchain elevated, the project registers one scheduled task, `PA-TTD-Record`, once from an elevated PowerShell (`install-admin.ps1`). The task runs `python.exe -I task_record.py` for the current account with the highest run level. It accepts only a build from an allow-list, a safe run name and a timeout of 1 to 120 seconds; server arguments, port and output place are fixed, and an existing run directory is refused. It locates the real `TTD.exe` under `C:\Program Files\WindowsApps`, not the user-writable alias.

The accepted risk: the task runs repository files directly, so any process under the same account can change those files and thereby change what runs with administrator rights.

## Recording

Do not let TTD start the server. Start it suspended through the headless launcher (no error dialogs, hidden desktop, stdin from NUL, kill after a timeout), attach TTD by PID, and resume only after TTD prints `Recording has started`.

The waiting condition matters. The `.run` file appears at "Initializing the recording", about a second before recording begins. Resuming on the file alone let the server initialise, including the V8 setup, outside the trace, and the trace then lacked it (the empty-trace pitfall).

The scripts do this for you:

```powershell
# Elevated shell, or when ttd.exe does not need elevation
python tools/ttd/record.py --name lobby-1 --build 14190493 --timeout 20

# Through the PA-TTD-Record scheduled task
python tools/ttd/record_admin.py --name lobby-1 --build 14190493 --timeout 20
```

Options: `--build 14190493|current` (`current` is the installed game), `--timeout` seconds under TTD (default 20), `--port` (default 20650), `--max-file-mb` (default 4096; TTD stops when the cap is reached). `record_admin.py` takes `--name`, `--build` and `--timeout` only, and refuses a run name that already exists. Use a timeout long enough to reach the lobby: 20 s did with build 14190493, and a 40 s run was used for the example below. The server is killed by the timeout, so the trace ends abruptly, which is fine.

Both scripts pass the executable and working directory as DOS short (8.3) paths. If the repository path contains non-ASCII characters, the server otherwise cannot find `icudtl.dat`.

Output in `tools/ttd/runs/<name>/`:

| File | Content |
|---|---|
| `server01.run` | the trace |
| `server01.idx` | index, created on first replay |
| `server-out.txt` | server log |
| `ttd-out.txt` | recorder log (look for `Recording has started`) |
| `meta.json` | result, sizes, the TTD command line |
| `task-result.json` | only with `record_admin.py`; `"ok": true` means a trace was written |

## Querying

Use `cdb.exe` from the WinDbg package folder, for example `...\Microsoft.WinDbg_<version>_x64__8wekyb3d8bbwe\amd64\cdb.exe`, or open the trace in the WinDbg UI with `windbg.exe -z <trace>`.

Rules that cost time when ignored:

- **Short paths.** Pass the trace and the symbol directory as 8.3 paths when the repository path is non-ASCII.
- **Symbols.** Give the folder with the PDB and `server.exe` through `-y`.
- **Index first.** Run `!ttdext.index` once. Without the index, `Calls()` returned 0. For the 228 MiB example it took 5.6 s and produced a 256 MiB `.idx`.
- **No seeking in scripts.** Commands that move through the trace (`!tt`, `SeekTo`) aborted a `$$<` command file. Put them directly in `-c`, separated by `;`. Keep script files for non-seeking `dx` queries.

```powershell
$cdb   = '<path to>\cdb.exe'
$trace = '<short path>\tools\ttd\runs\lobby-2c\server01.run'
$sym   = '<short path>\bins\14190493\bin_x64'
$query = '<short path>\tools\ttd\queries\ttd14-v8-summary.txt'

# non-seeking queries from a file
& $cdb -z $trace -y $sym -c "`$`$><$query;q"

# seeking commands inline
& $cdb -z $trace -y $sym -c '!tt 0;bp server+0x53c010;g;!tt;r r8;da @r8;q'
```

Useful data-model queries (the module name is `server`; an RVA works as `server+0x...`):

```text
dx @$cursession.TTD.Calls("server+0x53c010").Count()
dx @$cursession.TTD.Calls("server!v8::Object::Set").Select(c => c.ThreadId).Distinct()
dx @$cursession.TTD.Calls("server+0x53c010").First()
dx @$cursession.TTD.Memory(0x1234, 0x1244, "rw")   ; accesses to an address range
dx @$cursession.TTD.Events                          ; module loads, thread starts, exceptions
```

### Reading arguments (x64)

Take the argument registers from the PDB signature, not from the source-level parameter list. `v8::String::NewFromUtf8` returns a handle through a hidden return pointer, so on this x64 build the `char const*` string is in `R8`. `RDX` holds the isolate; dumping it does not show the input string. Hence `r r8;da @r8` in the example above.

## Example: V8 calls in a lobby trace

Trace `lobby-2c`: build 14190493, 40 s, 228 MiB, recorded with the scripts above.

| Function | RVA | Calls |
|---|---|---:|
| `v8::String::NewFromUtf8` | `0x53c010` | 722 |
| `v8::Object::Set` | `0x53e7a0` | 97 |
| `v8::Object::Set` (other overload) | `0x53e4b0` | 0 |

- `server+0x53c010` and `server!v8::String::NewFromUtf8` matched the same 722 calls.
- All 97 `v8::Object::Set` calls were at `0x53e7a0`.
- Both functions ran on a single thread (TID `0x4550`, TTD unique thread ID `0x2`).
- The first `NewFromUtf8` call, at TTD position `1571:11C5`, received the string `require`.

These RVAs are valid for build 14190493 only. For the shipped build `20261016195339` and the native binding callbacks, see [Reverse engineering native bindings](Reverse%20engineering%20native%20bindings.md).

## Practical notes

- Keep game code out of notes: record RVAs, names, counts and thread facts, not decompiled bodies.
- A trace that lacks initialisation was almost certainly resumed too early; check `ttd-out.txt` for `Recording has started`.
- Traces and indexes are large (the index is 1 to 2 times the trace). Nothing deletes old runs automatically.

## Related pages

- [Inspecting the server runtime](Inspecting%20the%20server%20runtime.md) explains how to run probes inside the server.
- [Reverse engineering native bindings](Reverse%20engineering%20native%20bindings.md) combines Ghidra and Frida for the same binary.
