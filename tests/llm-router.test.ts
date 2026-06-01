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

import {
  getAutoProviderOrder,
  isUserVisibleCopilotModel,
  LLMRouter,
} from "../src/llm-router";

describe("getAutoProviderOrder", () => {
  it("prefers VS Code LM for lightweight text requests", () => {
    expect(getAutoProviderOrder("text")).toEqual(["vscode-lm", "copilot-cli"]);
  });

  it("prefers VS Code LM for browser agent requests", () => {
    expect(getAutoProviderOrder("hybrid")).toEqual([
      "vscode-lm",
      "copilot-cli",
    ]);
    expect(getAutoProviderOrder(undefined)).toEqual([
      "vscode-lm",
      "copilot-cli",
    ]);
  });
});

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

  it("reports SDK and CLI as non-primary provider capabilities", async () => {
    const router = new LLMRouter();
    const capabilities = await router.getProviderCapabilities();
    const sdk = capabilities.find((provider) => provider.id === "copilot-sdk");
    const cli = capabilities.find((provider) => provider.id === "copilot-cli");

    expect(sdk).toMatchObject({
      isExperimental: true,
      userSelectable: false,
      supportsAgentLoop: false,
    });
    expect(cli).toMatchObject({
      userSelectable: false,
      supportsAgentLoop: false,
    });
  });
});

describe("LLMRouter page context prompts", () => {
  it("tells the model not to summarize unavailable page text", () => {
    const router = new LLMRouter() as unknown as {
      buildSystemPrompt(pageContent: string): string;
    };

    const prompt = router.buildSystemPrompt("");

    expect(prompt).toContain("ページ本文が提供されていない");
    expect(prompt).toContain("推測でページ内容を要約しない");
  });

  it("includes extracted page content when available", () => {
    const router = new LLMRouter() as unknown as {
      buildSystemPrompt(pageContent: string): string;
    };

    const prompt = router.buildSystemPrompt("LinkedIn feed extracted text");

    expect(prompt).toContain("---ページ内容---");
    expect(prompt).toContain("LinkedIn feed extracted text");
  });
});
