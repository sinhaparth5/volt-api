import {
  isWasmLoaded,
  wasmParseQueryParamsSync,
  wasmBuildUrlWithParamsSync,
  wasmEncodeFormDataSync,
  wasmBuildBasicAuthSync,
} from './wasm';

export const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

export type HTTPMethod = (typeof METHODS)[number];

// Key-value pair for headers and query params
export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

// Authentication types
export type AuthType = "none" | "basic" | "bearer" | "apikey";

// Body types
export type BodyType = "json" | "form-data" | "raw" | "none";

export interface AuthSettings {
  type: AuthType;
  username?: string;
  password?: string;
  token?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: "header" | "query";
}

// Generate unique ID for key-value pairs
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

// Create empty key-value pair
export const createEmptyPair = (): KeyValuePair => ({
  id: generateId(),
  key: "",
  value: "",
  enabled: true,
});

// Parse query params from URL
export const parseQueryParams = (url: string): KeyValuePair[] => {
  if (isWasmLoaded()) {
    const pairs = wasmParseQueryParamsSync(url).map((p) => ({
      id: generateId(),
      key: p.key,
      value: p.value,
      enabled: true,
    }));
    return pairs.length > 0 ? pairs : [createEmptyPair()];
  }
  try {
    const urlObj = new URL(url);
    const pairs: KeyValuePair[] = [];
    urlObj.searchParams.forEach((value, key) => {
      pairs.push({ id: generateId(), key, value, enabled: true });
    });
    return pairs.length > 0 ? pairs : [createEmptyPair()];
  } catch {
    return [createEmptyPair()];
  }
};

// Get base URL without query params
export const getBaseUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    // If URL is invalid, try to strip query string manually
    const queryIndex = url.indexOf("?");
    return queryIndex > -1 ? url.substring(0, queryIndex) : url;
  }
};

// Build URL with query params
export const buildUrlWithParams = (baseUrl: string, params: KeyValuePair[]): string => {
  if (isWasmLoaded()) {
    return wasmBuildUrlWithParamsSync(baseUrl, params);
  }
  const enabledParams = params.filter((p) => p.enabled && p.key.trim());
  if (enabledParams.length === 0) return baseUrl;
  try {
    const urlObj = new URL(baseUrl);
    urlObj.search = "";
    enabledParams.forEach((p) => urlObj.searchParams.append(p.key, p.value));
    return urlObj.toString();
  } catch {
    const queryString = enabledParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join("&");
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }
};

// Convert auth settings to headers
export const authToHeaders = (auth: AuthSettings): Record<string, string> => {
  switch (auth.type) {
    case "basic":
      if (auth.username && auth.password) {
        return { Authorization: wasmBuildBasicAuthSync(auth.username, auth.password) };
      }
      break;
    case "bearer":
      if (auth.token) {
        return { Authorization: `Bearer ${auth.token}` };
      }
      break;
    case "apikey":
      if (auth.apiKeyName && auth.apiKeyValue && auth.apiKeyLocation === "header") {
        return { [auth.apiKeyName]: auth.apiKeyValue };
      }
      break;
  }
  return {};
};

// Convert key-value pairs to headers object
export const keyValuePairsToHeaders = (pairs: KeyValuePair[]): Record<string, string> => {
  const headers: Record<string, string> = {};
  pairs
    .filter((p) => p.enabled && p.key.trim())
    .forEach((p) => {
      headers[p.key] = p.value;
    });
  return headers;
};

// Convert headers object to key-value pairs
export const headersToKeyValuePairs = (headers: Record<string, string>): KeyValuePair[] => {
  const pairs = Object.entries(headers).map(([key, value]) => ({
    id: generateId(),
    key,
    value,
    enabled: true,
  }));
  return pairs.length > 0 ? pairs : [createEmptyPair()];
};

// Default auth settings
export const defaultAuthSettings = (): AuthSettings => ({
  type: "none",
  apiKeyLocation: "header",
});

export const formatJSON = (str: string): string => {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
};

export const getStatusColor = (code: number): string => {
  if (code >= 200 && code < 300) return "text-ctp-green";
  if (code >= 300 && code < 400) return "text-ctp-yellow";
  if (code >= 400 && code < 500) return "text-ctp-peach";
  return "text-ctp-red";
};

export const getMethodColor = (method: string): string => {
  switch (method) {
    case "GET": return "text-ctp-green";
    case "POST": return "text-ctp-blue";
    case "PUT": return "text-ctp-peach";
    case "DELETE": return "text-ctp-red";
    case "PATCH": return "text-ctp-mauve";
    default: return "text-ctp-text";
  }
};

export const getMethodBg = (method: string): string => {
  switch (method) {
    case "GET": return "bg-ctp-green/10 border-ctp-green/30";
    case "POST": return "bg-ctp-blue/10 border-ctp-blue/30";
    case "PUT": return "bg-ctp-peach/10 border-ctp-peach/30";
    case "DELETE": return "bg-ctp-red/10 border-ctp-red/30";
    case "PATCH": return "bg-ctp-mauve/10 border-ctp-mauve/30";
    default: return "bg-ctp-surface0 border-ctp-surface1";
  }
};

// Convert form data key-value pairs to URL encoded string
export const formDataToUrlEncoded = (pairs: KeyValuePair[]): string => {
  if (isWasmLoaded()) {
    return wasmEncodeFormDataSync(pairs);
  }
  return pairs
    .filter((p) => p.enabled && p.key.trim())
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
};

// Get content type header based on body type
export const getContentTypeHeader = (bodyType: BodyType): Record<string, string> => {
  switch (bodyType) {
    case "json":
      return { "Content-Type": "application/json" };
    case "form-data":
      return { "Content-Type": "application/x-www-form-urlencoded" };
    case "raw":
      return { "Content-Type": "text/plain" };
    default:
      return {};
  }
};

// ============================================================================
// Variable Substitution
// ============================================================================

// Regex to match {{variableName}} patterns
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

// Substitute variables in a string using the provided variables map
export const substituteVariables = (
  text: string,
  variables: Record<string, string>
): string => {
  if (!text || !variables || Object.keys(variables).length === 0) {
    return text;
  }

  return text.replace(VARIABLE_PATTERN, (match, varName) => {
    const trimmedName = varName.trim();
    return variables[trimmedName] !== undefined ? variables[trimmedName] : match;
  });
};

// Substitute variables in headers
export const substituteHeaderVariables = (
  headers: Record<string, string>,
  variables: Record<string, string>
): Record<string, string> => {
  if (!headers || !variables || Object.keys(variables).length === 0) {
    return headers;
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    result[substituteVariables(key, variables)] = substituteVariables(value, variables);
  }
  return result;
};

// Find all variables used in a string
export const findVariables = (text: string): string[] => {
  if (!text) return [];

  const matches: string[] = [];
  let match;
  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    const varName = match[1].trim();
    if (!matches.includes(varName)) {
      matches.push(varName);
    }
  }
  // Reset regex state
  VARIABLE_PATTERN.lastIndex = 0;
  return matches;
};

// Check if a string contains any variables
export const hasVariables = (text: string): boolean => {
  if (!text) return false;
  VARIABLE_PATTERN.lastIndex = 0;
  return VARIABLE_PATTERN.test(text);
};

// Preview substitution result - returns original with substitutions highlighted
export const previewSubstitution = (
  text: string,
  variables: Record<string, string>
): { original: string; substituted: string; hasUnresolved: boolean } => {
  const substituted = substituteVariables(text, variables);
  const hasUnresolved = hasVariables(substituted);
  return { original: text, substituted, hasUnresolved };
};
