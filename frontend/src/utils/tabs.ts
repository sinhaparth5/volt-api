import { KeyValuePair, AuthSettings, BodyType, createEmptyPair, defaultAuthSettings } from "./helpers";
import { Assertion, AssertionResult } from "./assertions";
import { ChainVariable } from "./chainVariables";
import { ProxySettings, SSLSettings, RedirectSettings } from "../components/ClientSettings";
import { SentRequestInfo } from "../components/ResponseSection";
import { app } from "../../wailsjs/go/models";

type HTTPResponse = app.HTTPResponse;
export type RequestState = "idle" | "loading" | "success" | "error";

// Single request tab state
export interface RequestTab {
  id: string;
  name: string;
  method: string;
  url: string;
  requestBody: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  auth: AuthSettings;
  bodyType: BodyType;
  formData: KeyValuePair[];
  response: HTTPResponse | null;
  requestState: RequestState;
  assertions: Assertion[];
  assertionResults: AssertionResult[];
  chainVariables: ChainVariable[];
  timeout: number;
  userAgent: string;
  proxy: ProxySettings;
  ssl: SSLSettings;
  redirects: RedirectSettings;
  sentRequest: SentRequestInfo | null;
}

// Generate unique tab ID
export const generateTabId = (): string => {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Create default tab
export const createDefaultTab = (): RequestTab => ({
  id: generateTabId(),
  name: "New Request",
  method: "GET",
  url: "",
  requestBody: "",
  headers: [createEmptyPair()],
  queryParams: [createEmptyPair()],
  auth: defaultAuthSettings(),
  bodyType: "json",
  formData: [createEmptyPair()],
  response: null,
  requestState: "idle",
  assertions: [],
  assertionResults: [],
  chainVariables: [],
  timeout: 30,
  userAgent: "",
  proxy: { enabled: false, url: "" },
  ssl: { skipVerify: false, clientCertPath: "", clientKeyPath: "" },
  redirects: { follow: true, maxRedirects: 10 },
  sentRequest: null,
});

// Get tab display name from URL or default
export const getTabDisplayName = (tab: RequestTab): string => {
  if (tab.url) {
    try {
      const urlObj = new URL(tab.url);
      const path = urlObj.pathname;
      return path === "/" ? urlObj.hostname : path.split("/").pop() || urlObj.hostname;
    } catch {
      // If URL is incomplete, show first part
      const cleaned = tab.url.replace(/^https?:\/\//, "");
      return cleaned.slice(0, 20) || "New Request";
    }
  }
  return tab.name || "New Request";
};
