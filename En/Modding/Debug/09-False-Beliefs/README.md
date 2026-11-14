[Debug index](../README.md)

## 9. Things that are false

### 9.1 Beliefs that waste time

- **"The scripted Fight hangs, so the mod is broken."** Check the call was
  `model.fight(model, null, false)` ([§3.8](../Galactic%20War/README.md#38-fighting-from-galactic-war)).
- **"An empty `/json` means the scene doesn't exist."** Targets appear only while PA is in them.
- **"A missing `webSocketDebuggerUrl` means broken."** It means busy.
- **"`api.mods` can enable a mod."** It cannot ([§2.4](../02-Navigating-the-UI/README.md#24-mods)).
- **"`reloadFileSystemMods()` mounts a newly enabled mod."** It does not; restart.
- **"I enabled the mod, the change does nothing."** Check `api.mods.getMounted`: the release zip may
  be mounted instead of your `-dev` folder, or Shared Systems may be replacing GWO's generation.
- **"`navToAISkirmish()` silently failed."** On a new profile it showed the tutorial popup ([§1.1](../01-Attaching/README.md#11-launching-pa)).
- **"Memory files are gone after a scene change."** They survive; something called
  `unmountAllMemoryFiles`, a later root zip mount won, or a mounted mod ships that path ([§5.1](../05-Engine-Facts/README.md#51-file-system)).
- **"The DOM says it's visible, so it renders."** Not in root `live_game`, not in every panel.
- **"The final state is right, so the panel did not flicker."** Reading the model or a screenshot
  after the change shows only the end result. A HUD panel is a separate native view: for a few
  frames the parent has not resized it yet and new content is painted clipped to the old size. To
  see that frame, busy-wait the panel page for a few seconds two `requestAnimationFrame`s after the
  change and capture the window during the freeze.
- **"`_.where(list, fn)` filtered the list."** It filtered nothing.
- **"`$.when(api.x())` waited."** It did not.
- **"The file on disk changed but the game still sees the old one."** `spec://` cache, a new file
  needing a restart, or co-op `move()` not reloading code.
- **"Uncaught TypeError: undefined is not a function at :1"** is stock host noise.
- steamdb.info and planetaryannihilation.com return 403 to WebFetch. The official PA forums are
  offline; Steam and GitHub Discussions are fine as a `modinfo.json` `forum` link.

### 9.2 Corrections to the 2026-08-06 edition of this packet

1. It said jQuery-clicking the hidden `Browse Games` button works. It does not (2026-08-07). Use
   `model.navToServerBrowser()`.
2. It filtered server rows by `game_name.indexOf("GWO Co-op")`. `game_name` is undefined on every
   row. Match `region === "Local"`.
3. It said `cheats.jump(model, star)`. The second argument is the star **index**; an object throws.
   It also omitted that `jump` is a no-op for a co-op host.
4. It said `model.move()` reloads the scene. True solo; in co-op it does not reload code.
5. It said toggling mods always needs a restart. Only folder mods do; zip server mods toggle live.
6. Its two-client example put the viewer on the default `localstorage` profile. The viewer profile
   is `gwo_viewer`; the default profile is the user's and off limits.
7. It said PAMM keeps a second enable state. PAMM no longer exists; CMM is the only manager.
8. Its turn-loop summary started with `game.move(starIndex)`, which is `GWGame`'s internal method
   and skips the UI's checks. Drive moves with `model.selection.star(n)`, `model.canMove()`, then
   `model.move()`.
9. It pointed to `pa-navigation-kit`, which no longer exists. `pa-devtools` is at
   `<userdata>\pa-devtools\`.
10. It never mentioned the `model.fight(model, null, false)` requirement, target-matching hazards, the
    `spec://` crash, or that the port's PID is not `PA.exe`. See [§0](../00-Overview/README.md#0-tldr).
