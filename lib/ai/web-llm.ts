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

interface CategorizationResult {
  index: number;
  category: string;
  confidence: number;
  merchant?: string;
}

export async function categorizeTransactionsWithWebLLM(
  transactions: TransactionInput[],
  categories: string[],
  onProgress?: LoadingCallback
): Promise<CategorizationResult[]> {
  await initWebLLM(onProgress);

  const systemPrompt = `You are a financial transaction categorizer. Respond ONLY with a JSON array, no other text.

Rules:
- Categorize by PURPOSE, not payment method
- Transfer/Bizum for rent → Housing
- Extract merchant name (e.g., "MERCADONA EL FONTAN" → "Mercadona")
- Confidence: 0.9 for clear, 0.7 for educated guess, 0.5 for uncertain`;

  const prompt = `Categories: ${categories.join(", ")}

Transactions:
${transactions.map((t, i) => `${i + 1}. "${t.description}" - ${t.amount}€`).join("\n")}

Respond with JSON array only:
[{"index": 1, "category": "CategoryName", "confidence": 0.9, "merchant": "Name"}]`;

  try {
    const response = await generateCompletion(prompt, systemPrompt);
    return parseCategorizationResponse(response);
  } catch (error) {
    console.error("WebLLM categorization failed:", error);
    return [];
  }
}

function parseCategorizationResponse(response: string): CategorizationResult[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          index: Number(item.index),
          category: String(item.category),
          confidence: Number(item.confidence) || 0.5,
          merchant: item.merchant ? String(item.merchant) : undefined,
        }));
      }
    }
  } catch (error) {
    console.error("Failed to parse response:", error);
  }
  return [];
}
