# Native server architecture

This map describes the Windows PDB build `14190493`. Function and class names come from the server PDB and the existing Ghidra analysis; they are useful navigation anchors, not a complete runtime/threading contract. Build-specific addresses are maintained in the [symbol table](server-symbols.tsv).

## Main loop and simulation

`SDL_main` constructs the game object and enters `crom::Game`. `ServerGame::setup` connects server components; `ServerGame::update` handles the shell's frame work, timers and statistics, while `ServerGame::dispatch` handles events.

`GameServerImpl` owns match/server state and the simulation-thread boundary. `simTickOnce`, `simSync` and `simShutdown` are the tick, synchronization and shutdown anchors. The script-side creation/step path goes through `SimModule::init`, `js_create` and `js_step`. The shell's frame update and the simulation tick are separate responsibilities; their names alone do not establish timing or a lock-free scheduling model.

## Client messages and history transport

`ServerGame::newConnection`, `recvMessage` and `disconnected` form the game-connection boundary. The JSON-message path reaches `ServerModule::message`; `ServerModule::ClientInfo::setup` creates the script-facing client object and callbacks, and `js_client_message` is an outgoing script-message anchor.

The binary transport has a distinct `netutil::UberProtoPipe` layer, with typed sends/receives for `GameClientCommand`, `WorldHistoryMessage`, `ReplayHeader` and `SimModuleReplayData`. `HistoryServer::Connection::pull`, `processHistoryChanges` and `update` identify the history-stream side. Do not infer that every simulation update travels through the JSON handlers exposed to scripts.

## Script modules and callbacks

`ServerScriptEnv` owns the V8 platform, isolate and persistent context. `setModule` builds module objects/contexts; `load`, `js_require` and `fireCallback` are loading and callback anchors. `createTimerEvent` and `createIntervalEvent` connect script timers to the environment; `createGlobalTemplate` supplies globals such as `require`, timers and module exports.

Native module entry points include `ServerModule::init`, `SimModule::init` and `FileModule::init`; `getExports`/`ready` connect module initialization with script loading. This matches the separately observed per-module globals in [Runtime and boundaries](Runtime%20and%20boundaries.md). See [Alternative JavaScript runtime](Alternative%20JavaScript%20runtime.md) for initialization RVAs and the unresolved replacement ABI.

The analyzed constructor initializes ICU, the default platform and V8, creates the array-buffer allocator and isolate, then constructs a context with a microtask queue. Shutdown is anchored by `ServerScriptEnv::~ServerScriptEnv`. The reviewed constructor/strings did not establish `SetFlagsFromString` or `SetFlagsFromCommandLine` use; server switches such as `--headless` and `--scripturl` are not thereby V8 flags. The observed integer argument `3` to `V8::Initialize` has no established meaning in this analysis.

## Virtual filesystem and content

`WindowsFilesystem::mount`, `open`, `listDir`, `resolveAlias` and `resetMounts` identify the filesystem/mount layer. `ServerGame::mountFilePath` and `mountContent` connect content resources; `LoadedRemoteModCollectionImpl::mountToMemoryFilesystem` is a remote-mod memory-mount anchor.

`FileModule::js_load` and `js_loadBlocking` implement the script entry points; `js_mountMemoryFiles` and `js_unmountAllMemoryFiles` connect memory content to the virtual filesystem. For a failed resource load, inspect its virtual path and mount order before changing the script loader. These native filesystem classes do not by themselves grant arbitrary filesystem access to stock scripts.

## Replay and saves

Script entry points include `ServerModule::js_readReplay`, `js_writeReplay`, `js_loadSave`, `js_createSimFromReplay` and `js_setReplayConfig`. The next layer includes `GameServerImpl::readReplay`, `loadReplay`, `writeReplay` and `createSimFromReplay`; file-side anchors are `ServerGame::readReplayFile`, `writeReplayFile` and `loadSave`.

`ReplayHeader`, `SimModuleReplayData` and their `uberproto` encoders/decoders identify saved/transported data structures. The presence of those names is not a specification of the complete file format or a caller-selected URL API.

## Online services

`GameServerImpl::enableBeacon`, `updateBeacon`, `disableBeacon`, `ServerGame::setupUPNP` and the `ServerModuleAdaptor` HTTP completion/failure/abort callbacks are service/transport anchors. No separate `Steam*`/`SteamAPI*` family was found in the reviewed names and strings; that limited negative search neither proves absence of Steam code nor identifies beacon transport as Steam.

## Comparing builds

The current installed build has no neighboring PDB. A transferred name is an analysis result, not an original symbol. The maintained table records `build`, `rva`, `name`, `kind`, `confirmed` and `source`; the meaning of a confidence value differs from runtime confirmation.

The completed Version Tracking export contained 973,677 correlator records but only 21,729 unique accepted exact-function pairs at confidence at least 10.000. Duplicate-instruction matches and `AVAILABLE`/`BLOCKED` records are not confirmed mappings. A selected set of 27 exact-function matches supplied 20 new addresses and seven existing ones; the limited apply completed without errors.

Use a separate project copy when the shared service holds the original project open. Export a completed VT session in a later headless process using an independent host program (`vt-export-host.bin`); opening the source/destination program as the export host can cause domain-object locking. Short DOS paths and an isolated Ghidra profile avoid the observed Unicode-path problems. Consult the maintained Ghidra tool instructions for commands; record confirmed mappings in the symbol table and discard reproducible raw exports after extracting the findings.

Neither an exact-function confidence score nor matching public V8 names establishes semantic equivalence of whole builds or the runtime's exact V8 minor version.
