# Servo and UI validation

Current development targets the Servo bridge inside `PA.exe`: obtain a frame, display it in the client, then connect input and the JavaScript/native bridge before validating a real game screen. The standalone fixture project and bulk UI benchmark have been removed; their observations below are background knowledge, not validation of the integration.

## Standalone page fixtures

A previous standalone experiment served the installed `media/ui` on loopback, rewrote `coui://ui` and `bundle://boot` references and supplied synthetic `engine.call`/`engine.trigger` responses. Its iframe approximation of Coherent panels did not implement game-world state, docking or full input routing. The shared bundle included jQuery 2.1.4, jQuery UI 1.11.4, Bootstrap 3.0.3, Knockout 3.5.1, Lodash 3.9.3, i18next 1.7.1 and RequireJS.

Start and server-browser layouts appeared similar in Edge and servoshell, while both HUD screenshots were white. Missing `Build`, `i18n_data` and fixture resources made those HUD captures unsuitable for comparing browser rendering. The page called “Lobby” was the server browser, not the actual in-game lobby; loading such a fixture does not establish a working client integration. The fixture project and its browser guard are no longer maintained.

## Servo embedding smoke test

The bridge project manifest declares a `cdylib`, `pa_servo_bridge`, with published `servo 0.7.0`, plus a separate `offscreen-smoke` executable. The standalone servoshell used by the page harness is a different build (`0.8.0-fde5631b6`). These are distinct artifacts and integration paths.

`src/lib.rs` contains only a crate-shell comment: building its DLL does not initialize Servo or export the Coherent ABI. The reported 109,568-byte release DLL and successful Cargo log therefore establish a crate build, not an embedded browser or render surface.

The smoke source uses `ServoBuilder`, `SoftwareRenderingContext` and a `WebViewDelegate`. It loads a synthetic 640 × 360 page, spins Servo's event loop, paints and reads an image after a frame notification, checks for orange and light pixels, and saves a PNG with `FRAME_OK`. It returns an error after 45 seconds without a frame. These are source-level checks; the retained attempts establish an executable build and a failed runtime launch, with no successful frame/PNG.

Build the smoke with `cargo build --release --target x86_64-pc-windows-msvc --bin offscreen-smoke` in its crate directory, using the MSVC/SDK environment. Run the resulting executable with an output PNG path through the timeout launcher and allow more than its internal 45-second deadline.

Earlier Windows builds failed in the native `glslopt` dependency with MSVC `D8037` while creating a temporary IL file. A later minimal-environment experiment isolated a concrete cause: with the same writable TMP/TEMP, compilation fails without `SystemRoot`, succeeds with `SystemRoot=C:\Windows`, and still fails with only `windir`. This controlled result supersedes the earlier unknown-cause reports. Preserve `SystemRoot` in the build environment; changing TMP or desktop alone did not fix the observed failure.

A subsequent release build completed in 29m 32s. Launching its offscreen smoke executable produced a panic in `glow 0.17.0`: reading `GL_VERSION` failed and the diagnostic asks for an active GL context. This is a runtime/context diagnostic boundary, not evidence that Servo rendered the test page or that the Coherent ABI was implemented. Reproduce the compiler check with a minimal C source and record fresh build/runtime diagnostics only while investigating the relevant failure.

## Measuring the real client

The bulk measurement harness was removed because a working Servo UI integration must come first. The following measurement limits and historical observations remain useful when designing a focused check for a functioning screen.

Frame intervals come from page `requestAnimationFrame`, not compositor presentation or GPU frame time. CPU is the sum of `GetProcessTimes` across the PA process tree, reported both as a percentage of one core and of the whole machine. PresentMon/ETW were not used. Coherent CDP screenshots were unavailable, so this harness does not perform visual comparison.

The sampled Coherent check measured main menu, settings and server browser with median rAF intervals 17.2–17.5 ms and P95 18.2–18.7 ms. Lobby navigation timed out after 240 seconds; HUD was skipped. The hypothesis that `localServerAvailable()` prevents `navToAISkirmish()` remains unverified and must not be reported as the established cause.

The overhead sample had only two successful on-runs and three off-runs; CPU was lower with samplers on (39.1% versus 55.9% of a core). Different conditions, order and small samples prevent using that difference as sampler cost. Repeat matched runs with alternating order before drawing performance conclusions; no Servo-versus-Coherent comparison is established.

For a failed screen, distinguish process startup, CDP readiness and the target scene's state before interpreting timing data. A nonzero launcher code caused by an intentional stop does not by itself establish an application crash.

See [Replacing the DLL](Replacing%20the%20DLL.md) for the Coherent ABI contract and [Client renderer architecture](../Client%20internals/Renderer%20architecture.md) for the game-side composition boundary.
