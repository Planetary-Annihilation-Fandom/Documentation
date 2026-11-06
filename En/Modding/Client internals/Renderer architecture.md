# Client renderer architecture

## Renderer boundary

The client has a real renderer backend seam at the `crom::ras::Rasterizer`/`RasterizerImpl` HAL and its resource, state, render-target, shader, and synchronization interfaces. The inspected `OPENGL32` imports are called from `crom::ras` classes; the higher `RasRen` and client paths use renderer/HAL calls. Replacing the backend is therefore plausible without replacing `RasRen`, but it means implementing the complete HAL resource/state/shader family. `GLRasterizer` alone is not a self-contained plug-in boundary.

## Frame and render passes

All addresses are RVAs in `PA.exe` build 14190493.

- `client::ClientGame::updateAndPresent` (`0x6CE00`) updates `ClientInterface`, notifies `UIBridge` of the new frame, updates Coherent, performs deferred panel unloads, configures viewports, then updates Holodeck and view post-state. Its `present` section dispatches parallel work and waits on events; rendering is entered through callbacks/vtables rather than a simple direct call chain.
- `client::ClientGame::setupViewportStack` (`0x6C8F0`) sorts/configures Holodeck viewports and sets rectangles for the system editor, Coherent viewport, and statistics panel. Relevant setup functions include `client::Holodeck::setupViewport` (`0x1561A0`) and `client::UIBridge::setupViewport` (`0xFC4C0`).
- `crom::RasRenSceneViewport::render` (`0x454730`) processes opaque-unlit work and skybox, opaque meshes and particles, the post-solid chain, lighting, the post-lighting chain, non-HDR transparency, the final chain, post-effect transparency, and `RasRenRenderChain::endFrame`.
- Post-solid work is dispatched by `RasRenRenderChain::applyPostSolid` (`0x43F320`). `RasRenSSAOPipeline::apply` (`0x47E250`) performs SAO/SSAO reconstruction, application, blur, and composition through render-chain post quads.
- Lighting is applied by `RasRenLightingEnvironment::applyLighting` (`0x4702F0`); shadow maps update through `RasRenShadowMap::update` (`0x484D00`). `RasRenRenderChain::applyPostLighting` (`0x43F530`) dispatches the HDR stage, including `RasRenHdrPipeline::apply` (`0x47F8E0`) and `composeScene` (`0x480720`).
- `RasRenRenderChain::applyFinal` (`0x43F740`) precedes `endFrame` (`0x43F9C0`). Window presentation is `crom::SDLWindowWrapper::present` (`0x377220`), which calls `SDL_GL_SwapWindow`.

The named render-chain order is visible in `RasRenSceneViewport::render`; the callbacks between `ClientGame::updateAndPresent` and individual viewports prevent treating the whole frame as one synchronous call stack.

## OpenGL boundary and direct callers

The PE imports 29 OpenGL 1.1 entry points from `OPENGL32.dll`. Cross-references to their IAT entries locate these direct callers (RVA 14190493):

- `GLRasterizer`: `clear` (`0x40C340`), `init` (`0x408670`), `enableSRGB` (`0x40C320`), `applyTextureChannel` (`0x40B9A0`), `drawPrimitive` (`0x40C5F0`), `drawIndexedPrimitive` (`0x40C480`), `~GLRasterizer` (`0x4073E0`).
- GL state: `GlHalDepthState::apply` (`0x461BE0`), `GlHalRasterizerState::apply` (`0x461C60`), `GlHalBlendState::apply` (`0x461D60`), `GlHalStencilState::apply` (`0x461E30`).
- `GLTexture`: `bindTexture` (`0x4690C0`), `updateBits` (`0x468940`, `0x468D60`), `applyTextureWrap` (`0x4695F0`), `generateMips` (`0x469540`), scalar destructor (`0x467DB0`). `GLTextureBuffer`: `init` (`0x45E960`), `orphan` (`0x45EE20`), destructor (`0x45E880`); `GLTextureBufferNoMap::init` (`0x45EF30`) and deleting destructor (`0x406910`); `GLTextureBufferCoherentBinding::init` (`0x45F2F0`), `orphan` (`0x45F450`) and deleting destructor (`0x406960`).
- `GLRenderTarget`: `createBuffer` (`0x465FE0`), `downloadTextureData` (`0x466500`), `copy` (`0x466720`, `0x466880`), `prepareAsyncDownload` (`0x466CD0`), `applyViewport` (`0x466C00`).

`crom::ras::GLExtFunctions::GLExtFunctions` (`0x469860`) resolves 88 additional entry-point names through imported `SDL_GL_GetProcAddress`. The resolved set covers shaders/programs and uniforms, buffers and vertex input, texture extensions, framebuffers/renderbuffers, instancing, sync, and debug output. The dynamically resolved groups cover the 88 functions listed in the source GL inventory, `analyze client/gl-string-candidates.txt` in pa-research-data. Decompilation of the functions that invoke the resolved pointer fields identifies these additional callers:

- `GLRasterizer`: `GLPresenter::present` (`0x406CC0`), `setRenderTarget` (`0x407D90`), `init` (`0x408670`), `resize` (`0x40A370`), `createRenderTarget` (`0x40B790`), `applyTextureChannel` (`0x40B9A0`), `drawPrimitive` (`0x40C5F0`), `drawIndexedBatch` (`0x40C6E0`), `drawBatch` (`0x40C890`), `addFence` (`0x40DA50`), `relink` (`0x40DAD0`), `pushDebugGroup` (`0x40DF90`), `popDebugGroup` (`0x40DFC0`).
- `GLTextureBuffer`: destructor (`0x45E880`), `init` (`0x45E960`), `resize` (`0x45EA60`), `map` (`0x45EB10`), `mapRange` (`0x45EBB0`), `unmap` (`0x45EC50`), `orphan` (`0x45EE20`). `GLIndexBuffer`: deleting destructor (`0x4611A0`), `bindBuffer` (`0x461470`). `GLVertexBuffer`: deleting destructor (`0x461570`), `map` (`0x461840`), `mapRange` (`0x4618E0`), `updateRange` (`0x461990`), `unmap` (`0x461A40`), `bindBuffer` (`0x461A90`).
- `GLFence::isReady` (`0x465AD0`). `GLRenderTarget`: `cleanup` (`0x465F70`), `createBuffer` (`0x465FE0`), `copy` (`0x466880`), `applyDrawMask` (`0x466A10`), `prepareAsyncDownload` (`0x466CD0`), `processAsyncDownload` (`0x467820`), `cancelAsyncDownload` (`0x467A20`). `GLTexture::generateMips` (`0x469540`).
- Shader wrappers: `GlShaderBuilder::buildShader` (`0x4651F0`), `GlHalShaderProgram::relink` (`0x462490`), and `apply` (`0x463780`).

There is no `wglGetProcAddress` import or reference. The imported GL calls and resolved-pointer calls are both confined to `crom::ras`; no direct GL import call was found in `RasRen` or client classes.

This is a replaceable HAL contract, not a single-class plug-in: GL-specific buffers, textures, render targets, shader wrappers, and states accompany `GLRasterizer`.

## Shader manifests and hot reload

`crom::RasRen::loadEffects` (`0x3FA340`) reads JSON effect manifests, iterates their `effects`, creates `RasRenEffect` objects, and passes each object to `RasRenEffect::loadFromJson`. A manifest effect has feature flags and named `techniques`; each technique maps to vertex and pixel shader files plus optional raster/blend/depth state. For example, `content.json` maps effects such as `solid` and `pa_unit` to `Default`, `ShadowMap`, and `Prelight` techniques, while `post.json` declares `FXAA`, `HdrCompose`, and `SAO_*` techniques.

`loadRenderSpec` (`0x3B78E0`; short wrapper `0x3B8410`) loads render specifications. `GlShaderBuilder::loadAndPreprocessShaderCode` (`0x464040`) reads shader files under `/shaders/`, expands `#include` directives, and tracks watched dependencies. `buildShader` (`0x4651F0`) compiles prepared code. `fileChanged` (`0x465100`) handles file-change notifications; `GLRasterizer::relink` (`0x40DAD0`) revisits builders/programs, and `GlHalShaderProgram::relink` (`0x462490`) rebuilds the linked GL program and bindings. The JSON files describe effects and shader inputs, not prebuilt GL program handles.

## Coherent UI composition

`CoherentUI::update` (`0x1AE560`) runs during the client frame update. Panels are loaded through `UIBridge::loadPanel` (`0xF0DF0`) and `CoherentUI::loadLocalView` (`0x1AE430`). Coherent surface callbacks are bridged through shared memory: `UIBridge::Panel::CreateSurface` (`0x199820`) calls `CoherentUI::initSharedMemory` (`0x1AEC70`); `Panel::OnDraw` (`0x1994A0`) maps the surface handle and updates canvas presence. `Panel::bindSurface` (`0x19BA30`) creates a `crom::QuadItem`/`crom::Material`, adds it to a `crom::Canvas`, and updates `CanvasScenePresence` (`0x3A3490`). `RasRenUIQuadInstance::setTexture` (`0x47D9A0`) connects the texture to renderer material state.

The observed composition seam is a shared-memory pixel surface consumed as a textured canvas/quad. This does not establish that Coherent and the game share a GL context; Coherent's internal context ownership remains unknown.

## Possible backend replacement

A proposed integration route is a replacement `RasterizerImpl`/HAL backend while retaining `RasRen` and its render chains. The scope includes every backend resource/state/shader class, capability handling, and resource-lifetime behavior—not just `GLRasterizer`. A GL translation layer is a viable prototype to measure the observed 29 imported plus 88 dynamically resolved GL entry points. Coherent UI is a separate shared-memory surface integration to preserve or reimplement.

## Evidence

This is static analysis of the existing Ghidra `client` project for build 14190493. The game was not started, installed files and `bins/` were not changed, and the Ghidra project/service was not started, stopped, imported, or modified. Findings describe analyzed functions and cross-references; runtime context ownership and callback scheduling details remain unverified.

## Client state and input boundaries

The first PDB/PE inventory also identifies `client::ConnectionToServer`, `ConnectionToServerCallbacks`, `MessageHandlers`, `net::SocketMsgPipe`, `MessageReader`, `MessageWriter` and `Lz4MsgPipe`. `uberproto` has encoders/decoders for client/server commands and world-history messages; the client contains army, planet, unit, projectile, order and other history/storage types. These establish transport and stored-history interfaces, but not receive-thread ownership, tick cadence, interpolation or rendered-transform timing.

SDL event, mouse, keyboard and text-input imports coexist with Coherent input types and `s_SDLKey2Coherent`. Their names identify the input boundary; exact focus and event-routing behavior still needs runtime verification. Matching PDB type names between client and server show shared interfaces, not byte-identical implementations or update ownership.

## Reproducing the static inventory

In pa-research-data, `analyze client/export-pdb-symbols.py` uses Windows DbgHelp (`SymEnumSymbolsW` and `SymEnumTypesW`) with the binary's directory as the PDB search path. Run it from the checkout root with Python x64:

```powershell
python 'analyze client/export-pdb-symbols.py' 'bins/14190493/bin_x64/PA.exe' 'analyze client/pa-symbols.tsv' --module PA --types-out 'analyze client/pa-types.tsv'
python 'analyze client/inspect-pe-imports.py'
```

The second script targets `bins/14190493` and exports `pe-imports.tsv` and `gl-string-candidates.txt`. Retain those files, the symbol/type TSVs, shader manifests and Ghidra client database as underlying evidence. The PDB pass alone recovered names and types; the frame/pass/GL call relationships above come from later function-body and callsite analysis.

Shader sources in this build predominantly declare GLSL 1.40. That does not establish the minimum supported GL context: the loader also names newer and extension entry points, whose optional checks and fallback behavior have not been fully established.

See [Coherent UI](../Coherent%20UI/README.md) for view, ABI and surface details and [Servo and UI validation](../Coherent%20UI/Servo%20and%20UI%20validation.md) for the separate rendering experiments.
