import type { ParsedArgs } from './types';

export function printOutput(data: unknown, parsed: ParsedArgs): void {
  if (parsed.options.json === 'true') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (Array.isArray(data)) {
    printTable(data);
    return;
  }

  if (isRecord(data)) {
    const arrayEntry = findFirstArrayEntry(data);
    if (arrayEntry) {
      const [key, value] = arrayEntry;
      console.log(`${key}:`);
      printTable(value);

      const meta = Object.fromEntries(
        Object.entries(data).filter(([entryKey]) => entryKey !== key),
      );
      if (Object.keys(meta).length > 0) {
        console.log('');
        printObject(meta);
      }
      return;
    }

    printObject(data);
    return;
  }

  if (data === null || data === undefined) {
    console.log('(empty)');
    return;
  }

  console.log(String(data));
}

export function printTable(rows: unknown[]): void {
  if (rows.length === 0) {
    console.log('(no results)');
    return;
  }

  const normalized = rows.map((row) => (isRecord(row) ? row : { value: row }));
  const columns = Array.from(new Set(normalized.flatMap((row) => Object.keys(row))));

  const widths = columns.map((column) => {
    const values = normalized.map((row) => formatCell(row[column]));
    return Math.max(column.length, ...values.map((v) => v.length));
  });

  const divider = widths.map((w) => '-'.repeat(w)).join('-+-');
  const header = columns.map((column, idx) => column.padEnd(widths[idx])).join(' | ');

  console.log(header);
  console.log(divider);

  for (const row of normalized) {
    const line = columns
      .map((column, idx) => formatCell(row[column]).padEnd(widths[idx]))
      .join(' | ');
    console.log(line);
  }
}

export function printObject(data: Record<string, unknown>): void {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    console.log('{}');
    return;
  }

  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      console.log(`${key}: ${value.length} item(s)`);
      continue;
    }

    if (isRecord(value)) {
      console.log(`${key}: ${JSON.stringify(value)}`);
      continue;
    }

    console.log(`${key}: ${formatCell(value)}`);
  }
}

function findFirstArrayEntry(record: Record<string, unknown>): [string, unknown[]] | null {
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      return [key, value];
    }
  }

  return null;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return truncate(value, 80);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return truncate(JSON.stringify(value), 80);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 3)}...`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
