import { describe, expect, it } from "vitest";
import {
  buildClaudeArgs,
  buildCliEnvironment,
  buildCodexArgs,
  CliProviderClient,
  parseClaudeJsonl,
  parseCodexJsonl,
  resolveCliSpawnSpec,
  runBoundedCli,
  validateCliModelId,
} from "../src/cli-providers";

describe("CLI provider contracts", () => {
  it("builds a read-only ephemeral Codex invocation", () => {
    const args = buildCodexArgs("gpt-5.4");
    expect(args).toEqual(expect.arrayContaining(["--sandbox", "read-only"]));
    for (const feature of [
      "shell_tool",
      "browser_use",
      "computer_use",
      "apps",
      "hooks",
      "plugins",
    ]) {
      expect(args).toContain(feature);
    }
    expect(args).toContain("--model=gpt-5.4");
    expect(args.at(-1)).toBe("-");
  });

  it("builds a tool-free Claude invocation", () => {
    expect(buildClaudeArgs("copilot/claude-opus-5")).toContain("--tools=");
    expect(buildClaudeArgs("copilot/claude-opus-5")).toContain("--no-chrome");
    expect(buildClaudeArgs("copilot/claude-opus-5")).toEqual(
      expect.arrayContaining(["--model", "copilot/claude-opus-5"]),
    );
  });

  it("rejects option-like and malformed model IDs", () => {
    expect(() => validateCliModelId("--dangerously-skip-permissions")).toThrow(
      /invalid/i,
    );
    expect(() => validateCliModelId("model name")).toThrow(/invalid/i);
    expect(validateCliModelId("")).toBe("");
  });

  it("identifies the selected Claude connection in execution errors", async () => {
    const client = new CliProviderClient();
    await expect(
      client.runPrompt(
        {
          provider: "claude-code",
          connection: "gateway",
          model: "invalid model",
        },
        "Synthetic prompt",
      ),
    ).rejects.toThrow(/claude-code \(gateway\) failed/i);
  });

  it("resolves Windows npm shims through their native Node entries", () => {
    expect(
      resolveCliSpawnSpec(
        "codex-cli",
        "direct",
        "win32",
        "C:\\nvm4w\\nodejs\\codex",
      ),
    ).toEqual({
      command: "C:\\nvm4w\\nodejs\\node.exe",
      argsPrefix: [
        "C:\\nvm4w\\nodejs\\node_modules\\@openai\\codex\\bin\\codex.js",
      ],
    });
    expect(
      resolveCliSpawnSpec(
        "claude-code",
        "gateway",
        "win32",
        "C:\\nvm4w\\nodejs\\gw.cmd",
      ).argsPrefix,
    ).toEqual([
      "C:\\nvm4w\\nodejs\\node_modules\\copilot-anthropic-gateway\\dist\\cli.js",
      "claude",
    ]);
  });

  it("extracts only completed Codex agent messages", () => {
    expect(
      parseCodexJsonl(
        [
          '{"type":"thread.started","thread_id":"t1"}',
          '{"type":"item.completed","item":{"type":"agent_message","text":"Hello"}}',
          '{"type":"turn.completed"}',
        ].join("\n"),
      ),
    ).toBe("Hello");
  });

  it("extracts the final Claude result", () => {
    expect(
      parseClaudeJsonl(
        [
          '{"type":"system","subtype":"init"}',
          '{"type":"result","subtype":"success","is_error":false,"result":"Hello"}',
        ].join("\n"),
      ),
    ).toBe("Hello");
  });

  it("passes prompts over stdin with a sanitized environment", async () => {
    const result = await runBoundedCli(
      { command: process.execPath, argsPrefix: [] },
      [
        "-e",
        "process.stdin.setEncoding('utf8');let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>process.stdout.write(s))",
      ],
      "Synthetic prompt",
    );
    expect(result).toMatchObject({ stdout: "Synthetic prompt", exitCode: 0 });
    expect(
      buildCliEnvironment({
        PATH: "safe",
        GITHUB_TOKEN: "secret",
        ANTHROPIC_API_KEY: "secret",
      }),
    ).toEqual({ PATH: "safe" });
  });

  it("does not spawn an already-aborted request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runBoundedCli(
        { command: process.execPath, argsPrefix: [] },
        ["-e", "process.exit(0)"],
        "ignored",
        { abortSignal: controller.signal },
      ),
    ).rejects.toThrow(/aborted/i);
  });

  it("aborts a running child without leaving the request pending", async () => {
    const controller = new AbortController();
    const result = runBoundedCli(
      { command: process.execPath, argsPrefix: [] },
      ["-e", "setInterval(() => {}, 1000)"],
      "",
      { abortSignal: controller.signal },
    );
    setTimeout(() => controller.abort(), 50);
    await expect(result).rejects.toThrow(/aborted/i);
  });
});
