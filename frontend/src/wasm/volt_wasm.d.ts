/* tslint:disable */
/* eslint-disable */

/**
 * Find all variable names used in a string.
 * Returns JSON array of variable names.
 */
export function find_variables(text: string): string;

/**
 * Check if a string contains any {{variable}} patterns.
 */
export function has_variables(text: string): boolean;

export function init(): void;

/**
 * Extract a value from JSON using dot notation path (e.g., "data.users[0].name").
 * Returns the extracted value as a JSON string, or "undefined" if not found.
 */
export function json_extract(json_str: string, path: string): string;

/**
 * Extract multiple values from JSON at once.
 * paths_json is a JSON array of paths.
 * Returns JSON object mapping paths to extracted values.
 */
export function json_extract_batch(json_str: string, paths_json: string): string;

/**
 * Format/pretty-print JSON string.
 */
export function json_format(json_str: string): string;

/**
 * Get JSON size info (for large response handling).
 */
export function json_info(json_str: string): string;

/**
 * Minify JSON (remove whitespace).
 */
export function json_minify(json_str: string): string;

/**
 * Validate if a string is valid JSON.
 */
export function json_validate(json_str: string): boolean;

/**
 * Run all assertions against response data.
 * assertions_json: JSON array of assertion objects
 * response_json: JSON object with statusCode, headers, body, timingMs
 * Returns JSON array of assertion results.
 */
export function run_assertions(assertions_json: string, response_json: string): string;

/**
 * Substitutes {{variable}} patterns in a string with values from the provided map.
 * Returns the substituted string.
 */
export function substitute_variables(text: string, variables_json: string): string;

/**
 * Batch substitute variables in multiple strings at once.
 * Returns JSON array of substituted strings.
 */
export function substitute_variables_batch(texts_json: string, variables_json: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly find_variables: (a: number, b: number) => [number, number];
    readonly has_variables: (a: number, b: number) => number;
    readonly init: () => void;
    readonly json_extract: (a: number, b: number, c: number, d: number) => [number, number];
    readonly json_extract_batch: (a: number, b: number, c: number, d: number) => [number, number];
    readonly json_format: (a: number, b: number) => [number, number];
    readonly json_info: (a: number, b: number) => [number, number];
    readonly json_minify: (a: number, b: number) => [number, number];
    readonly json_validate: (a: number, b: number) => number;
    readonly run_assertions: (a: number, b: number, c: number, d: number) => [number, number];
    readonly substitute_variables: (a: number, b: number, c: number, d: number) => [number, number];
    readonly substitute_variables_batch: (a: number, b: number, c: number, d: number) => [number, number];
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
