// cdp.js - Chrome DevTools Protocol driver for Planetary Annihilation (Coherent UI, CDP 1.1).
// Node 18+ (global fetch and WebSocket), no dependencies.
//
//   node cdp.js <port> --list                                   list targets ("*" = busy)
//   node cdp.js <port> <match> <file.js>                        evaluate a file once
//   node cdp.js <port> <match> -e "<body>"                      evaluate an inline body once
//   node cdp.js <port> wait <match> (<file.js> | -e "<body>")   re-evaluate until the result is truthy
//   node cdp.js <port> wait-target <match> [--gone]             wait until a free target matches (or none does)
//   node cdp.js <port> input <match> click <x> <y>              real mouse click (panel's own coordinates)
//   node cdp.js <port> input <match> move <x> <y>               real mouse move (hover)
//   node cdp.js <port> input <match> key <name|vk> [--char c]   real key press: =  -  pause  enter  esc  a-z  0-9  or a number
//
// Options (before -e): --timeout <s> (wait 30, wait-target 60), --interval <ms> (default 500).
//
// The script is a FUNCTION BODY: end it with `return <value>;`. Strings come back as-is, anything
// else is JSON.stringify'd in-page, and a throw comes back as "THROW: <stack>". The body runs in
// Chromium 40, so write ES5 there (no let, arrow functions, template literals or class).
// `wait` treats "", "false", "null", "undefined", "0" and THROW results as not yet.
//
// Target matching is deliberately strict:
//   - atlas:// views, main.html and uberbar are skipped unless the match names them, because
//     navigating the icon atlas view starts a second scene tree that reloads the client every ~5 s;
//   - more than one free match is an error, so "live_game" cannot land on a panel and "start"
//     cannot land on gw_start. Use "game/start/", "live_game/live_game.html", "new_game/new_game.html".
//   - there is no match-anything option on purpose.
//
// Exit codes: 0 ok, 2 no CDP on the port, 3 no free/unique target, 4 socket timeout,
// 5 socket error, 6 wait timed out, 64 usage.

"use strict";
const fs = require("fs");

const SPECIAL = ["atlas://", "/main.html", "/uberbar"];
const KEYS = { "=": 187, "-": 189, pause: 19, enter: 13, esc: 27, escape: 27, tab: 9, space: 32, backspace: 8 };

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function fail(code, message) { const e = new Error(message); e.exitCode = code; return e; }

async function listTargets(port) {
  try {
    return await (await fetch("http://127.0.0.1:" + port + "/json")).json();
  } catch (e) {
    throw fail(2, "no CDP on port " + port + " (launched without --coherent_port?): " + e.message);
  }
}

function matching(targets, match) {
  return targets.filter(function (t) {
    const url = t.url || "";
    return url.indexOf(match) >= 0 && SPECIAL.every(function (s) {
      return url.indexOf(s) < 0 || match.indexOf(s.replace(/^\//, "")) >= 0;
    });
  });
}

function describe(targets) {
  return targets.map(function (t) { return (t.webSocketDebuggerUrl ? "  " : "* ") + t.url; }).join("\n");
}

async function resolveTarget(port, match) {
  const targets = await listTargets(port);
  const hits = matching(targets, match);
  const free = hits.filter(function (t) { return t.webSocketDebuggerUrl; });
  if (free.length === 1) return free[0];
  let msg = (free.length ? "ambiguous match \"" : "no free target matching \"") + match + "\":\n" + describe(targets);
  if (!free.length && hits.length) msg += "\n(a match exists but is busy: another client is attached, or the last socket has not released yet - retry in a second)";
  throw fail(3, msg);
}

// Opens one socket, runs fn(send) and closes. send(method, params) resolves with the reply's result.
function session(target, fn) {
  return new Promise(function (resolve, reject) {
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    const pending = {};
    let nextId = 1;
    const timer = setTimeout(function () { ws.close(); reject(fail(4, "timeout (20 s)")); }, 20000);
    function send(method, params) {
      return new Promise(function (res, rej) {
        const id = nextId++;
        pending[id] = { res: res, rej: rej, method: method };
        ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
      });
    }
    ws.onmessage = function (m) {
      const d = JSON.parse(m.data);
      const p = pending[d.id];
      if (!p) return;
      delete pending[d.id];
      if (d.error) p.rej(fail(5, p.method + " failed: " + JSON.stringify(d.error)));
      else p.res(d.result);
    };
    ws.onerror = function (e) { clearTimeout(timer); reject(fail(5, "ws error " + ((e && e.message) || ""))); };
    ws.onopen = function () {
      fn(send).then(function (v) { clearTimeout(timer); ws.close(); resolve(v); },
                    function (e) { clearTimeout(timer); ws.close(); reject(e); });
    };
  });
}

function wrap(body) {
  return "(function(){try{var __r=(function(){" + body + "\n})();" +
    "if(__r===undefined)return \"undefined\";" +
    "return typeof __r===\"string\"?__r:JSON.stringify(__r);}" +
    "catch(e){return \"THROW: \"+(e&&(e.stack||e.message)||e);}})()";
}

async function evaluate(port, match, body) {
  const target = await resolveTarget(port, match);
  return session(target, async function (send) {
    const res = await send("Runtime.evaluate", { expression: wrap(body), returnByValue: true });
    if (res.exceptionDetails) return "THROW: " + JSON.stringify(res.exceptionDetails);
    const r = res.result;
    if (!r || r.type === "undefined") return "undefined";
    return r.value !== undefined ? String(r.value) : JSON.stringify(r);
  });
}

function truthy(v) {
  return ["", "false", "null", "undefined", "0"].indexOf(v) < 0 && v.indexOf("THROW: ") !== 0;
}

async function waitFor(port, match, body, timeoutS, intervalMs) {
  const deadline = Date.now() + timeoutS * 1000;
  let last = "(never evaluated)";
  for (;;) {
    try {
      last = await evaluate(port, match, body);
      if (truthy(last)) return last;
    } catch (e) {
      last = e.message;
    }
    if (Date.now() > deadline) throw fail(6, "wait timed out after " + timeoutS + " s; last result: " + last);
    await sleep(intervalMs);
  }
}

async function waitTarget(port, match, gone, timeoutS, intervalMs) {
  const deadline = Date.now() + timeoutS * 1000;
  for (;;) {
    let hits = null;
    try { hits = matching(await listTargets(port), match); } catch (e) { hits = null; }
    if (hits) {
      const free = hits.filter(function (t) { return t.webSocketDebuggerUrl; });
      if (!gone && free.length) return free.map(function (t) { return t.url; }).join("\n");
      if (gone && !hits.length) return "gone";
    }
    if (Date.now() > deadline) throw fail(6, "wait-target timed out after " + timeoutS + " s");
    await sleep(intervalMs);
  }
}

async function input(port, match, action, a, b, charOpt) {
  const target = await resolveTarget(port, match);
  return session(target, async function (send) {
    if (action === "click" || action === "move") {
      const x = Number(a), y = Number(b);
      if (isNaN(x) || isNaN(y)) throw fail(64, action + " needs <x> <y>");
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x, y: y });
      if (action === "click") {
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x: x, y: y, button: "left", clickCount: 1 });
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x, y: y, button: "left", clickCount: 1 });
      }
      return action + " " + x + "," + y;
    }
    if (action === "key") {
      if (a === undefined) throw fail(64, "key needs a name or virtual key code");
      const name = String(a).toLowerCase();
      let vk = KEYS[name], ch = charOpt;
      if (vk === undefined && /^[a-z0-9]$/.test(name)) { vk = name.toUpperCase().charCodeAt(0); if (ch === undefined) ch = name; }
      if (vk === undefined && /^\d+$/.test(name)) vk = Number(name);
      if (vk === undefined) throw fail(64, "unknown key " + a);
      if (ch === undefined && (name === "=" || name === "-")) ch = name;
      if (ch === undefined && name === "enter") ch = "\r";
      if (ch === undefined && name === "space") ch = " ";
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      if (ch !== undefined) await send("Input.dispatchKeyEvent", { type: "char", text: ch, unmodifiedText: ch, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await send("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      return "key " + a + " (vk " + vk + (ch !== undefined ? ", char " + JSON.stringify(ch) : "") + ")";
    }
    throw fail(64, "unknown input action " + action + " (click, move, key)");
  });
}

function parse(argv) {
  const opts = { timeout: null, interval: 500, gone: false, char: undefined };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-e") { opts.body = argv.slice(i + 1).join(" "); break; }
    if (a === "--timeout") opts.timeout = Number(argv[++i]);
    else if (a === "--interval") opts.interval = Number(argv[++i]);
    else if (a === "--gone") opts.gone = true;
    else if (a === "--char") opts.char = argv[++i];
    else pos.push(a);
  }
  return { pos: pos, opts: opts };
}

function bodyFrom(file, opts) {
  if (opts.body !== undefined) return opts.body;
  if (file) return fs.readFileSync(file, "utf8");
  throw fail(64, "missing <file.js> or -e \"<body>\"");
}

async function main() {
  const p = parse(process.argv.slice(2));
  const port = p.pos[0], cmd = p.pos[1];
  if (!port || !cmd) throw fail(64, "usage: see the header of cdp.js");
  if (cmd === "--list") return describe(await listTargets(port));
  if (cmd === "wait") return waitFor(port, p.pos[2], bodyFrom(p.pos[3], p.opts), p.opts.timeout || 30, p.opts.interval);
  if (cmd === "wait-target") return waitTarget(port, p.pos[2], p.opts.gone, p.opts.timeout || 60, p.opts.interval);
  if (cmd === "input") return input(port, p.pos[2], p.pos[3], p.pos[4], p.pos[5], p.opts.char);
  return evaluate(port, cmd, bodyFrom(p.pos[2], p.opts));
}

module.exports = { listTargets: listTargets, matching: matching, resolveTarget: resolveTarget, evaluate: evaluate,
  waitFor: waitFor, waitTarget: waitTarget, input: input, sleep: sleep };

if (require.main === module) {
  main().then(function (out) { if (out !== undefined) console.log(out); process.exit(0); },
              function (e) { console.error(e.message); process.exit(e.exitCode || 1); });
}
