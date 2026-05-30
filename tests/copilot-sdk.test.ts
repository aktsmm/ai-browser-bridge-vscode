import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: [],
  },
}));

import {
  buildCopilotSdkPrompt,
  rejectToolPermission,
} from "../src/copilot-sdk";

describe("buildCopilotSdkPrompt", () => {
  it("adds browser-agent-lite tool boundary instructions in agent mode", () => {
    const prompt = buildCopilotSdkPrompt(
      "System rules",
      [{ role: "user", content: "Click the button" }],
      { agentMode: true },
    );

    expect(prompt).toContain("Mode: GitHub Copilot SDK browser-agent-lite.");
    expect(prompt).toContain(
      "Do not request shell, file-system, memory, MCP, or OS-level tool execution.",
    );
    expect(prompt).toContain("emit only the bridge ACTION DSL");
    expect(prompt).toContain("USER: Click the button");
  });

  it("keeps chat mode free of agent tool wording", () => {
    const prompt = buildCopilotSdkPrompt("System rules", [
      { role: "assistant", content: "Previous" },
      { role: "user", content: "Hello" },
    ]);

    expect(prompt).toContain("Mode: GitHub Copilot SDK chat.");
    expect(prompt).not.toContain("bridge ACTION DSL");
    expect(prompt).toContain("ASSISTANT: Previous");
    expect(prompt).toContain("USER: Hello");
  });
});

describe("rejectToolPermission", () => {
  it("rejects SDK tool permission requests with bridge guidance", () => {
    expect(rejectToolPermission({ kind: "shell" })).toEqual({
      kind: "reject",
      feedback:
        "GitHub Copilot Browser Bridge blocks Copilot SDK shell requests in this mode. Use bridge-managed browser actions instead.",
    });
  });
});
