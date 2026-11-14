# Surface and frame path

The UI pixel surface crosses the DLL boundary through a shared-memory handle and becomes an ordinary renderer texture on a quad in `PA.exe`. Evidence is static (Ghidra xref on `PA.exe` and the DLL); the callback timing at runtime was not observed.

## Steps

| Step | What happens | Function (RVA) | Evidence |
|---:|---|---|---|
| 1 | Coherent asks the host for a surface through `Panel::CreateSurface(bool, uint width, uint height, SurfaceResponse*)`. The host allocates `width * height * 4` bytes, creates a named Windows file mapping, maps it into the `PA.exe` process and stores `{CoherentHandle, mapping pointer, size}` in a 24-byte `CoherentUI::MappedHandle`. | `Panel::CreateSurface` `0x199820`; `CoherentUI::initSharedMemory` `0x1AEC70` (uses `CreateFileMappingW`, `MapViewOfFile`) | Ghidra xref |
| 2 | The record and requested size go into a host `UIBridge::SurfaceItem`. The host then calls `SurfaceResponse` slot 0 with the new `CoherentHandle`. | `Panel::CreateSurface` | Ghidra xref |
| 3 | In the DLL, `CreateSurfaceContinuation::Signal(CoherentHandle)` (`0x20E90`, vtable `0xD2E28`, one entry) resumes the pending view creation or resize, then deletes itself. | DLL `0x20E90` | DLL body |
| 4 | Coherent calls `Panel::OnDraw(handle, ..., width, height)`. The host finds the matching surface, recreates the texture if dimensions or texture state changed, maps the shared handle for reading and uploads `width * height * 4` bytes. It then selects the active surface. | `Panel::OnDraw` `0x1994A0` | Ghidra xref |
| 5 | `Panel::bindSurface` creates a `crom::QuadItem` and a material using `textured_unlit_transparent_bgra`, adds it to the surface canvas and updates `CanvasScenePresence`. `RasRenUIQuadInstance::setTexture` connects the texture to renderer material state. | `Panel::bindSurface` `0x19BA30`; `setTexture` `0x47D9A0` | Ghidra xref |
| 6 | `ClientGame::updateAndPresent` calls `CoherentUI::update` before the viewport presentation work, and the UI viewport joins the renderer's canvas path. | `0x6CE00`; `CoherentUI::update` `0x1AE560` | Ghidra xref |

The material name `textured_unlit_transparent_bgra` indicates a BGRA pixel layout; the sources do not state the byte order separately.

## Lifetime

- `Panel::DestroySurface` (`0x199C40`) is the destroy callback. `OnDraw` clears the active canvas item when no valid matching surface remains.
- The handle is passed by value to `SurfaceResponse`; no ownership transfer is observed at the response call. The host mapping record stays until `DestroySurface`.
- A replacement therefore has to keep a stable handle identity while a surface is live, and release mappings and textures when the host destroys or replaces the surface. This is an inference from the observed callbacks (Ghidra xref); the DLL-side timing was not observed.
- The exact scheduling of these callbacks relative to the frame's parallel viewport callbacks is not statically resolved. The route pixels, texture, quad is.

## Where the GPU renderer fits

The DLL also loads the in-process renderer `CoherentUI_HostLibrary` and exposes `GetGPUSurface` through it (see [Overview and processes](Overview%20and%20processes.md)). Static evidence does not prove a shared GL or D3D device, or direct rendering into a `PA.exe`-owned texture. The verified route is a pixel surface in shared memory plus an explicit upload in the host. A direct texture hand-over cannot be justified from the observed `SurfaceResponse` contract. See [Open questions](Open%20questions.md).

For the renderer side of the quad, see the wider renderer findings: the game's GL calls are confined to `crom::ras`, and Coherent composition sits above that layer as a separate canvas/quad seam (research files `12-renderer-seam-final.md` and `client-map.md`, static).
