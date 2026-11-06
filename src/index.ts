export interface PropertiesOptions {
  duplicate?: 'first' | 'last' | 'error';
  maxInput?: number;
  maxEntries?: number;
}
function limits(options: PropertiesOptions): { maxInput: number; maxEntries: number } {
  const { maxInput = 1_000_000, maxEntries = 10_000 } = options;
  for (const n of [maxInput, maxEntries])
    if (!Number.isSafeInteger(n) || n < 1) throw new RangeError('Invalid budget.');
  if (options.duplicate !== undefined && !['first', 'last', 'error'].includes(options.duplicate))
    throw new TypeError('Invalid duplicate policy.');
  return { maxInput, maxEntries };
}
function unescape(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const character = value[i]!;
    if (character !== '\\') {
      result += character;
      continue;
    }
    const escaped = value[++i];
    if (escaped === undefined) throw new SyntaxError('Dangling backslash.');
    if (escaped === 'u') {
      const hex = value.slice(i + 1, i + 5);
      if (!/^[0-9a-f]{4}$/iu.test(hex)) throw new SyntaxError('Malformed Unicode escape.');
      result += String.fromCharCode(Number.parseInt(hex, 16));
      i += 4;
    } else
      result +=
        ({ t: '\t', r: '\r', n: '\n', f: '\f' } as Record<string, string>)[escaped] ?? escaped;
  }
  return result;
}
/** Java Reader-style .properties subset; no byte charset or interpolation. */
export function parseProperties(
  text: string,
  options: PropertiesOptions = {},
): Map<string, string> {
  const { maxInput, maxEntries } = limits(options);
  if (
    typeof text !== 'string' ||
    text.length > maxInput ||
    /[\u0000-\u0008\u000b\u000e-\u001f\u007f]/u.test(text)
  )
    throw new TypeError('Invalid or oversized properties text.');
  const result = new Map<string, string>();
  let logical = '',
    continued = false,
    entries = 0;
  const consume = (line: string): void => {
    line = line.replace(/^[ \t\f]+/u, '');
    if (!line || line[0] === '#' || line[0] === '!') return;
    if (++entries > maxEntries) throw new RangeError('Entry budget exceeded.');
    let end = 0;
    for (; end < line.length; end++) {
      if (line[end] === '\\') {
        end++;
        continue;
      }
      if (/[=:\t\f ]/u.test(line[end]!)) break;
    }
    const key = unescape(line.slice(0, end));
    let start = end;
    while (/[ \t\f]/u.test(line[start] ?? '') && start < line.length) start++;
    if (line[start] === '=' || line[start] === ':') start++;
    while (/[ \t\f]/u.test(line[start] ?? '') && start < line.length) start++;
    const value = unescape(line.slice(start));
    if (result.has(key)) {
      if (options.duplicate === 'error') throw new SyntaxError(`Duplicate key: ${key}`);
      if (options.duplicate === 'first') return;
    }
    result.set(key, value);
  };
  const lines = text.split(/\r\n|\n|\r/u);
  for (let index = 0; index < lines.length; index++) {
    let line = lines[index]!;
    if (continued) line = line.replace(/^[ \t\f]+/u, '');
    else if (/^[ \t\f]*[#!]/u.test(line)) continue;
    logical += line;
    let backslashes = 0;
    for (let i = logical.length - 1; i >= 0 && logical[i] === '\\'; i--) backslashes++;
    continued = backslashes % 2 === 1;
    if (continued) {
      logical = logical.slice(0, -1);
      if (index === lines.length - 1) throw new SyntaxError('Continuation at end of input.');
    } else {
      consume(logical);
      logical = '';
    }
  }
  return result;
}
export function stringifyProperties(
  entries: ReadonlyMap<string, string>,
  options: PropertiesOptions = {},
): string {
  const { maxInput, maxEntries } = limits(options);
  if (!(entries instanceof Map) || entries.size > maxEntries)
    throw new TypeError('Expected bounded Map.');
  const escape = (text: string, key: boolean): string => {
    if (typeof text !== 'string' || text.length > maxInput)
      throw new TypeError('Invalid or oversized key/value.');
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const point = text[i]!,
        code = text.charCodeAt(i);
      if (point === '\\' || /[=:#!]/u.test(point) || (point === ' ' && (key || i === 0)))
        result += '\\' + point;
      else if (code < 32 || code > 126) result += '\\u' + code.toString(16).padStart(4, '0');
      else result += point;
      if (result.length > maxInput) throw new RangeError('Output budget exceeded.');
    }
    return result;
  };
  const lines: string[] = [];
  let length = 0;
  for (const [key, value] of entries) {
    const line = `${escape(key, true)}=${escape(value, false)}\n`;
    length += line.length;
    if (length > maxInput) throw new RangeError('Output budget exceeded.');
    lines.push(line);
  }
  return lines.join('');
}
