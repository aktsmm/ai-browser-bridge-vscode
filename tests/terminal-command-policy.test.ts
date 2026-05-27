import { describe, expect, it } from "vitest";
import { validateTerminalCommand } from "../src/terminal-command-policy";

describe("terminal command policy", () => {
  it("allows safe read-only commands", () => {
    expect(validateTerminalCommand("git status")).toEqual({ ok: true });
    expect(validateTerminalCommand("npm run test")).toEqual({ ok: true });
    expect(validateTerminalCommand("Get-Location")).toEqual({ ok: true });
  });

  it("blocks dangerous or unrestricted commands", () => {
    expect(validateTerminalCommand("Remove-Item foo -Force").ok).toBe(false);
    expect(validateTerminalCommand("curl https://example.com").ok).toBe(false);
    expect(validateTerminalCommand("npx cowsay hi").ok).toBe(false);
  });
});