import type { BankFormat } from "./bank-formats";

export interface ColumnMapping {
  dateColumn: number;
  descriptionColumn: number;
  amountColumn?: number;
  debitColumn?: number;
  creditColumn?: number;
  balanceColumn?: number;
  notesColumn?: number; // Observaciones
  movementColumn?: number; // Movimiento (type of transaction)
  headers: string[];
}

// Prefer operation date over value date (F.Valor can be in the future)
const DATE_PATTERNS = [
  /^fecha$/i,              // Exact "Fecha" - operation date (preferred)
  /fecha.?operaci[oó]n/i,  // "Fecha operación"
  /date/i,
  /fec\.?$/i,              // Short "Fec." but not "F.Valor"
];

// Value date patterns (lower priority - only use if no operation date found)
const VALUE_DATE_PATTERNS = [
  /f\.?\s*valor/i,         // "F.Valor" or "F. Valor"
  /fecha.?valor/i,         // "Fecha valor"
];

const DESCRIPTION_PATTERNS = [
  /^concepto$/i,
  /descripci[oó]n/i,
  /description/i,
  /detalle/i,
];

const AMOUNT_PATTERNS = [
  /^importe$/i,
  /^amount$/i,
  /^cantidad$/i,
  /^monto$/i,
];

const DEBIT_PATTERNS = [/cargo/i, /debe/i, /debit/i, /salida/i, /gasto/i, /-/];

const CREDIT_PATTERNS = [
  /abono/i,
  /haber/i,
  /credit/i,
  /entrada/i,
  /ingreso/i,
  /\+/,
];

const BALANCE_PATTERNS = [/saldo/i, /balance/i, /disponible/i];

const NOTES_PATTERNS = [/observacion/i, /notas?/i, /notes?/i, /remarks?/i, /comentario/i];

const MOVEMENT_PATTERNS = [/movimiento/i, /tipo/i, /type/i];

export function detectColumnMapping(
  rawData: unknown[][],
  bankFormat: BankFormat | null
): { headerRow: number; mapping: ColumnMapping } {
  // If we have a known bank format, use predefined mapping
  if (bankFormat?.columnMapping) {
    return {
      headerRow: bankFormat.headerRow ?? 0,
      mapping: bankFormat.columnMapping,
    };
  }

  // Auto-detect: find the header row
  let headerRow = 0;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i] as unknown[];
    if (!row) continue;

    const rowStrings = row.map((cell) => String(cell ?? "").toLowerCase());

    // Check if this row looks like headers
    const hasDate = rowStrings.some((s) =>
      DATE_PATTERNS.some((p) => p.test(s))
    );
    const hasDesc = rowStrings.some((s) =>
      DESCRIPTION_PATTERNS.some((p) => p.test(s))
    );
    const hasAmount = rowStrings.some(
      (s) =>
        AMOUNT_PATTERNS.some((p) => p.test(s)) ||
        DEBIT_PATTERNS.some((p) => p.test(s)) ||
        CREDIT_PATTERNS.some((p) => p.test(s))
    );

    if (hasDate && hasDesc && hasAmount) {
      headerRow = i;
      headers = rowStrings;
      break;
    }
  }

  // If no headers found, try first row anyway
  if (headers.length === 0 && rawData[0]) {
    headers = (rawData[0] as unknown[]).map((cell) =>
      String(cell ?? "").toLowerCase()
    );
  }

  // Detect column indices
  // Try to find operation date first, fall back to value date
  let dateColumn = findColumn(headers, DATE_PATTERNS);
  if (dateColumn === -1) {
    dateColumn = findColumn(headers, VALUE_DATE_PATTERNS);
  }

  const mapping: ColumnMapping = {
    dateColumn,
    descriptionColumn: findColumn(headers, DESCRIPTION_PATTERNS),
    headers,
  };

  // Try to find single amount column first
  const amountCol = findColumn(headers, AMOUNT_PATTERNS);
  if (amountCol !== -1) {
    mapping.amountColumn = amountCol;
  } else {
    // Look for separate debit/credit columns
    const debitCol = findColumn(headers, DEBIT_PATTERNS);
    const creditCol = findColumn(headers, CREDIT_PATTERNS);
    if (debitCol !== -1 && creditCol !== -1) {
      mapping.debitColumn = debitCol;
      mapping.creditColumn = creditCol;
    }
  }

  // Optional balance column
  const balanceCol = findColumn(headers, BALANCE_PATTERNS);
  if (balanceCol !== -1) {
    mapping.balanceColumn = balanceCol;
  }

  // Optional notes/observaciones column
  const notesCol = findColumn(headers, NOTES_PATTERNS);
  if (notesCol !== -1) {
    mapping.notesColumn = notesCol;
  }

  // Optional movement type column
  const movementCol = findColumn(headers, MOVEMENT_PATTERNS);
  if (movementCol !== -1) {
    mapping.movementColumn = movementCol;
  }

  // Validate we have minimum required columns
  if (mapping.dateColumn === -1) {
    mapping.dateColumn = 0; // Fallback to first column
  }
  if (mapping.descriptionColumn === -1) {
    mapping.descriptionColumn = 1; // Fallback to second column
  }
  if (
    mapping.amountColumn === undefined &&
    mapping.debitColumn === undefined
  ) {
    // Fallback: assume third column is amount
    mapping.amountColumn = 2;
  }

  return { headerRow, mapping };
}

function findColumn(headers: string[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (patterns.some((p) => p.test(headers[i]))) {
      return i;
    }
  }
  return -1;
}
