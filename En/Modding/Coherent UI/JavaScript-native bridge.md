# JavaScript-native bridge

Two directions cross the boundary: the game registers native callbacks on a Coherent `View` (JavaScript to native), and UI messages are serialized and delivered back to the view (native to JavaScript). All findings are static.

## JavaScript to native

| Piece | What is established | Evidence |
|---|---|---|
| Registration | `ClientGame::bindToCoherent(View*, int)` (`0x6EF30`) and its `Coherent::UI::MakeHandler<...>` callees build the host-side native callback set for a view. Similar functions: `VenderClientStats::bindToCoherent` (`0x173C60`), `SystemEditorView::bindToCoherent` (`0x184D40`). They register through View slots 37 to 41 (`RegisterForEvent`, `UnregisterFromEvent`, `BindCall`, `UnbindCall`, `UnbindObject`). | Ghidra xref, Callsite |
| Handler objects | Native callbacks derive from `IEventHandler`. They are allocated and freed with the imported `IEventHandler::operator new` and `operator delete`. The generated `EventHandler<...>::Invoke` and `InvokeStub` functions hold the callback bodies. Interface order: slot 0 deleting destructor, slot 1 `Invoke(ArgumentsBinder*)`, slot 2 `GetTarget()`. | Ghidra xref, PDB |
| Reading arguments | Generated invokers call the imported `CoherentReadInternal` for `bool&`, `int&`, `float&` and `double&`. | Ghidra xref |
| Returning values | They call the imported `CoherentBindInternal` for `bool`, `int` and `double`. The decorated names establish only these scalar types, not container or string rules. | PE table, Ghidra xref |
| Lifecycle callbacks | `Panel::OnReadyForBindings` (`0x199ED0`) schedules a separate view-ready action; `OnBindingsReleased` (`0x19A0B0`) unbinds panel state. The ordering between these callbacks and every `bindToCoherent` call is not established. | Ghidra xref |

### Binder read and bind helpers

The imported scalar helpers dispatch through concrete Binder slots (DLL body). Slot numbers refer to the tables in [Views, listeners and vtables](Views%2C%20listeners%20and%20vtables.md#binder-tables).

| Type | Read slot | Bind slot |
|---|---:|---:|
| `bool` | 18 | 10 |
| `int` | 17 | 9 |
| `float` | 13 | 5 |
| `double` | 12 | 4 |

`BinderImpl` is the backing implementation reached from the second pointer of the 16-byte `Binder`. `PA.exe` does not use a separate `BinderImpl` vtable. `ArgumentsBinder` is an 8-byte host-visible polymorphic shell (PDB). Only the 16-byte Binder layout is confirmed as state; internal `BinderImpl` state is not established.

## Native to JavaScript

| Piece | What is established | Evidence |
|---|---|---|
| Message routing | `UIBridge::safeSendUIMessage`, `safePushMessage` and `pushHashedMessage` build and route host messages to a panel. `Panel::allowMessage` applies per-panel gating before queuing. The queued message is encoded with `GetScriptEventWriter(View*)`. | Ghidra xref |
| Direct event path | `Coherent::UI::View::TriggerEvent` also obtains a script-event writer before dispatch. | Ghidra xref |
| Reverse callbacks | `CoherentViewListener::OnJavaScriptMessage` and `OnScriptMessage` are host callbacks for messages originating from the view or runtime. | Ghidra xref |

### `GetScriptEventWriter(View*)`

DLL RVA `0x40FD0` (DLL body). It obtains the view context through View slot 0, reads the implementation pointer at context `+0x08`, obtains the view ID through View slot 42, then selects that view's Binder-backed writer.

`ScriptEventWriterImpl` vtable at `0xD85B0`:

| Slot | Method | RVA |
|---:|---|---|
| 0 | `BeginEvent(char*, uint64)` | `0x40FA0` |
| 1 | `GetBinder() -> Binder*` | `0x40FC0` |
| 2 | `EndEvent()` | `0x40FB0` |

**Serialization order used by the host** (Callsite): writer slot 1 (`GetBinder`), then slot 0 (`BeginEvent`) with the event name and argument count, then Binder serialization of the arguments, then slot 2 (`EndEvent`).

### Callers of the import

IAT `0x588150` has these `PA.exe` xrefs, and at each one RCX is the target `View*`:

| Caller | RVA |
|---|---|
| `safePushMessage` | `0xF9ED0` |
| `pushHashedMessage` | `0xFA060` |
| `safeSendUIMessage` | `0xFC0A0` |
| `panelMessage` | `0xFE590` |
| `panelMessageById` | `0xFEA50` |
| `View::TriggerEvent` | `0xFFD20` |
| `_Do_call` lambda | `0x1039D0` |
| `_Do_call` lambda | `0x103CB0` |
| `Panel::updateFocused` | `0x1979A0` |
| `Panel::updateCurrentUrl` | `0x197D00` |

An earlier decompiler rendering showed the call without arguments; callsite disassembly contradicts it (RCX carries the `View*`).

## Limits

The scalar and event paths above are complete only for what was observed. String, array and map serialization rules, and how `engine.call` names map to native handlers, are not covered by the sources. For the JavaScript side of the same bridge see [Navigating the UI](../Debug/02-Navigating-the-UI/README.md), which describes `engine.call` and `engine.on`.
