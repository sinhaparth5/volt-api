export const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

export type HTTPMethod = (typeof METHODS)[number];

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
