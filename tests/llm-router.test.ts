import { describe, expect, it, vi } from "vitest";

type MockLanguageModel = {
  family: string;
  name: string;
};

const selectedModels: MockLanguageModel[] = [];

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: <T>(_key: string, defaultValue: T): T => defaultValue,
    }),
    workspaceFolders: [],
  },
  lm: {
    selectChatModels: async () => selectedModels,
  },
}));

import { isUserVisibleCopilotModel, LLMRouter } from "../src/llm-router";

describe("isUserVisibleCopilotModel", () => {
  it("hides internal and utility Copilot models", () => {
    expect(
      isUserVisibleCopilotModel({
        family: "claude-opus-4.7-1m-internal",
        name: "Claude Opus 4.7 (Internal only)",
      }),
    ).toBe(false);
    expect(
      isUserVisibleCopilotModel({
        family: "copilot-utility-small",
        name: "GPT-4o mini",
      }),
    ).toBe(false);
    expect(
      isUserVisibleCopilotModel({
        family: "oswe-vscode-modelD",
        name: "MAI-Code-1-Flash",
      }),
    ).toBe(false);
  });

  it("keeps normal user-selectable Copilot families", () => {
    expect(
      isUserVisibleCopilotModel({
        family: "claude-opus-4",
        name: "Claude Opus 4",
      }),
    ).toBe(true);
  });

  it("filters internal and utility models from the public model list", async () => {
    selectedModels.splice(
      0,
      selectedModels.length,
      {
        family: "claude-opus-4.7-1m-internal",
        name: "Claude Opus 4.7 (Internal only)",
      },
      { family: "copilot-utility-small", name: "GPT-4o mini" },
      { family: "oswe-vscode-modelD", name: "MAI-Code-1-Flash" },
      { family: "gpt-5.2", name: "GPT-5.2" },
    );

    const router = new LLMRouter();
    const models = await router.getAvailableModels();

    expect(models.filter((model) => model.provider === "copilot")).toEqual([
      { provider: "copilot", id: "gpt-5.2", name: "GPT-5.2 (gpt-5.2)" },
    ]);
  });
});
