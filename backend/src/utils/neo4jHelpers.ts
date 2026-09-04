import { isInt } from 'neo4j-driver';

/**
 * Safely converts any Neo4j record value to a JavaScript number.
 * Handles Neo4j Integer objects, normal JS numbers, null, undefined,
 * and safely coercible values.
 */
export const toNum = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;

  if (typeof value === 'number') {
    return Number.isNaN(value) ? fallback : value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (isInt(value)) {
    return value.toNumber();
  }

  if (typeof (value as any)?.toNumber === 'function') {
    try {
      return (value as any).toNumber();
    } catch {
      // Fall through to standard coercion
    }
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? fallback : parsed;
};
