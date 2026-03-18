import { useState } from "react";
import { Icons } from "./Icons";
import { AuthSettings, AuthType } from "../utils/helpers";

interface AuthEditorProps {
  auth: AuthSettings;
  onChange: (auth: AuthSettings) => void;
}

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: "none", label: "No Auth" },
  { value: "basic", label: "Basic Auth" },
  { value: "bearer", label: "Bearer Token" },
  { value: "apikey", label: "API Key" },
];

const AUTH_PANEL_CLASS =
  "space-y-3 p-3 bg-ctp-surface0/50 rounded-lg border border-ctp-surface1";
const AUTH_INPUT_CLASS =
  "w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded text-sm outline-none focus:border-ctp-lavender placeholder:text-ctp-overlay0";

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const updateAuth = (updates: Partial<AuthSettings>) => {
    onChange({ ...auth, ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs text-ctp-text font-medium">Type</label>
        <div className="relative">
          <select
            value={auth.type}
            onChange={(e) => updateAuth({ type: e.target.value as AuthType })}
            className="w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-lg text-sm outline-none focus:border-ctp-lavender appearance-none cursor-pointer"
          >
            {AUTH_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <Icons.ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ctp-overlay0 pointer-events-none"
          />
        </div>
      </div>

      {auth.type === "basic" && (
        <div className={AUTH_PANEL_CLASS}>
          <div className="flex items-center gap-2 text-ctp-text">
            <Icons.Lock size={14} />
            <span className="text-xs font-medium">Basic Authentication</span>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={auth.username || ""}
              onChange={(e) => updateAuth({ username: e.target.value })}
              placeholder="Username"
              className={AUTH_INPUT_CLASS}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={auth.password || ""}
                onChange={(e) => updateAuth({ password: e.target.value })}
                placeholder="Password"
                className={`${AUTH_INPUT_CLASS} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ctp-overlay0 hover:text-ctp-text p-1"
              >
                {showPassword ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {auth.type === "bearer" && (
        <div className={AUTH_PANEL_CLASS}>
          <div className="flex items-center gap-2 text-ctp-text">
            <Icons.Key size={14} />
            <span className="text-xs font-medium">Bearer Token</span>
          </div>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={auth.token || ""}
              onChange={(e) => updateAuth({ token: e.target.value })}
              placeholder="Token"
              className={`${AUTH_INPUT_CLASS} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ctp-overlay0 hover:text-ctp-text p-1"
            >
              {showToken ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
            </button>
          </div>
        </div>
      )}

      {auth.type === "apikey" && (
        <div className={AUTH_PANEL_CLASS}>
          <div className="flex items-center gap-2 text-ctp-text">
            <Icons.Key size={14} />
            <span className="text-xs font-medium">API Key</span>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={auth.apiKeyName || ""}
              onChange={(e) => updateAuth({ apiKeyName: e.target.value })}
              placeholder="Key name (e.g., X-API-Key)"
              className={AUTH_INPUT_CLASS}
            />
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={auth.apiKeyValue || ""}
                onChange={(e) => updateAuth({ apiKeyValue: e.target.value })}
                placeholder="Key value"
                className={`${AUTH_INPUT_CLASS} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ctp-overlay0 hover:text-ctp-text p-1"
              >
                {showApiKey ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateAuth({ apiKeyLocation: "header" })}
                className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                  auth.apiKeyLocation === "header"
                    ? "bg-ctp-mauve/20 text-ctp-mauve border border-ctp-mauve"
                    : "bg-ctp-surface0 text-ctp-text border border-ctp-surface1 hover:border-ctp-surface2"
                }`}
              >
                Add to Header
              </button>
              <button
                onClick={() => updateAuth({ apiKeyLocation: "query" })}
                className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                  auth.apiKeyLocation === "query"
                    ? "bg-ctp-mauve/20 text-ctp-mauve border border-ctp-mauve"
                    : "bg-ctp-surface0 text-ctp-text border border-ctp-surface1 hover:border-ctp-surface2"
                }`}
              >
                Add to Query
              </button>
            </div>
          </div>
        </div>
      )}

      {auth.type === "none" && (
        <div className="p-4 text-center text-ctp-text text-sm">
          No authentication will be used for this request.
        </div>
      )}
    </div>
  );
}
