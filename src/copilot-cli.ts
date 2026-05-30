import * as vscode from "vscode";
import { spawn, spawnSync } from "child_process";

export interface CopilotCliMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export const COPILOT_CLI_TIMEOUT_MS = 30_000;

export function buildCopilotCliSpawnSpec(
  resolvedCommand: string,
  platform = process.platform,
): { command: string; argsPrefix: string[] } {
  if (platform === "win32" && resolvedCommand.toLowerCase().endsWith(".ps1")) {
    return {
      command: "pwsh",
      argsPrefix: ["-NoProfile", "-File", resolvedCommand],
    };
  }

  return {
    command: resolvedCommand,
    argsPrefix: [],
  };
}

function resolveCopilotCliCommand(platform = process.platform): string {
  if (platform !== "win32") {
    return "copilot";
  }

  try {
    const result = spawnSync("where.exe", ["copilot"], {
      encoding: "utf8",
      shell: false,
    });
    const firstMatch = result.stdout
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    return firstMatch || "copilot";
  } catch {
    return "copilot";
  }
}

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
    // If the request was already aborted before we got here, do not spawn a
    // doomed child process that would only be reaped on timeout.
    if (abortSignal?.aborted) {
      reject(new Error("GitHub Copilot CLI request aborted"));
      return;
    }

    const spawnSpec = buildCopilotCliSpawnSpec(
      resolveCopilotCliCommand(),
      process.platform,
    );
    const child = spawn(spawnSpec.command, [...spawnSpec.argsPrefix, ...args], {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const abortHandler = () => {
      finish(() => {
        child.kill();
        reject(new Error("GitHub Copilot CLI request aborted"));
      });
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

    // Centralized cleanup so every settle path clears the timer and detaches
    // the abort listener (otherwise the listener lingers on normal completion).
    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      abortSignal?.removeEventListener("abort", abortHandler);
      callback();
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
        reject(error);
      });
    });

    child.on("close", (exitCode) => {
      finish(() => {
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
