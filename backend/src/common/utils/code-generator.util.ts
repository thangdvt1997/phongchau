import { customAlphabet } from 'nanoid';

// Plain `nanoid()` draws from an alphabet that includes `_` and `-`, which slipped into
// human-facing reference codes (order/RFQ/OEM/ticket/transfer numbers) meant to look like
// "TCK-2026-A1B2C3" — occasionally producing "TCK-2026-A1_2C3" instead. Restricting to
// uppercase letters and digits keeps every generated code visually and format-consistent.
const generateAlphanumeric = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');

/** Builds a `PREFIX-YYYY-XXXXXX`-style reference code, e.g. `generateCode('TCK', 6)`. */
export function generateCode(prefix: string, randomLength: number): string {
  return `${prefix}-${new Date().getFullYear()}-${generateAlphanumeric(randomLength)}`;
}
