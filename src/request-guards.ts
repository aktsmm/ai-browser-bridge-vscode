import type { ChatRequest } from "./llm-router";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const DEFAULT_ALLOWED_EXTENSION_ORIGINS = [
  "chrome-extension://nggfpdadfepkbpjfnpcihagbnnfpeian",
] as const;

export const MAX_PAGE_CONTENT_LENGTH = 50_000;

const ALLOWED_EXTENSION_ORIGIN_PATTERN = /^chrome-extension:\/\/[a-p]{32}$/;

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
