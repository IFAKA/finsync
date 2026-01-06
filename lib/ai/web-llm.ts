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
    temperature: 0.3,
    max_tokens: 1024,
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
  let examplesSection = "";
  if (categoryExamples && categoryExamples.length > 0) {
    const exampleLines = categoryExamples
      .filter((ce) => ce.examples.length > 0)
      .map((ce) => `${ce.category}: ${ce.examples.slice(0, 3).join(", ")}`)
      .join("\n");
    if (exampleLines) {
      examplesSection = `\nExamples:\n${exampleLines}\n`;
    }
  }

  const systemPrompt = `You categorize bank transactions into categories. Output ONLY a JSON array.

Instructions:
- Match by merchant/purpose, not amount
- Extract clean merchant name from description
- Confidence: 0.9=obvious match, 0.7=likely, 0.5=guess
- Use exact category names provided
${examplesSection}
Respond with JSON array only, no explanation.`;

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

    const prompt = `Categories: ${categories.join(", ")}

Transactions:
${txList}

Output format: [{"index":1,"category":"CategoryName","confidence":0.9,"merchant":"Name"}]`;

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

  // Replace single quotes with double quotes (but not inside strings)
  // This handles: {'key': 'value'} -> {"key": "value"}
  result = result.replace(/'/g, '"');

  // Fix unquoted property names: {index: 1} -> {"index": 1}
  result = result.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');

  // Remove trailing commas before ] or }
  result = result.replace(/,(\s*[}\]])/g, "$1");

  // Fix missing commas between objects: }{  -> },{
  result = result.replace(/}(\s*){/g, "},$1{");

  return result;
}

function parseCategorizationResponse(
  response: string,
  categories: string[]
): CategorizationResult[] {
  try {
    // Find the JSON array by matching balanced brackets
    const startIdx = response.indexOf("[");
    if (startIdx === -1) {
      console.warn("[WebLLM Parse] No JSON array found in response");
      return [];
    }

    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < response.length; i++) {
      if (response[i] === "[") depth++;
      else if (response[i] === "]") {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }

    if (endIdx === -1) {
      console.warn("[WebLLM Parse] Unbalanced brackets in response");
      return [];
    }

    let jsonStr = response.slice(startIdx, endIdx + 1);

    // Try parsing as-is first, then sanitized
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      jsonStr = sanitizeJson(jsonStr);
      parsed = JSON.parse(jsonStr);
    }

    if (Array.isArray(parsed)) {
      const results: CategorizationResult[] = [];

      for (const item of parsed) {
        const rawCategory = String(item.category || "");
        const matchedCategory = findBestCategory(rawCategory, categories);

        if (matchedCategory) {
          results.push({
            index: Number(item.index),
            category: matchedCategory,
            confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.5)),
            merchant: item.merchant ? String(item.merchant).trim() : undefined,
          });
        } else {
          console.warn(`[WebLLM Parse] Unknown category "${rawCategory}", skipping`);
        }
      }

      return results;
    }
  } catch (error) {
    console.error("[WebLLM Parse] Failed:", error);
  }
  return [];
}
