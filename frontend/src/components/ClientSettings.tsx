import { useState, useEffect } from "react";
import { Icons } from "./Icons";

// Popular User-Agent strings
export const USER_AGENTS = {
  "Default (Volt-API)": "",
  "Chrome (Windows)": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Chrome (macOS)": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Chrome (Linux)": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Firefox (Windows)": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Firefox (macOS)": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Firefox (Linux)": "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Safari (macOS)": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Safari (iOS)": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Edge (Windows)": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  "Postman": "PostmanRuntime/7.36.0",
  "curl": "curl/8.4.0",
  "Insomnia": "insomnia/8.5.1",
  "httpie": "HTTPie/3.2.2",
  "Python Requests": "python-requests/2.31.0",
  "Node.js Axios": "axios/1.6.2",
  "Go HTTP Client": "Go-http-client/2.0",
} as const;

export type UserAgentKey = keyof typeof USER_AGENTS;

export interface ProxySettings {
  enabled: boolean;
  url: string;
}

export interface SSLSettings {
  skipVerify: boolean;
  clientCertPath: string;
  clientKeyPath: string;
}

export interface RedirectSettings {
  follow: boolean;
  maxRedirects: number;
}

interface ClientSettingsProps {
  userAgent: string;
  proxy: ProxySettings;
  ssl: SSLSettings;
  redirects: RedirectSettings;
  onUserAgentChange: (userAgent: string) => void;
  onProxyChange: (proxy: ProxySettings) => void;
  onSSLChange: (ssl: SSLSettings) => void;
  onRedirectsChange: (redirects: RedirectSettings) => void;
}

export function ClientSettings({
  userAgent,
  proxy,
  ssl,
  redirects,
  onUserAgentChange,
  onProxyChange,
  onSSLChange,
  onRedirectsChange,
}: ClientSettingsProps) {
  const [selectedKey, setSelectedKey] = useState<UserAgentKey>("Default (Volt-API)");
  const [customAgent, setCustomAgent] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [clientInfo, setClientInfo] = useState<{
    platform: string;
    language: string;
    screenSize: string;
  } | null>(null);

  // Detect current selection from userAgent value
  useEffect(() => {
    if (!userAgent) {
      setSelectedKey("Default (Volt-API)");
      setIsCustom(false);
      return;
    }

    // Check if it matches a preset
    const matchingKey = Object.entries(USER_AGENTS).find(
      ([, value]) => value === userAgent
    )?.[0] as UserAgentKey | undefined;

    if (matchingKey) {
      setSelectedKey(matchingKey);
      setIsCustom(false);
    } else {
      setIsCustom(true);
      setCustomAgent(userAgent);
    }
  }, [userAgent]);

  // Get client info on mount
  useEffect(() => {
    setClientInfo({
      platform: navigator.platform || "Unknown",
      language: navigator.language || "Unknown",
      screenSize: `${window.screen.width}x${window.screen.height}`,
    });
  }, []);

  const handleSelectChange = (key: UserAgentKey) => {
    setSelectedKey(key);
    setIsCustom(false);
    onUserAgentChange(USER_AGENTS[key]);
  };

  const handleCustomChange = (value: string) => {
    setCustomAgent(value);
    setIsCustom(true);
    onUserAgentChange(value);
  };

  const getCurrentUserAgent = (): string => {
    if (isCustom) return customAgent;
    if (selectedKey === "Default (Volt-API)") return "Volt-API/dev";
    return USER_AGENTS[selectedKey];
  };

  return (
    <div className="space-y-6">
      {/* User-Agent Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Icons.Globe size={12} />
          <span>User-Agent</span>
        </div>

        {/* Preset Selector */}
        <select
          value={isCustom ? "" : selectedKey}
          onChange={(e) => handleSelectChange(e.target.value as UserAgentKey)}
          className="w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text"
        >
          {Object.keys(USER_AGENTS).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
          {isCustom && <option value="">Custom</option>}
        </select>

        {/* Custom Input */}
        <div className="space-y-1">
          <label className="text-xs text-ctp-overlay0">Custom User-Agent:</label>
          <input
            type="text"
            value={isCustom ? customAgent : ""}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Enter custom User-Agent string..."
            className="w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
          />
        </div>

        {/* Current Value Preview */}
        <div className="p-3 bg-ctp-surface0/50 rounded-md border border-ctp-surface0">
          <div className="text-xs text-ctp-overlay0 mb-1">Will be sent as:</div>
          <code className="text-xs text-ctp-green break-all">{getCurrentUserAgent()}</code>
        </div>
      </div>

      {/* Client Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Icons.Settings size={12} />
          <span>Client Information</span>
        </div>

        <div className="grid gap-2">
          {clientInfo && (
            <>
              <div className="flex items-center justify-between p-2 bg-ctp-surface0/30 rounded-md">
                <span className="text-xs text-ctp-subtext0">Platform</span>
                <span className="text-xs text-ctp-text">{clientInfo.platform}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-ctp-surface0/30 rounded-md">
                <span className="text-xs text-ctp-subtext0">Language</span>
                <span className="text-xs text-ctp-text">{clientInfo.language}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-ctp-surface0/30 rounded-md">
                <span className="text-xs text-ctp-subtext0">Screen Size</span>
                <span className="text-xs text-ctp-text">{clientInfo.screenSize}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Proxy Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Icons.Globe size={12} />
          <span>Proxy</span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={proxy.enabled}
            onChange={(e) => onProxyChange({ ...proxy, enabled: e.target.checked })}
            className="w-4 h-4 rounded border-ctp-surface1 bg-ctp-surface0 text-ctp-mauve focus:ring-ctp-mauve focus:ring-offset-0"
          />
          <span className="text-xs text-ctp-text">Use Proxy</span>
        </label>

        {proxy.enabled && (
          <input
            type="text"
            value={proxy.url}
            onChange={(e) => onProxyChange({ ...proxy, url: e.target.value })}
            placeholder="http://localhost:8080"
            className="w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
          />
        )}
      </div>

      {/* SSL Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Icons.Lock size={12} />
          <span>SSL / TLS</span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={ssl.skipVerify}
            onChange={(e) => onSSLChange({ ...ssl, skipVerify: e.target.checked })}
            className="w-4 h-4 rounded border-ctp-surface1 bg-ctp-surface0 text-ctp-mauve focus:ring-ctp-mauve focus:ring-offset-0"
          />
          <span className="text-xs text-ctp-text">Skip SSL Certificate Verification</span>
        </label>

        {ssl.skipVerify && (
          <div className="p-2 bg-ctp-peach/10 border border-ctp-peach/30 rounded-md">
            <div className="flex items-start gap-2">
              <Icons.AlertTriangle size={12} className="text-ctp-peach mt-0.5 flex-shrink-0" />
              <span className="text-xs text-ctp-peach">
                Warning: Disabling SSL verification makes connections insecure. Only use for testing.
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs text-ctp-overlay0">Client Certificate (optional):</label>
          <input
            type="text"
            value={ssl.clientCertPath}
            onChange={(e) => onSSLChange({ ...ssl, clientCertPath: e.target.value })}
            placeholder="/path/to/client.crt"
            className="w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
          />
          <input
            type="text"
            value={ssl.clientKeyPath}
            onChange={(e) => onSSLChange({ ...ssl, clientKeyPath: e.target.value })}
            placeholder="/path/to/client.key"
            className="w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
          />
        </div>
      </div>

      {/* Redirect Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Icons.ArrowRight size={12} />
          <span>Redirects</span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={redirects.follow}
            onChange={(e) => onRedirectsChange({ ...redirects, follow: e.target.checked })}
            className="w-4 h-4 rounded border-ctp-surface1 bg-ctp-surface0 text-ctp-mauve focus:ring-ctp-mauve focus:ring-offset-0"
          />
          <span className="text-xs text-ctp-text">Follow Redirects</span>
        </label>

        {redirects.follow && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-ctp-overlay0">Max Redirects:</label>
            <input
              type="number"
              value={redirects.maxRedirects}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 0 && val <= 50) {
                  onRedirectsChange({ ...redirects, maxRedirects: val });
                }
              }}
              min={0}
              max={50}
              className="w-16 bg-ctp-surface0 border border-ctp-surface1 px-2 py-1 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text text-center"
            />
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="p-3 bg-ctp-blue/10 border border-ctp-blue/20 rounded-md">
        <div className="flex items-start gap-2">
          <Icons.Bolt size={12} className="text-ctp-blue mt-0.5" />
          <div className="text-xs text-ctp-blue">
            <p className="font-medium mb-1">Tips:</p>
            <ul className="list-disc list-inside space-y-0.5 text-ctp-blue/80">
              <li>Use proxy to debug requests with tools like Burp or mitmproxy</li>
              <li>Skip SSL only for local/development APIs</li>
              <li>Client certs are for mTLS authentication</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
