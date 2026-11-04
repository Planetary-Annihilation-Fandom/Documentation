[Debug index](../README.md)

## 6. Measuring

- **Freeze probe:** a `requestAnimationFrame` chain recording `performance.now()`; a gap is the
  frozen period. A `setInterval(50)` recorder is also safe.
- **Hook a scene load over CDP without editing files** (2026-09-30): navigate from the old scene,
  poll `/json` every 20 ms, attach to the new target and eval the hooks; they land ~240 ms after
  navigation start, before `$(document).ready`. Retry until `$`, `ko`, `requirejs`, `requireGW` and
  `api.file` exist. Wrap `loadMods`, `ko.applyBindings`, `XMLHttpRequest.prototype.open/send`,
  `requirejs.load`, `requirejs.onResourceLoad`, `requireGW`, `api.file.zip.mount`, `engine.call`.
  Coherent keeps no Resource Timing for `coui://`. A sync `coui:` fetch costs ~15 ms even for 1 KB.
  Stubbing through the same hooks measures a fix before it is written.
- An eval sent during a freeze runs only when the freeze ends.
- **Patch diffs:** `C:\Program Files (x86)\Steam\depotcache\` keeps the previous build's manifest
  beside the current one (depots 386074 media, 386071 binaries). Format: magic `0x71F617D0`, length,
  then protobuf `FileMapping { filename=1, size=2, flags=3, sha_content=5 }`. Diff on `sha_content`;
  mtimes overstate a patch badly. Silent hotfixes exist.

---
