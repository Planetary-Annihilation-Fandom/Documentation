# Debugging Planetary Annihilation: TITANS over CDP

This guide covers CDP debugging, UI navigation, Galactic War, battles, engine behavior, performance measurement, and client safety. Findings were verified on PA build 124680 unless a section gives another build or date.

Run the companion scripts from this directory: [`cdp.js`](cdp.js) evaluates expressions and sends input to a client; [`pa.js`](pa.js) starts, lists, and closes test clients. Both require Node.js 18 or newer.

## Chapters

| Chapter | Documentation |
|---|---|
| 0. Overview | [Overview](00-Overview/README.md) |
| 1. Attaching | [Attaching](01-Attaching/README.md) |
| 2. Navigating the UI | [Navigating the UI](02-Navigating-the-UI/README.md) |
| 3. Galactic War | [Galactic War](Galactic%20War/README.md) |
| 4. Battles and skirmishes | [Battles and skirmishes](04-Battles-and-Skirmishes/README.md) |
| 5. Engine facts | [Engine facts for code written against PA](05-Engine-Facts/README.md) |
| 6. Measuring | [Measuring](06-Measuring/README.md) |
| 7. CEF | [CEF (dev builds only)](07-CEF/README.md) |
| 8. Safety | [Safety summary](08-Safety/README.md) |
| 9. False beliefs | [Things that are false](09-False-Beliefs/README.md) |

Run `node pa.js start <profile> <port> --devmode` only with a dedicated test profile. The safety chapter lists actions that can change profile data or close a client.
