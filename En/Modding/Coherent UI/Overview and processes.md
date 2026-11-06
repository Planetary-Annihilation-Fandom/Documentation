# Overview and processes

## Components

| Component | Role | Evidence |
|---|---|---|
| `PA.exe` | Game client. Imports 14 entries from `CoherentUI64.dll`. Owns the wrapper `CoherentUI`, the panels (`client::UIBridge::Panel`) and the renderer. | PE table, PDB |
| `CoherentUI64.dll` | Coherent runtime loaded into the `PA.exe` process. Implements the view context factory, contexts, views and binders behind virtual interfaces. | PE table, DLL body |
| `CoherentUI_Host.exe` | Separate UI/content process, spawned by the DLL from the `bin_x64\host` directory under the installation. | DLL body, Ghidra xref |
| `CoherentUI_HostLibrary` | GPU-renderer library loaded by name into the process that hosts `CoherentUI64.dll`, not into `CoherentUI_Host.exe`. | DLL body, Ghidra xref |

**Process spawning.** `ConcreteContext::Initialize` (DLL RVA `0x55380`) builds a command line containing `--coherent-options=...`, resolves `CoherentUI_Host.exe` and calls `ContextImpl::SpawnHostProcess` (`0x20EE0`). That helper passes the executable path and command line to `PlatformProcess::SpawnProcess` and retains the process and event handles. Evidence: DLL body, Ghidra xref.

**In-process GPU renderer.** `ContextImpl::LoadInProcessRenderer` (`0x15930`) calls `LoadLibraryA("CoherentUI_HostLibrary")` and resolves five exports, storing the function pointers in `ContextImpl` at offsets `+0xD0` to `+0xF0`. `StartGPURenderer` (`0x210C0`) starts a worker thread for `GPURendererStart`, calls `StartGPU` and marks the renderer active. `DrawSurface` fires RPC event `0xE` and calls the loaded `RunGPU`. Evidence: DLL body, Ghidra xref.

| Resolved export | Resolved by |
|---|---|
| `StartInProcessHost` | `LoadInProcessRenderer` (`0x15930`) |
| `StartGPU` | same |
| `RunGPU` | same |
| `StopGPU` | same |
| `GetGPUSurface` | same |

The `CoherentUI_HostLibrary` binary itself was not analyzed. What it does with graphics contexts is unverified; see [Open questions](Open%20questions.md).

## Startup in the host

The first Coherent initialization in the client is inside the constructor `CoherentUI::CoherentUI` (`PA.exe` RVA `0x1AD0D0`). The order below is static call order in the constructor, not a live trace.

| Step | Action | Evidence |
|---:|---|---|
| 1 | Allocate `CoherentLogHandler` and call the imported `ILogHandler` base constructor (IAT `0x588110`). | Ghidra xref |
| 2 | Call `InitializeCoherentUI` (IAT `0x588170`) at RVA `0x1AE01C` with seven arguments: `0x2680`, an encoded configuration, `&FactorySettings`, `&RenderingParameters`, a severity, the log handler and a custom allocator pointer. | Callsite (register and stack arguments) |
| 3 | Store the return as `mFactory`. A null return takes the constructor's failure path and raises an initialization failure. | Ghidra xref |
| 4 | Call factory slot 0, `CreateViewContext(ContextSettings*, ContextListener*, FileHandler*)`, to obtain the runtime context (`mSystem`). | Callsite |

What `0x2680` and the encoded configuration mean is not explained by the sources (unverified). The runtime order of calls made inside the DLL is also not established by this evidence.

## Per-frame and shutdown calls

| Phase | Host function (RVA) | DLL call | Evidence |
|---|---|---|---|
| Frame update | `ClientGame::updateAndPresent` (`0x6CE00`) leads to `CoherentUI::update` (`0x1AE560`) | context slots 1 `Update` and 2 `FetchSurfaces` | Callsite |
| Load a view | `CoherentUI::loadUrl` (`0x1AE2B0`) | context slot 3 or 4 `CreateView` | Callsite |
| Input, focus, resize, redraw | `CoherentUI::dispatchToView` (`0x1AE810`) | View slots 3, 5, 6, 11, 29 | Callsite |
| View created | `Panel::OnViewCreated` (`0x1991B0`) | View slot 18 `SetTargetFramerate` with 60 | Callsite |
| Shutdown | `CoherentUI` destructor (`0x1AE1C0`) | context slot 0 `Uninitialize`, then factory slot 1 `Destroy` | Callsite |

`CoherentUI` is 168 bytes in `PA.pdb` (PDB) and is host-owned wrapper state. Its fields:

| Field | Offset |
|---|---|
| `mContentRoot` | `+0x08` |
| `mBootScripts` | `+0x28` |
| `mFactory` | `+0x48` |
| `mSystem` | `+0x50` |
| `mLogHandler` | `+0x58` |
| `mHost` | `+0x60` |
| `mPlatform` | `+0x80` |
| `mEventTranslator` | `+0x88` |
| `mFileHandler` | `+0x90` |
| `mBundleFileHandler` | `+0x98` |
| `mForceSoftwareRendering` | `+0xA0` |

This is not a layout that a DLL replacement has to reproduce. The vtables behind the slot numbers are in [Views, listeners and vtables](Views%2C%20listeners%20and%20vtables.md).

## Related

- [Attaching](../Debug/01-Attaching/README.md) for the host executable path and the debug port.
- [CEF](../Debug/07-CEF/README.md) for dev builds that move away from Coherent.
