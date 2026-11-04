# LAN match and simulation

## Match lifecycle

The regular LAN PvP path uses the server's normal lobby and playing states. The lobby script collects player slots and settings; the landing state turns the finalized configuration into simulation armies and players; the playing state owns the live match handlers. The server's `main.js` changes states and publishes the resulting server state to connected clients.

Useful shipped files:

- `media/server-script/states/lobby.js`
- `media/server-script/states/landing.js`
- `media/server-script/states/playing.js`
- `media/server-script/states/playing_shared.js`

The server executable's help includes `--allow-lan`, `--port`, `--game-mode`, `--headless`, and `--scripturl`. These are launch-time controls; they do not by themselves implement custom gameplay rules.

## Spawn units

The regular playing code has a `spawnUnit` helper that pushes a unit record into `sim.units` and returns the created unit. It resolves the simulation army from `config.army.sim`; the spec, planet, position, and orientation must be valid for the active match.

The equivalent code shape is:

```js
function spawnForMatch(army, spec, planet, position, orientation) {
    sim.units.push({
        army: army.sim,
        spec: spec,
        planet: planet,
        position: position,
        orientation: orientation
    });
}
```

This is a shape copied from the regular server implementation, not a standalone script: a real mode must obtain the correct simulation objects, validate the request, and run the spawn at a valid point in the match lifecycle. The active server/client content must also know the unit spec. The relevant implementation is in `states/playing_shared.js` near `spawnUnit`.

## Economy

The lobby tracks an economy factor per player/army and writes it into the army's `econ_rate`. The playing setup copies that value into the simulation army. This confirms control over the configured income rate for an army.

It does not prove that a script can add an arbitrary one-time amount of metal or energy to an already-running army. No direct stockpile-credit operation was found in the shipped regular-match scripts; see [Unverified capabilities](Unverified%20capabilities.md).

## Designing a LAN PvP game master

A server-authoritative game master can be built from the same regular-match primitives:

1. Keep server-owned match state in the active server state.
2. Accept player requests through registered message handlers.
3. Validate the caller, army, allowed unit specs, and requested action.
4. Change the simulation or match state from server code.
5. Send a result or updated player view through `client.message` or `server.broadcast`.

Do not use a client message as proof that an action is allowed. A player may modify the payload; the server must decide what to spawn or award.
