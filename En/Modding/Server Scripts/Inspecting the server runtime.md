# Inspecting the server runtime

This guide shows how to run your own code inside a local `server.exe` and list what the engine exposes to server scripts. The results for build `20261016195339` are in [Runtime API surface](Runtime%20API%20surface.md). The complete dump scripts and raw dumps are attached to [issue #24](https://github.com/Planetary-Annihilation-Fandom/Documentation/issues/24).

Use a disposable output directory. The game installation is not modified.

## 1. Load your own scripts with `--scripturl`

`--scripturl` mounts a local directory over `/server-script/`. A file in that directory replaces the shipped file with the same name; every other shipped module still loads. The server log confirms the mount:

```text
INFO Mounting C:\pa-probe\script\ as /server-script/
```

Pass a plain directory path, for example `C:\pa-probe\script\`. Backslashes, forward slashes, spaces and non-ASCII characters all work. A `file:///` URL is rejected with `WARN Failed mounting ...`.

A minimal probe replaces `main.js`, logs something and exits:

```js
// C:\pa-probe\script\main.js
var console = require('console');
console.log('PROBE|server keys: ' + Object.getOwnPropertyNames(server).sort().join(' '));
setTimeout(function () { require('server').exit(); }, 500);
```

```bash
cd "<game>/bin_x64"
./server.exe --headless --no-players --disable-replays --port 20557 --output-dir "C:\pa-probe\out" --scripturl "C:\pa-probe\script\\"
```

`console.log` output goes to stdout and to the log file in `--output-dir`. Prefix your lines so they are easy to filter out of the engine's own messages.

## 2. Choose the server state

Replacing `main.js` stops the server before the lobby exists, so only the objects present at startup are visible. To inspect a live match, keep the shipped `main.js` and add your code after it:

1. Copy the shipped `media/server-script/main.js` into your script directory (do not commit or publish the copy).
2. Append `require('my_hook');` and put `my_hook.js` next to it.
3. Start the server with `--state benchmark`. This state builds a system from `benchmark_config.js` and runs an AI-only match without players.

The hook can wait for the match to populate before it inspects anything:

```js
// my_hook.js
var timer = setInterval(function () {
    if (sim.units.length < 5) return;
    clearInterval(timer);
    console.log('PROBE|first unit: ' + Object.getOwnPropertyNames(sim.units[0]).join(' '));
    server.exit();
}, 1000);
```

Planet generation takes about a minute before the match starts. No client is connected in this mode, so `sim.players` and `server.clients` stay empty.

## 3. Walk objects safely

Use `Object.getOwnPropertyNames` rather than `Object.keys` or `for...in`: it also returns non-enumerable members. Read each property inside `try`/`catch`, keep a list of visited objects to avoid cycles, and limit depth.

Some reads kill the process outright, and `try`/`catch` cannot catch that:

| Operation | Result |
|---|---|
| Reading `sim.initDropletTest` | `server.exe` exits |
| Reading `sim.navDebugEnabled` | `server.exe` exits |
| `Object.prototype.toString.call(env)` | `server.exe` exits |

Because of the last one, do not describe values with `Object.prototype.toString` or with library helpers built on it (many type checks in lodash are). Use `typeof`, `Array.isArray` and `length` instead.

When the process dies, the last line in the log shows how far the walk got. Log the path before each read (`TRY sim.foo`) so the last line names the property that killed it, add that path to a skip list and run again. The log is not truncated on a crash: lines written before the read are always present.

## 4. Know what the walk cannot see

- **Engine collections hide their elements.** `sim.units`, `sim.armies`, `sim.planets` and `server.clients` report `length` but list no indexed properties. Read `collection[0]` explicitly.
- **Some objects hide everything.** `env` lists no own properties, yet `env[0]` and `env.length` work. Other engine objects may also serve members that never appear in a listing, so a walk gives a lower bound.
- **Function text is useless.** `Function.prototype.toString` returns `[native code]` for every function, including your own, and native functions report `length` 0. A walk cannot tell native from script functions or recover signatures.
- **Modules share one global object.** `main.js` runs in one context; modules loaded with `require` run in a second context whose global object is shared by all of them. A top-level `var` in your module leaks into that shared global. Wrap module code in a function.
- **`require` does not throw on unknown names.** It returns `undefined`, so test the result rather than catching an error.

## 5. Record the result

Write down the build ID from the log (`Loaded buildID ...`), the state you inspected and the exact command line. Engine objects change between builds, so a dump is only valid for the build it was taken from.
