import * as XLSX from "xlsx";
import { detectColumnMapping, type ColumnMapping } from "./column-detector";
import { detectBankFormat, type BankFormat } from "./bank-formats";

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  balance?: number;
  notes?: string; // Observaciones - often contains more details
  movementType?: string; // Movimiento - type of transaction
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  bankFormat: BankFormat | null;
  columnMapping: ColumnMapping;
  filename: string;
  sheetName: string;
  warnings: string[];
}

export async function parseExcelBuffer(
  buffer: ArrayBuffer,
  filename: string
): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const warnings: string[] = [];

  // Usually first sheet contains transactions
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of arrays first to detect headers
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
  });

  // Detect bank format from filename
  const bankFormat = detectBankFormat(filename, rawData);

  // Find header row and detect column mapping
  const { headerRow, mapping } = detectColumnMapping(rawData, bankFormat);

  // Parse transactions starting after header
  const transactions: ParsedTransaction[] = [];

  for (let i = headerRow + 1; i < rawData.length; i++) {
    const row = rawData[i] as unknown[];
    if (!row || row.every((cell) => !cell)) continue;

    const transaction = extractTransaction(row, mapping);
    if (transaction) {
      transactions.push(transaction);
    } else {
      warnings.push(`Could not parse row ${i + 1}`);
    }
  }

  return {
    transactions,
    bankFormat,
    columnMapping: mapping,
    filename,
    sheetName,
    warnings,
  };
}

function extractTransaction(
  row: unknown[],
  mapping: ColumnMapping
): ParsedTransaction | null {
  try {
    const dateValue = row[mapping.dateColumn];
    const descValue = row[mapping.descriptionColumn];

    if (!dateValue || !descValue) return null;

    // Parse date
    const date = parseDate(dateValue);
    if (!date) return null;

    // Parse base description (Concepto)
    const baseDescription = String(descValue).trim();
    if (!baseDescription) return null;

    // Parse amount
    let amount: number;
    if (
      mapping.debitColumn !== undefined &&
      mapping.creditColumn !== undefined
    ) {
      const debit = parseAmount(row[mapping.debitColumn]);
      const credit = parseAmount(row[mapping.creditColumn]);
      amount = credit - debit; // Credits positive, debits negative
    } else if (mapping.amountColumn !== undefined) {
      amount = parseAmount(row[mapping.amountColumn]);
    } else {
      return null;
    }

    // Parse balance if available
    const balance =
      mapping.balanceColumn !== undefined
        ? parseAmount(row[mapping.balanceColumn])
        : undefined;

    // Parse notes/observaciones if available
    const notes =
      mapping.notesColumn !== undefined && row[mapping.notesColumn]
        ? String(row[mapping.notesColumn]).trim()
        : undefined;

    // Parse movement type if available
    const movementType =
      mapping.movementColumn !== undefined && row[mapping.movementColumn]
        ? String(row[mapping.movementColumn]).trim()
        : undefined;

    // Build rich description combining all available info
    // Priority: notes (most specific) > base description > movement type
    const description = buildRichDescription(baseDescription, notes, movementType);

    return { date, description, amount, balance, notes, movementType };
  } catch {
    return null;
  }
}

/**
 * Build a rich description by picking the most informative field.
 *
 * BBVA patterns:
 * - Card payments: Concepto has merchant ("Mercadona el fontan"), Movimiento is generic ("Pago con tarjeta")
 * - Transfers out: Concepto is generic ("Transferencia realizada"), Movimiento has detail ("Alquiler diciembre...")
 * - Direct debits: Concepto has company ("Adeudo grupo masmovil"), Movimiento has reference
 * - Transfers in: All fields are generic/reference numbers
 */
function buildRichDescription(
  baseDescription: string,
  notes: string | undefined,
  movementType: string | undefined
): string {
  // Generic patterns that indicate the field doesn't have useful specific info
  const genericPatterns = [
    /^pago\s+(con\s+)?tarjeta$/i,
    /^transferencia\s+(realizada|recibida)$/i,
    /^abono\s+por\s+transferencia/i,
    /^compras?$/i,
    /^recibos?$/i,
    /^varios$/i,
    /^otros?$/i,
    /^bizum$/i,
    /^adeudo\s+n[ºo°]?\s*\d+/i, // "Adeudo nº 123456"
  ];

  // Reference/noise patterns (not useful info)
  const noisePatterns = [
    /^liq\.?\s*op\.?\s*n/i,  // "LIQ. OP. N 000459377850001"
    /^n\s*\d{10,}/i,         // "N 2025363004491512..."
    /^\d{16}/,               // Card number at start
    /^compra:\s*pedido\s+[a-f0-9]+$/i, // "COMPRA: PEDIDO 128342289e7f"
  ];

  const isGeneric = (text: string) => genericPatterns.some(p => p.test(text.trim()));
  const isNoise = (text: string) => noisePatterns.some(p => p.test(text.trim()));

  // Clean a field by removing common noise
  const clean = (text: string): string => {
    return text
      // Remove card numbers at start (16 digits)
      .replace(/^\d{16}\s*/, "")
      // Remove card references like "TARJ.:*1234"
      .replace(/TARJ\.?\s*:?\*[\d\s]+/gi, "")
      // Remove reference prefixes
      .replace(/^N\s+\d+\s+/i, "")
      // Remove extra whitespace
      .replace(/\s+/g, " ")
      .trim();
  };

  // Score a candidate: longer non-generic text is better
  const score = (text: string | undefined): number => {
    if (!text) return 0;
    const cleaned = clean(text);
    if (!cleaned || cleaned.length < 3) return 0;
    if (isNoise(text)) return 0;
    if (isGeneric(text)) return 1;
    return cleaned.length + 10; // Prefer longer, specific text
  };

  // Evaluate all candidates
  const candidates = [
    { text: baseDescription, score: score(baseDescription) },
    { text: movementType, score: score(movementType) },
    { text: notes, score: score(notes) },
  ].filter(c => c.text && c.score > 0);

  // Pick the best one
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0 && candidates[0].text) {
    return clean(candidates[0].text);
  }

  return baseDescription;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value;

  if (typeof value === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
    return null;
  }

  if (typeof value === "string") {
    // Try common Spanish date formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        if (format.source.startsWith("^(\\d{4})")) {
          return new Date(+match[1], +match[2] - 1, +match[3]);
        } else {
          return new Date(+match[3], +match[2] - 1, +match[1]);
        }
      }
    }

    // Try native Date parse as fallback
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    // Handle Spanish number format: 1.234,56 -> 1234.56
    let cleaned = value
      .replace(/[€$\s]/g, "") // Remove currency symbols and spaces
      .replace(/\./g, "") // Remove thousand separators
      .replace(",", "."); // Convert decimal separator

    // Handle parentheses for negative: (100) -> -100
    if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
      cleaned = "-" + cleaned.slice(1, -1);
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}
