# Coherent UI in the game client

How the shipping client (`PA.exe` build 14190493, Windows x64) talks to Coherent UI: which processes exist, what the executable imports from `CoherentUI64.dll`, which interfaces cross the boundary, how pixels reach the screen, and how JavaScript and native code exchange messages. The material comes from the research in [pa-research-data issue #20](https://github.com/Planetary-Annihilation-Fandom/pa-research-data/issues/20). It applies to the shipping Coherent build only; the CEF dev builds are covered in [CEF](../Debug/07-CEF/README.md).

## Browser version and compatibility

The shipping Coherent UI runtime reports **Chromium 40.0.2214.28** (`Chrome/40.0.2214.28` in `navigator.userAgent`). This was confirmed in the running Windows client, PA build **124685**, on **2026-11-14**. It describes the embedded UI browser; CEF dev builds can use a different runtime.

Target Chromium 40 when writing UI JavaScript and CSS. Modern-browser previews do not establish compatibility with the game. In particular, flexbox `gap` is unsupported: a two-item flex row with `gap:12px` measured a **0 px** gap in the client. Use a child margin for that spacing. For JavaScript compatibility, see the [Chromium 40 reference](../Review/references/chrome40.md).

To check the runtime of an already running test client, evaluate `navigator.userAgent` through [CDP](../Debug/01-Attaching/README.md), for example from the workspace root:

```powershell
node docs/En/Modding/Debug/cdp.js 9881 game/start/ -e "return navigator.userAgent;"
```

## Start here

| Need to understand | Page |
|---|---|
| Processes, startup call, factory/context lifecycle | [Overview and processes](Overview%20and%20processes.md) |
| The 14 functions `PA.exe` imports from `CoherentUI64.dll` | [Imported API](Imported%20API.md) |
| Host callbacks, View/factory/context vtables, Binder tables | [Views, listeners and vtables](Views%2C%20listeners%20and%20vtables.md) |
| Shared-memory surface to a textured quad | [Surface and frame path](Surface%20and%20frame%20path.md) |
| `engine.call` handlers and native-to-JavaScript events | [JavaScript-native bridge](JavaScript-native%20bridge.md) |
| What an ABI-compatible replacement DLL must provide | [Replacing the DLL](Replacing%20the%20DLL.md) |
| Runtime facts that were not established, and how to check them | [Open questions](Open%20questions.md) |
| Standalone Servo fixtures, embedding smoke and real-client UI measurements | [Servo and UI validation](Servo%20and%20UI%20validation.md) |

## How to read the findings

The ABI, bridge and surface reference pages below report static analysis of the shipping client; no live trace was used for those findings. [Servo and UI validation](Servo%20and%20UI%20validation.md) separately describes fixture/browser runs, embedding build/launch evidence and real-client measurements, with their own verification limits.

| Evidence | Meaning |
|---|---|
| PE table | Read from the PE import directory / IAT of `PA.exe`. |
| PDB | Type sizes, field offsets or symbol names from `PA.pdb` or `CoherentUI64.pdb`. The DLL PDB gives function names but no useful class layouts. |
| RTTI | Run-time type information and vtable labels in the binary. |
| Ghidra xref | A cross-reference or decompilation in a Ghidra project (`client` for `PA.exe`, `current` for `CoherentUI64.dll`). |
| Callsite | Disassembly of a call in `PA.exe` (used to check register and argument use). |
| DLL body | A function body or vtable data inside `CoherentUI64.dll`. |
| Unverified | Not established by the sources. Marked explicitly where it appears. |

Addresses are RVAs unless a page says VA. `PA.exe` VAs use image base `0x140000000`; `CoherentUI64.dll` uses `0x180000000`. They apply to this build only and must be re-derived for another one. Vtable slot numbers count 8-byte entries from the table label.

## Related pages

- [Attaching](../Debug/01-Attaching/README.md) covers `--coherent_port`, the `CoherentUI_Host.exe` path and why the debug port belongs to the host process, not `PA.exe`.
- [Reverse engineering native bindings](../Server%20Scripts/Reverse%20engineering%20native%20bindings.md) shows the same Ghidra plus Frida method on `server.exe`.
