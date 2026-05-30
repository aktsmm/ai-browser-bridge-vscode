import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: () => true,
    }),
  },
}));

import {
  buildCopilotCliPrompt,
  buildCopilotCliSpawnSpec,
  CopilotCliClient,
} from "../src/copilot-cli";

describe("copilot CLI helper", () => {
  it("builds a chat fallback prompt with conversation history", () => {
    const prompt = buildCopilotCliPrompt(
      "System prompt",
      [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ],
      { fallbackMode: "chat" },
    );

    expect(prompt).toContain("System prompt");
    expect(prompt).toContain("USER: Hello");
    expect(prompt).toContain("ASSISTANT: Hi");
    expect(prompt).toContain("GitHub Copilot CLI fallback");
  });

  it("marks agent fallback as read-only", () => {
    const prompt = buildCopilotCliPrompt(
      "Agent prompt",
      [{ role: "user", content: "Do this" }],
      { fallbackMode: "agent" },
    );

    expect(prompt).toContain("read-only");
    expect(prompt).toContain("no tool execution");
  });

  it("uses pwsh file execution for a resolved ps1 path on Windows", () => {
    expect(
      buildCopilotCliSpawnSpec("C:\\tooling\\copilot.ps1", "win32"),
    ).toEqual({
      command: "pwsh",
      argsPrefix: ["-NoProfile", "-File", "C:\\tooling\\copilot.ps1"],
    });
  });

  it("rejects immediately without spawning when the signal is already aborted", async () => {
    // An already-aborted request must not spawn a doomed child process that
    // would only be reaped on timeout.
    const controller = new AbortController();
    controller.abort();

    const client = new CopilotCliClient();
    await expect(client.runPrompt("hello", controller.signal)).rejects.toThrow(
      /aborted/i,
    );
  });
});
