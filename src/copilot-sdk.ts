import * as vscode from "vscode";
import type { ChatMessage } from "./llm-router";

type PermissionRequest = { kind?: unknown };
type PermissionRequestResult = { kind: "reject"; feedback?: string };
type CopilotSessionInstance = {
  abort(): Promise<void>;
  disconnect(): Promise<void>;
  sendAndWait(
    options: { prompt: string },
    timeout?: number,
  ): Promise<{ data: { content?: string } } | undefined>;
};
type CopilotClientInstance = {
  createSession(
    config: Record<string, unknown>,
  ): Promise<CopilotSessionInstance>;
  stop(): Promise<Error[]>;
};
type CopilotClientConstructor = new (options: {
  workingDirectory?: string;
  logLevel?: "none" | "error" | "warning" | "info" | "debug" | "all";
}) => CopilotClientInstance;

export const COPILOT_SDK_TIMEOUT_MS = 60_000;

export function getCopilotSdkRuntimeBlockReason(): string | null {
  const execPath = process.execPath.toLowerCase();
  if (process.versions.electron || execPath.endsWith("code.exe")) {
    return "Copilot SDK runtime is disabled inside the VS Code extension host because the SDK starts its bundled JavaScript runtime via process.execPath, which can resolve to Code.exe instead of node.exe.";
  }

  return null;
}

function getWorkspaceDirectory(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function rejectToolPermission(
  request: PermissionRequest,
): PermissionRequestResult {
  const requestKind =
    typeof (request as { kind?: unknown }).kind === "string"
      ? (request as { kind: string }).kind
      : "tool";

  return {
    kind: "reject",
    feedback: `AI Browser Bridge blocks Copilot SDK ${requestKind} requests in this mode. Use bridge-managed browser actions instead.`,
  };
}

export function buildCopilotSdkPrompt(
  systemPrompt: string,
  messages: ChatMessage[],
  options?: { agentMode?: boolean },
): string {
  const conversation = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  const modeNote = options?.agentMode
    ? [
        "Mode: GitHub Copilot SDK browser-agent-lite.",
        "Do not request shell, file-system, memory, MCP, or OS-level tool execution.",
        "If browser interaction is needed, emit only the bridge ACTION DSL described in the instructions.",
      ].join("\n")
    : "Mode: GitHub Copilot SDK chat.";

  return [
    systemPrompt.trim(),
    "",
    modeNote,
    "Respond in the user's language.",
    "",
    conversation,
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}

export class CopilotSdkClient {
  async isAvailable(): Promise<boolean> {
    if (getCopilotSdkRuntimeBlockReason()) {
      return false;
    }

    try {
      await import("@github/copilot-sdk");
      return true;
    } catch {
      return false;
    }
  }

  async runPrompt(
    prompt: string,
    model: string,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    const runtimeBlockReason = getCopilotSdkRuntimeBlockReason();
    if (runtimeBlockReason) {
      throw new Error(runtimeBlockReason);
    }

    if (abortSignal?.aborted) {
      throw new Error("GitHub Copilot SDK request aborted");
    }

    const { CopilotClient } = (await import("@github/copilot-sdk")) as {
      CopilotClient: CopilotClientConstructor;
    };
    const client = new CopilotClient({
      workingDirectory: getWorkspaceDirectory(),
      logLevel: "error",
    });
    let session: CopilotSessionInstance | undefined;

    const timeout = setTimeout(() => {
      void session?.abort().catch(() => undefined);
    }, COPILOT_SDK_TIMEOUT_MS);

    const abortHandler = () => {
      void session?.abort().catch(() => undefined);
    };
    abortSignal?.addEventListener("abort", abortHandler, { once: true });

    try {
      session = await client.createSession({
        model: model.trim() || undefined,
        streaming: false,
        enableConfigDiscovery: false,
        skipCustomInstructions: true,
        availableTools: [],
        excludedTools: ["builtin:*", "mcp:*", "custom:*"],
        onPermissionRequest: rejectToolPermission,
      });

      const response = await session.sendAndWait(
        { prompt },
        COPILOT_SDK_TIMEOUT_MS,
      );
      const content = response?.data.content?.trim();
      if (!content) {
        throw new Error("GitHub Copilot SDK returned an empty response");
      }

      return content;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`GitHub Copilot SDK failed: ${message}`);
    } finally {
      clearTimeout(timeout);
      abortSignal?.removeEventListener("abort", abortHandler);
      await session?.disconnect().catch(() => undefined);
      await client.stop().catch(() => []);
    }
  }
}
