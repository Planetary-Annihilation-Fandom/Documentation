# Views, listeners and vtables

Slot numbers count 8-byte entries from the vtable label (slot offset = `8 * slot`). Host addresses are `PA.exe` RVAs; DLL addresses are `CoherentUI64.dll` RVAs (image base `0x180000000`). In the DLL the PDB, RTTI, vtable data, function bodies and host callsites were cross-checked in the Ghidra project `current`.

## Host types at the boundary

| Type | Size and fields | Role | Evidence |
|---|---|---|---|
| `Coherent::UI::Binder` | 16 bytes: vptr `+0`, `BinderImpl*` `+8` | Passed by reference to the scalar read/bind imports. | PDB |
| `Coherent::UI::IEventHandler` | 8 bytes (one vptr) | Host-allocated callback; allocated and freed through imported class operators. | PDB |
| `Coherent::UI::HTTPHeader` | 16 bytes: `Field*` `+0`, `Content*` `+8` | Passed to the panel finish-load callback; `GetHeaderField` reads a named field. | PDB |
| `Coherent::UI::ContextListener` | 8 bytes | Implemented by `client::ClientGame`. | PDB, RTTI |
| `Coherent::UI::ViewListener` / `ViewListenerBase` | 8 bytes each | `client::UIBridge::Panel` sits in this hierarchy. | PDB, RTTI |
| `CoherentLogHandler` | 8 bytes (one vptr), derives from imported `ILogHandler` | Logging sink given to `InitializeCoherentUI`. `WriteLog(Severity, char*, uint64)` at `0x1AA9D0`. | PDB |
| `CoherentUI::MappedHandle` | 24 bytes: `CoherentHandle` `+0`, mapping pointer `+8`, byte size `+16` | Host surface record; the raw mapping is distinct from the handle given to Coherent. | PDB |

Empty PDB class records still give the ABI size; they say nothing about implementation state behind a virtual interface.

## Host vtables (callbacks Coherent calls into PA.exe)

| Table | Label (VA) | Observed slots | Evidence |
|---|---|---|---|
| `ClientGame` as `ContextListener` | `0x1405B5C58` | 0 `ContextReady` (`0x6E9D0`), 1 `OnError` (`0x6EB50`). Later bytes are adjacent data, not slots. | Ghidra xref |
| `UIBridge::Panel` (view listener) | `0x1405CF588` | see below | Ghidra xref (function-pointer xrefs) |
| `IEventHandler` interface | `0x1405B7198` | 0 deleting destructor, 1 and 2 pure-call placeholders | Ghidra xref |
| `EventHandler<void(ClientGame::*)(string)>` | `0x1405B7260` | 0 deleting destructor, 1 `Invoke(ArgumentsBinder*)` (`0xB0FD0`), 2 `GetTarget()` (`0xB06F0`) | Ghidra xref |
| `CoherentLogHandler` | `0x1405D0A48` | 0 vector-deleting destructor (`0x1AAA50`), 1 `WriteLog` (`0x1AA9D0`), 2 `Assert` (`0x198C0`, see note) | Ghidra xref |

Other concrete `EventHandler` specializations follow the same `Invoke`/`GetTarget` pattern with their own `Invoke` signatures. The log handler table is the host implementation's, not a claim about the DLL's `ILogHandler` layout. The `Assert` RVA is printed with five digits in the source, unlike its neighbours; check it before relying on it.

### Panel callback slots

| Slot | Callback | RVA |
|---:|---|---|
| 0 | deleting destructor | |
| 1 | `Release` | |
| 3 | `OnViewCreated` | `0x1991B0` |
| 5 | `OnDraw` | `0x1994A0` |
| 6 | `OnFinishLoad` | `0x199810` |
| 9 | `OnReadyForBindings` | `0x199ED0` |
| 10 | `OnBindingsReleased` | `0x19A0B0` |
| 13 | `OnNavigateTo` | `0x1993D0` |
| 14 | `OnError` | `0x19A1F0` |
| 15 | `CoherentViewListener::OnScriptMessage` | `0x1AA350` |
| 18 | `CoherentViewListener::OnJavaScriptMessage` | `0x1AA600` |
| 20 | `CreateSurface` | `0x199820` |
| 21 | `DestroySurface` | `0x199C40` |

Evidence: Ghidra xref. Other slots are not assigned names in the sources.

## DLL tables

### Factory and context

| Table | RVA | Slots | Evidence |
|---|---|---|---|
| `ViewContextFactoryImpl` | `0xDB7E0` | 0 `CreateViewContext(ContextSettings*, ContextListener*, FileHandler*) -> ViewContext*` (`0x54FE0`), 1 `Destroy()` (`0x55180`) | DLL body |
| `ConcreteContext` (runtime) | `0xDB780` | see below | DLL body |

| Context slot | Method | Host caller |
|---:|---|---|
| 0 | `Uninitialize() -> bool` | `CoherentUI` destructor |
| 1 | `Update()` | `CoherentUI::update` |
| 2 | `FetchSurfaces()` | `CoherentUI::update` |
| 3 | `CreateView(ViewInfo*, wchar_t*, ViewListenerBase*, wchar_t*)` | `CoherentUI::loadUrl` |
| 4 | `CreateView(ViewInfo*, wchar_t*, ViewListenerBase*)` | `CoherentUI::loadUrl` |
| 5 | `SaveCookies() -> bool` | not observed |
| 6 | `AddCrossOriginWhitelistEntry(wchar_t*, wchar_t*, wchar_t*, bool)` | not observed |
| 7 | `RemoveCrossOriginWhitelistEntry(...)` | not observed |
| 8 | `ClearCrossOriginWhitelist()` | not observed |
| 9 | `FreeInProcessRenderingResources()` | not observed |
| 10 | `RecreateInProcessRenderingResources()` | not observed |

The "Host caller" column is from callsites for slots 0 to 4; "not observed" means the sources record no host call, not that none exists.

### View (`BrowserViewImpl`, vtable `0xCF0F8`, 63 entries)

This is the concrete View used for the host contract (DLL body). Slot 1 is an ICF/codecvt alias at `0x3D0F0` with no confirmed View meaning.

| Slots | Methods in order |
|---|---|
| 0, 2-8 | `GetContext() -> ViewContext*`; slot 1 unresolved; `Destroy()`, `SetFocus()`, `KillFocus()`, `MouseEvent(MouseEventData*)`, `KeyEvent(KeyEventData*)`, `TouchEvent(TouchEventData*, uint)`, `MouseActivate()` |
| 9-17 | `GetWidth() -> int`, `GetHeight() -> int`, `Resize(uint, uint)`, `IssueMouseOnUIQuery(float, float)`, `HasMouseQueryFinished() -> ViewErrorType`, `FetchMouseOnUIQuery()`, `IsMouseOnView() -> bool`, `SetClickThroughAlphaThreshold(float)`, `GetClickThroughAlphaThreshold() -> float` |
| 18-29 | `SetTargetFramerate(int)`, `GetTargetFramerate() -> int`, `IsOnDemand() -> bool`, `RequestFrame(double) -> ViewErrorType`, `RequestFrame() -> ViewErrorType`, `PeekFrameReady() -> ViewErrorType`, `FetchSurface() -> ViewErrorType`, `DrawSurface() -> ViewErrorType`, `UsesSharedMemory() -> bool`, `IsTransparent() -> bool`, `SupportsClickThrough() -> bool`, `Redraw()` |
| 30-42 | `DownloadUrl(wchar_t*)`, `Load(wchar_t*)`, `Reload(bool)`, `GetCurentViewPath() -> wchar_t*`, `GetLastRequestedPath() -> wchar_t*`, `GetLastLoadedPath() -> wchar_t*`, `GetLastFailedPath() -> wchar_t*`, `RegisterForEvent(char*, IEventHandler*) -> void*`, `UnregisterFromEvent(void*)`, `BindCall(char*, IEventHandler*) -> void*`, `UnbindCall(void*)`, `UnbindObject(void*)`, `GetId() -> uint*` |
| 43-58 | `ExecuteScript(char*)`, `TriggerEvent(char*)`, `ReplyToJavaScriptMessage(bool, char*)`, `AuthCredentialsResponse(wchar_t*, wchar_t*, bool)`, `SetScriptError(ScriptCallErrorType, char*)`, `InterceptURLRequests(bool)`, `IMEActivate(bool)`, `IMEIsActive() -> bool`, `IMESetComposition(wchar_t*, uint, uint, uint) -> bool`, `IMEConfirmComposition(wchar_t*) -> bool`, `IMECancelComposition() -> bool`, `CreateImageData(char*, int, int, void*, bool) -> ImageData*`, `GetAudioData(int, void*, int, int) -> int`, `SetZoomLevel(double)`, `SetMasterVolume(double)`, `Print(bool)` |
| 59-62 | `GoBack()`, `GoForward()`, `GetHistory()`, vector-deleting destructor |

`GetCurentViewPath` keeps the spelling from the DLL symbol name.

Slots the host calls (Callsite, matching the DLL table): 3, 5, 6, 11, 18, 29, 37, 38, 39, 40, 41 and 42. They serve focus, input, resize, redraw, the 60 fps setup, event registration and unregistration, and writer selection. `Panel::OnViewCreated` calls slot 18 with 60; `CoherentUI::dispatchToView` calls 3, 5, 6, 11 and 29.

Event registration is done in `ClientGame::bindToCoherent` (`0x6EF30`), `VenderClientStats::bindToCoherent` (`0x173C60`) and `SystemEditorView::bindToCoherent` (`0x184D40`) (Callsite). The class name `VenderClientStats` is spelled as in the PDB.

## Binder tables

`Binder`'s abstract table is at `0xCE938` with 38 entries: slot 0 is the vector-deleting destructor (`0x2210`), slots 1-37 are pure-call entries. Concrete tables extend this layout (DLL body).

| Slot | `ViewBinder` (`0xDAAF0`) | `JStoNativeBinder` (`0xD6798`) |
|---:|---|---|
| 0 | vector-deleting destructor (`0x51580`) | vector-deleting destructor (`0x350B0`) |
| 1 | `ReadType(char*) -> bool` (`0x36860`) | same (`0x36860`) |
| 2-10 | `Bind(wchar_t*)`, `Bind(char*)`, `Bind(double)`, `Bind(float)`, `Bind(unsigned char)`, `Bind(char)`, `Bind(unsigned int)`, `Bind(int)`, `Bind(bool)` (`0x51770` to `0x51790`) | pure-call entries |
| 11-18 | `Read(char**, uint64*)`, `Read(double*)`, `Read(float*)`, `Read(unsigned char*)`, `Read(char*)`, `Read(unsigned int*)`, `Read(int*)`, `Read(bool*)` (`0x35F80`, `0x35E40`, `0x35E10`, `0x35A70`, `0x35920`, `0x35CF0`, `0x35BC0`, `0x360A0`) | same implementations |
| 19-21 | `TypeName(char*)` (`0x51E00`), `PropertyName(char*)` (`0x51CD0`), `BindNull()` (`0x517B0`) | pure-call entries |
| 22-27 | `ArrayBegin(uint64)` (`0x515B0`), `ArrayEnd()` (`0x51620`), `MapBegin(uint64)` (`0x51A10`), `MapEnd()` (`0x51A80`), `OnTypeBegin()` (`0x51B30`), `OnTypeEnd()` (`0x51BF0`) | pure-call entries |
| 28 | shared no-op target `0x654B0`; the symbol alias does not establish a method name | same target `0x654B0` |
| 29-37 | `OnReadTypeEnd()` (`0x35860`), `ReadProperty(char*) -> bool` (`0x36740`), `ReadArrayBegin() -> uint64` (`0x361F0`), `ReadArrayElement(uint64)` (`0x362F0`), `ReadArrayEnd()` (`0x363C0`), `ReadMapBegin() -> uint64` (`0x36510`), `ReadKeyValuePair()` (`0x36450`), `ReadMapEnd()` (`0x366E0`), `PeekValueType() -> ValueType` (`0x358B0`) | same implementations |
| 38-39 | `EventBegin(char*, uint64)` (`0x51800`), `EventEnd()` (`0x51940`) | pure-call entries |

Slots 38 and 39 are listed in the source for the concrete tables although the abstract table has 38 entries (slots 0-37); the sources do not reconcile this. Treat the concrete tables as 40 slots and the abstract count as unreconciled.

`ArgumentsBinder` base table: `JStoNativeBinder` at `0xD68E0` (7 slots); the corresponding `ViewBinder` table is at `0xDAC38` (its slots are not listed in the sources).

| Slot | Method | `JStoNativeBinder` RVA |
|---:|---|---:|
| 0 | adjusting vector-deleting destructor | `0x34FD8` |
| 1 | `GetArgument(int) -> Binder*` | `0x357E0` |
| 2 | `ResultBegin() -> Binder*` | `0x371C0` |
| 3 | `ResultEnd()` | `0x37240` |
| 4 | `ResultVoid()` | `0x37250` |
| 5 | `HasError() -> bool` | `0x35840` |
| 6 | `GetArguments() -> EventArguments*` | `0x35830` |

Direct wrapper and implementation functions in the DLL (DLL body, PDB names; signatures recovered):

| RVA | Method | Signature |
|---|---|---|
| `0x2300` | `Binder::AddProperty` | `void AddProperty(Property const&)` |
| `0x2310` | `BinderImpl::AddProperty` | `void AddProperty(Property const&)` |
| `0x2410` | `Binder::BeginType` | `void BeginType()` |
| `0x2430` | `BinderImpl::BeginType` | `bool BeginType(char*, void*)` |
| `0x2840` | `Binder::EndType` | `void EndType(void*)` |
| `0x2950` | `Binder::ReadType` | `void ReadType()` |
| `0x2970` | `Binder::RegisterType` | `TypeDescription RegisterType(char*, void*)` |
| `0x2990` | `BinderImpl::RegisterType` | `TypeDescription RegisterType(char*, void*)` |

How the imported scalar helpers reach these tables is in [JavaScript-native bridge](JavaScript-native%20bridge.md).
