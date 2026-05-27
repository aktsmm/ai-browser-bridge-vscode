import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: () => true,
    }),
  },
}));

import { buildCopilotCliPrompt } from "../src/copilot-cli";

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
});
