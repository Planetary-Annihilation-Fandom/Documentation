# Server scripts for LAN PvP

This guide describes the JavaScript runtime started by `server.exe` for a LAN player-versus-player match. It focuses on the regular lobby and playing states. It does not describe Galactic War, server mods, or client-side UI mods.

The installed game build examined for this guide is `1.0.0.0.20261016195339` (`124685`, build ID `20261016195339`). The relevant shipped code is under `media/server-script/` in the game installation.

## Start here

| Need to understand | Page |
|---|---|
| Script runtime, built-in modules, and process boundaries | [Runtime and boundaries](Runtime%20and%20boundaries.md) |
| LAN lobby, simulation, units, and economy | [LAN match and simulation](LAN%20match%20and%20simulation.md) |
| Client messages, per-player state, and match data | [Client messaging and match state](Client%20messaging%20and%20match%20state.md) |
| Objects and functions observed in a running server | [Runtime API surface](Runtime%20API%20surface.md) |
| Running your own probe inside `server.exe` | [Inspecting the server runtime](Inspecting%20the%20server%20runtime.md) |
| Findings that still need a controlled experiment | [Unverified capabilities](Unverified%20capabilities.md) |

## How to read the findings

“Confirmed” means the behavior appears in the installed server scripts or was observed while running the installed server. A code pattern is not necessarily a complete drop-in mod: the server still needs a valid game mode, content, and state lifecycle. Items with no confirmed contract are collected in [Unverified capabilities](Unverified%20capabilities.md).

The main regular-match code paths are:

- `media/server-script/main.js` for state changes and server-state messages.
- `media/server-script/states/lobby.js` for player slots and match settings.
- `media/server-script/states/landing.js` for creating the simulation from the lobby configuration.
- `media/server-script/states/playing.js` and `playing_shared.js` for live match state and unit simulation.

These paths are the basis for the LAN PvP examples below. A server script is code loaded by the game server; a server mod is a content/mod package and has a different loading and distribution role.
