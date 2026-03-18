import type { Assertion, AssertionResult, ResponseData } from "./assertions";

type WasmModule = typeof import("../wasm/volt_wasm");
type QueryParam = { key: string; value: string };
type EnabledPair = { key: string; value: string; enabled: boolean };
type ParsedCookie = {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  maxAge?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
};

let wasmModule: typeof import("../wasm/volt_wasm") | null = null;
let wasmLoadPromise: Promise<WasmModule> | null = null;

async function loadWasm(): Promise<WasmModule> {
  if (wasmModule) {
    return wasmModule;
  }

  if (wasmLoadPromise) {
    return wasmLoadPromise;
  }

  wasmLoadPromise = (async () => {
    const wasm = await import("../wasm/volt_wasm");
    await wasm.default();
    wasmModule = wasm;
    return wasm;
  })();

  return wasmLoadPromise;
}

function requireWasm(): WasmModule {
  if (!wasmModule) {
    throw new Error("WASM not loaded. Call preloadWasm() first.");
  }
  return wasmModule;
}

export function isWasmLoaded(): boolean {
  return wasmModule !== null;
}

export async function preloadWasm(): Promise<void> {
  await loadWasm();
}

export async function wasmSubstituteVariables(
  text: string,
  variables: Record<string, string>
): Promise<string> {
  const wasm = await loadWasm();
  return wasm.substitute_variables(text, JSON.stringify(variables));
}

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

export async function wasmFindVariables(text: string): Promise<string[]> {
  const wasm = await loadWasm();
  return JSON.parse(wasm.find_variables(text));
}

export async function wasmHasVariables(text: string): Promise<boolean> {
  const wasm = await loadWasm();
  return wasm.has_variables(text);
}

export async function wasmJsonExtract(json: string, path: string): Promise<string> {
  const wasm = await loadWasm();
  return wasm.json_extract(json, path);
}

export async function wasmJsonExtractBatch(
  json: string,
  paths: string[]
): Promise<Record<string, unknown>> {
  const wasm = await loadWasm();
  const result = wasm.json_extract_batch(json, JSON.stringify(paths));
  return JSON.parse(result);
}

export async function wasmJsonFormat(json: string): Promise<string> {
  const wasm = await loadWasm();
  return wasm.json_format(json);
}

export async function wasmJsonMinify(json: string): Promise<string> {
  const wasm = await loadWasm();
  return wasm.json_minify(json);
}

export async function wasmJsonValidate(json: string): Promise<boolean> {
  const wasm = await loadWasm();
  return wasm.json_validate(json);
}

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

export async function wasmParseQueryParams(url: string): Promise<QueryParam[]> {
  const wasm = await loadWasm();
  return JSON.parse(wasm.parse_query_params(url));
}

export async function wasmBuildUrlWithParams(
  baseUrl: string,
  params: EnabledPair[]
): Promise<string> {
  const wasm = await loadWasm();
  return wasm.build_url_with_params(baseUrl, JSON.stringify(params));
}

export async function wasmEncodeFormData(
  pairs: EnabledPair[]
): Promise<string> {
  const wasm = await loadWasm();
  return wasm.encode_form_data(JSON.stringify(pairs));
}

export async function wasmBuildBasicAuth(username: string, password: string): Promise<string> {
  const wasm = await loadWasm();
  return wasm.build_basic_auth(username, password);
}

export async function wasmParseCookies(
  headers: Record<string, string>
): Promise<ParsedCookie[]> {
  const wasm = await loadWasm();
  return JSON.parse(wasm.parse_cookies(JSON.stringify(headers)));
}

export function wasmSubstituteVariablesSync(
  text: string,
  variables: Record<string, string>
): string {
  return requireWasm().substitute_variables(text, JSON.stringify(variables));
}

export function wasmJsonFormatSync(json: string): string {
  return requireWasm().json_format(json);
}

export function wasmHasVariablesSync(text: string): boolean {
  return requireWasm().has_variables(text);
}

export function wasmRunAssertionsSync(
  assertions: Assertion[],
  response: ResponseData
): AssertionResult[] {
  const result = requireWasm().run_assertions(
    JSON.stringify(assertions),
    JSON.stringify(response)
  );
  return JSON.parse(result);
}

export function wasmParseQueryParamsSync(url: string): QueryParam[] {
  if (!wasmModule) return [];
  return JSON.parse(wasmModule.parse_query_params(url));
}

export function wasmBuildUrlWithParamsSync(
  baseUrl: string,
  params: EnabledPair[]
): string {
  if (!wasmModule) return baseUrl;
  return wasmModule.build_url_with_params(baseUrl, JSON.stringify(params));
}

export function wasmEncodeFormDataSync(
  pairs: EnabledPair[]
): string {
  if (!wasmModule) return "";
  return wasmModule.encode_form_data(JSON.stringify(pairs));
}

export function wasmBuildBasicAuthSync(username: string, password: string): string {
  if (!wasmModule) return `Basic ${btoa(`${username}:${password}`)}`;
  return wasmModule.build_basic_auth(username, password);
}

export function wasmParseCookiesSync(headers: Record<string, string>): ParsedCookie[] {
  if (!wasmModule) return [];
  return JSON.parse(wasmModule.parse_cookies(JSON.stringify(headers)));
}
