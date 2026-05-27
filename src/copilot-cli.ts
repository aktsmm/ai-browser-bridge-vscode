import * as vscode from "vscode";
import { spawn } from "child_process";

export interface CopilotCliMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export const COPILOT_CLI_TIMEOUT_MS = 30_000;

export function buildCopilotCliPrompt(
  systemPrompt: string,
  messages: CopilotCliMessage[],
  options?: { fallbackMode?: "chat" | "agent" },
): string {
  const conversation = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  const modeNote =
    options?.fallbackMode === "agent"
      ? "Mode: GitHub Copilot CLI fallback (read-only, no tool execution)."
      : "Mode: GitHub Copilot CLI fallback.";

  return [
    systemPrompt.trim(),
    "",
    modeNote,
    "Respond in the user's language.",
    "If browser or tool execution was expected, answer without emitting tool commands.",
    "",
    conversation,
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}

function runCliCommand(
  args: string[],
  abortSignal?: AbortSignal,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn("copilot", args, {
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      callback();
    };

    const timeout = setTimeout(() => {
      finish(() => {
        child.kill();
        reject(
          new Error(
            `GitHub Copilot CLI timed out after ${COPILOT_CLI_TIMEOUT_MS}ms`,
          ),
        );
      });
    }, COPILOT_CLI_TIMEOUT_MS);

    const abortHandler = () => {
      finish(() => {
        clearTimeout(timeout);
        child.kill();
        reject(new Error("GitHub Copilot CLI request aborted"));
      });
    };

    abortSignal?.addEventListener("abort", abortHandler, { once: true });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      finish(() => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    child.on("close", (exitCode) => {
      finish(() => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode });
      });
    });
  });
}

export class CopilotCliClient {
  private availabilityCache: boolean | null = null;

  async isAvailable(forceRefresh = false): Promise<boolean> {
    if (!forceRefresh && this.availabilityCache !== null) {
      return this.availabilityCache;
    }

    try {
      const result = await runCliCommand(["--version"]);
      this.availabilityCache = result.exitCode === 0;
      return this.availabilityCache;
    } catch {
      this.availabilityCache = false;
      return false;
    }
  }

  async runPrompt(prompt: string, abortSignal?: AbortSignal): Promise<string> {
    const result = await runCliCommand(["-p", prompt, "--silent"], abortSignal);
    if (result.exitCode !== 0) {
      throw new Error(
        result.stderr.trim() ||
          `GitHub Copilot CLI exited with code ${result.exitCode ?? "unknown"}`,
      );
    }

    const output = result.stdout.trim();
    if (!output) {
      throw new Error("GitHub Copilot CLI returned an empty response");
    }

    return output;
  }
}

export function isCopilotCliFallbackEnabled(): boolean {
  return vscode.workspace
    .getConfiguration("copilotBrowserBridge")
    .get<boolean>("enableCopilotCliFallback", true);
}
