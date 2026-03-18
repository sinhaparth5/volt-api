import { useState, useEffect } from "react";
import { Icons } from "./Icons";

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
type ClientInfo = {
  platform: string;
  language: string;
  screenSize: string;
};

const DEFAULT_USER_AGENT_KEY: UserAgentKey = "Default (Volt-API)";
const DEFAULT_USER_AGENT_VALUE = "Volt-API/dev";
const TIMEOUT_MIN_SECONDS = 1;
const TIMEOUT_MAX_SECONDS = 300;
const REDIRECT_MIN = 0;
const REDIRECT_MAX = 50;
const SECTION_TITLE_CLASS = "flex items-center gap-2 text-xs text-ctp-text";
const TEXT_INPUT_CLASS =
  "w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0";
const INFO_ROW_CLASS = "flex items-center justify-between p-2 bg-ctp-surface0/30 rounded-md";
const TOGGLE_LABEL_CLASS = "flex items-center gap-2 cursor-pointer";
const TOGGLE_INPUT_CLASS =
  "w-4 h-4 rounded border-ctp-surface1 bg-ctp-surface0 text-ctp-mauve focus:ring-ctp-mauve focus:ring-offset-0";
const FIELD_LABEL_CLASS = "text-xs text-ctp-text";
const INFO_TEXT_CLASS = "text-xs text-ctp-text";
const CARD_CLASS = "p-3 rounded-md border";

const getClientInfo = (): ClientInfo => ({
  platform: navigator.platform || "Unknown",
  language: navigator.language || "Unknown",
  screenSize: `${window.screen.width}x${window.screen.height}`,
});

const isWithinRange = (value: number, min: number, max: number) => value >= min && value <= max;
const getTimeoutValue = (value: string) => parseInt(value, 10);

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
  timeout: number;
  proxy: ProxySettings;
  ssl: SSLSettings;
  redirects: RedirectSettings;
  onUserAgentChange: (userAgent: string) => void;
  onTimeoutChange: (timeout: number) => void;
  onProxyChange: (proxy: ProxySettings) => void;
  onSSLChange: (ssl: SSLSettings) => void;
  onRedirectsChange: (redirects: RedirectSettings) => void;
}

export function ClientSettings({
  userAgent,
  timeout,
  proxy,
  ssl,
  redirects,
  onUserAgentChange,
  onTimeoutChange,
  onProxyChange,
  onSSLChange,
  onRedirectsChange,
}: ClientSettingsProps) {
  const [selectedKey, setSelectedKey] = useState<UserAgentKey>(DEFAULT_USER_AGENT_KEY);
  const [customAgent, setCustomAgent] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);

  useEffect(() => {
    if (!userAgent) {
      setSelectedKey(DEFAULT_USER_AGENT_KEY);
      setIsCustom(false);
      return;
    }

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

  useEffect(() => {
    setClientInfo(getClientInfo());
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
    if (selectedKey === DEFAULT_USER_AGENT_KEY) return DEFAULT_USER_AGENT_VALUE;
    return USER_AGENTS[selectedKey];
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className={SECTION_TITLE_CLASS}>
          <Icons.Globe size={12} />
          <span>User-Agent</span>
        </div>

        <select
          value={isCustom ? "" : selectedKey}
          onChange={(e) => handleSelectChange(e.target.value as UserAgentKey)}
          className={TEXT_INPUT_CLASS}
        >
          {Object.keys(USER_AGENTS).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
          {isCustom && <option value="">Custom</option>}
        </select>

        <div className="space-y-1">
          <label className={FIELD_LABEL_CLASS}>Custom User-Agent:</label>
          <input
            type="text"
            value={isCustom ? customAgent : ""}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Enter custom User-Agent string..."
            className={TEXT_INPUT_CLASS}
          />
        </div>

        <div className={`${CARD_CLASS} bg-ctp-surface0/50 border-ctp-surface0`}>
          <div className={`${INFO_TEXT_CLASS} mb-1`}>Will be sent as:</div>
          <code className="text-xs text-ctp-green break-all">{getCurrentUserAgent()}</code>
        </div>
      </div>

      <div className="space-y-3">
        <div className={SECTION_TITLE_CLASS}>
          <Icons.History size={12} />
          <span>Request Timeout</span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={TIMEOUT_MIN_SECONDS}
            max={TIMEOUT_MAX_SECONDS}
            value={timeout}
            onChange={(e) => onTimeoutChange(getTimeoutValue(e.target.value))}
            className="flex-1 h-1.5 bg-ctp-surface0 rounded-lg appearance-none cursor-pointer accent-ctp-mauve"
          />
          <div className="flex items-center gap-1 bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1">
            <input
              type="number"
              value={timeout}
              onChange={(e) => {
                const val = getTimeoutValue(e.target.value);
                if (isWithinRange(val, TIMEOUT_MIN_SECONDS, TIMEOUT_MAX_SECONDS)) {
                  onTimeoutChange(val);
                }
              }}
              min={TIMEOUT_MIN_SECONDS}
              max={TIMEOUT_MAX_SECONDS}
              className="w-10 bg-transparent text-xs text-ctp-text outline-none text-center"
            />
            <span className="text-xs text-ctp-overlay0">sec</span>
          </div>
        </div>

        <div className="text-xs text-ctp-overlay0">
          Time to wait for a response before timing out (1-300 seconds)
        </div>
      </div>

      <div className="space-y-3">
        <div className={SECTION_TITLE_CLASS}>
          <Icons.Settings size={12} />
          <span>Client Information</span>
        </div>

        <div className="grid gap-2">
          {clientInfo && (
            <>
              <div className={INFO_ROW_CLASS}>
                <span className={INFO_TEXT_CLASS}>Platform</span>
                <span className={INFO_TEXT_CLASS}>{clientInfo.platform}</span>
              </div>
              <div className={INFO_ROW_CLASS}>
                <span className={INFO_TEXT_CLASS}>Language</span>
                <span className={INFO_TEXT_CLASS}>{clientInfo.language}</span>
              </div>
              <div className={INFO_ROW_CLASS}>
                <span className={INFO_TEXT_CLASS}>Screen Size</span>
                <span className={INFO_TEXT_CLASS}>{clientInfo.screenSize}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className={SECTION_TITLE_CLASS}>
          <Icons.Globe size={12} />
          <span>Proxy</span>
        </div>

        <label className={TOGGLE_LABEL_CLASS}>
          <input
            type="checkbox"
            checked={proxy.enabled}
            onChange={(e) => onProxyChange({ ...proxy, enabled: e.target.checked })}
            className={TOGGLE_INPUT_CLASS}
          />
          <span className={FIELD_LABEL_CLASS}>Use Proxy</span>
        </label>

        {proxy.enabled && (
          <input
            type="text"
            value={proxy.url}
            onChange={(e) => onProxyChange({ ...proxy, url: e.target.value })}
            placeholder="http://localhost:8080"
            className={TEXT_INPUT_CLASS}
          />
        )}
      </div>

      <div className="space-y-3">
        <div className={SECTION_TITLE_CLASS}>
          <Icons.Lock size={12} />
          <span>SSL / TLS</span>
        </div>

        <label className={TOGGLE_LABEL_CLASS}>
          <input
            type="checkbox"
            checked={ssl.skipVerify}
            onChange={(e) => onSSLChange({ ...ssl, skipVerify: e.target.checked })}
            className={TOGGLE_INPUT_CLASS}
          />
          <span className={FIELD_LABEL_CLASS}>Skip SSL Certificate Verification</span>
        </label>

        {ssl.skipVerify && (
          <div className={`${CARD_CLASS} p-2 bg-ctp-peach/10 border-ctp-peach/30`}>
            <div className="flex items-start gap-2">
              <Icons.AlertTriangle size={12} className="text-ctp-peach mt-0.5 flex-shrink-0" />
              <span className="text-xs text-ctp-peach">
                Warning: Disabling SSL verification makes connections insecure. Only use for testing.
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className={FIELD_LABEL_CLASS}>Client Certificate (optional):</label>
          <input
            type="text"
            value={ssl.clientCertPath}
            onChange={(e) => onSSLChange({ ...ssl, clientCertPath: e.target.value })}
            placeholder="/path/to/client.crt"
            className={TEXT_INPUT_CLASS}
          />
          <input
            type="text"
            value={ssl.clientKeyPath}
            onChange={(e) => onSSLChange({ ...ssl, clientKeyPath: e.target.value })}
            placeholder="/path/to/client.key"
            className={TEXT_INPUT_CLASS}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className={SECTION_TITLE_CLASS}>
          <Icons.ArrowRight size={12} />
          <span>Redirects</span>
        </div>

        <label className={TOGGLE_LABEL_CLASS}>
          <input
            type="checkbox"
            checked={redirects.follow}
            onChange={(e) => onRedirectsChange({ ...redirects, follow: e.target.checked })}
            className={TOGGLE_INPUT_CLASS}
          />
          <span className={FIELD_LABEL_CLASS}>Follow Redirects</span>
        </label>

        {redirects.follow && (
          <div className="flex items-center gap-2">
            <label className={FIELD_LABEL_CLASS}>Max Redirects:</label>
            <input
              type="number"
              value={redirects.maxRedirects}
              onChange={(e) => {
                const val = getTimeoutValue(e.target.value);
                if (isWithinRange(val, REDIRECT_MIN, REDIRECT_MAX)) {
                  onRedirectsChange({ ...redirects, maxRedirects: val });
                }
              }}
              min={REDIRECT_MIN}
              max={REDIRECT_MAX}
              className="w-16 bg-ctp-surface0 border border-ctp-surface1 px-2 py-1 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text text-center"
            />
          </div>
        )}
      </div>

      <div className={`${CARD_CLASS} bg-ctp-blue/10 border-ctp-blue/20`}>
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
