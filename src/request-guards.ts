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

export function isAllowedPlaywrightAction(action: string): boolean {
  return action in PLAYWRIGHT_MCP_TOOL_MAP;
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
  const allowedProviders = ["copilot", "copilot-agent", "lm-studio"];
  if (typeof provider !== "string" || !allowedProviders.includes(provider)) {
    return { ok: false, error: "Invalid provider" };
  }

  if (provider === "copilot" || provider === "copilot-agent") {
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
      if (item.textContent !== undefined && typeof item.textContent !== "string") {
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
