import * as net from "net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The bridge server (and its transitive imports) depend on the `vscode` module,
// which is unavailable in the test runner. Provide a minimal mock so we can
// exercise the real HTTP authorization gate end-to-end.
vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: <T>(_key: string, defaultValue: T): T => defaultValue,
    }),
    workspaceFolders: [],
  },
  lm: {
    selectChatModels: async () => [],
  },
}));

import { BridgeServer } from "../src/server";

const TRUSTED_HEADERS = { "X-Copilot-Bridge-Client": "chrome-extension" };

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (address && typeof address === "object") {
        const { port } = address;
        probe.close(() => resolve(port));
      } else {
        probe.close(() => reject(new Error("Failed to acquire a free port")));
      }
    });
  });
}

describe("bridge server authorization gate (HTTP)", () => {
  let server: BridgeServer;
  let baseUrl: string;

  beforeEach(async () => {
    const port = await getFreePort();
    server = new BridgeServer(port, "test");
    await server.start();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(() => {
    server.stop();
  });

  it("authorizes requests with the trusted client header and no Origin header", async () => {
    // Chrome omits the Origin header when the extension fetches a host it
    // already has host_permissions for (the local bridge). The request must
    // pass the gate and reach routing (404 here), NOT be rejected with 403.
    const response = await fetch(`${baseUrl}/__unknown_route__`, {
      headers: TRUSTED_HEADERS,
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Not found");
  });

  it("allows the health check without any auth headers", async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("rejects protected routes without the trusted client header", async () => {
    const response = await fetch(`${baseUrl}/models`);
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Unauthorized client");
  });

  it("returns provider capabilities to trusted extension clients", async () => {
    const response = await fetch(`${baseUrl}/capabilities`, {
      headers: TRUSTED_HEADERS,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      version: string;
      bridge: string;
      providers: Array<{ id: string; status: string }>;
      recommended: { chat: string; agent: string };
    };
    expect(body.version).toBe("test");
    expect(body.bridge).toBe("vscode");
    expect(body.recommended).toEqual({
      chat: "vscode-lm",
      agent: "copilot-sdk",
    });
    expect(body.providers.map((provider) => provider.id)).toEqual([
      "vscode-lm",
      "copilot-sdk",
      "copilot-cli",
      "lm-studio",
    ]);
  });

  it("rejects requests from a disallowed Origin", async () => {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { ...TRUSTED_HEADERS, Origin: "https://evil.example.com" },
    });
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Forbidden origin");
  });

  it("rejects a CORS preflight from a disallowed Origin", async () => {
    const response = await fetch(`${baseUrl}/models`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example.com",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "x-copilot-bridge-client",
      },
    });
    expect(response.status).toBe(403);
  });
});
