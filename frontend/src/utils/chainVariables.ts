export interface ChainVariable {
  id: string;
  name: string;
  value: string;
  source: string;
  createdAt: number;
}

export const extractJsonValue = (json: string, path: string): string | null => {
  if (!path.trim()) return null;

  try {
    const obj = JSON.parse(json);
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return null;

      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = (current as Record<string, unknown>)[key];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return null;
        }
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    if (current === null || current === undefined) return null;

    if (typeof current === "object") {
      return JSON.stringify(current);
    }
    return String(current);
  } catch {
    return null;
  }
};

export const extractHeaderValue = (headers: Record<string, string>, headerName: string): string | null => {
  const lowerName = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  return null;
};

export const extractRegexValue = (text: string, pattern: string): string | null => {
  try {
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    if (match) {
      return match[1] ?? match[0];
    }
    return null;
  } catch {
    return null;
  }
};

export type ExtractionType = "json" | "header" | "regex" | "status" | "body";

export interface ExtractionConfig {
  type: ExtractionType;
  path: string;
  variableName: string;
}

export const extractValue = (
  config: ExtractionConfig,
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  }
): string | null => {
  switch (config.type) {
    case "json":
      return extractJsonValue(response.body, config.path);
    case "header":
      return extractHeaderValue(response.headers, config.path);
    case "regex":
      return extractRegexValue(response.body, config.path);
    case "status":
      return String(response.statusCode);
    case "body":
      return response.body;
    default:
      return null;
  }
};

export const generateChainId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
