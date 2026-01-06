import type { ColumnMapping } from "./column-detector";

export interface BankFormat {
  name: string;
  filenamePatterns: RegExp[];
  headerRow?: number;
  columnMapping?: ColumnMapping;
}

export const SPANISH_BANK_FORMATS: BankFormat[] = [
  {
    name: "BBVA",
    filenamePatterns: [/[uú]ltimos.?movimientos/i, /bbva/i],
    headerRow: 4, // BBVA has metadata rows before headers
    columnMapping: {
      dateColumn: 1,        // Fecha (operation date, not F.Valor which is value/settlement date)
      descriptionColumn: 2, // Concepto
      movementColumn: 3,    // Movimiento (type: PAGO CON TARJETA, TRANSFERENCIA, etc.)
      amountColumn: 4,      // Importe
      balanceColumn: 6,     // Disponible
      notesColumn: 8,       // Observaciones (detailed info: merchant name, card number, etc.)
      headers: ["f.valor", "fecha", "concepto", "movimiento", "importe", "divisa", "disponible", "divisa", "observaciones"],
    },
  },
  {
    name: "Santander",
    filenamePatterns: [/santander/i, /movimientos.*santander/i],
    headerRow: 1, // Often has bank header row
  },
  {
    name: "CaixaBank",
    filenamePatterns: [/caixa/i, /lacaixa/i],
    headerRow: 0,
  },
  {
    name: "ING",
    filenamePatterns: [/ing/i],
    headerRow: 0,
  },
  {
    name: "Openbank",
    filenamePatterns: [/openbank/i],
    headerRow: 0,
  },
  {
    name: "Sabadell",
    filenamePatterns: [/sabadell/i],
    headerRow: 0,
  },
  {
    name: "Bankinter",
    filenamePatterns: [/bankinter/i],
    headerRow: 0,
  },
  {
    name: "Revolut",
    filenamePatterns: [/revolut/i],
    headerRow: 0,
  },
  {
    name: "N26",
    filenamePatterns: [/n26/i],
    headerRow: 0,
  },
];

export function detectBankFormat(
  filename: string,
  rawData: unknown[][]
): BankFormat | null {
  const lowerFilename = filename.toLowerCase();

  // First try filename-based detection
  for (const format of SPANISH_BANK_FORMATS) {
    for (const pattern of format.filenamePatterns) {
      if (pattern.test(lowerFilename)) {
        console.log("Bank format detected by filename:", format.name);
        return format;
      }
    }
  }

  // Content-based detection: check if headers match known formats
  // BBVA format: headers are at row 4 with specific columns
  const bbvaFormat = SPANISH_BANK_FORMATS.find(f => f.name === "BBVA");
  if (bbvaFormat && rawData.length > 4) {
    const potentialHeaderRow = rawData[4] as unknown[];
    if (potentialHeaderRow) {
      const headers = potentialHeaderRow.map(c => String(c ?? "").toLowerCase().trim());
      // Check for BBVA-specific headers
      const hasFValor = headers.some(h => /f\.?\s*valor/i.test(h));
      const hasConcepto = headers.includes("concepto");
      const hasImporte = headers.includes("importe");
      const hasDisponible = headers.includes("disponible");

      if (hasFValor && hasConcepto && hasImporte && hasDisponible) {
        console.log("Bank format detected by content: BBVA");
        return bbvaFormat;
      }
    }
  }

  console.log("No bank format detected, using auto-detection");
  return null;
}
