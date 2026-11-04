"use strict";
// JavaScript completeness, levels 1-3.
//
// PA's UI runs on Coherent UI, which embeds Chromium 40. Node's parser accepts
// far more than that, so "it parses here" proves nothing. Every scan below runs
// on tokenised source (comments/strings/templates/regex masked out).
//
// Severity rationale:
//   syntax Chrome 40 rejects -> Blocker. The file fails to parse, so NOTHING in
//     it runs; this is not a style preference.
//   runtime API Chrome 40 lacks -> Bug. The file runs until the call is reached.
//   runtime API Chrome 40 half-implements -> Bug, and the worse kind: nothing
//     throws, the call just answers wrongly (see HALF_IMPLEMENTED below).
//   `const` -> Area of Concern. Chrome 40's `const` is the legacy V8 extension:
//     function-scoped, not block-scoped, so it does not create a fresh binding
//     per loop iteration. It parses and usually looks fine, which is what makes
//     it worth surfacing.
//   function declaration in a block -> Area of Concern, for the same reason: it
//     parses, then gets hoisted to function scope (see scanBlockScopedFunctions).
//
// The whitelist of what Chrome 40 *does* support is not guesswork: it mirrors the
// `es-x` block in GW-AI-Overhaul's eslint.config.mjs, which sources its Chrome
// numbers from @mdn/browser-compat-data. references/chrome40.md reproduces it.

const vm = require("node:vm");
const { tokenise } = require("./tokenise.js");
const { offsetToLineCol } = require("./util.js");

// Chrome version in which each construct first shipped. Anything above 40 is
// unavailable to PA.
const SYNTAX_RULES = [
  {
    id: "let",
    re: /(^|[^\w.$])let\s+[A-Za-z_$[{]/g,
    offset: 1,
    severity: "BLOCKER",
    title: "`let` is not supported by Chrome 40",
    why:
      "Chrome 40 accepts `let` only in strict mode. PA scene files are classic, non-strict scripts, so this is a SyntaxError and the entire file fails to parse — nothing in it runs.",
    fix: "Use `var`.",
  },
  {
    id: "const",
    re: /(^|[^\w.$])const\s+[A-Za-z_$]/g,
    offset: 1,
    severity: "CONCERN",
    title: "`const` uses legacy function-scoped semantics in Chrome 40",
    why:
      "Chrome 40 implements `const` as the pre-ES6 V8 extension: function-scoped rather than block-scoped, so it does not create a fresh binding per iteration and is unreliable as a loop variable. Reassignment fails silently instead of throwing.",
    fix:
      "Use `var`, and confirm no `const` is declared inside a loop body or relied on for block scoping.",
  },
  {
    id: "arrow",
    re: /=>/g,
    offset: 0,
    severity: "BLOCKER",
    title: "Arrow function is not supported by Chrome 40",
    why:
      "Arrow functions shipped in Chrome 45. In Chrome 40 this is a SyntaxError and the whole file fails to parse.",
    fix: "Use `function () { ... }`, binding `this` via a `self` variable if needed.",
  },
  {
    id: "class",
    re: /(^|[^\w.$])class\s+[A-Za-z_$]/g,
    offset: 1,
    severity: "BLOCKER",
    title: "`class` is not supported by Chrome 40",
    why:
      "Class syntax shipped in Chrome 42. In Chrome 40 this is a SyntaxError and the whole file fails to parse.",
    fix: "Use a constructor function and prototype assignment.",
  },
  {
    id: "spread",
    re: /\.\.\./g,
    offset: 0,
    severity: "BLOCKER",
    title: "Spread/rest syntax is not supported by Chrome 40",
    why:
      "Array spread shipped in Chrome 46 and rest parameters in Chrome 47. In Chrome 40 this is a SyntaxError and the whole file fails to parse.",
    fix:
      "Use `arguments`, `Function.prototype.apply`, or `Array.prototype.slice.call`.",
  },
  {
    // `async` and `await` are NOT reserved words in ES5, and the base game uses
    // `async` as an ordinary identifier — `var async = function () {`,
    // `async : options.getAsync`. Matching the bare word reports six Blockers
    // against shipped, working code. Only the actual syntax counts.
    id: "async",
    re: /(^|[^\w.$])(async\s+function|async\s*\([^)]*\)\s*=>|await\s+[A-Za-z_$([{'"])/g,
    offset: 1,
    severity: "BLOCKER",
    title: "`async`/`await` is not supported by Chrome 40",
    why:
      "Async functions shipped in Chrome 55. In Chrome 40 this is a SyntaxError and the whole file fails to parse.",
    fix: "Use `Promise` chains, which Chrome 40 does support.",
  },
  {
    id: "destructuring",
    re: /(^|[^\w.$])var\s*[[{]/g,
    offset: 1,
    severity: "BLOCKER",
    title: "Destructuring assignment is not supported by Chrome 40",
    why:
      "Destructuring shipped in Chrome 49. In Chrome 40 this is a SyntaxError and the whole file fails to parse.",
    fix: "Assign each property or index to its own `var`.",
  },
];

// Unambiguous static references: the receiver is a built-in, so a hit is real.
const MISSING_STATIC_APIS = [
  ["Object.assign", 45],
  ["Object.entries", 54],
  ["Object.values", 54],
  ["Object.getOwnPropertyDescriptors", 54],
  ["Array.from", 45],
  ["Array.of", 45],
  ["String.raw", 41],
  ["String.fromCodePoint", 41],
  ["Object.fromEntries", 73],
  ["Promise.allSettled", 76],
  ["Promise.any", 85],
];
// Number.isSafeInteger was listed here as Chrome 41 and removed: MDN's
// browser-compat-data puts it at 34, alongside the rest of the ES6 Number
// additions (isInteger, parseInt/parseFloat, EPSILON, MAX/MIN_SAFE_INTEGER).
// GW-AI-Overhaul's eslint.config.mjs whitelists all of them (`es-x/
// no-number-issafeinteger: off // Chrome 34`), which is the authority here.
//
// `Promise` itself is whitelisted at Chrome 32, but only the four methods that
// shipped with it. allSettled (76) and any (85) are ES2020 and are checked above;
// `.finally()` (63) is not, because a bare `.finally(` has an ambiguous receiver -
// see the note on prototype methods below.

// There is deliberately NO GENERAL prototype-method check.
//
// Chrome 40 genuinely lacks Array.prototype.find/includes/fill and
// String.prototype.repeat/padStart. But whether a call is dangerous depends
// entirely on the receiver's type, which cannot be established without full type
// analysis — and the names collide with jQuery and canvas:
//
//   $(content).find('a')          jQuery, fine
//   this.$element.find('input')   jQuery, fine
//   ctx.fill()                    canvas, fine
//
// Auditing the shipped base game, every single one of the 24 hits was a false
// positive of exactly this kind. A check that is wrong 24 times out of 24 on
// known-good code is worse than no check, so it was removed rather than tuned.
//
// The one exception is the two-argument form of startsWith/endsWith, in
// scanHalfImplementedApis below. It earns its place by being narrow: a wrong
// second argument is a wrong *answer* rather than a crash, and the shape is
// specific enough to calibrate clean. It cost one round of exactly the false
// positive described above - `_.startsWith(mode, 'x')` - now excluded by receiver.
//
// The static checks below survive because their receiver is a built-in
// namespace, so a hit is unambiguous. They produced zero findings across 347
// base-game scripts.

function scanSyntax(masked, push) {
  for (const rule of SYNTAX_RULES) {
    rule.re.lastIndex = 0;
    let m = rule.re.exec(masked);
    while (m) {
      const at = m.index + (m[1] ? m[1].length : rule.offset);
      push(rule, at);
      m = rule.re.exec(masked);
    }
  }
}

function scanDefaultParams(masked, push) {
  const re = /function\s*[\w$]*\s*\(([^()]*)\)/g;
  let m = re.exec(masked);
  while (m) {
    const params = m[1];
    // An `=` in a parameter list that is not part of a comparison operator.
    if (/[^=!<>]=[^=]/.test(params)) {
      push(
        {
          id: "default-params",
          severity: "BLOCKER",
          title: "Default parameter value is not supported by Chrome 40",
          why:
            "Default parameters shipped in Chrome 49. In Chrome 40 this is a SyntaxError and the whole file fails to parse.",
          fix:
            "Assign the fallback inside the function body: `if (x === undefined) { x = ...; }`.",
        },
        m.index
      );
    }
    m = re.exec(masked);
  }
}

function scanMissingApis(masked, push) {
  for (const entry of MISSING_STATIC_APIS) {
    const name = entry[0];
    const since = entry[1];
    const re = new RegExp("(^|[^\\w.$])" + name.replace(".", "\\.") + "\\s*\\(", "g");
    let m = re.exec(masked);
    while (m) {
      push(
        {
          id: "missing-api",
          severity: "BUG",
          title: name + "() does not exist in Chrome 40",
          why:
            name +
            " shipped in Chrome " +
            since +
            ". The file parses and runs until this line, then throws a TypeError.",
          fix:
            "Use the lodash 3.9.3 equivalent (PA ships lodash globally as `_`) or hand-roll it.",
        },
        m.index + (m[1] ? m[1].length : 0)
      );
      m = re.exec(masked);
    }
  }

}

// `startsWith`/`endsWith` are half-implemented in PA - and it is PA's own polyfill
// doing it, not the engine. Chrome 40 genuinely lacks both (MDN's Chrome 41 is
// right), so the guard in ui/main/shared/js/helpers.js:130-142 passes and the
// polyfill installs. The polyfill takes ONE parameter:
//
//   String.prototype.startsWith = function (prefix) {
//       return this.substring(0, prefix.length) === prefix;   // ignores position
//   };
//
// so a second argument is silently dropped. Verified over the DevTools protocol
// against the running game (Chrome/40.0.2214.28), in the main, atlas and uberbar
// contexts alike: not native code, `.length` (arity) 1, source matching the above,
// and "foobar".startsWith("bar", 3) / "foobar".endsWith("foo", 3) both false when
// both should be true. GW-AI-Overhaul's eslint.config.mjs forbids the methods
// outright; here only the form that is actually wrong is reported, because the base
// game uses the one-argument form throughout and it works.
const HALF_IMPLEMENTED = ["startsWith", "endsWith"];

/**
 * Number of top-level arguments in the call whose `(` is at `openParen`, or -1 if
 * the parens never balance. Commas inside nested calls, arrays, objects and (by
 * masking) strings do not count.
 */
function argCount(masked, openParen) {
  let depth = 0;
  let args = 0;
  let seenContent = false;
  for (let i = openParen; i < masked.length; i += 1) {
    const c = masked.charAt(i);
    if (c === "(" || c === "[" || c === "{") {
      depth += 1;
    } else if (c === ")" || c === "]" || c === "}") {
      depth -= 1;
      if (depth === 0) {
        return seenContent ? args + 1 : 0;
      }
    } else if (c === "," && depth === 1) {
      args += 1;
    } else if (depth === 1 && !/\s/.test(c)) {
      seenContent = true;
    }
  }
  return -1;
}

// lodash has its own `_.startsWith(string, target, position)` and
// `_.endsWith(string, target, position)`, and they implement `position` properly.
// PA ships lodash globally as `_`, and all three hits this check produced against
// the base game were `_.startsWith`/`_.endsWith` calls - false positives of exactly
// the receiver-type kind described below. The receiver has to be excluded by name.
const LODASH_RECEIVERS = new Set(["_", "lodash"]);

function scanHalfImplementedApis(masked, push) {
  for (const name of HALF_IMPLEMENTED) {
    const re = new RegExp("\\." + name + "\\s*\\(", "g");
    let m = re.exec(masked);
    while (m) {
      const open = masked.indexOf("(", m.index);
      const receiver = trailingWord(tailBefore(masked, m.index));
      if (!LODASH_RECEIVERS.has(receiver) && argCount(masked, open) >= 2) {
        push(
          {
            id: "half-implemented-api",
            severity: "BUG",
            title: name + "() ignores its second argument in Chrome 40",
            why:
              "Chrome 40 lacks String.prototype." +
              name +
              ", so PA's own polyfill in ui/main/shared/js/helpers.js:130-142 installs - and it takes one parameter, so this call's second argument is silently dropped and the result is the wrong boolean. Nothing throws, which is what makes it worse than a missing method. The one-argument form is fine.",
            fix:
              "Use `indexOf`/`lastIndexOf` with an explicit offset, or `slice` the string first.",
          },
          m.index
        );
      }
      m = re.exec(masked);
    }
  }
}

/** Index of the innermost `{` still open before `at`, or -1. */
function enclosingBrace(masked, at) {
  let depth = 0;
  for (let i = at - 1; i >= 0; i -= 1) {
    const c = masked[i];
    if (c === "}") {
      depth += 1;
    } else if (c === "{") {
      if (depth === 0) {
        return i;
      }
      depth -= 1;
    }
  }
  return -1;
}

/** Index of the `(` matching the `)` at `at`, or -1. */
function matchingParen(masked, at) {
  let depth = 0;
  for (let i = at; i >= 0; i -= 1) {
    const c = masked[i];
    if (c === ")") {
      depth += 1;
    } else if (c === "(") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

// A `{` is only treated as a block when the construct in front of it says so.
// Positive identification, not elimination: anything unrecognised (object
// literal, IIFE, `switch` case body, something this misreads) is left alone.
const BLOCK_KEYWORDS = new Set(["else", "do", "try", "finally"]);
const BLOCK_HEAD_KEYWORDS = new Set(["if", "for", "while", "switch", "catch"]);
const WORD_AT_END = /([A-Za-z_$][\w$]*)\s*$/;

// Only ever look this far back. Every construct examined sits immediately in
// front of the brace or paren, so a window keeps this linear on large files
// instead of re-scanning the whole prefix once per declaration.
const LOOKBACK = 400;

/** Right-trimmed source immediately before `end`, capped at LOOKBACK. */
function tailBefore(masked, end) {
  return masked.slice(Math.max(0, end - LOOKBACK), end).replace(/\s+$/, "");
}

/** Index of the last non-whitespace character before `end`, or -1. */
function lastSignificantIndex(masked, end) {
  let i = end - 1;
  while (i >= 0 && /\s/.test(masked.charAt(i))) {
    i -= 1;
  }
  return i;
}

function trailingWord(text) {
  const m = WORD_AT_END.exec(text);
  return m ? m[1] : "";
}

/** `function f(` / `function (` - i.e. the brace after this opens a function body. */
function isFunctionHead(head) {
  const word = trailingWord(head);
  if (word === "function") {
    return true;
  }
  if (!word) {
    return false;
  }
  return trailingWord(head.slice(0, head.length - word.length)) === "function";
}

// `case 1:` and `default:` put the statement after them in declaration
// position. An object-literal `key:` does not - but that only reaches here for
// an object literal, whose `{` is never classified as a block below, so being
// generous costs nothing.
const CASE_LABEL = /(^|[^\w.$])case[^{};:]*$/;

function isSwitchLabel(before) {
  if (before.charAt(before.length - 1) !== ":") {
    return false;
  }
  const body = before.slice(0, -1);
  return trailingWord(body) === "default" || CASE_LABEL.test(body);
}

function isBlockNotFunctionBody(masked, brace) {
  if (BLOCK_KEYWORDS.has(trailingWord(tailBefore(masked, brace)))) {
    return true;
  }
  const closeAt = lastSignificantIndex(masked, brace);
  if (closeAt < 0 || masked.charAt(closeAt) !== ")") {
    return false;
  }
  const open = matchingParen(masked, closeAt);
  if (open < 0) {
    return false;
  }
  const head = tailBefore(masked, open);
  // `function f(...) {` and `function (...) {` are function bodies, which is
  // where declarations are supposed to live.
  if (isFunctionHead(head)) {
    return false;
  }
  return BLOCK_HEAD_KEYWORDS.has(trailingWord(head));
}

/**
 * Function *declarations* inside a block. GW-AI-Overhaul's eslint.config.mjs
 * restates `es-x/no-block-scoped-functions` as an error for this reason: block
 * scoping for function declarations is Chrome 49. Chrome 40 hoists the
 * declaration to the enclosing function scope under legacy sloppy-mode rules, so
 * the scoping written is not the scoping obtained.
 */
function scanBlockScopedFunctions(masked, push) {
  const re = /(^|[^\w.$])function\s+[A-Za-z_$][\w$]*\s*\(/g;
  let m = re.exec(masked);
  while (m) {
    const at = m.index + (m[1] ? m[1].length : 0);
    // Declaration position only. A named function *expression*
    // (`var f = function foo() {}`) is fine anywhere, block or not.
    const before = tailBefore(masked, at);
    const last = before.charAt(before.length - 1);
    const isDeclaration =
      before === "" ||
      last === ";" ||
      last === "}" ||
      last === "{" ||
      BLOCK_KEYWORDS.has(trailingWord(before)) ||
      isSwitchLabel(before);
    if (isDeclaration) {
      const brace = enclosingBrace(masked, at);
      if (brace >= 0 && isBlockNotFunctionBody(masked, brace)) {
        push(
          {
            id: "block-scoped-function",
            severity: "CONCERN",
            title: "Function declaration inside a block is hoisted out by Chrome 40",
            why:
              "ES2015 block scoping for function declarations is Chrome 49. Chrome 40 applies legacy sloppy-mode rules and hoists the declaration to the enclosing function scope, fully defined at function entry. Verified over the DevTools protocol against the running game: `if (false) { function h() {} }` still leaves `typeof h === \"function\"`, and declaring the same name in an if branch and an else branch resolves to whichever comes LAST in the source no matter which branch runs. So the block neither scopes the declaration nor gates it, and two branches silently collapse into one.",
            fix:
              "Declare it outside the block, or assign a function expression to a `var` inside the block.",
          },
          at
        );
      }
    }
    m = re.exec(masked);
  }
}

/** Top-level `var` collisions. PA scene scripts share one global scope. */
function scanTopLevelVars(masked, push) {
  const seen = new Map();
  const re = /(^|[^\w.$])var\s+([A-Za-z_$][\w$]*)/g;
  let m = re.exec(masked);
  while (m) {
    // Only depth 0 matters: that is the shared global scope.
    const upto = masked.slice(0, m.index);
    let depth = 0;
    for (let i = 0; i < upto.length; i += 1) {
      if (upto[i] === "{") {
        depth += 1;
      } else if (upto[i] === "}") {
        depth -= 1;
      }
    }
    if (depth === 0) {
      const name = m[2];
      const line = offsetToLineCol(masked, m.index).line;
      if (seen.has(name)) {
        push(
          {
            id: "duplicate-top-level-var",
            severity: "BUG",
            title: "`" + name + "` is declared twice at file top level",
            why:
              "Declared on line " +
              seen.get(name) +
              " and again here. This is legal JavaScript and the last assignment silently wins. PA loads every scene script into one shared global scope, so a stale earlier declaration can be what other code sees.",
            fix: "Remove the redundant declaration, or rename one of them.",
          },
          m.index
        );
      } else {
        seen.set(name, line);
      }
    }
    m = re.exec(masked);
  }
}

// There is deliberately NO duplicate-object-key check for JavaScript.
//
// Tracking which object literal a key belongs to needs a real parser: counting
// braces conflates *sibling* objects at the same nesting level, so two unrelated
// entries that both have `minions:` read as a duplicate. That is exactly what it
// did to gw_faction_credits_writing.js in the shipped base game.
//
// The equivalent check for JSON data files in json-lint.js is correct — it keeps
// a proper stack of object frames — and that is where duplicate keys actually
// bite in PA, since specs are JSON.

/** Minified bundles have no useful line structure. */
function isMinified(src) {
  const lines = src.split("\n");
  if (lines.length === 0) {
    return false;
  }
  const longest = lines.reduce(function (max, l) {
    return Math.max(max, l.length);
  }, 0);
  return longest > 2000 || (src.length > 20000 && src.length / lines.length > 400);
}

/** Collapse repeated findings of one check into a single entry listing lines. */
function collapse(out, check, summarise) {
  const matching = out.filter(function (f) {
    return f.check === check;
  });
  if (matching.length < 2) {
    return;
  }
  const lines = matching
    .map(function (f) {
      return f.line;
    })
    .filter(function (l) {
      return typeof l === "number";
    });
  const summary = summarise(matching.length, lines);
  const first = matching[0];
  for (let i = out.length - 1; i >= 0; i -= 1) {
    if (out[i].check === check) {
      out.splice(i, 1);
    }
  }
  out.push({
    severity: first.severity,
    check: check,
    title: summary.title,
    line: first.line,
    col: null,
    detail: summary.detail,
    why: first.why,
    fix: first.fix,
  });
}

/**
 * @param {string} src   raw file contents
 * @param {string} relPath  mod-relative path, for reporting
 * @returns {Array<object>} findings, each {severity, check, title, line, col, why, fix, detail}
 */
function checkJs(src, relPath) {
  const out = [];

  // Level 1: does it parse at all? vm.Script gives an exact position.
  try {
    new vm.Script(src, { filename: relPath });
  } catch (err) {
    const line = err.lineNumber || 1;
    out.push({
      severity: "BLOCKER",
      check: "js.parse",
      title: "File is not valid JavaScript",
      line: typeof line === "number" ? line : 1,
      col: null,
      detail: String(err.message),
      why:
        "The file cannot be parsed, so none of it executes. PA injects scene scripts with document.createElement('script'), and a parse failure means every symbol the file was meant to define is absent.",
      fix: "Fix the syntax error at the reported position.",
    });
    // A file that will not parse cannot be meaningfully scanned further.
    return out;
  }

  const t = tokenise(src);
  const masked = t.masked;

  function push(rule, offset) {
    const pos = offsetToLineCol(masked, offset);
    out.push({
      severity: rule.severity,
      check: "js.chrome40." + rule.id,
      title: rule.title,
      line: pos.line,
      col: pos.col,
      detail: null,
      why: rule.why,
      fix: rule.fix,
    });
  }

  scanSyntax(masked, push);
  scanDefaultParams(masked, push);
  scanMissingApis(masked, push);
  scanHalfImplementedApis(masked, push);

  // Scope- and depth-sensitive checks need real line structure. On a minified
  // bundle the whole file is one line, brace-depth tracking stops being
  // meaningful, and the reported line number is useless anyway. Mods routinely
  // ship minified third-party libraries, so these are skipped rather than
  // guessed at.
  if (!isMinified(src)) {
    scanTopLevelVars(masked, push);
    scanBlockScopedFunctions(masked, push);
  }

  // Advisory findings that can legitimately recur many times in one file are
  // collapsed to a single entry listing the lines, so one stylistic choice does
  // not bury the substantive findings.
  collapse(out, "js.chrome40.const", function (n, lines) {
    return {
      title: n + " `const` declarations use legacy function-scoped semantics",
      detail: "Lines " + lines.join(", ") + ".",
    };
  });
  collapse(out, "js.chrome40.missing-proto-api", function (n, lines) {
    return {
      title: n + " calls to methods that may not exist in Chrome 40",
      detail: "Lines " + lines.join(", ") + ".",
    };
  });
  collapse(out, "js.chrome40.block-scoped-function", function (n, lines) {
    return {
      title: n + " function declarations inside blocks are hoisted out by Chrome 40",
      detail: "Lines " + lines.join(", ") + ".",
    };
  });

  // Template literals are recorded by the tokeniser, since they are masked out
  // before the syntax scan runs.
  for (const region of t.regions) {
    if (region.type === "template") {
      const pos = offsetToLineCol(src, region.start);
      out.push({
        severity: "BLOCKER",
        check: "js.chrome40.template-literal",
        title: "Template literal is not supported by Chrome 40",
        line: pos.line,
        col: pos.col,
        detail: null,
        why:
          "Template literals shipped in Chrome 41. In Chrome 40 this is a SyntaxError and the whole file fails to parse.",
        fix: "Use string concatenation with `+`.",
      });
    }
  }

  return out;
}

module.exports = { checkJs, SYNTAX_RULES };
