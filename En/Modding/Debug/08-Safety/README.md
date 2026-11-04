[Debug index](../README.md)

## 8. Safety summary

| Action | Risk |
| --- | --- |
| Attaching, reading `model`, changing scene | Safe. Note the user's scene and return to it. |
| Chrome/Edge DevTools on a Coherent port | **Kills the Coherent host.** Never. |
| `location.href` in an `atlas://` target | **Client reload loop.** Never. |
| Sync XHR to `spec://`, `api.file.list` of `/ui/` | **Crashed a user's client.** Never. |
| Killing the PID that owns the port | Leaves an unreachable `PA.exe`. Kill `PA.exe` by command line. |
| Testing on the user's default profile | **Off limits.** Use test profiles. |
| `model.navToNewGame()` | New war in IndexedDB, repoints `gw_active_game`. Ask first on a real profile. |
| `move()`, Explore, `win`, `lose`, `fight` | Spends a turn irreversibly. Ask first on a real profile. |
| `model.exitGame()` in `live_game` | Quits PA. |
| Leaving `live_game` via `location.href` | Orphans `server.exe`. Stop it by PID. |
| Toggling mods | Persists; folder mods need a restart; `updateActiveZipMods` rewrites the `ui_mod_list` every profile shares. |
| Writing a test zip into `download/` | CMM restores the release zip on md5 mismatch. Back up and restore. |
| Clients you launched | Close them all when done; leave the user's open. |

---
