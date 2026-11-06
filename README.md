# @lp-labs/properties-codec

Java Reader-style properties subset with escaped keys, Unicode escapes, continuation and duplicate policies.

Standalone original implementation; zero runtime, peer, or sibling-package dependencies. Node.js 18+, ESM and CommonJS with separate declaration trees. No browser globals are accessed at import time; compiled runtime uses only standard JavaScript APIs.

## Install

```sh
npm install @lp-labs/properties-codec
```

## Quick start

```js
import { parseProperties, stringifyProperties } from '@lp-labs/properties-codec';
const entries = new Map([
  ['app name', 'Café'],
  ['__proto__', 'safe'],
]);
const source = stringifyProperties(entries);
console.log(source, parseProperties(source).get('app name'));
```

CommonJS exposes the same named exports:

```cjs
const api = require('@lp-labs/properties-codec');
```

## Customization

```js
import { parseProperties } from '@lp-labs/properties-codec';
console.log(
  parseProperties('key=first\nkey=second', { duplicate: 'first', maxEntries: 10, maxInput: 200 }),
);
```

## Semantics, limits and errors

`parseProperties` implements a Java Reader-style text subset: CRLF/LF/CR physical lines; leading space/tab/formfeed trimming; #/! comments at a new logical line; unescaped =, :, or whitespace key/value separators; odd trailing-backslash continuation with leading whitespace skipped on continuation lines. Escaped spaces/separators belong to the key. Empty keys and values are valid. A continuation line starting #/! remains data; comment lines cannot continue.

Supported escapes: backslash-t/n/r/f, backslash-backslash and exact backslash-u plus four hexadecimal UTF-16 units. Surrogate pairs can be represented as two u escapes. As in Java properties, a backslash before other characters is discarded, not treated as an unknown-escape error. Malformed Unicode escapes throw SyntaxError. A dangling final continuation with no following physical line throws SyntaxError (a deliberate strict subset difference); an explicit empty trailing line can complete it.

The result is a fresh Map, so **proto**, constructor and empty keys are safe. `duplicate` is `last` by default; `first` retains the first value, `error` throws SyntaxError. Every encountered entry counts toward the limit, including duplicates. Defaults: `maxInput=1000000` UTF-16 units, `maxEntries=10000`, positive safe integers. Raw unsupported C0 controls and DEL throw TypeError; escaped controls are valid values.

`stringifyProperties` takes a Map/ReadonlyMap backed by a real Map. It preserves iteration order, emits key=value followed by LF, escapes key spaces and leading value spaces, punctuation/separators/backslashes, and **every non-ASCII UTF-16 unit** as lowercase uXXXX. This provides ASCII output without assuming an input/output byte charset. It does not emit comments or physical continuations; parser semantics are preserved, not source formatting. Options' duplicate policy is validated but unnecessary for unique Map keys.

TypeError covers wrong types, raw controls and oversized inputs/individual key/value strings. RangeError covers invalid limits, excess entries and encoded output exceeding maxInput. No interpolation, Java XML properties, bytes/ISO-8859-1 decoder, filesystem loading, or full Java API compatibility is claimed. O(n + output) work/storage; no input/output Map is retained.

## Complete public declaration API

The following is the complete public ESM declaration surface; CommonJS has matching declarations and runtime exports. Optional properties are omitted rather than supplied as undefined under exactOptionalPropertyTypes.

```ts
export interface PropertiesOptions {
  duplicate?: 'first' | 'last' | 'error';
  maxInput?: number;
  maxEntries?: number;
}
/** Java Reader-style .properties subset; no byte charset or interpolation. */
export declare function parseProperties(
  text: string,
  options?: PropertiesOptions,
): Map<string, string>;
export declare function stringifyProperties(
  entries: ReadonlyMap<string, string>,
  options?: PropertiesOptions,
): string;
```

## Development and verification

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
npm run build
npm run typecheck
npm test
npm run format:check
```

The offline command requires the dev tools already present in npm's cache. TypeScript ^5.9.3 and Prettier ^3.6.2 are dev-only. Build targets ES2022 with strict NodeNext declarations, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noUnused checks, ES2022/DOM libs and no ambient type packages. Runtime tests import the ESM distribution directly and check CommonJS parity. Bare-package .mts/.cts consumer tests include negative type assertions. Published files are only dist, this README, LICENSE and package.json. No publication is performed by tests.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
