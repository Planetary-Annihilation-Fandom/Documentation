# Servo and UI validation

Three different test surfaces exist: standalone page fixtures, a Servo embedding smoke test, and a real-client UI measurement harness. A successful result on one surface does not establish a working replacement for `CoherentUI64.dll`.

## Standalone page fixtures

The harness in `analyze client/19-servo-spike` in pa-research-data serves the installed `media/ui` on loopback. `server.py` rewrites `coui://ui` and `bundle://boot` references in HTML, JS and JSON and assembles the shared bundle from `boot.json`. `engine_stub.js` supplies fixture responses for `engine.call`/`engine.trigger`; `panel_polyfill.js` approximates nested Coherent panels with iframes. It does not implement game-world state, Coherent docking or full input routing.

The examined shared bundle includes jQuery 2.1.4, jQuery UI 1.11.4, Bootstrap 3.0.3, Knockout 3.5.1, Lodash 3.9.3, i18next 1.7.1 and RequireJS. Start, server browser and live-game HUD exercise shared libraries, game-list data and nested panels respectively. The page called “Lobby” in the capture reports is `server_browser.html`, not the in-game lobby page `new_game.html`.

Start the fixture server with `python 'analyze client/19-servo-spike/server.py' --port 8767` from the research checkout root. Browser invocations use `browser_guard.py` and the timeout launcher; see the harness source and [launcher instructions](https://github.com/Planetary-Annihilation-Fandom/pa-research-tools/blob/main/headless-server/README.md) for arguments and desktop selection.

The evidence set `runs/r3-20261106-021011` contains nine completed browser invocations: Edge screenshots, Edge DOM dumps and Servo screenshots for each page. Start and server-browser layouts were visually similar; the synthetic room remained absent in both browsers despite delivery of the fixture beacon. Both HUD screenshots were white. The Edge HUD DOM run reported missing `Build`; Servo panels failed to fetch fixtures and reported missing `i18n_data` and other resources. Incomplete fixtures therefore prevent interpreting the HUD captures as a browser rendering comparison.

The DOM dumps and screenshots came from separate invocations. For example, `$ is not defined` in the Edge Start DOM run is not evidence that the separate screenshot run failed. Engine-call journal counts depend on page/panel timing and are not a compatibility score.

Earlier IPC access-denied (`0x5`) failures were absent in the r3 runs through the current desktop and launcher. This supports the sandbox-token explanation for the earlier failure, but does not establish that every desktop or browser configuration is equivalent. Preserve the screenshots, DOM dumps, console logs, guard logs and `engine-calls.jsonl` when removing duplicate prose reports.

## Servo embedding smoke test

`analyze client/24-servo-pa/Cargo.toml` declares a `cdylib`, `pa_servo_bridge`, with published `servo 0.7.0`, plus a separate `offscreen-smoke` executable. The standalone servoshell used by the page harness is a different build (`0.8.0-fde5631b6`). These are distinct artifacts and integration paths.

`src/lib.rs` contains only a crate-shell comment: building its DLL does not initialize Servo or export the Coherent ABI. The reported 109,568-byte release DLL and successful Cargo log therefore establish a crate build, not an embedded browser or render surface.

The smoke source uses `ServoBuilder`, `SoftwareRenderingContext` and a `WebViewDelegate`. It loads a synthetic 640 × 360 page, spins Servo's event loop, paints and reads an image after a frame notification, checks for orange and light pixels, and saves a PNG with `FRAME_OK`. It returns an error after 45 seconds without a frame. These are source-level checks; the retained attempts establish an executable build and a failed runtime launch, with no successful frame/PNG.

Build the smoke with `cargo build --release --target x86_64-pc-windows-msvc --bin offscreen-smoke` in its crate directory, using the MSVC/SDK environment. Run the resulting executable with an output PNG path through the timeout launcher and allow more than its internal 45-second deadline.

Earlier Windows builds failed in the native `glslopt` dependency with MSVC `D8037` while creating a temporary IL file. The later minimal-environment experiment in `runs/cl-boss-minenv-20261106-par35` isolates a concrete cause: with the same writable TMP/TEMP, compilation fails without `SystemRoot`, succeeds with `SystemRoot=C:\Windows`, and still fails with only `windir`. Its `minenv.py`, `minenv.log` and successful object files supersede the earlier unknown-cause reports. Preserve `SystemRoot` in the build environment; changing TMP or desktop alone did not fix the observed failure.

The subsequent `runs/offscreen-20261106-160900-13/build.log` ends with a successful release build in 29m 32s, and `offscreen-smoke.exe` exists. That run's `smoke.log` records a panic in `glow 0.17.0`: reading `GL_VERSION` failed and the diagnostic asks for an active GL context. This is a runtime/context diagnostic boundary, not evidence that Servo rendered the test page or that the Coherent ABI was implemented. Preserve the build/launch commands and runtime log alongside the minimal compiler reproduction.

## Measuring the real client

The local entry point is `tools/ui-bench/ui_bench.py` in the combined checkout (`ui-bench/` in [pa-research-tools](https://github.com/Planetary-Annihilation-Fandom/pa-research-tools)). It selects a UI DLL in a copied game, drives scenes over CDP, and records per-screen results. The implementation uses a separate test profile and rejects the primary `localstorage` profile and debug port 9999. At the time of this review, that tool directory had not yet been committed; its publication is separate from this reference.

```powershell
python tools/ui-bench/ui_bench.py --scenes main-menu,settings --window 10
python tools/ui-bench/ui_bench.py --overhead 3
```

Frame intervals come from page `requestAnimationFrame`, not compositor presentation or GPU frame time. CPU is the sum of `GetProcessTimes` across the PA process tree, reported both as a percentage of one core and of the whole machine. PresentMon/ETW were not used. Coherent CDP screenshots were unavailable, so this harness does not perform visual comparison.

The Coherent run `20261106-143309-coherent-samplers-on` measured main menu, settings and server browser with median rAF intervals 17.2–17.5 ms and P95 18.2–18.7 ms. Lobby navigation timed out after 240 seconds; HUD was skipped. The hypothesis that `localServerAvailable()` prevents `navToAISkirmish()` remains unverified and must not be reported as the established cause.

The overhead sample had only two successful on-runs and three off-runs; CPU was lower with samplers on (39.1% versus 55.9% of a core). Different conditions, order and small samples prevent using that difference as sampler cost. Repeat matched runs with alternating order before drawing performance conclusions; no Servo-versus-Coherent comparison is established.

For a failed screen inspect `steps.log`, `client.txt` and the client journal, then `run.json`'s error and screen statuses. A launcher return code of 1 alone can result from the harness terminating the client and is not sufficient to classify failure. Keep `frames-*.json`, `cpu.csv`, `run.json` and failed-run diagnostics when they support an unresolved question.

See [Replacing the DLL](Replacing%20the%20DLL.md) for the Coherent ABI contract and [Client renderer architecture](../Client%20internals/Renderer%20architecture.md) for the game-side composition boundary.
