# Imported API

`PA.exe` imports exactly 14 named entries from `CoherentUI64.dll` (evidence: PE table). They occupy consecutive 8-byte IAT slots starting at RVA `0x588110`. The client uses the Microsoft x64 ABI. Names below are the undecorated PE names; the decorated C++ spelling encodes the overload and parameter types.

| IAT RVA | Import | Host use observed in `PA.exe` | Evidence |
|---:|---|---|---|
| `0x588110` | `Coherent::Logging::ILogHandler::ILogHandler()` | Base constructor for `CoherentLogHandler` in `CoherentUI::CoherentUI` (`0x1AD0D0`). | Ghidra xref |
| `0x588118` | `Coherent::UI::CoherentReadInternal(Binder*, bool&)` | Reads a `bool` argument in generated event-handler invokers. | Ghidra xref |
| `0x588120` | `CoherentReadInternal(Binder*, int&)` | Reads an `int` argument in event-handler invokers. | Ghidra xref |
| `0x588128` | `CoherentReadInternal(Binder*, float&)` | Reads a `float` argument in event-handler invokers. | Ghidra xref |
| `0x588130` | `CoherentReadInternal(Binder*, double&)` | Reads a `double` in event-handler invokers and `ArgumentsBinder`. | Ghidra xref |
| `0x588138` | `CoherentBindInternal(Binder*, bool)` | Binds a boolean argument or return in event handlers and `ClientGame::bindToCoherent`. | Ghidra xref |
| `0x588140` | `Coherent::UI::IEventHandler::operator delete(void*)` | Frees `IEventHandler` instances, including exception cleanup and deleting destructors. | Ghidra xref |
| `0x588148` | `IEventHandler::operator new(size_t)` | Allocates handlers in `ProbedEventHandler::wrapAndBind` and `ClientGame::bindToCoherent`. | Ghidra xref |
| `0x588150` | `GetScriptEventWriter(View*) -> ScriptEventWriter*` (C linkage) | Called by the message-push paths and `View::TriggerEvent`; RCX holds the target `View*`. See [JavaScript-native bridge](JavaScript-native%20bridge.md). | Ghidra xref, Callsite |
| `0x588158` | `CoherentBindInternal(Binder*, double)` | Binds a double in the `HolodeckCoherentBinder` getter path. | Ghidra xref |
| `0x588160` | `Coherent::Logging::ILogHandler::~ILogHandler()` | Logger base destruction via `CoherentLogHandler`'s vector-deleting destructor. | Ghidra xref |
| `0x588168` | `Coherent::UI::HTTPHeader::GetHeaderField(HTTPHeader::FieldType)` | Reads response header values in `CoherentUtilFileHandler` and `SynchronousFileHandler`, including partial responses. | Ghidra xref |
| `0x588170` | `InitializeCoherentUI(int, char*, FactorySettings*, RenderingParameters*, Severity, ILogHandler*, void*) -> ViewContextFactory*` (C linkage) | Called by `CoherentUI::CoherentUI`; the return becomes `mFactory`. | Callsite |
| `0x588178` | `CoherentBindInternal(Binder*, int)` | Binds integer arguments or returns in event handlers and `ClientGame::bindToCoherent`. | Ghidra xref |

## Grouping

| Group | Imports |
|---|---|
| Logging base class | `ILogHandler()` constructor, `~ILogHandler()` |
| Scalar reads (4) | `bool&`, `int&`, `float&`, `double&` |
| Scalar binds (3) | `bool`, `int`, `double` |
| Event-handler allocation | `IEventHandler::operator new`, `operator delete` |
| Native-to-script events | `GetScriptEventWriter` |
| HTTP headers | `HTTPHeader::GetHeaderField` |
| Startup | `InitializeCoherentUI` |

## Limits

- There is no `CoherentBindInternal` import for `float`, and none for strings, arrays or maps. The sources establish only the scalar set above; they do not explain how other types are handled (Ghidra xref).
- The prototypes of the two undecorated exports, `GetScriptEventWriter` and `InitializeCoherentUI`, were reconstructed from DLL function bodies and `PA.exe` callsites, since the names carry no types (DLL body, Callsite).
- Only `InitializeCoherentUI` and the `ILogHandler` constructor are on the constructor's initialization path. The others are used by event marshalling, file/HTTP handling, message dispatch and cleanup; which UI event first exercises each one at runtime is not established.
- `GetScriptEventWriter` is at DLL RVA `0x40FD0` (DLL body).
