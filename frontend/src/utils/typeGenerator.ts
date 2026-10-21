/**
 * TypeScript and JSON Schema Generator from live API response data
 */

function capitalize(str: string): string {
  if (!str) return 'Item';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/[^a-zA-Z0-9]/g, '');
}

function toPascalCase(str: string): string {
  if (!str) return 'ApiResponse';
  const cleaned = str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return cleaned ? (cleaned.endsWith('Response') ? cleaned : `${cleaned}Response`) : 'ApiResponse';
}

/**
 * Generate TypeScript interfaces from a JavaScript object or array
 */
export function generateTypeScriptTypes(data: unknown, rawRootName = 'ApiResponse'): string {
  const rootName = toPascalCase(rawRootName);
  if (data === null || data === undefined) {
    return `export type ${rootName} = null;`;
  }

  if (typeof data !== 'object') {
    return `export type ${rootName} = ${typeof data};`;
  }

  const interfaces: Record<string, string[]> = {};

  function parseObject(obj: Record<string, unknown>, interfaceName: string): string {
    const lines: string[] = [];

    for (const [key, val] of Object.entries(obj)) {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
      const typeStr = getType(val, key, interfaceName);
      lines.push(`  ${safeKey}: ${typeStr};`);
    }

    interfaces[interfaceName] = lines;
    return interfaceName;
  }

  function getType(val: unknown, key: string, parentName: string): string {
    if (val === null) return 'null | unknown';
    if (val === undefined) return 'undefined';

    if (Array.isArray(val)) {
      if (val.length === 0) return 'unknown[]';
      // Inspect first item or union of items
      const first = val[0];
      if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
        const subName = `${parentName}${capitalize(key)}Item`;
        parseObject(first as Record<string, unknown>, subName);
        return `${subName}[]`;
      }
      return `${typeof first}[]`;
    }

    if (typeof val === 'object') {
      const subName = `${parentName}${capitalize(key)}`;
      parseObject(val as Record<string, unknown>, subName);
      return subName;
    }

    return typeof val;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `export type ${rootName} = unknown[];`;
    }
    const first = data[0];
    if (typeof first === 'object' && first !== null) {
      const itemInterface = `${rootName}Item`;
      parseObject(first as Record<string, unknown>, itemInterface);
      const results: string[] = [];
      for (const [name, fields] of Object.entries(interfaces)) {
        results.push(`export interface ${name} {\n${fields.join('\n')}\n}`);
      }
      results.push(`export type ${rootName} = ${itemInterface}[];`);
      return results.join('\n\n');
    }
    return `export type ${rootName} = ${typeof first}[];`;
  }

  parseObject(data as Record<string, unknown>, rootName);

  const results: string[] = [];
  // Output child interfaces first, then root interface
  const keys = Object.keys(interfaces).reverse();
  for (const name of keys) {
    results.push(`export interface ${name} {\n${interfaces[name].join('\n')}\n}`);
  }

  return results.join('\n\n');
}

/**
 * Generate standard JSON Schema from data
 */
export function generateJsonSchema(data: unknown, title = 'APIResponse'): string {
  function getSchema(val: unknown): Record<string, unknown> {
    if (val === null) return { type: 'null' };
    if (Array.isArray(val)) {
      return {
        type: 'array',
        items: val.length > 0 ? getSchema(val[0]) : {}
      };
    }
    if (typeof val === 'object') {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        properties[k] = getSchema(v);
        required.push(k);
      }
      return {
        type: 'object',
        properties,
        required
      };
    }
    return { type: typeof val };
  }

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title,
    ...getSchema(data)
  };

  return JSON.stringify(schema, null, 2);
}
