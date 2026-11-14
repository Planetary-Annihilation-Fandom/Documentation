# Replacing the DLL

This page collects what a drop-in `CoherentUI64.dll` has to provide to be loaded by `PA.exe` build 14190493, derived from the host-side contract in the other pages. Every item below restates a static finding; none was tested with a real replacement. The research concluded that this contract is specified well enough to implement an ABI-compatible loadable stub, and that runtime rendering equivalence is unverified.

## Exports the executable binds

`PA.exe` resolves 14 names from the DLL ([Imported API](Imported%20API.md)). A replacement must export all of them with matching decorated names, or the loader fails.

| Requirement | Source detail | Evidence |
|---|---|---|
| `InitializeCoherentUI` with 7 arguments, returning a non-null `ViewContextFactory*` | A null return takes the host's failure path. | Callsite |
| `GetScriptEventWriter(View*)` returning a `ScriptEventWriter*` | The `View*` arrives in RCX. | Callsite |
| Scalar helpers `CoherentReadInternal` (bool, int, float, double) and `CoherentBindInternal` (bool, int, double) | Called with a `Binder*` and a value or reference. | Ghidra xref |
| `IEventHandler::operator new` and `operator delete` | Used by the host to allocate and free its handlers. | Ghidra xref |
| `ILogHandler` constructor and destructor | `CoherentLogHandler` derives from it. | Ghidra xref |
| `HTTPHeader::GetHeaderField(FieldType)` | Used by the host file handlers. | Ghidra xref |

## Objects the host calls into

| Object | What the host calls | Evidence |
|---|---|---|
| Factory | Slot 0 `CreateViewContext`, slot 1 `Destroy`. | Callsite |
| Runtime context | Slots 0 to 4: `Uninitialize`, `Update`, `FetchSurfaces`, two `CreateView` overloads. The remaining slots 5 to 10 exist in the DLL but no host call is recorded. | Callsite |
| View | Slots 3, 5, 6, 11, 18, 29, 37 to 41 (and 42 through the writer lookup). A stub that keeps the real 63-slot layout also keeps every other slot callable. | Callsite, DLL body |
| `SurfaceResponse` | Slot 0 `Signal(CoherentHandle)`, called by the host from `Panel::CreateSurface`. In the DLL it resumes pending view creation or resize and deletes itself. | Callsite, DLL body |
| `ScriptEventWriter` | Slots 1, 0, 2 in that order per event. | Callsite |
| `Binder` | Concrete slot order per [Views, listeners and vtables](Views%2C%20listeners%20and%20vtables.md#binder-tables), reachable through the scalar helpers. | DLL body |

## Objects the DLL must call on the host

| Object | Callbacks | Evidence |
|---|---|---|
| `ContextListener` (`ClientGame`) | `ContextReady`, `OnError` | Ghidra xref |
| `ViewListener` (`UIBridge::Panel`) | `OnViewCreated`, `OnDraw`, `OnFinishLoad`, `OnReadyForBindings`, `OnBindingsReleased`, `OnNavigateTo`, `OnError`, `OnScriptMessage`, `OnJavaScriptMessage`, `CreateSurface`, `DestroySurface` | Ghidra xref |
| `ILogHandler` (`CoherentLogHandler`) | `WriteLog`, `Assert` | Ghidra xref |
| Event handlers | `IEventHandler::Invoke(ArgumentsBinder*)`, `GetTarget()` | Ghidra xref |

## Rendering constraint

The only verified way to put pixels on screen is the shared-memory path: the host creates a named mapping on `CreateSurface`, the replacement receives the `CoherentHandle` through the response, writes BGRA-compatible pixels of size `width * height * 4` and triggers `OnDraw` with that handle and size. Keep handle identity stable while the surface lives, and drop mappings when `DestroySurface` arrives. See [Surface and frame path](Surface%20and%20frame%20path.md).

A direct texture or shared graphics context is not supported by any observed contract. See [Open questions](Open%20questions.md). The statement that pixels must be BGRA-compatible is an inference from the material name `textured_unlit_transparent_bgra`; the DLL-side write path was not observed.

## Not established

- The meaning of the first `InitializeCoherentUI` argument (`0x2680`) and of the encoded configuration string.
- Binder behavior for strings, arrays and maps from the host's side.
- Internal `BinderImpl` state, and View slot 1.
- Whether `CoherentUI_Host.exe` or `CoherentUI_HostLibrary` are needed at all by a replacement; the host does not import them directly.
- Runtime order of DLL-internal calls, and thread on which the DLL fires host callbacks.
