"use client";

import * as webllm from "@mlc-ai/web-llm";

let engine: webllm.MLCEngine | null = null;
let isInitializing = false;
let initPromise: Promise<webllm.MLCEngine> | null = null;

export type LoadingCallback = (progress: {
  stage: "downloading" | "loading" | "ready";
  progress: number;
  text: string;
}) => void;

const MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

// Built-in patterns for automatic categorization (checked in priority order)
// These provide 100% accurate categorization for known Spanish merchants
const BUILTIN_PATTERNS: { pattern: RegExp; categoryName: string }[] = [
  // === SUBSCRIPTIONS (check FIRST - before Shopping for amazon/spotify) ===
  { pattern: /claude\.ai/i, categoryName: "Subscriptions" },
  { pattern: /cursor[,\s]+ai/i, categoryName: "Subscriptions" },
  { pattern: /netflix/i, categoryName: "Subscriptions" },
  { pattern: /spotify/i, categoryName: "Subscriptions" },
  { pattern: /disney\+?/i, categoryName: "Subscriptions" },
  { pattern: /hbo/i, categoryName: "Subscriptions" },
  { pattern: /google\s*\*?\s*one/i, categoryName: "Subscriptions" },
  { pattern: /amazon\s*prime/i, categoryName: "Subscriptions" },
  { pattern: /linkedinpre/i, categoryName: "Subscriptions" },
  { pattern: /masmovil|xfera|vodafone|movistar|orange/i, categoryName: "Subscriptions" },
  { pattern: /synergym|fitness\s*park|gym\s*asturias/i, categoryName: "Subscriptions" },

  // === HOUSING (check before Transfer for "alquiler" in transfer descriptions) ===
  { pattern: /alquiler|hipoteca|fianza\s*habitacion/i, categoryName: "Housing" },

  // === GROCERIES ===
  { pattern: /mercadona|carrefour|lidl|aldi|eroski|alcampo|hiper\s*euro/i, categoryName: "Groceries" },
  { pattern: /\bdia\b/i, categoryName: "Groceries" },
  { pattern: /supermercado/i, categoryName: "Groceries" },

  // === HEALTH ===
  { pattern: /farmacia/i, categoryName: "Health" },
  { pattern: /clinica|hospital|optica/i, categoryName: "Health" },
  { pattern: /monkey\s*wellness/i, categoryName: "Health" },

  // === TRANSPORTATION ===
  { pattern: /renfe/i, categoryName: "Transportation" },
  { pattern: /taxi/i, categoryName: "Transportation" },
  { pattern: /uber|cabify|bolt/i, categoryName: "Transportation" },
  { pattern: /parking|gasolina|gasolinera/i, categoryName: "Transportation" },

  // === FOOD & DINING ===
  { pattern: /sibelius/i, categoryName: "Food & Dining" },
  { pattern: /mcdonalds|mcdonald|burger\s*king|kfc/i, categoryName: "Food & Dining" },
  { pattern: /papajohn|papa\s*john/i, categoryName: "Food & Dining" },
  { pattern: /churreria/i, categoryName: "Food & Dining" },
  { pattern: /familia\s*campomanes/i, categoryName: "Food & Dining" },
  { pattern: /restaurante|kebab|pizza(?!hut)/i, categoryName: "Food & Dining" },

  // === TRANSFER (money movement) ===
  { pattern: /western\s*union/i, categoryName: "Transfer" },
  { pattern: /r3mit|remesa/i, categoryName: "Transfer" },
  { pattern: /bizum.*(?:enviado|envia)/i, categoryName: "Transfer" },
  { pattern: /transferencia\s+(realizada|recibida)/i, categoryName: "Transfer" },

  // === SHOPPING ===
  { pattern: /amazon/i, categoryName: "Shopping" },
  { pattern: /xiaomi/i, categoryName: "Shopping" },
  { pattern: /aliexpress/i, categoryName: "Shopping" },
  { pattern: /mediamarkt/i, categoryName: "Shopping" },
  { pattern: /zara\b/i, categoryName: "Shopping" },
  { pattern: /shein/i, categoryName: "Shopping" },
  { pattern: /bizum.*compra|compra.*pedido/i, categoryName: "Shopping" },

  // === OTHER (fees, taxes, unknown) ===
  { pattern: /tgss|seguridad\s*social/i, categoryName: "Other" },
  { pattern: /hacienda|pago\s*de\s*impuestos/i, categoryName: "Other" },
  { pattern: /liquidacion.*interes|comision/i, categoryName: "Other" },
  { pattern: /assidere|asesor/i, categoryName: "Other" },
  { pattern: /ret\.?\s*efectivo|cajero/i, categoryName: "Other" },
  { pattern: /cashback|retenci[oó]n\s*promoci/i, categoryName: "Other" },
];

// Check if transaction is Income based on amount and keywords
function isIncomeTransaction(description: string, amount: number): boolean {
  if (amount <= 0) return false;
  // Large incoming transfer (salary-like)
  if (amount > 1000 && /abono.*transferencia|transferencia.*recibida/i.test(description)) {
    return true;
  }
  // Explicit salary
  if (/nomina|salario/i.test(description)) return true;
  // Internal bank transfer (traspaso)
  if (amount > 500 && /traspaso/i.test(description)) return true;
  return false;
}

// Apply built-in patterns to transactions for deterministic categorization
export function applyBuiltinPatterns(
  transactions: { description: string; amount: number }[],
  categoryNameToId: Map<string, string>
): { matches: RuleMatchResult[]; unmatchedIndices: number[] } {
  const matches: RuleMatchResult[] = [];
  const matchedIndices = new Set<number>();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const desc = tx.description;

    // Check Income first (requires amount check)
    if (isIncomeTransaction(desc, tx.amount)) {
      const categoryId = categoryNameToId.get("Income");
      if (categoryId) {
        matches.push({
          index: i + 1,
          categoryId,
          confidence: 1.0,
          matchedRule: "builtin:income",
        });
        matchedIndices.add(i);
        continue;
      }
    }

    // Check patterns in priority order
    for (const { pattern, categoryName } of BUILTIN_PATTERNS) {
      if (pattern.test(desc)) {
        const categoryId = categoryNameToId.get(categoryName);
        if (categoryId) {
          matches.push({
            index: i + 1,
            categoryId,
            confidence: 1.0,
            matchedRule: `builtin:${categoryName.toLowerCase().replace(/\s+/g, "-")}`,
          });
          matchedIndices.add(i);
          break;
        }
      }
    }
  }

  const unmatchedIndices = transactions
    .map((_, i) => i)
    .filter((i) => !matchedIndices.has(i));

  return { matches, unmatchedIndices };
}

// Rule matching types
export interface Rule {
  id: string;
  categoryId: string;
  descriptionContains?: string;
  amountEquals?: number;
  amountMin?: number;
  amountMax?: number;
  isEnabled: boolean;
  priority: number;
}

export interface RuleMatchResult {
  index: number;
  categoryId: string;
  confidence: number;
  matchedRule: string;
}

// Apply rules to transactions - returns matches and unmatched indices
export function applyRules(
  transactions: { description: string; amount: number }[],
  rules: Rule[]
): { matches: RuleMatchResult[]; unmatchedIndices: number[] } {
  const sortedRules = rules.sort((a, b) => b.priority - a.priority);

  const matches: RuleMatchResult[] = [];
  const matchedIndices = new Set<number>();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const descUpper = tx.description.toUpperCase();

    for (const rule of sortedRules) {
      let isMatch = true;

      // Check description contains (case-insensitive)
      if (rule.descriptionContains) {
        if (!descUpper.includes(rule.descriptionContains.toUpperCase())) {
          isMatch = false;
        }
      }

      // Check exact amount
      if (rule.amountEquals != null && isMatch) {
        if (Math.abs(tx.amount - rule.amountEquals) > 0.01) {
          isMatch = false;
        }
      }

      // Check amount range
      if (rule.amountMin != null && isMatch) {
        if (tx.amount < rule.amountMin) {
          isMatch = false;
        }
      }

      if (rule.amountMax != null && isMatch) {
        if (tx.amount > rule.amountMax) {
          isMatch = false;
        }
      }

      if (isMatch) {
        matches.push({
          index: i + 1, // 1-indexed to match LLM output
          categoryId: rule.categoryId,
          confidence: 1.0, // Rules are 100% confident
          matchedRule: rule.id,
        });
        matchedIndices.add(i);
        break; // Stop at first matching rule
      }
    }
  }

  const unmatchedIndices = transactions
    .map((_, i) => i)
    .filter((i) => !matchedIndices.has(i));

  return { matches, unmatchedIndices };
}

export async function initWebLLM(
  onProgress?: LoadingCallback
): Promise<webllm.MLCEngine> {
  if (engine) return engine;

  if (initPromise) return initPromise;

  isInitializing = true;

  initPromise = (async () => {
    const newEngine = new webllm.MLCEngine();

    newEngine.setInitProgressCallback((report) => {
      onProgress?.({
        stage: report.progress < 1 ? "downloading" : "loading",
        progress: report.progress,
        text: report.text,
      });
    });

    await newEngine.reload(MODEL_ID);

    onProgress?.({
      stage: "ready",
      progress: 1,
      text: "Model ready",
    });

    engine = newEngine;
    isInitializing = false;
    return newEngine;
  })();

  return initPromise;
}

export function isModelLoaded(): boolean {
  return engine !== null;
}

export function isModelLoading(): boolean {
  return isInitializing;
}

export async function generateCompletion(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  if (!engine) {
    throw new Error("WebLLM not initialized. Call initWebLLM first.");
  }

  const messages: webllm.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const response = await engine.chat.completions.create({
    messages,
    temperature: 0, // Maximum determinism
    top_p: 0.1, // Narrow token selection to reduce hallucinations
    max_tokens: 1024,
    seed: 42, // Reproducible outputs
  });

  return response.choices[0]?.message?.content || "";
}

interface TransactionInput {
  description: string;
  amount: number;
  date: string;
}

export interface CategorizationResult {
  index: number;
  category: string;
  confidence: number;
  merchant?: string;
}

// Examples of past categorizations to help the model
export interface CategoryExample {
  category: string;
  examples: string[]; // Transaction descriptions
}

// Process transactions in batches to avoid context window overflow
const BATCH_SIZE = 8; // Reduced to fit examples in context

export async function categorizeTransactionsWithWebLLM(
  transactions: TransactionInput[],
  categories: string[],
  onProgress?: LoadingCallback,
  categoryExamples?: CategoryExample[]
): Promise<CategorizationResult[]> {
  if (transactions.length === 0) {
    return [];
  }

  await initWebLLM(onProgress);

  // Build examples section if we have past categorizations
  let userExamplesSection = "";
  if (categoryExamples && categoryExamples.length > 0) {
    const exampleLines = categoryExamples
      .filter((ce) => ce.examples.length > 0)
      .map((ce) => `- ${ce.category}: ${ce.examples.slice(0, 3).join(", ")}`)
      .join("\n");
    if (exampleLines) {
      userExamplesSection = `\nPast categorizations:\n${exampleLines}\n`;
    }
  }

  // Simplified prompt for LLM - only handles transactions that didn't match built-in patterns
  // The built-in patterns handle ~95% of transactions, so LLM only sees unknown merchants
  const systemPrompt = `Categorize Spanish bank transactions that didn't match known patterns.
Output ONLY a valid JSON array, no other text.

CLUES to identify category:
- Spanish business suffixes: "cb"=comunidad de bienes, "sl"=sociedad limitada, "sa"=sociedad anonima
- Small amounts (<€10): often coffee, snacks
- Medium amounts (€10-50): meals, small purchases
- Large amounts (>€50): shopping, bills
- Location words (oviedo, madrid, etc) = local businesses

CONFIDENCE guidelines:
- 0.7: Business type is clear from name
- 0.5: Guessing based on amount or context
- If truly unknown, use "Other" with confidence 0.5

OUTPUT FORMAT exactly:
[{"index":1,"category":"Other","confidence":0.5,"merchant":"BusinessName"}]

CRITICAL:
- Use EXACT category names from the provided list
- Extract short merchant name from description
- Output JSON array only, nothing else`;

  const allResults: CategorizationResult[] = [];
  const totalBatches = Math.ceil(transactions.length / BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, transactions.length);
    const batch = transactions.slice(start, end);

    onProgress?.({
      stage: "loading",
      progress: batchIndex / totalBatches,
      text: `Categorizing ${start + 1}-${end} of ${transactions.length}...`,
    });

    // Build compact transaction list
    const txList = batch
      .map((t, i) => {
        const sign = t.amount >= 0 ? "+" : "";
        return `${start + i + 1}. ${t.description} (${sign}${t.amount})`;
      })
      .join("\n");

    // Build the prompt - these are unknown merchants that didn't match patterns
    const prompt = `Categories: ${categories.join(", ")}
${userExamplesSection}
Unknown transactions to categorize:
${txList}

Example for unknown merchants:
- "1. Nestares cb (-7.10)" → [{"index":1,"category":"Other","confidence":0.5,"merchant":"Nestares"}]
- "1. Tan bonita (-4.80)" → [{"index":1,"category":"Food & Dining","confidence":0.7,"merchant":"Tan Bonita"}]

Output JSON array only:`;

    try {
      const response = await generateCompletion(prompt, systemPrompt);
      const results = parseCategorizationResponse(response, categories);
      allResults.push(...results);
    } catch (error) {
      console.error(`[WebLLM] Batch ${batchIndex + 1} failed:`, error);
    }
  }

  onProgress?.({
    stage: "ready",
    progress: 1,
    text: `Categorized ${allResults.length} of ${transactions.length}`,
  });

  return allResults;
}

// Find best matching category name (fuzzy match)
function findBestCategory(input: string, categories: string[]): string | null {
  const inputLower = input.toLowerCase().trim();

  // Exact match first
  const exact = categories.find((c) => c.toLowerCase() === inputLower);
  if (exact) return exact;

  // Partial match (category contains input or input contains category)
  const partial = categories.find(
    (c) =>
      c.toLowerCase().includes(inputLower) ||
      inputLower.includes(c.toLowerCase())
  );
  if (partial) return partial;

  // Word overlap match
  const inputWords = inputLower.split(/\s+/);
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const cat of categories) {
    const catWords = cat.toLowerCase().split(/\s+/);
    const overlap = inputWords.filter((w) => catWords.includes(w)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      bestMatch = cat;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

// Sanitize LLM-generated JSON to fix common issues
function sanitizeJson(jsonStr: string): string {
  let result = jsonStr;

  // Replace single quotes with double quotes
  // This handles: {'key': 'value'} -> {"key": "value"}
  result = result.replace(/'/g, '"');

  // Fix unquoted property names: {index: 1} -> {"index": 1}
  result = result.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');

  // Fix missing colon after property name: "category" "Food" -> "category": "Food"
  result = result.replace(/"([^"]+)"\s+"([^"]+)"/g, '"$1": "$2"');

  // Fix missing colon before numbers: "index" 1 -> "index": 1
  result = result.replace(/"([^"]+)"\s+(\d+\.?\d*)/g, '"$1": $2');

  // Remove trailing commas before ] or }
  result = result.replace(/,(\s*[}\]])/g, "$1");

  // Fix missing commas between objects: }{  -> },{
  result = result.replace(/}(\s*){/g, "},$1{");

  // Fix missing commas between values: "value" "key" -> "value", "key"
  result = result.replace(/("|\d)\s+"/g, '$1, "');

  return result;
}

// Extract individual JSON objects from potentially malformed array
function extractJsonObjects(str: string): object[] {
  const objects: object[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        let objStr = str.slice(start, i + 1);
        try {
          objects.push(JSON.parse(objStr));
        } catch {
          try {
            objStr = sanitizeJson(objStr);
            objects.push(JSON.parse(objStr));
          } catch {
            // Skip malformed object
          }
        }
        start = -1;
      }
    }
  }

  return objects;
}

// ============================================
// NATURAL LANGUAGE SEARCH
// ============================================

export interface ParsedSearchQuery {
  search?: string; // Text to search in description/merchant
  category?: string; // Category name to filter by
  month?: string; // Month in YYYY-MM format
  amountMin?: number;
  amountMax?: number;
  sortBy?: "date" | "amount";
}

const MONTH_NAMES: Record<string, number> = {
  january: 1, jan: 1, enero: 1, ene: 1,
  february: 2, feb: 2, febrero: 2,
  march: 3, mar: 3, marzo: 3,
  april: 4, apr: 4, abril: 4, abr: 4,
  may: 5, mayo: 5,
  june: 6, jun: 6, junio: 6,
  july: 7, jul: 7, julio: 7,
  august: 8, aug: 8, agosto: 8, ago: 8,
  september: 9, sep: 9, sept: 9, septiembre: 9,
  october: 10, oct: 10, octubre: 10,
  november: 11, nov: 11, noviembre: 11,
  december: 12, dec: 12, diciembre: 12, dic: 12,
};

// Parse natural language query without using LLM (fast, deterministic)
export function parseNLQueryLocal(
  query: string,
  categories: string[],
  currentDate: Date = new Date()
): ParsedSearchQuery {
  const result: ParsedSearchQuery = {};
  const queryLower = query.toLowerCase().trim();

  // Extract amount conditions
  const overMatch = queryLower.match(/(?:over|above|more than|mayor que|más de)\s*[€$]?\s*(\d+)/i);
  const underMatch = queryLower.match(/(?:under|below|less than|menor que|menos de)\s*[€$]?\s*(\d+)/i);
  const betweenMatch = queryLower.match(/between\s*[€$]?\s*(\d+)\s*(?:and|y|-)\s*[€$]?\s*(\d+)/i);

  if (betweenMatch) {
    result.amountMin = parseFloat(betweenMatch[1]);
    result.amountMax = parseFloat(betweenMatch[2]);
  } else {
    if (overMatch) result.amountMin = parseFloat(overMatch[1]);
    if (underMatch) result.amountMax = parseFloat(underMatch[1]);
  }

  // Extract sort preference
  if (/(?:most expensive|biggest|largest|sort by amount|ordenar por cantidad)/i.test(queryLower)) {
    result.sortBy = "amount";
  }

  // Extract month - relative terms
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  if (/(?:this month|este mes)/i.test(queryLower)) {
    result.month = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  } else if (/(?:last month|mes pasado|el mes pasado)/i.test(queryLower)) {
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    result.month = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}`;
  }

  // Extract month - by name
  for (const [name, monthNum] of Object.entries(MONTH_NAMES)) {
    const monthRegex = new RegExp(`\\b${name}\\b`, "i");
    if (monthRegex.test(queryLower)) {
      // Check if year is mentioned
      const yearMatch = queryLower.match(/\b(202\d)\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : currentYear;
      result.month = `${year}-${String(monthNum).padStart(2, "0")}`;
      break;
    }
  }

  // Extract category - fuzzy match against available categories
  const categoryLower = categories.map(c => c.toLowerCase());
  for (let i = 0; i < categories.length; i++) {
    const cat = categoryLower[i];
    // Check for exact or partial match
    if (queryLower.includes(cat) || cat.split(/\s+/).some(word => queryLower.includes(word) && word.length > 3)) {
      result.category = categories[i];
      break;
    }
  }

  // Common category aliases
  const categoryAliases: Record<string, string[]> = {
    "Food & Dining": ["food", "restaurant", "dining", "comida", "restaurante", "eating out"],
    "Groceries": ["grocery", "groceries", "supermarket", "supermercado", "mercado"],
    "Transportation": ["transport", "travel", "uber", "taxi", "transporte", "viaje"],
    "Shopping": ["shopping", "compras", "amazon", "tienda"],
    "Subscriptions": ["subscription", "subscriptions", "netflix", "spotify", "suscripción"],
    "Housing": ["rent", "housing", "alquiler", "vivienda", "hipoteca"],
    "Health": ["health", "medical", "pharmacy", "salud", "farmacia", "médico"],
    "Income": ["income", "salary", "ingreso", "salario", "nómina"],
  };

  if (!result.category) {
    for (const [catName, aliases] of Object.entries(categoryAliases)) {
      if (aliases.some(alias => queryLower.includes(alias))) {
        // Find matching category in available categories
        const match = categories.find(c => c.toLowerCase() === catName.toLowerCase());
        if (match) {
          result.category = match;
          break;
        }
      }
    }
  }

  // Extract search terms - remove recognized patterns to get the "search" part
  let searchText = queryLower
    .replace(/(?:over|above|more than|mayor que|más de)\s*[€$]?\s*\d+/gi, "")
    .replace(/(?:under|below|less than|menor que|menos de)\s*[€$]?\s*\d+/gi, "")
    .replace(/between\s*[€$]?\s*\d+\s*(?:and|y|-)\s*[€$]?\s*\d+/gi, "")
    .replace(/(?:most expensive|biggest|largest|sort by amount|ordenar por cantidad)/gi, "")
    .replace(/(?:this month|este mes|last month|mes pasado|el mes pasado)/gi, "")
    .replace(/\b(202\d)\b/g, "")
    .replace(/(?:in|en|from|de|during|durante)\s+/gi, " ");

  // Remove month names
  for (const name of Object.keys(MONTH_NAMES)) {
    searchText = searchText.replace(new RegExp(`\\b${name}\\b`, "gi"), "");
  }

  // Remove category name if found
  if (result.category) {
    searchText = searchText.replace(new RegExp(result.category, "gi"), "");
  }

  // Clean up and extract merchant/description search
  searchText = searchText.replace(/\s+/g, " ").trim();

  // Remove common query words
  searchText = searchText
    .replace(/\b(show|find|search|get|list|buscar|mostrar|ver|transactions?|transacciones?|purchases?|compras?|payments?|pagos?|spent|gastado|spending|gasto)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (searchText.length > 1) {
    result.search = searchText;
  }

  return result;
}

// Check if a query looks like natural language (vs simple keyword search)
export function isNaturalLanguageQuery(query: string): boolean {
  const nlIndicators = [
    /\b(show|find|search|get|list|buscar|mostrar|ver)\b/i,
    /\b(over|above|under|below|more than|less than|between)\b/i,
    /\b(this month|last month|este mes|mes pasado)\b/i,
    /\b(most expensive|biggest|sort by)\b/i,
    /\b(in|from|during)\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /\b(en|de|durante)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
  ];

  return nlIndicators.some(pattern => pattern.test(query));
}

// ============================================
// AI INSIGHTS GENERATION
// ============================================

export interface SpendingData {
  totalExpenses: number;
  totalIncome: number;
  savings: number;
  byCategory: Array<{
    categoryName: string;
    amount: number;
    percentOfTotal: number;
  }>;
  // Optional comparison data
  previousMonth?: {
    totalExpenses: number;
    totalIncome: number;
  };
  // Budget info
  budgetUsed?: number;
  budgetTotal?: number;
}

export async function generateSpendingInsights(
  data: SpendingData,
  monthLabel: string,
  onProgress?: LoadingCallback
): Promise<string> {
  // Build a structured prompt with pre-computed data
  const topCategories = data.byCategory
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const dataPoints: string[] = [];

  // Basic stats
  dataPoints.push(`Month: ${monthLabel}`);
  dataPoints.push(`Total spent: €${data.totalExpenses.toFixed(0)}`);
  dataPoints.push(`Total income: €${data.totalIncome.toFixed(0)}`);
  dataPoints.push(`Savings: €${data.savings.toFixed(0)} (${data.savings >= 0 ? "positive" : "negative"})`);

  // Top categories
  if (topCategories.length > 0) {
    dataPoints.push(`Top spending: ${topCategories.map(c => `${c.categoryName} €${c.amount.toFixed(0)} (${c.percentOfTotal.toFixed(0)}%)`).join(", ")}`);
  }

  // Month-over-month comparison
  if (data.previousMonth) {
    const expenseChange = data.totalExpenses - data.previousMonth.totalExpenses;
    const expenseChangePercent = data.previousMonth.totalExpenses > 0
      ? ((expenseChange / data.previousMonth.totalExpenses) * 100).toFixed(0)
      : "N/A";
    dataPoints.push(`vs last month: ${expenseChange >= 0 ? "+" : ""}€${expenseChange.toFixed(0)} (${expenseChangePercent}%)`);
  }

  // Budget status
  if (data.budgetTotal && data.budgetTotal > 0) {
    const budgetPercent = ((data.budgetUsed || 0) / data.budgetTotal * 100).toFixed(0);
    dataPoints.push(`Budget: ${budgetPercent}% used (€${data.budgetUsed?.toFixed(0) || 0} of €${data.budgetTotal.toFixed(0)})`);
  }

  await initWebLLM(onProgress);

  const systemPrompt = `You generate brief, friendly financial insights. Write 2-3 short sentences.
Rules:
- Be conversational, not formal
- Focus on the most notable observation
- If savings are negative, gently note it
- If spending increased significantly, mention it
- Keep it under 50 words total
- No bullet points, just flowing text
- Use € symbol for amounts`;

  const prompt = `Generate a brief insight from this spending data:
${dataPoints.join("\n")}

Write 2-3 sentences highlighting the most interesting observation:`;

  try {
    const response = await generateCompletion(prompt, systemPrompt);
    // Clean up response - remove quotes if present
    return response.replace(/^["']|["']$/g, "").trim();
  } catch (error) {
    console.error("[WebLLM] Insights generation failed:", error);
    // Fallback to a simple template-based insight
    return generateFallbackInsight(data, monthLabel);
  }
}

function generateFallbackInsight(data: SpendingData, monthLabel: string): string {
  const parts: string[] = [];

  if (data.savings >= 0) {
    parts.push(`You saved €${data.savings.toFixed(0)} in ${monthLabel}.`);
  } else {
    parts.push(`You spent €${Math.abs(data.savings).toFixed(0)} more than you earned in ${monthLabel}.`);
  }

  if (data.byCategory.length > 0) {
    const top = data.byCategory.sort((a, b) => b.amount - a.amount)[0];
    parts.push(`${top.categoryName} was your biggest expense at €${top.amount.toFixed(0)}.`);
  }

  return parts.join(" ");
}

function parseCategorizationResponse(
  response: string,
  categories: string[]
): CategorizationResult[] {
  const processItems = (items: object[]): CategorizationResult[] => {
    const results: CategorizationResult[] = [];
    for (const item of items) {
      const obj = item as Record<string, unknown>;
      const rawCategory = String(obj.category || "");
      const matchedCategory = findBestCategory(rawCategory, categories);

      if (matchedCategory) {
        results.push({
          index: Number(obj.index),
          category: matchedCategory,
          confidence: Math.min(1, Math.max(0, Number(obj.confidence) || 0.5)),
          merchant: obj.merchant ? String(obj.merchant).trim() : undefined,
        });
      } else if (rawCategory) {
        console.warn(`[WebLLM Parse] Unknown category "${rawCategory}", skipping`);
      }
    }
    return results;
  };

  try {
    // Find the JSON array start
    const startIdx = response.indexOf("[");
    if (startIdx === -1) {
      console.warn("[WebLLM Parse] No JSON array found in response");
      return [];
    }

    // Find matching bracket, accounting for strings
    let depth = 0;
    let endIdx = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = startIdx; i < response.length; i++) {
      const char = response[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === "[") depth++;
      else if (char === "]") {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }

    let jsonStr: string;
    const needsRecovery = endIdx === -1;

    if (needsRecovery) {
      // Array not properly closed - try to salvage
      jsonStr = response.slice(startIdx);

      // Find the last complete object by finding the last valid "}"
      const lastCompleteObject = jsonStr.lastIndexOf("}");
      if (lastCompleteObject > 0) {
        // Trim to last complete object and close the array
        jsonStr = jsonStr.slice(0, lastCompleteObject + 1) + "]";
      } else {
        // No complete objects, just close it
        jsonStr = jsonStr + "]";
      }
    } else {
      jsonStr = response.slice(startIdx, endIdx + 1);
    }

    // Try parsing as-is first
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return processItems(parsed);
      }
    } catch {
      // Try with sanitization
      try {
        const sanitized = sanitizeJson(jsonStr);
        const parsed = JSON.parse(sanitized);
        if (Array.isArray(parsed)) {
          return processItems(parsed);
        }
      } catch {
        // Silent - will try object extraction next
      }
    }

    // Fallback: extract individual objects
    const objects = extractJsonObjects(jsonStr);
    if (objects.length > 0) {
      return processItems(objects);
    }

    // Only warn if we couldn't recover anything
    if (needsRecovery) {
      console.warn("[WebLLM Parse] Could not recover any results from truncated response");
    }
  } catch (error) {
    console.error("[WebLLM Parse] Failed:", error);
  }
  return [];
}
