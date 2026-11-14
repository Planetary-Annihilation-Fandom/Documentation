# Client messaging and match state

## Server-to-client messages

The server can send JSON-like message objects to one client with `client.message(msg)` or broadcast them to connected clients with `server.broadcast(msg)`. `server_utils.js` implements broadcasts by iterating connected clients and calling `client.message`.

For example, the regular playing state builds a state payload separately for each connected client when it exports `getClientState(client)`. `main.js` includes that result in the `server_state` message both when changing state and when handling a client's `hello` request. This is the relevant pattern for first join and re-synchronization.

## Custom player requests

The server utilities expose `server.setHandlers(handlers)`, which installs or replaces message handlers and returns a cleanup function that restores the previous handlers. The regular playing state registers its handlers on entry and cleans them up when leaving.

An illustrative handler pattern is:

```js
var playerLoadouts = Object.create(null);

function handleChooseLoadout(msg) {
    var player = players[msg.client.id];
    if (!player || !isAllowedLoadout(msg.payload))
        return server.respond(msg).fail('Invalid loadout');

    playerLoadouts[msg.client.id] = sanitizeLoadout(msg.payload);
    msg.client.message({
        message_type: 'loadout_updated',
        payload: playerLoadouts[msg.client.id]
    });
}

var cleanupHandlers = server.setHandlers({
    choose_loadout: handleChooseLoadout
});
```

This is a design sketch, not a drop-in script. `players`, `isAllowedLoadout`, and `sanitizeLoadout` depend on the mode. Register the handler only for the relevant state and call the returned cleanup function on state exit.

## Match state and reconnects

JavaScript objects kept by a state module are server-owned for the lifetime of that server process. A client can be sent a projection of that state from `getClientState(client)`. Keep canonical loadouts, score, round data, and game-master state on the server; send only the view each client needs.

For durable match setup, the landing state serializes a cleaned game configuration using `server.setGameConfig(JSON.stringify(clean_config))`. The corresponding load path reads configuration back. This confirms a game-config/replay route for serializable setup data, but it does not establish arbitrary durable storage for every custom field. See [Unverified capabilities](Unverified%20capabilities.md).

## Suggested loadout flow

1. The client submits a loadout identifier or compact selection through a custom message.
2. The server checks the client is a playing participant and verifies every selected item against server-side rules.
3. The server stores the sanitized result keyed by a stable in-match player or army identifier.
4. The server acknowledges the change and publishes the appropriate update.
5. `getClientState(client)` reconstructs the current per-player view for late join or rejoin.

Avoid trusting a full loadout object echoed back from a client. Prefer an allowed identifier and rebuild the authoritative loadout on the server.
