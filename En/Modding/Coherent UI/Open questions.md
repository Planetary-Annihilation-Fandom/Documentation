# Open questions

Everything else in this section is static. The following points need a live session.

| Question | Why it is open | Static evidence so far |
|---|---|---|
| Which process creates and makes current a graphics context for the GPU renderer, and is it shared with `PA.exe`'s GL context? | `CoherentUI_HostLibrary` was not analyzed and no live handles were inspected. | Renderer exports are loaded in-process (DLL body); `PA.exe` composition uses a shared-memory pixel surface, not a proven shared context (Ghidra xref). |
| What does `GetGPUSurface` return: a CPU mapping, a graphics resource or an opaque bridge handle? | The export is resolved but its arguments and return were never observed. | Only the name and its storage in `ContextImpl` (`+0xD0` to `+0xF0`). |
| Does that resource ever reach `PA.exe`'s texture path? | The host path uploads from the named mapping; any other route is unseen. | `Panel::OnDraw` uploads `width * height * 4` bytes (Ghidra xref). |
| Runtime order of DLL-internal calls and callback threads | Static evidence gives host call order only. | Constructor order (Callsite). Frame callback scheduling is not statically resolved. |
| Which UI event first exercises each import | Not shown as constructor-path calls. | Only caller lists (Ghidra xref). |
| Ordering of `OnReadyForBindings` / `OnBindingsReleased` against `bindToCoherent` | Not resolved statically. | Callback bodies (Ghidra xref). |

## Method: Frida attach

The prepared Frida observer is `coherent-render-capture.js` in the shared tools. It records API boundaries and handles only; it does not dump mapped pixels. Constraints from the research:

- Start `PA.exe` normally, wait until the UI is visible, then attach to the running process. Do not use `frida -f`: it would launch a second client.
- Attach separately to the already-running `CoherentUI_Host.exe` child with the same script. Find its PID first.
- Record PID, module base and timestamps. Save traces outside the installed game directory.
- Server-side notes on Frida versions in [Reverse engineering native bindings](../Server%20Scripts/Reverse%20engineering%20native%20bindings.md) concern `server.exe` spawn; the same caveat has not been checked for attaching to the client.
- Do not use Chrome DevTools on the Coherent port; see [Attaching](../Debug/01-Attaching/README.md) and [Safety](../Debug/08-Safety/README.md).

### What the script hooks

| Hook | Records |
|---|---|
| `LoadLibraryA` / `LoadLibraryW` | Module loads whose name contains `coherentui_hostlibrary`. |
| `GetProcAddress` | Resolution of the five renderer exports; hooks are attached to the resolved addresses. |
| `CreateProcessW` | Application, command line and child PID of the UI host. |
| `CreateFileMappingW`, `OpenFileMappingW`, `MapViewOfFile`, `UnmapViewOfFile` | Mapping name, size, handle and mapped base. |
| `wglCreateContext`, `wglMakeCurrent`, `eglCreateContext`, `eglMakeCurrent`, `Direct3DCreate9`, `Direct3DCreate9Ex`, `D3D11CreateDevice`, `D3D11CreateDeviceAndSwapChain` | Arguments, return and a short stack, for those exports present in loaded modules. |
| `StartInProcessHost`, `StartGPU`, `RunGPU`, `StopGPU`, `GetGPUSurface` | First three arguments, return value and stack. |

The script inspects module exports only. Device creation reached through COM vtables needs additional hooks.

### What to correlate per view

1. `CreateSurface` response.
2. Shared-memory mapping.
3. `GetGPUSurface`.
4. `RunGPU` / `DrawSurface`.
5. `Panel::OnDraw` texture upload in `PA.exe`.

The result should state which PID creates and makes current the graphics context, whether `GetGPUSurface` returns a CPU mapping, a graphics resource or an opaque handle, and whether the same resource reaches the host texture path. If a hook cannot be set up, record the exact missing API or module and leave the static conclusions unchanged.
