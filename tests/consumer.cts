import {
  parseProperties,
  stringifyProperties,
  type PropertiesOptions,
} from '@lp-labs/properties-codec';
const options: PropertiesOptions = { duplicate: 'error' };
const entries: Map<string, string> = parseProperties('a=b', options);
const text: string = stringifyProperties(entries, options);
// @ts-expect-error unsupported duplicate policy
parseProperties('', { duplicate: 'merge' });
// @ts-expect-error serializer expects string Map values
stringifyProperties(new Map([['a', 1]]));
void text;
