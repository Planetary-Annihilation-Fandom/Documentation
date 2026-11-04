[Debug index](../README.md)

## 3. Galactic War

This chapter collects the Galactic War workflow and the profile changes it can cause. Use a dedicated test profile; do not test on the default profile or alter a war the user has in progress.

GWO = Galactic War Overhaul (`com.pa.quitch.gwaioverhaul`, dev folder `-dev`). GWSM = GW Server Mods.
Many recipes below were verified under GWO and also hold in stock; differences are called out.

### 3.1 Creating a war

PA boots into `start`. **You cannot navigate straight to `gw_play`** without a war.

**Step 1.** From `start`:
`window.location.href = "coui://ui/main/game/galactic_war/gw_start/gw_start.html";`

**Step 2: configure.** `GW` is not global:
`requireGW(["shared/gw_common"], function (GW) { window.__GW = GW; });`

- `model.newGameSizeIndex`: index into `GW.balance.numberOfSystems`, which is
  **`[18, 24, 36, 54, 78]`** in stock and GWO (2026-08-06). The *Bigger Galactic War* mod pushes
  `108, 144, 186, 234`. Read the array; don't assume its length.
- `model.newGameSeed`, `model.newGameName`, `model.newGameHardcore`, `model.mode`,
  `model.newGameCoopPlayers`, `model.newGamePerPlayerTechCards`, `model.newGameSharedByDefault`.
- **Under GWO** the settings live on `model.gwoDifficultySettings` (~50 observables: `ai`,
  `aiAlly`, `techCardDeck`, `factionScaling`, `systemScaling`, `simpleSystems`, `easierStart`,
  `paLore`, `bossCommanders`, `ffaChance`, `personalityTags`, `aiByRace`, `perPlayerRace`, …).
  `difficultyLevel`: `0 Beginner, 1 Casual, 2 Iron, 3 Bronze, 4 Silver, 5 Gold, 6 Platinum,
  7 Diamond, 8 Uber, 9 Custom`. Level 9 enables the custom fields.
- GWO aliases `model.newGameSizeIndex` to `gwoDifficultySettings.galaxySize` (same observable), and
  likewise `newGameHardcore` and `activeStartCardIndex`. **`model.newGameDifficultyIndex` is ignored
  under GWO.**
- **GWO restores the last war's settings on every `gw_start` load** from the `gwo_previous_settings`
  localStorage key (written only on a successful creation). That includes player faction, race,
  loadout, brains, co-op count and **Separate races**. Set every input explicitly, every run.
  - **Custom (9) keeps whatever preset the previous level applied.** For repeatable runs set
    `difficultyLevel(1)`, then `(5)`, then `(9)`, then the custom fields.
  - A scripted shared-race war must set `model.gwoDifficultySettings.perPlayerRace(false)`.
  - Under Separate races an AI never takes a race a player fields.
- Race options: `model.gwoRaceOptions()`. Race mods (Legion, Bugs, Exiles) must be mounted, or a race
  war silently becomes MLA.
- **Shared Systems for GW sources:** `model.selectedNames` is a computed. Toggle the sources:
  `_.forEach(model.systemSources(), function (s) { s.selected(s.name === "<tab>"); });`. With Shared
  Systems installed, GWO's own system generation never runs; a galaxy-generation change then tests as
  a no-op.
- **`gw_start` can take ~8 s to become ready with many mods** (2026-09-30, 35 client mods). Wait for
  Go To War to be enabled (`model.ready()`, and GWO's `enableGoToWar`) rather than a fixed delay.

**Step 3: Go To War.** Call `model.navToNewGame()`. Preconditions: `model.ready()` and
`model.activeStartCard()`; GWO also requires `enableGoToWar`.

> **Stock: a config write resets `ready()`.** The write starts a fresh `makeGame()`; calling
> `navToNewGame()` before `ready()` is true and `makeGameBusy()` false is a silent no-op. Under GWO,
> generation is deferred to the click, so `ready` stays true.

| | what `navToNewGame` does |
| --- | --- |
| **Stock** (`gw_start.js:172`) | Galaxy already built by `makeGame()`. Saves and navigates. `makeGameBusy` false right after. |
| **GWO** (`gw_start/setup.js`) | Builds the galaxy now: seeded RNG, factions, teams, lore, AIs, through a promise chain. Retries up to 5 times on failure. `makeGameBusy` true right after. |

Which is bound: `model.navToNewGame.toString().indexOf("gwoVersion") >= 0`.

**Completion** has no callback. Poll `/json` until a `gw_play.html` target appears. If
`makeGameBusy()` goes false and the URL never changes, generation failed. 18 systems took ~1 s.
A registered GWO loadout id with no card file makes war generation hang.

> **This writes a new war to IndexedDB and repoints `gw_active_game`.** On a profile with a war in
> progress, snapshot `gw_active_game` (and under GWO `gwo_previous_settings`) to a file first and
> restore them after. Ask before doing this on the user's profile. Dedicated test profiles need no
> restore.

**Comparing two war generations (A/B).** Subscribe to `model.newGame` before `navToNewGame()` and
write `g.save()` (minus `id` and `timestamp`) to `localStorage`; it survives the scene change. Two
runs of one seed are **not** byte-identical: planet names are unseeded, and minion/foe key order
varies (`econ_rate` position). Compare sorted keys with planet names blanked. A 36-star Uber war is
~2.6 MB, so two overflow the localStorage quota: pull each to disk and remove it.

**Find a war id by name:** `ko.unwrap(GW.manifest.games)` (each has `id` and `name`).

### 3.2 Re-entering a war, and the `gw_active_game` key

- From `start`, navigating to `gw_play.html` resumes the war named by `gw_active_game`.
- **`gw_active_game` is JSON-quoted** (`"\"365678\""`). A bare number makes `GW.manifest.loadGame`
  return undefined and `gw_play` exits to the menu. Write it with
  `ko.observable().extend({ local: "gw_active_game" })("365678")`.
- A finished war redirects `gw_play` to `gw_war_over`.
- Load a war in memory without switching:
  `GW.manifest.loadGame(id).then(function (game) { ... })`; save with `GW.manifest.saveGame(game)`.

### 3.3 The turn loop

**`turnState` lives on the game:** `model.game().turnState()`. `model.turnState` is undefined.

The state machine (`gw_game.js`):

| Event | turnState |
| --- | --- |
| `move()` | `begin` |
| `explore()` | `explore` |
| `fight()` | `fight` |
| win a fight | `begin` (now explore that star) |
| finish exploring (take a card) | `end` |
| lose a fight | `end` |

`turnState` returns to `begin` only through `move()`, so `end` is a resting state. UI gated on
`begin` is dead from taking a card until the next move.

**You must explore your current star before you can move**: `canMove()` is false while an
unexplored card sits under you.

**Picking a destination.** `canSelect` reaches beyond the neighbour list, so scan every star:

```js
var game = model.game(), best = null;
_.forEach(game.galaxy().stars(), function (s, i) {
  var sel = model.canSelect(i);
  if (i !== game.currentStar() && sel && s.ai() && (!best || sel.length < best.len)) { best = { i: i, len: sel.length }; }
});
return best;
```

- `model.canSelect(i)` returns the **path** as an array, except for the current star (truthy, no
  `.length`). During `explore` it collapses to the current star; read it before exploring or after.
- A star with `system().ai` is an enemy. `ai.treasurePlanet` marks the treasure star.
  `ai().boss` marks a boss.
- `model.galaxy.systems()` (live board) and `game.galaxy().stars()` are different object graphs.
- **`game.stats().turns()` is the only monotonic per-turn counter.** `loseTurn()` rewinds
  `currentStar()` to `previousStar()`.

**Select and move:**

```js
model.selection.star(n);
model.canMove();   // the path, truthy when legal; false for a viewer, while moving, or from === to
model.move();      // lower-case; model.Move does not exist
```

`model.move()` **reloads the solo `gw_play` scene** (window state lost, target id changes). In
co-op `gw_play?gw_campaign=1` it does **not** reload the code ([§2.4](../02-Navigating-the-UI/README.md#24-mods)).

**Explore.** Click the Explore button rather than calling `model.explore()`:

```js
$(".btn_hero.explore").filter(":visible").first().click();
```

Confirm the deal ran: `game.hostTechCardDealCount()` increments and `hostTechCardDealHistory()`
records it. A direct `model.explore()` once showed the host three cards but left the count at 0 and
never dealt the co-op viewer (2026-08-05; the user's stated rule, not an isolated mechanism).

- The Explore button shows only when `model.selection.star()` is the current star, and after a
  cheat jump it is not `:visible` even with `canExplore()` true. Solo, `model.selection.star(cur);
  model.explore();` deals fine. The origin star is never explorable.
- Take a card with `model.win(cardIndex)`.
- **A co-op war with unfilled slots is frozen for the host** (`canMove`, `canExplore`, `canFight` all
  false). For solo driving, create a solo war (`model.newGameCoopPlayers(1)`).
- Setting `model.selection.star` to an unexplored AI star with `noFog` on throws inside stock
  subscribers. Reload the scene and use `cheats.jump`.

### 3.4 Cheats

`model.cheats` exists in stock and GWO regardless of devmode; `--devmode` only shows the
`#test-panel` buttons. Members: `noFog`, `jump`, `testCards`, `giveCardId`, `giveCard`,
`loadGameText`, `loadGame`. **Host only:** `win`/`lose` refuse for a campaign viewer.

- **`noFog`** (`ko.observable`) also widens pathing: it is passed to `galaxy.pathBetween` and lets
  you move to otherwise unreachable stars (still not every star).
- **`jump(model, starIndex)`**: the second argument is the star **index**. An object throws
  `Cannot read property 'coordinates' of undefined` (`gw_play.js:670`). It sets `turnState('begin')`
  and moves. **In a co-op session it is a no-op for the host and is not replicated to viewers.**
- **`giveCard()` takes no argument.** Set `giveCardId` first:
  `model.cheats.giveCardId("gwaio_upgrade_ant"); model.cheats.giveCard();`. Passing the id as an
  argument does nothing and looks like success (verified both forms 2026-08-06). An id not in GWO's
  deck is refused with only a log line; check `_.includes(model.gwoCards, id)` first.
  `gwc_enable_orbital_t1` and `gwc_enable_sea_t1` are not in GWO's deck.
- **`model.gwoCards` is a flat array of id strings** (235 at GWO v6.6.0), not card objects.
- `testCards` gives every card (a ~460-card hand). `giveCard` and `testCards` both re-run the
  AI-star deal. A card given by cheat has no `.one-card` element until the next eval.

**Cheat / Win / Lose are panel buttons, not `cheats` members.** `Cheat` shows when `canFight()` and
calls `fight(model, event, true)`, which sets `fighting()`. Then `Win` → `model.win(-1)`,
`Lose` → `model.lose()`. They report `visible: false` even in devmode, but clicking works.

**Taking one AI star without fighting** (one cycle = one host deal):

```js
model.selection.star(n); model.canMove() && model.move();
// next eval, after the reload:
$(".btn_hero").filter(function () { return $.trim($(this).text()) === "Cheat"; }).click();
// poll model.fighting() until true, then:
model.win(-1);                                              // turnState -> begin, star captured
$(".btn_hero.explore").filter(":visible").first().click();  // the deal
model.win(0);                                               // take a card, turnState -> end
```

Verified step by step 2026-08-06 (stock):

| step | observed |
| --- | --- |
| `canMove()` to a neighbour | path `[16,10]`; after `move()`, `currentStar` 16 → 10, `displayExplore` true |
| click Explore | `turnState` `explore`, 3 cards, `hostTechCardDealCount` 0 → 1, `turns` 1 → 2 |
| `model.win(0)` | `turnState` `end`, card list cleared, star explored, reachable set grew |
| move onto an AI star | `canFight` true, `displayExplore` false |
| click `Cheat` | `fighting()` true, `turnState` `fight` |
| `model.win(-1)` | `fighting()` false, `turnState` `begin`, star's `ai()` false, Explore available |

**Cheat-winning every AI star ends the war** (bosses count) and drops into `gw_war_over`. Skip
`star.ai().boss` when sweeping.

### 3.5 Deals and cards

**Re-running an exploration** (comparing two deals at one star):

```js
var g = model.game(), s = g.galaxy().stars()[g.currentStar()];
s.cardList([]); model.gwoRerollsUsed(0); g.turnState("begin"); model.explore(true);
```

A repeat deal differs unless you reset everything it reads: the star's `cardList()` (the previous
deal is excluded from the next), the whole inventory (`applyCards()` after a `load()` can settle
differently the first time; do a throwaway call first), and the card count (`handIsFull()`). Hold
the inventory still by snapshotting `inventory.save()` and `load()` + `applyCards()` before each run.

**Every `applyCards` pass in `gw_play` runs twice** (stock subscribes `cardsChanged` to the card list
and `maxCards`, and the pass's own `maxCards(0)` reset re-queues it). `done` callbacks see the end of
both passes.

**Card tooltips (GWO):** `model.setHoverCard(ko.dataFor(el), { target: el })` for a `.one-card`
element, then read `model.gwoTechCardTooltip()[0]`; call again to un-hover. After `explore()`, star
card `i` is `model.gwoTechCardTooltip()[i + 1]`. `currentSystemCardList()[i].id` is an observable;
`ko.unwrap` it.

**Testing a card without a file:** evaluate `define("cards/zz_x", [], factory)` and
`requireGW(["cards/zz_x"], ...)` in the same eval; the gw context takes the named define with no
fetch. Then `new GWInventory()`, `inv.cards([{id: "zz_x"}])`, `inv.applyCards(done)` (2026-09-26).

### 3.6 The referee (battle config) without fighting

**Hire the real referee from the console:**

```js
var g = model.game();
requireGW(["pages/gw_play/gw_referee"], function (R) {
  R.hire(g).then(function (r) { window.__ref = { files: _.keys(r.files()).length, config: r.config() }; },
                 function (e) { window.__ref = "REJECT " + e; });
});
return "hiring";
```

- Set `g.currentStar(n)` first to pick the star, and put it back after. An `Object.create(game)`
  wrapper does not work.
- A hire takes 10–60 s with race mods. Poll the window var. Reload the scene between hires (a hire
  unmounts memory files).
- **Files are keyed by tagged path**: `<spec path>.player`, `.ai0`, … The tagged
  `/pa/units/unit_list.json.player` lists tagged paths too, so test a unit with
  `_.has(r.files(), path + ".player")`.
- **Co-op per-player tech** rejects a bare hire ("mismatch between connected players and human
  armies"). Chain stock's co-op referees:
  `requireGW(['pages/gw_play/gw_referee','pages/gw_play/gw_coop_referee','pages/gw_play/gw_per_player_tech_referee'], ...)`,
  then `R.hire(g)` → `COOP.apply(r, o)` → `PPT.apply(r, o)` with
  `o = { active: true, sharedControl: false, perPlayerTechCards: true, connectedClients: _.cloneDeep(model.gwCampaignConnectedClients()) }`.
- Older recipe, GWO's config factory alone: `requireGW(["coui://ui/mods/com.pa.quitch.gwaioverhaul/gw_play/referee_config.js"], function (cfg) { cfg.call(fakeSelf); })`
  with `fakeSelf` providing `game`, `files`, `config` (captures the result) and
  `biomeServed: function () { return []; }`. The module path depends on the GWO version.

### 3.7 Co-op

**Setup order:**

1. **`gw_start`**: host sets `newGameCoopPlayers` and per-player tech. The count scales the war and
   seeds the open slots but is not a ceiling. Per-player tech forces `sharedByDefault` off.
2. **`gw_play`**: host calls `model.openToCoop()` ("Call for Reinforcements!"). That starts a local
   server and returns as `gw_play?gw_campaign=1`. Offered only while `canOpenCoopSession()`;
   `openCoopPromptDismissed(false)` brings a dismissed prompt back.
   **Wait a few seconds in `start` before leaving it.** If `start.js` has not run,
   `use_local_server_multi_threading` is undefined and `openToCoop` dies in `connect_to_game` with
   `localserver.startGame ... expected Boolean, got Null`.
3. **Slots.** The live count is `gwCampaignMaxClients`, capped at **12**. `model.addGwCampaignSlot()`
   adds one. **An open, unfilled slot blocks fighting and exploring** (`gwCampaignFightBlocked`,
   tooltip `Slots are empty`). The slot list is `model.gwCampaignSlots()` (`index`, `empty`,
   `canRemove`, `canKick`). `removeGwCampaignSlot` takes the **slot object**; with no argument it
   does nothing:
   `model.removeGwCampaignSlot(_.find(model.gwCampaignSlots(), function (s) { return s.canRemove; }));`
4. **Viewer identity** (for a profile that is not signed in). `uberId` and `displayName` are
   per-process session vars. Without them the viewer joins as `Player`: the host still creates a
   record, but the viewer's `currentCoopPlayerInventoryData()` never resolves, it cannot answer its
   tech offer, and a pending offer blocks the host's explore and fight for the rest of the war. Set
   them in `server_browser` right before joining (step 5). Set earlier in `start`, `displayName` was
   blanked again before the join (2026-09-23). Use a **new uberId for each test** that needs a fresh
   record.
5. **Join.** In the viewer's `start`: `model.navToServerBrowser()` (a jQuery click on the hidden
   `Browse Games` button does nothing). In `server_browser`, wait for the LAN row (~10 s), then:

   ```js
   var g = _.find(model.allGames(), function (x) { return x.region === "Local"; });
   if (g) {
     ko.observable().extend({ session: "uberId" })("9000000000000001");   // step 4, test profiles only
     ko.observable().extend({ session: "displayName" })("test_viewer");
     model.currentSelectedGame(g); model.tryToJoinGame();
   }
   return !!g;
   ```

   **Match `region === "Local"`, never the name.** The public list holds strangers' servers, and
   `game_name` was undefined on every row (2026-08-07). `model.lanGameList()` is a second check.
6. **GWSM gates the viewer** on the host's client-relevant server zips; enable those on the viewer
   first (no restart needed for zips). GWO itself is gated by version: the server rejects a viewer
   whose GWO `version` differs.
7. **Per-player tech:** the viewer picks a loadout in `gw_coop_per_player_loadout`:
   `model.activeStartCardIndex(i); model.submitLoadout();`. Pick a stock id
   (`_.findIndex(model.startCards(), function (c) { return c.id() === "gwc_start_vehicle"; })`):
   index 0 may be a card mod the viewer lacks, which fails with no visible error. Locked loadouts
   have `id()` null. **A viewer that already has a record never sees this scene again**; join as a
   new identity to retest it. Cheaper: call `model.buildStartingInventory(id, commander, galaxy, star)`
   directly; it returns a promise and does not submit.

**Viewer is read-only for the war** (`canMove`, `win`, `lose`, cheats refuse). Drive from the host.
Viewer offers: a tech offer with `model.submitCoopTechCardChoice(i)` or `model.win(i)`; a loadout
(treasure) offer with `model.win(i)`.

**Host-side records:** `model.gwCampaignConnectedClients()`;
`model.game().findCoopPlayerInventoryData({ id: <clientId>, name: <clientName> })` (matches by id,
then falls back to name); a viewer's pending hand is `record.pendingTechCards.cards`. A viewer can
send host operators with
`model.sendCampaignViewerOperator("<op>", {}, { request_id: _.uniqueId("op_") })`.

**Leaving and kicking:**

- **A viewer leaves through the UI**: `Leave Co-op Session` or `Quit to Main Menu`. Over CDP, click
  the bound element: `document.querySelector('[data-bind*=leaveCoopSession]').click()`. Calling
  `model.leaveCoopSession()` directly tears down the viewer but leaves the host holding a ghost
  client indefinitely. Even the UI leave has left a ghost.
- **The host's Kick button clears a ghost; `model.kickGwCampaignClient(client)` does not.**
- **Bouncing the viewer through `start` blanks `displayName`** (the fake `uberId` survives). Set
  `displayName` to the record's name again and `reloadScene`.
- To play on alone: remove the empty slot, play, and `addGwCampaignSlot()` before the viewer rejoins.
  Catch-up deals replay one at a time (verified 2026-08-06).
- To end a co-op session from both sides: `model.abandon()` on both, then `model.navToGalacticWar()`
  on each; the host resumes solo.

**Two clients share one local server** (2026-09-23). While one client hosts a co-op session, another
client's **solo** Fight joins that session (it lands in the co-op loadout scene) instead of starting
its own battle. Send the other client to `start` first.

**Viewer bootstrap path is unreachable in normal play** (2026-09-30): every stock route into a
viewer's co-op `gw_play` saves the host snapshot first. To force it for a test, set the viewer's
`gw_active_game` to a missing JSON-quoted id and `location.reload()`. Removing the key instead makes
`loadGame` throw and `gw_play` hangs.

### 3.8 Fighting from Galactic War

**Start the battle with `model.fight(model, null, false)`.** Stock declares
`fight = function (model, event, cheat)`; the first parameter shadows the global `model`. With no
argument it is undefined, and a throw inside `referee.mountFiles().always` is swallowed by jQuery
just before the launch. Signature of the hang:

- every referee and GWSM launch line appears, ending around `[GW COOP] personalizedFiles for launch`
  and `Community Mods is reloading after unmountAllMemoryFiles`;
- `model.battleConfig()` is set, `model.launchingFight()` stays true, no error anywhere;
- co-op: no `launch_gw_battle` line in the campaign `server-*.txt`.

Recovery without a restart (co-op host):

```js
var bc = model.battleConfig(), game = model.game();
model.send_message("launch_gw_battle", { current_star: game.currentStar(), gw_campaign_active: true,
  gw_campaign_settings: bc.gw_campaign_settings, shared_control: bc.shared_control,
  per_player_tech_cards: bc.per_player_tech_cards }, function (ok, r) { window.__launch = [ok, r]; });
```

Solo: set `serverType("local")` and `serverSetup("game")`, then navigate to
`connect_to_game.html?` + `$.param({ action: "start", mode: "gw", content: model.game().content(),
local: true, params: JSON.stringify({ local_host_transport: model.getLocalHostTransport() }) })`,
only after `battleConfig()` is set.

**Before you Fight:**

- **With race mods, wait for the race units.** After entering `gw_play`, GWSM remounts the race zips
  a few seconds after `model` is readable. A Fight before that builds race armies from a list with no
  race units (log: `gwoRaces: no legion unit in the unit list read`), and they idle. Poll
  `$.get("coui://pa/units/unit_list.json")` until it lists `/l_` and `bug_` units (2026-09-28).
- With GWSM, `model.fight` returns before `launchingFight()` goes true; that is normal.
- **A war left in `turnState` `fight` launches from any star**, AI or not, and a star with no AI
  makes the referee throw on `ai.foes`. Check the current star's `ai()` first.
- **A Sub Commander test needs a card that grants a vehicle, bot or air factory**
  (`gwc_enable_vehicles_t1`); `gwc_minion` is useless without a land factory.
- No other local client may be hosting a co-op session ([§3.7](README.md#37-co-op)).
- GWO's launch screen stage, `model.gwoLaunchProgress.message()`, says where a hung launch stopped.

**Leaving a battle** (from `live_game/live_game.html`):

- `model.abandon()` surrenders without the dialog (`menuSurrender()` only opens the dialog). It
  resolves in ~8 s; poll `model.gameOver()`.
- **Solo:** `model.navToGalacticWar()` returns to `gw_play`. A surrendered solo battle is a loss and
  rewinds `currentStar`; refighting needs another jump.
- **Co-op:** use `model.menuReturnToWar()` after `gameOver()`. It sends
  `gw_return_to_campaign_restart` and both players return through `gw_campaign_restart_loading` to
  `gw_play?gw_campaign=1`. `navToGalacticWar()` drops the host into a solo `gw_play` and ends the
  session.
- **Never `model.exitGame()`**: it quits PA.

**There is no cheat that wins a live GW battle.** `change_control_flags` and `create_unit` are
handled only when `game_options.sandbox` is true, and GW battles are not sandbox. An idle commander
dies to Beginner AI in about eight minutes. **Fake a win:** surrender, wait for the loss to be saved
(~6 s after `gameOver()`), then rewrite the save:

```js
requireGW(["shared/gw_common"], function (GW) {
  GW.manifest.loadGame(ko.observable().extend({ local: "gw_active_game" })()).then(function (game) {
    game.lastBattleResult("win"); GW.manifest.saveGame(game);
  });
});
// then model.menuReturnToWar() (co-op) or model.navToGalacticWar() (solo)
```

`gw_play` consumes `lastBattleResult` at startup (`startup battleResult=` in the log). On GWO builds
before the last-boss fix (#239), also set `game.gameState("won")` for a final boss.

**War-over badges** (GWO): a war created by a `--devmode` client has `gwaio.cheatsUsed = true` and
records no badge. `gw_war_over` reloads the war from storage on every load. To test badges, delete
`gwaio.cheatsUsed` on the in-memory `model.game()`, then fetch and `eval` GWO's
`gw_war_over/stats.js` over a synchronous **`coui://`** XHR (what PA's own `loadScript` does; never
`spec://`).

---
