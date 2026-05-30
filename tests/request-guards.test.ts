import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALLOWED_EXTENSION_ORIGINS,
  evaluateBridgeRequestGate,
  hasTrustedBridgeClientHeader,
  isAllowedLmStudioEndpoint,
  isAllowedPlaywrightAction,
  isAllowedExtensionOrigin,
  MAX_ATTACHMENT_COUNT,
  MAX_PAGE_CONTENT_LENGTH,
  normalizeAllowedExtensionOrigins,
  validateChatRequestBody,
} from "../src/request-guards";

const VALID_EXTENSION_ORIGIN =
  "chrome-extension://abcdefghijklmnopabcdefghijklmnop";

describe("request guards", () => {
  it("normalizes additional extension origins", () => {
    expect(
      normalizeAllowedExtensionOrigins([
        ` ${VALID_EXTENSION_ORIGIN} `,
        "https://example.com",
        "chrome-extension://INVALID",
      ]),
    ).toEqual([VALID_EXTENSION_ORIGIN]);
  });

  it("accepts only trusted extension origins and client headers", () => {
    expect(
      isAllowedExtensionOrigin(DEFAULT_ALLOWED_EXTENSION_ORIGINS[0], [
        VALID_EXTENSION_ORIGIN,
      ]),
    ).toBe(true);
    expect(
      isAllowedExtensionOrigin(VALID_EXTENSION_ORIGIN, [
        VALID_EXTENSION_ORIGIN,
      ]),
    ).toBe(true);
    expect(isAllowedExtensionOrigin("chrome-extension://zzzz", [])).toBe(false);

    expect(hasTrustedBridgeClientHeader("chrome-extension")).toBe(true);
    expect(hasTrustedBridgeClientHeader(["chrome-extension", "other"])).toBe(
      true,
    );
    expect(hasTrustedBridgeClientHeader("web")).toBe(false);
  });

  it("authorizes non-health requests by trusted client header, not Origin", () => {
    // Health check is always unauthenticated.
    expect(
      evaluateBridgeRequestGate({
        isHealthCheck: true,
        hasTrustedClient: false,
      }),
    ).toEqual({ ok: true });

    // Trusted client header present (no Origin needed) -> accepted.
    // Chrome omits the Origin header when fetching a host the extension already
    // has host_permissions for (the local bridge), so requiring Origin would
    // break the side panel.
    expect(
      evaluateBridgeRequestGate({
        isHealthCheck: false,
        hasTrustedClient: true,
      }),
    ).toEqual({ ok: true });

    // Missing trusted client header on a protected route -> 401.
    expect(
      evaluateBridgeRequestGate({
        isHealthCheck: false,
        hasTrustedClient: false,
      }),
    ).toEqual({ ok: false, status: 401, error: "Unauthorized client" });
  });

  it("rejects oversized chat requests", () => {
    const request = {
      settings: {
        provider: "copilot",
        copilot: { model: "gpt-4o" },
      },
      messages: [{ role: "user", content: "Hello" }],
      pageContent: "x".repeat(MAX_PAGE_CONTENT_LENGTH + 1),
    };

    expect(validateChatRequestBody(request)).toEqual({
      ok: false,
      error: `pageContent exceeds ${MAX_PAGE_CONTENT_LENGTH} characters`,
    });
  });

  it("accepts valid lm-studio chat requests", () => {
    const request = {
      settings: {
        provider: "lm-studio",
        lmStudio: {
          endpoint: "http://localhost:1234",
          model: "local-model",
        },
      },
      messages: [{ role: "user", content: "Hello" }],
      pageContent: "short page",
    };

    expect(validateChatRequestBody(request)).toEqual({
      ok: true,
      value: request,
    });
  });

  it("rejects non-loopback lm-studio endpoints", () => {
    const request = {
      settings: {
        provider: "lm-studio",
        lmStudio: {
          endpoint: "https://evil.example.com",
          model: "local-model",
        },
      },
      messages: [{ role: "user", content: "Hello" }],
      pageContent: "short page",
    };

    expect(validateChatRequestBody(request)).toEqual({
      ok: false,
      error: "LM Studio endpoint must use a localhost or loopback address",
    });
  });

  it("allows only localhost or loopback lm-studio endpoints", () => {
    expect(isAllowedLmStudioEndpoint("http://localhost:1234")).toBe(true);
    expect(isAllowedLmStudioEndpoint("http://127.0.0.1:1234")).toBe(true);
    expect(isAllowedLmStudioEndpoint("http://127.0.0.5:1234")).toBe(true);
    expect(isAllowedLmStudioEndpoint("http://[::1]:1234")).toBe(true);
    expect(isAllowedLmStudioEndpoint("https://example.com")).toBe(false);
  });

  it("accepts only known playwright actions", () => {
    expect(isAllowedPlaywrightAction("browser_click")).toBe(true);
    expect(isAllowedPlaywrightAction("browser_tabs")).toBe(true);
    expect(isAllowedPlaywrightAction("browser_delete_everything")).toBe(false);
  });

  it("accepts valid attachments in chat requests", () => {
    const request = {
      settings: {
        provider: "copilot",
        copilot: { model: "gpt-4o" },
      },
      messages: [{ role: "user", content: "Hello" }],
      pageContent: "short page",
      attachments: [
        {
          id: "1",
          name: "note.md",
          kind: "text",
          mimeType: "text/markdown",
          size: 10,
          textContent: "hello",
        },
      ],
    };

    expect(validateChatRequestBody(request)).toEqual({
      ok: true,
      value: request,
    });
  });

  it("rejects too many attachments", () => {
    const request = {
      settings: {
        provider: "copilot",
        copilot: { model: "gpt-4o" },
      },
      messages: [{ role: "user", content: "Hello" }],
      pageContent: "short page",
      attachments: Array.from(
        { length: MAX_ATTACHMENT_COUNT + 1 },
        (_, index) => ({
          id: String(index),
          name: `file-${index}.md`,
          kind: "text",
          mimeType: "text/markdown",
          size: 10,
        }),
      ),
    };

    expect(validateChatRequestBody(request)).toEqual({
      ok: false,
      error: `attachments exceed ${MAX_ATTACHMENT_COUNT} items`,
    });
  });
});
