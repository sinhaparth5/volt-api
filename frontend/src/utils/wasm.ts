/**
 * WASM Core - High-performance operations via Rust/WebAssembly
 *
 * Provides optimized implementations for:
 * - Variable substitution (regex-based {{var}} replacement)
 * - JSON processing (parsing, formatting, extraction)
 * - Assertion evaluation (batch evaluation with single JSON parse)
 */

import type { Assertion, AssertionResult, ResponseData } from './assertions';

// Lazy-loaded WASM module
let wasmModule: typeof import('../wasm/volt_wasm') | null = null;
let wasmLoadPromise: Promise<typeof import('../wasm/volt_wasm')> | null = null;

/**
 * Initialize and load the WASM module (lazy loaded on first use)
 */
async function loadWasm(): Promise<typeof import('../wasm/volt_wasm')> {
  if (wasmModule) {
    return wasmModule;
  }

  if (wasmLoadPromise) {
    return wasmLoadPromise;
  }

  wasmLoadPromise = (async () => {
    const wasm = await import('../wasm/volt_wasm');
    await wasm.default(); // Initialize WASM
    wasmModule = wasm;
    return wasm;
  })();

  return wasmLoadPromise;
}

/**
 * Check if WASM is already loaded
 */
export function isWasmLoaded(): boolean {
  return wasmModule !== null;
}

/**
 * Preload WASM module (call early for better performance)
 */
export async function preloadWasm(): Promise<void> {
  await loadWasm();
}

// ============================================================================
// Variable Substitution
// ============================================================================

/**
 * Substitute {{variable}} patterns in a string using WASM
 */
export async function wasmSubstituteVariables(
  text: string,
  variables: Record<string, string>
): Promise<string> {
  const wasm = await loadWasm();
  return wasm.substitute_variables(text, JSON.stringify(variables));
}

/**
 * Batch substitute variables in multiple strings
 */
export async function wasmSubstituteVariablesBatch(
  texts: string[],
  variables: Record<string, string>
): Promise<string[]> {
  const wasm = await loadWasm();
  const result = wasm.substitute_variables_batch(
    JSON.stringify(texts),
    JSON.stringify(variables)
  );
  return JSON.parse(result);
}

/**
 * Find all variable names in a string
 */
export async function wasmFindVariables(text: string): Promise<string[]> {
  const wasm = await loadWasm();
  return JSON.parse(wasm.find_variables(text));
}

/**
 * Check if a string contains any {{variable}} patterns
 */
export async function wasmHasVariables(text: string): Promise<boolean> {
  const wasm = await loadWasm();
  return wasm.has_variables(text);
}

// ============================================================================
// JSON Processing
// ============================================================================

/**
 * Extract a value from JSON using dot notation path
 */
export async function wasmJsonExtract(json: string, path: string): Promise<string> {
  const wasm = await loadWasm();
  return wasm.json_extract(json, path);
}

/**
 * Extract multiple values from JSON at once
 */
export async function wasmJsonExtractBatch(
  json: string,
  paths: string[]
): Promise<Record<string, unknown>> {
  const wasm = await loadWasm();
  const result = wasm.json_extract_batch(json, JSON.stringify(paths));
  return JSON.parse(result);
}

/**
 * Format/pretty-print JSON
 */
export async function wasmJsonFormat(json: string): Promise<string> {
  const wasm = await loadWasm();
  return wasm.json_format(json);
}

/**
 * Minify JSON (remove whitespace)
 */
export async function wasmJsonMinify(json: string): Promise<string> {
  const wasm = await loadWasm();
  return wasm.json_minify(json);
}

/**
 * Validate if a string is valid JSON
 */
export async function wasmJsonValidate(json: string): Promise<boolean> {
  const wasm = await loadWasm();
  return wasm.json_validate(json);
}

/**
 * Get JSON metadata (size, type, depth, etc.)
 */
export async function wasmJsonInfo(json: string): Promise<{
  valid: boolean;
  size: number;
  type?: string;
  depth?: number;
  keys?: number;
  length?: number;
}> {
  const wasm = await loadWasm();
  return JSON.parse(wasm.json_info(json));
}

// ============================================================================
// Assertion Evaluation
// ============================================================================

/**
 * Run all assertions against response data using WASM
 * This is significantly faster for large responses with multiple assertions
 * because it only parses the JSON once
 */
export async function wasmRunAssertions(
  assertions: Assertion[],
  response: ResponseData
): Promise<AssertionResult[]> {
  const wasm = await loadWasm();
  const result = wasm.run_assertions(
    JSON.stringify(assertions),
    JSON.stringify(response)
  );
  return JSON.parse(result);
}

// ============================================================================
// Sync versions (only use if WASM is definitely loaded)
// ============================================================================

/**
 * Sync version of substituteVariables - only use if you've called preloadWasm()
 */
export function wasmSubstituteVariablesSync(
  text: string,
  variables: Record<string, string>
): string {
  if (!wasmModule) {
    throw new Error('WASM not loaded. Call preloadWasm() first.');
  }
  return wasmModule.substitute_variables(text, JSON.stringify(variables));
}

/**
 * Sync version of jsonFormat - only use if you've called preloadWasm()
 */
export function wasmJsonFormatSync(json: string): string {
  if (!wasmModule) {
    throw new Error('WASM not loaded. Call preloadWasm() first.');
  }
  return wasmModule.json_format(json);
}

/**
 * Sync version of hasVariables - only use if you've called preloadWasm()
 */
export function wasmHasVariablesSync(text: string): boolean {
  if (!wasmModule) {
    throw new Error('WASM not loaded. Call preloadWasm() first.');
  }
  return wasmModule.has_variables(text);
}

/**
 * Sync version of runAssertions - only use if you've called preloadWasm()
 */
export function wasmRunAssertionsSync(
  assertions: Assertion[],
  response: ResponseData
): AssertionResult[] {
  if (!wasmModule) {
    throw new Error('WASM not loaded. Call preloadWasm() first.');
  }
  const result = wasmModule.run_assertions(
    JSON.stringify(assertions),
    JSON.stringify(response)
  );
  return JSON.parse(result);
}
