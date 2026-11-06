[Debug index](../README.md)

## 7. CEF (dev builds only)

PA is moving from Coherent UI to CEF. Verified on a v149 dev build by user relay (2026-08-12); not
re-verified on later builds, and none of this applies to the shipping Coherent build.

- `--coherent_port=9999` becomes **`--webview-port 9999`**. Dev builds also take `--ui-backend=cef`
  (the shipping build rejects it).
- CDP protocol 1.3; `returnByValue` works. Keep the in-page wrapper anyway.
- **Full DevTools and `chrome://inspect` are safe on CEF.**
- Icon-atlas views are separate drivable targets. Modern JS evaluates.
- Unchanged: match targets by URL; one client per target; `api.*` stays promise-based; scene
  navigation by `coui://` URL and the start → gw_start → gw_play flow work.
- Re-check `Page.captureScreenshot` on CEF before assuming it fails.
- See also: [Coherent UI in the game client](../../Coherent%20UI/README.md) for the shipping Coherent host boundary.

---
