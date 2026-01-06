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
  const enabledRules = rules
    .filter((r) => r.isEnabled)
    .sort((a, b) => b.priority - a.priority);

  const matches: RuleMatchResult[] = [];
  const matchedIndices = new Set<number>();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const descUpper = tx.description.toUpperCase();

    for (const rule of enabledRules) {
      let isMatch = true;

      // Check description contains (case-insensitive)
      if (rule.descriptionContains) {
        if (!descUpper.includes(rule.descriptionContains.toUpperCase())) {
          isMatch = false;
        }
      }

      // Check exact amount
      if (rule.amountEquals !== undefined && isMatch) {
        if (Math.abs(tx.amount - rule.amountEquals) > 0.01) {
          isMatch = false;
        }
      }

      // Check amount range
      if (rule.amountMin !== undefined && isMatch) {
        if (tx.amount < rule.amountMin) {
          isMatch = false;
        }
      }

      if (rule.amountMax !== undefined && isMatch) {
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

  // Optimized system prompt for small models (Llama 3.2 3B)
  // Key principles: explicit patterns, deterministic rules, few-shot examples
  const systemPrompt = `You categorize Spanish bank transactions. Output ONLY valid JSON array.

CATEGORY RULES (use these patterns):
Groceries: mercadona, carrefour, lidl, aldi, dia, eroski, supermercado
Food & Dining: restaurante, bar, cafe, sibelius, kebab, pizza, burger
Health: farmacia, clinica, hospital, medico, optica
Subscriptions: netflix, spotify, hbo, disney, google one, claude.ai, amazon prime, masmovil, movistar, vodafone, xfera
Shopping: amazon (not prime), aliexpress, xiaomi, mediamarkt, zara, hm
Transfer: transferencia realizada, transferencia recibida, western union, bizum envio, r3mit, remesa
Income: nomina, salario, abono transferencia +large amount
Housing: alquiler, hipoteca, rent
Utilities: luz, agua, gas, electricidad, endesa, iberdrola (not telecom)
Transportation: uber, cabify, taxi, parking, gasolina, renfe
Entertainment: cine, teatro, spotify (if not subscription)
Other: comisiones, intereses, seguridad social, tgss, hacienda, bank fees

OUTPUT FORMAT (exactly this):
[{"index":1,"category":"Groceries","confidence":0.9,"merchant":"Mercadona"}]

CONFIDENCE:
- 0.9: Pattern clearly matches (mercadona→Groceries)
- 0.7: Likely match but not certain
- 0.5: Guessing, no clear pattern

RULES:
- Use EXACT category names from the list provided
- Extract merchant name: "Mercadona el fontan oviedo" → "Mercadona"
- If unsure, use "Other" with confidence 0.5
- Output JSON array only, no text before or after`;

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

    // Build the prompt with few-shot example for better model guidance
    const prompt = `Categories: ${categories.join(", ")}
${userExamplesSection}
Transactions:
${txList}

Example output for "1. Mercadona el fontan (-45.50)" and "2. Claude.ai subscription (-18.00)":
[{"index":1,"category":"Groceries","confidence":0.9,"merchant":"Mercadona"},{"index":2,"category":"Subscriptions","confidence":0.9,"merchant":"Claude.ai"}]

Now categorize the transactions above. Output JSON array only:`;

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
