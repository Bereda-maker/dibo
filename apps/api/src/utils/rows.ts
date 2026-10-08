/** db.execute returns an array with postgres-js and { rows } with PGlite; normalise both. */
export const rowsOf = <T,>(res: unknown): T[] => (Array.isArray(res) ? res : (res as { rows: T[] }).rows) as T[];
