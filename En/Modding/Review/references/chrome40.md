# JavaScript target: Chromium 40

PA's UI is Coherent UI, which embeds **Chromium 40** (V8 ~3.30/4.0, January 2015). Node and
every modern browser accept far more than this, so "it runs in my editor" proves nothing.

## The rule that governs everything

**A syntax error kills the entire file.** Not the statement — the file. PA injects scene
scripts with `document.createElement('script')`, so if the parse fails, every symbol the
file was meant to define is simply absent. This is why unsupported *syntax* is a Blocker
while an unsupported *runtime API* is only a Bug: the API call fails when reached, but the
file up to that point ran.

## Which part of a mod's linter config to trust

Two different things live in GW-AI-Overhaul's `eslint.config.mjs`, and they deserve
opposite treatment.

**Do not infer the target from `ecmaVersion`.** It is set to `6`, which permits `let` and
`const`; GWO ships **zero** of either. The comment there says why it cannot be lowered to
`5` — `for...of` would become an unsuppressible parse error that silently skips every other
rule in the file. It is a parser backstop, not a statement of intent, and following it would
produce broken mods.

**Do trust the `es-x` block.** `eslint-plugin-es-x`'s `flat/restrict-to-es5` is applied to
`ui/**`, forbidding every post-ES5 feature — syntax *and* builtins — and then individual
rules are switched back off for what Chrome 40 actually supports. Each `off` carries the
Chrome release that shipped it, taken from `@mdn/browser-compat-data`, and a rule qualifies
only if that number is ≤ 40. That inversion makes the list exhaustive rather than
as-needed: it covers features the repo does not use, so **no entry means no**. The Permitted
section below mirrors it.

That whitelist is the authority used here, and it is checkable: it caught
`Number.isSafeInteger` being listed in this file as Chrome 41 when it is 34.

## Syntax — Blockers

| Construct | Shipped in Chrome | Use instead |
|---|---|---|
| `let` | 49 (sloppy mode) | `var` |
| arrow `=>` | 45 | `function () {}` |
| template literal `` `x` `` | 41 | string concatenation with `+` |
| `class` | 42 | constructor function + prototype |
| spread / rest `...` | 46 / 47 | `arguments`, `.apply()`, `slice.call()` |
| destructuring | 49 | one `var` per property |
| default parameters | 49 | `if (x === undefined) { x = ...; }` |
| `async` / `await` | 55 | `Promise` chains |

### `let` specifically

`let` is out of reach in PA regardless of which source you take. MDN records sloppy-mode
`let` at Chrome 49; `eslint.config.mjs` notes strict-mode-only `let` at Chrome 41. PA scene
files are classic, non-strict scripts, so either way `let` is a SyntaxError in Chrome 40 and
the whole file is dead.

This is one of the two rules GWO restates as an explicit error
(`es-x/no-block-scoped-variables`) rather than leaving to `restrict-to-es5`, purely to record
the reasoning — and it notes `const` stays excluded on its own merits even if the version
maths ever changed, because Chrome 40's block scoping does not create the per-iteration
binding ES2015 specifies.

## `const` — Area of Concern

`const` *parses* in Chrome 40, but as the **pre-ES6 V8 extension**, not the ES6 keyword:

- it is **function-scoped, not block-scoped**
- it does **not** create a fresh binding per loop iteration
- reassignment **fails silently** rather than throwing

So `const` usually appears to work and then misbehaves inside a loop. It is reported as an
Area of Concern rather than a Blocker because the file still loads.

## Function declarations inside blocks — Area of Concern

The second rule GWO restates as an explicit error, `es-x/no-block-scoped-functions`:

```js
if (window) {
  function makeStorageExtender(storage, onWrite) { ... }   // hoisted out
}
```

ES2015 block scoping for function declarations is **Chrome 49**. Chrome 40 applies legacy
sloppy-mode rules and hoists the declaration to the enclosing *function* scope, fully defined
at function entry. Measured in the running game:

| Snippet | Chrome 40 |
|---|---|
| `if (true) { function k() { return 'in'; } } k()` | `'in'` — visible outside the block |
| `if (false) { function h() {} } typeof h` | `'function'` — the guard does nothing |
| `if (c) { function g(){return 'A'} } else { function g(){return 'B'} } g()` with `c = true` | **`'B'`** |

That last one is the reason this matters: the block neither scopes the declaration nor gates
it, so two branches declaring the same name collapse into one and the **last declaration in
source order wins regardless of which branch runs**.

Reported as an Area of Concern, not a Blocker: it parses and usually behaves, which is what
makes it worth surfacing. Declare it outside the block, or assign a function expression to a
`var` inside it.

The base game does this five times — a `try` block in `community_mods/states/main.js`, an
`if (window)` in `shared/js/ko_utility.js`, an `if (false)` test block in
`shared/js/db_utility.js`, and once each in the vendored Knockout 3.3.0 and 3.5.1 debug
builds. All five are genuine, and GWO's own 304 shipped files contain none, which is what
its ESLint error guarantees.

## Permitted

All of ES5, plus the slice of ES6 V8 had shipped by Chrome 40. This mirrors the `es-x`
whitelist block in GW-AI-Overhaul's `eslint.config.mjs` rule for rule, plus what those rules
imply; the numbers are that file's, sourced from `@mdn/browser-compat-data`. **Nothing
outside this list is available** — the whitelist is exhaustive by construction, not
as-needed.

### Syntax

| Construct | Shipped in Chrome |
|---|---|
| `for...of` | 38 |
| generators `function*` / `yield` | 39 |
| getters/setters in object literals | ES5 |

### Built-ins

| API | Shipped in Chrome |
|---|---|
| `Promise`, `.then`/`.catch`, `Promise.all`/`race`/`resolve`/`reject` | 32 |
| `Map`, `Set`, and their `keys`/`values`/`entries`/`forEach`/`size` | 38 |
| `WeakMap`, `WeakSet` | 36 |
| `Symbol` as a constructor (see near misses re `Symbol.iterator`) | 38 |
| `Symbol.for`, `Symbol.keyFor` | 40 |
| `Object.getOwnPropertySymbols` | 38 |
| `Object.setPrototypeOf` | 34 |
| `Object.is` | 19 |
| `Number.isInteger`, `isSafeInteger`, `parseInt`, `parseFloat`, `EPSILON`, `MAX_SAFE_INTEGER`, `MIN_SAFE_INTEGER` | 34 |
| `Number.isFinite` / `Number.isNaN` | 19 / 25 |
| `Math.trunc`, `sign`, `cbrt`, `clz32`, `expm1`, `fround`, `hypot`, `log1p`, `log2`, `log10`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh` | 38 |
| `Math.imul` | 28 |
| `Array.prototype.keys`, `Array.prototype.entries` | 38 |
| built-in iterators on arrays, strings, `Map`, `Set`, typed arrays | 38 |
| `String.prototype.normalize` | 34 |
| typed arrays (`Int8Array` … `Float64Array`, `ArrayBuffer`, `DataView`) | 7 |

### Near misses — do not generalise from the table above

Chrome 38's iterator work is the trap: it landed in pieces, and the obvious
companions to what shipped did not come with it.

- **`Array.prototype.values` is Chrome 66** — `keys` and `entries` are 38, `values`
  was held back for years over web compatibility. Iterate with an index, or `for...of`
  the array directly. `eslint.config.mjs` calls this one out in a comment of its own,
  for the same reason it is called out here.
- **Only the `Promise` methods that shipped in 32 are available.** `Promise.allSettled`
  (76), `Promise.any` (85) and `.finally()` (63) are not, even though `Promise` is
  whitelisted.
- **`Symbol.iterator` *is* present and usable**, despite MDN dating the property to
  Chrome 43. `typeof Symbol.iterator` answers `"symbol"`, and assigning
  `obj[Symbol.iterator]` a function returning a `next()` object then driving it with
  `for...of` yields the expected values in the running game. Do not repeat the claim,
  previously made here, that hand-written iterables are out of reach. `for...of` over
  arrays and over a `Map` also both work.
- **`Array.prototype.includes` is 47**; `find`/`findIndex`/`fill`/`copyWithin` are 45.
- **`String.prototype.includes`, `.repeat` and `.contains` are absent** — all
  `undefined` in the engine. `startsWith`/`endsWith` are the exception and are worse
  than absent; see their section below.
- **Object-literal extensions are not available**, and this one is measured rather
  than inferred: in the running game `({ x })` is `SyntaxError: Unexpected token }`,
  `({ m() {} })` is `SyntaxError: Unexpected token (`, and `({ [k]: 1 })` is
  `SyntaxError: Unexpected token [`. They have no whitelist entry either, and no
  entry means no. (MDN's data is muddled here — 39, 43 and 47 all appear for
  shorthand across three entries — so ignore it and trust the engine.)
- **Binary and octal literals (`0b1010`, `0o17`) are 41**; `\u{...}` code point
  escapes are 44. Hex literals and `\uXXXX` are ES5 and fine.
- **`Proxy` and `Reflect` are 49.** There is no partial version to fall back on.

## Runtime APIs missing from Chrome 40 — Bugs

Only calls whose receiver is a built-in **namespace** are checked, because those are
unambiguous:

| API | Shipped in Chrome |
|---|---|
| `Object.assign` | 45 |
| `Object.entries`, `Object.values` | 54 |
| `Object.getOwnPropertyDescriptors` | 54 |
| `Object.fromEntries` | 73 |
| `Array.from`, `Array.of` | 45 |
| `String.raw`, `String.fromCodePoint` | 41 |
| `Promise.allSettled` | 76 |
| `Promise.any` | 85 |

`Number.isSafeInteger` used to be in this table at Chrome 41. It is **34**, and
`eslint.config.mjs` whitelists it — the entry was wrong and has been removed.

### `startsWith` and `endsWith` — the one-argument form only

These two are the subtlest case in this file, and the previous account of them here was
wrong. What is actually true, verified over the DevTools protocol against the running game
(`Chrome/40.0.2214.28`):

| Call | Chrome 40 | Correct |
|---|---|---|
| `"foobar".startsWith("foo")` | `true` | `true` |
| `"foobar".endsWith("bar")` | `true` | `true` |
| `"foobar".startsWith("bar", 3)` | **`false`** | `true` |
| `"foobar".endsWith("foo", 3)` | **`false`** | `true` |

**The culprit is PA's own polyfill, not the engine.** Chrome 40 genuinely lacks both — MDN's
Chrome 41 is correct — so the guard in `media/ui/main/shared/js/helpers.js:130-142` passes and
the polyfill installs. It takes a single parameter:

```js
String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
String.prototype.startsWith = function (prefix) {
    return this.substring(0, prefix.length) === prefix;
};
```

A second argument is therefore silently dropped. `"foobar".startsWith("bar", 3)` evaluates
`"foobar".substring(0, 3) === "bar"`, i.e. `"foo" === "bar"`, i.e. `false`.

Confirmed in the running game: `String.prototype.startsWith` is not native code, its `length`
is **1**, and its source is the function above — in the main, atlas and uberbar contexts
alike. That the polyfill installed is itself the proof the natives are absent, since it only
installs `if (typeof String.prototype.startsWith !== 'function')`.

Two consequences worth keeping straight:

- A wrong answer is worse than a missing method: nothing throws, and the bug surfaces as
  logic that quietly takes the wrong branch.
- Because this is a polyfill and not the engine, a mod that ships its own spec-complete
  polyfill *first* would not have the problem — but nothing can be assumed about load order,
  so treat the one-argument form as the only safe form.

The base game uses the one-argument form throughout and it works. GWO's `eslint.config.mjs`
goes further and forbids both methods outright — reasonable for a codebase it controls, but
too broad to report against other people's mods, which is why only the two-argument form is
flagged here.

That helpers.js block contains exactly these two methods and nothing else, so no other
missing API is polyfilled.

`String.prototype.includes`, `.repeat` and the legacy `.contains` spelling are genuinely
absent (all confirmed `undefined` in the same session).

### Prototype methods are deliberately not checked — with one exception

`Array.prototype.find`/`includes`/`fill` and `String.prototype.repeat`/`padStart` genuinely
are absent from Chrome 40, but whether a call is dangerous depends entirely on the
receiver's type, and the names collide with libraries PA ships:

```js
$(content).find('a')          // jQuery, fine
this.$element.find('input')   // jQuery, fine
ctx.fill()                    // canvas, fine
```

Auditing 347 base-game scripts, **all 24 hits were false positives of exactly this kind**. A
check that is wrong 24 times out of 24 on known-good code is worse than no check, so it was
removed rather than tuned. If you need certainty here, check the receiver by hand.

The exception is the two-argument `startsWith`/`endsWith` form above, which is narrow enough
to calibrate clean — and it paid the same toll first: its opening version reported three
hits against the base game, all of them `_.startsWith(...)`/`_.endsWith(...)`. lodash's
versions take `(string, target, position)` and honour `position`, so the `_` receiver is
excluded by name. Base-game hits are now zero, and so are GWO's 304 shipped files.

### `async` and `await` are not reserved words in ES5

The base game uses `async` as an ordinary identifier — `var async = function () {`,
`async : options.getAsync`, `typeof async == "boolean"`. Only real `async function` /
`await <expr>` syntax is a Blocker.

## Libraries PA ships globally

From `media/ui/main/shared/js/thirdparty/`:

- **lodash 3.9.3** as `_` — the safe substitute for most missing APIs
- **Knockout 3.5.1** as `ko`
- **jQuery** as `$`
- **CreateJS** as `createjs`

Pin lodash to **3.9.3** exactly in any dev tooling. A newer lodash in `devDependencies`
will accept calls the shipped version rejects.

## `try`/`catch` is not required

Wrapping a scene script body in `try`/`catch` is **gold plating, not a requirement**. Its
absence is never reported at any severity.

This is called out explicitly because Legion Expansion's own `CLAUDE.md` mandates the idiom
for its own codebase. That is a house style, not a platform rule, and a reviewer treating it
as a rule would flag every mod that omits it.
