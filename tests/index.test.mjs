import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { parseProperties, stringifyProperties } from '../dist/esm/index.js';
test('comments whitespace separators safe empty and escaped keys', () => {
  const parsed = parseProperties(
    '# comment\\\n! second\n a\\ b\\:c = value\n__proto__:safe\n=empty\nalone',
  );
  assert.deepEqual(
    [...parsed],
    [
      ['a b:c', 'value'],
      ['__proto__', 'safe'],
      ['', 'empty'],
      ['alone', ''],
    ],
  );
});
test('real Java escapes unicode and unknown escapes', () => {
  assert.equal(parseProperties('x=\\u0041\\t\\n\\r\\f\\\\\\z').get('x'), 'A\t\n\r\f\\z');
  assert.equal(parseProperties('x=\\uD83D\\uDE00').get('x'), '😀');
  for (const value of ['x=\\u123', 'x=\\uZZZZ', 'x=abc\\'])
    assert.throws(() => parseProperties(value), SyntaxError);
});
test('odd continuation parity indentation and comment-looking continued text', () => {
  assert.equal(parseProperties('x=ab\\\n  cd\\\r\n\t#ef').get('x'), 'abcd#ef');
  assert.equal(parseProperties('x=ab\\\\\ny=z').get('x'), 'ab\\');
  assert.equal(parseProperties('x=ab\\\n').get('x'), 'ab');
});
test('duplicate policies and safe map ownership', () => {
  assert.equal(parseProperties('a=1\na=2').get('a'), '2');
  assert.equal(parseProperties('a=1\na=2', { duplicate: 'first' }).get('a'), '1');
  assert.throws(() => parseProperties('a=1\na=2', { duplicate: 'error' }), SyntaxError);
  assert.throws(() => parseProperties('', { duplicate: 'other' }), TypeError);
  const parsed = parseProperties('__proto__=x');
  parsed.set('other', 'new');
  assert.equal(parseProperties('__proto__=x').size, 1);
});
test('serialization escapes all nonASCII UTF16 units and round trips', () => {
  const entries = new Map([
    [' a:=#!', ' leading\n😀é\\'],
    ['__proto__', '\0'],
    ['', ''],
  ]);
  const output = stringifyProperties(entries);
  assert.ok(output.includes('\\ud83d\\ude00'));
  assert.ok(!output.includes('😀'));
  assert.deepEqual(parseProperties(output), entries);
});
test('bounds controls and invalid entry types', () => {
  assert.throws(() => parseProperties('\0'), TypeError);
  assert.throws(() => parseProperties('a=1\na=2', { maxEntries: 1 }), RangeError);
  assert.equal(parseProperties('a=1', { maxInput: 3, maxEntries: 1 }).size, 1);
  assert.throws(() => stringifyProperties(new Map([['a', 1]])), TypeError);
  assert.throws(() => stringifyProperties(new Map([['a', 'é']]), { maxInput: 5 }), RangeError);
  assert.throws(() => stringifyProperties([['a', 'b']]), TypeError);
});
test('CJS surface', () => {
  assert.equal(
    createRequire(import.meta.url)('../dist/cjs/index.js')
      .parseProperties('a=b')
      .get('a'),
    'b',
  );
});
