# Overview

**Updated 2026-10-03 against PA build 124680.** Observations carry individual verification dates where relevant; undated live checks were made between 2026-08-05 and 2026-09-30. The guide covers client launch and identity, target matching, shell behavior, client cleanup, battles, engine behavior, measuring, and CEF. [§9.2](../09-False-Beliefs/README.md#92-corrections-to-the-2026-08-06-edition-of-this-packet) records corrections to an earlier edition.

## 0. TL;DR

- PA's Coherent UI host speaks **CDP 1.1 on `127.0.0.1:<port>`** only when launched with
  `--coherent_port=<port>` (underscore). It is off by default.
- A raw Node WebSocket doing `Runtime.evaluate` is the whole capability. Use `cdp.js`.
- **Never point Chrome/Edge DevTools or `chrome://inspect` at the port.** The handshake fails and
  has killed the Coherent host (PA keeps running, the port stays dead until a PA restart).
- Every scene exposes its Knockout view model as the global **`model`**. That is the API.
- **Write ES5 in every expression.** It is Chromium 40: `let`, arrow functions, template literals
  and `class` do not parse, and one parse error kills the whole script.
- **Match targets strictly.** `game/start/`, `live_game/live_game.html`, `new_game/new_game.html`.
  Never act in an `atlas://` target: navigating it starts a second scene tree that reloads the
  client every ~5 s.
- **Never send a synchronous XHR to `spec://`** and never `api.file.list` a `/ui/` path over CDP.
  That killed a user's client on 2026-09-16.
- **The user's default profile is off limits for tests.** Use dedicated test profiles (`--localstorageurl`).
- **Close every client you launch** (`model.exit()` on `start`) and leave the user's own clients
  alone. Never kill the PID that owns the debug port: it is the Coherent host, not `PA.exe`.

---
