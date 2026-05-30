import type { ChatRequest } from "./llm-router";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const DEFAULT_ALLOWED_EXTENSION_ORIGINS = [
  "chrome-extension://nggfpdadfepkbpjfnpcihagbnnfpeian",
] as const;

export const MAX_PAGE_CONTENT_LENGTH = 50_000;
export const MAX_ATTACHMENT_COUNT = 5;

export function isAllowedLmStudioEndpoint(endpoint: string): boolean {
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "::1" ||
      hostname === "[::1]"
    ) {
      return true;
    }

    return /^127(?:\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
}

export const PLAYWRIGHT_MCP_TOOL_MAP = {
  browser_click: "mcp_playwright_browser_click",
  browser_type: "mcp_playwright_browser_type",
  browser_navigate: "mcp_playwright_browser_navigate",
  browser_navigate_back: "mcp_playwright_browser_navigate_back",
  browser_snapshot: "mcp_playwright_browser_snapshot",
  browser_drag: "mcp_playwright_browser_drag",
  browser_hover: "mcp_playwright_browser_hover",
  browser_select_option: "mcp_playwright_browser_select_option",
  browser_fill_form: "mcp_playwright_browser_fill_form",
  browser_evaluate: "mcp_playwright_browser_evaluate",
  browser_wait_for: "mcp_playwright_browser_wait_for",
  browser_press_key: "mcp_playwright_browser_press_key",
  browser_tabs: "mcp_playwright_browser_tabs",
  browser_take_screenshot: "mcp_playwright_browser_take_screenshot",
  browser_close: "mcp_playwright_browser_close",
} as const;

const ALLOWED_EXTENSION_ORIGIN_PATTERN = /^chrome-extension:\/\/[a-p]{32}$/;
const MAX_PLAYWRIGHT_SELECTOR_LENGTH = 5_000;
const MAX_PLAYWRIGHT_TEXT_LENGTH = 20_000;
const MAX_PLAYWRIGHT_KEY_LENGTH = 100;
const MAX_PLAYWRIGHT_RAW_LENGTH = 10_000;
const MAX_PLAYWRIGHT_OPTION_VALUE_LENGTH = 1_000;
const MAX_PLAYWRIGHT_FORM_FIELDS = 50;

export function isAllowedPlaywrightAction(action: string): boolean {
  return action in PLAYWRIGHT_MCP_TOOL_MAP;
}

function isSafeBrowserNavigationUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (trimmed === "about:blank") {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validatePlaywrightParams(
  action: string,
  params: Record<string, unknown>,
): ValidationResult<Record<string, unknown>> {
  if (action === "browser_evaluate") {
    return {
      ok: false,
      error: "browser_evaluate is blocked by the VS Code bridge",
    };
  }

  if (action === "browser_navigate") {
    if (
      typeof params.url !== "string" ||
      !isSafeBrowserNavigationUrl(params.url)
    ) {
      return {
        ok: false,
        error: "browser_navigate requires a safe http(s) URL",
      };
    }
  }

  if (action === "browser_tabs") {
    const tabAction =
      typeof params.action === "string" ? params.action.trim() : "";
    const tabUrl = typeof params.url === "string" ? params.url.trim() : "";
    if (
      tabAction === "new" &&
      tabUrl.length > 0 &&
      !isSafeBrowserNavigationUrl(tabUrl)
    ) {
      return {
        ok: false,
        error: "browser_tabs new URL must be http(s) or about:blank",
      };
    }
  }

  const stringFieldChecks: Array<[string, number]> = [
    ["selector", MAX_PLAYWRIGHT_SELECTOR_LENGTH],
    ["startSelector", MAX_PLAYWRIGHT_SELECTOR_LENGTH],
    ["endSelector", MAX_PLAYWRIGHT_SELECTOR_LENGTH],
    ["element", MAX_PLAYWRIGHT_SELECTOR_LENGTH],
    ["ref", MAX_PLAYWRIGHT_SELECTOR_LENGTH],
    ["text", MAX_PLAYWRIGHT_TEXT_LENGTH],
    ["value", MAX_PLAYWRIGHT_TEXT_LENGTH],
    ["raw", MAX_PLAYWRIGHT_RAW_LENGTH],
  ];

  for (const [field, maxLength] of stringFieldChecks) {
    const value = params[field];
    if (value !== undefined) {
      if (typeof value !== "string" || value.length > maxLength) {
        return {
          ok: false,
          error: `${field} must be a string <= ${maxLength} chars`,
        };
      }
    }
  }

  if (action === "browser_press_key") {
    if (
      typeof params.key !== "string" ||
      params.key.trim().length === 0 ||
      params.key.length > MAX_PLAYWRIGHT_KEY_LENGTH
    ) {
      return {
        ok: false,
        error: `browser_press_key key must be a non-empty string <= ${MAX_PLAYWRIGHT_KEY_LENGTH} chars`,
      };
    }
  }

  if (action === "browser_fill_form" && params.fields !== undefined) {
    if (
      !Array.isArray(params.fields) ||
      params.fields.length > MAX_PLAYWRIGHT_FORM_FIELDS
    ) {
      return {
        ok: false,
        error: `browser_fill_form fields must be an array of <= ${MAX_PLAYWRIGHT_FORM_FIELDS} items`,
      };
    }

    for (const field of params.fields) {
      if (!field || typeof field !== "object" || Array.isArray(field)) {
        return {
          ok: false,
          error: "browser_fill_form field must be an object",
        };
      }
      const record = field as Record<string, unknown>;
      for (const key of ["name", "ref", "type", "value"] as const) {
        const value = record[key];
        if (
          value !== undefined &&
          (typeof value !== "string" ||
            value.length > MAX_PLAYWRIGHT_TEXT_LENGTH)
        ) {
          return {
            ok: false,
            error: `browser_fill_form field ${key} must be a string <= ${MAX_PLAYWRIGHT_TEXT_LENGTH} chars`,
          };
        }
      }
    }
  }

  if (action === "browser_select_option") {
    const value = params.value;
    if (
      value !== undefined &&
      (typeof value !== "string" ||
        value.length > MAX_PLAYWRIGHT_OPTION_VALUE_LENGTH)
    ) {
      return {
        ok: false,
        error: `browser_select_option value must be a string <= ${MAX_PLAYWRIGHT_OPTION_VALUE_LENGTH} chars`,
      };
    }

    const values = params.values;
    if (values !== undefined) {
      if (
        !Array.isArray(values) ||
        values.length > MAX_PLAYWRIGHT_FORM_FIELDS
      ) {
        return {
          ok: false,
          error: `browser_select_option values must be an array of <= ${MAX_PLAYWRIGHT_FORM_FIELDS} items`,
        };
      }
      if (
        !values.every(
          (item) =>
            typeof item === "string" &&
            item.length <= MAX_PLAYWRIGHT_OPTION_VALUE_LENGTH,
        )
      ) {
        return {
          ok: false,
          error: `browser_select_option values must be strings <= ${MAX_PLAYWRIGHT_OPTION_VALUE_LENGTH} chars`,
        };
      }
    }
  }

  return { ok: true, value: params };
}

export function normalizeAllowedExtensionOrigins(
  configuredOrigins: string[],
): string[] {
  return configuredOrigins
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => ALLOWED_EXTENSION_ORIGIN_PATTERN.test(value));
}

export function isAllowedExtensionOrigin(
  origin: string,
  configuredOrigins: string[],
): boolean {
  const allowedOrigins = new Set<string>([
    ...DEFAULT_ALLOWED_EXTENSION_ORIGINS,
    ...normalizeAllowedExtensionOrigins(configuredOrigins),
  ]);

  return allowedOrigins.has(origin);
}

export function hasTrustedBridgeClientHeader(
  headerValue: string | string[] | undefined,
): boolean {
  const clientValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return clientValue === "chrome-extension";
}

export interface BridgeRequestGateInput {
  isHealthCheck: boolean;
  hasTrustedClient: boolean;
}

export type BridgeRequestGateDecision =
  | { ok: true }
  | { ok: false; status: 401; error: string };

/**
 * Authorization gate applied after the origin/CORS checks.
 *
 * The trusted client header is the primary CSRF gate: a cross-site web page
 * cannot set the custom `X-Copilot-Bridge-Client` header without a CORS
 * preflight that the server only approves for allowed extension origins.
 * The Origin header itself is intentionally NOT required, because Chrome omits
 * it when the extension fetches a host it already has `host_permissions` for
 * (e.g. the local bridge on `localhost`). Requiring it broke the side panel.
 */
export function evaluateBridgeRequestGate(
  input: BridgeRequestGateInput,
): BridgeRequestGateDecision {
  if (input.isHealthCheck) {
    return { ok: true };
  }

  if (!input.hasTrustedClient) {
    return { ok: false, status: 401, error: "Unauthorized client" };
  }

  return { ok: true };
}

export function validateChatRequestBody(
  request: unknown,
  maxPageContentLength = MAX_PAGE_CONTENT_LENGTH,
): ValidationResult<ChatRequest> {
  if (!request || typeof request !== "object") {
    return { ok: false, error: "Invalid chat request body" };
  }

  const body = request as Record<string, unknown>;
  const settings = body.settings as Record<string, unknown> | undefined;

  if (!settings || typeof settings !== "object") {
    return { ok: false, error: "Invalid chat settings" };
  }

  const provider = settings.provider;
  const allowedProviders = [
    "auto",
    "copilot",
    "copilot-agent",
    "copilot-sdk",
    "copilot-cli",
    "lm-studio",
  ];
  if (typeof provider !== "string" || !allowedProviders.includes(provider)) {
    return { ok: false, error: "Invalid provider" };
  }

  if (
    provider === "auto" ||
    provider === "copilot" ||
    provider === "copilot-agent" ||
    provider === "copilot-sdk"
  ) {
    const copilotSettings = settings.copilot as Record<string, unknown>;
    if (
      !copilotSettings ||
      typeof copilotSettings !== "object" ||
      typeof copilotSettings.model !== "string" ||
      copilotSettings.model.trim().length === 0
    ) {
      return { ok: false, error: "Invalid copilot settings" };
    }
  }

  if (provider === "lm-studio") {
    const lmStudioSettings = settings.lmStudio as Record<string, unknown>;
    if (
      !lmStudioSettings ||
      typeof lmStudioSettings !== "object" ||
      typeof lmStudioSettings.endpoint !== "string" ||
      typeof lmStudioSettings.model !== "string"
    ) {
      return { ok: false, error: "Invalid lmStudio settings" };
    }

    if (lmStudioSettings.endpoint.trim().length === 0) {
      return { ok: false, error: "Invalid lmStudio endpoint" };
    }

    if (!isAllowedLmStudioEndpoint(lmStudioSettings.endpoint)) {
      return {
        ok: false,
        error: "LM Studio endpoint must use a localhost or loopback address",
      };
    }
  }

  if (typeof body.pageContent !== "string") {
    return { ok: false, error: "Invalid pageContent" };
  }

  if (body.pageContent.length > maxPageContentLength) {
    return {
      ok: false,
      error: `pageContent exceeds ${maxPageContentLength} characters`,
    };
  }

  if (!Array.isArray(body.messages)) {
    return { ok: false, error: "Invalid messages" };
  }

  const roleSet = new Set(["user", "assistant", "system"]);
  for (const message of body.messages) {
    if (!message || typeof message !== "object") {
      return { ok: false, error: "Invalid message item" };
    }

    const role = (message as Record<string, unknown>).role;
    const content = (message as Record<string, unknown>).content;
    if (typeof role !== "string" || !roleSet.has(role)) {
      return { ok: false, error: "Invalid message role" };
    }
    if (typeof content !== "string") {
      return { ok: false, error: "Invalid message content" };
    }
  }

  if (body.screenshot !== undefined && typeof body.screenshot !== "string") {
    return { ok: false, error: "Invalid screenshot" };
  }

  if (body.attachments !== undefined) {
    if (!Array.isArray(body.attachments)) {
      return { ok: false, error: "Invalid attachments" };
    }

    if (body.attachments.length > MAX_ATTACHMENT_COUNT) {
      return {
        ok: false,
        error: `attachments exceed ${MAX_ATTACHMENT_COUNT} items`,
      };
    }

    for (const attachment of body.attachments) {
      if (!attachment || typeof attachment !== "object") {
        return { ok: false, error: "Invalid attachment item" };
      }

      const item = attachment as Record<string, unknown>;
      if (typeof item.id !== "string" || typeof item.name !== "string") {
        return { ok: false, error: "Invalid attachment identity" };
      }
      if (
        item.kind !== "text" &&
        item.kind !== "image" &&
        item.kind !== "pdf"
      ) {
        return { ok: false, error: "Invalid attachment kind" };
      }
      if (typeof item.mimeType !== "string" || typeof item.size !== "number") {
        return { ok: false, error: "Invalid attachment metadata" };
      }
      if (
        item.textContent !== undefined &&
        typeof item.textContent !== "string"
      ) {
        return { ok: false, error: "Invalid attachment textContent" };
      }
      if (item.dataUrl !== undefined && typeof item.dataUrl !== "string") {
        return { ok: false, error: "Invalid attachment dataUrl" };
      }
      if (item.note !== undefined && typeof item.note !== "string") {
        return { ok: false, error: "Invalid attachment note" };
      }
    }
  }

  if (
    body.operationMode !== undefined &&
    body.operationMode !== "text" &&
    body.operationMode !== "hybrid" &&
    body.operationMode !== "screenshot"
  ) {
    return { ok: false, error: "Invalid operationMode" };
  }

  return { ok: true, value: request as ChatRequest };
}
