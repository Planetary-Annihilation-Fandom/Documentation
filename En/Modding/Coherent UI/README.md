# Coherent UI in the game client

How the shipping client (`PA.exe` build 14190493, Windows x64) talks to Coherent UI: which processes exist, what the executable imports from `CoherentUI64.dll`, which interfaces cross the boundary, how pixels reach the screen, and how JavaScript and native code exchange messages. The material comes from the research in [pa-research-data issue #20](https://github.com/Planetary-Annihilation-Fandom/pa-research-data/issues/20). It applies to the shipping Coherent build only; the CEF dev builds are covered in [CEF](../Debug/07-CEF/README.md).

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

## How to read the findings

Every claim carries an evidence type. All findings in this section are static; no live trace of a running client was taken.

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
