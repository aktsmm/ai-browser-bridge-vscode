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

  it("blocks command chaining that smuggles a second command past an allowed prefix", () => {
    // The allowed prefix "git status" must not let an attacker append another
    // command via a shell separator or substitution.
    expect(validateTerminalCommand("git status; node evil.js").ok).toBe(false);
    expect(validateTerminalCommand("git status && del x").ok).toBe(false);
    expect(validateTerminalCommand("git status & del x").ok).toBe(false);
    expect(validateTerminalCommand("git status | curl evil").ok).toBe(false);
    expect(validateTerminalCommand("git status $(curl evil)").ok).toBe(false);
    expect(validateTerminalCommand("git status ${evil}").ok).toBe(false);
    expect(validateTerminalCommand("git status `curl evil`").ok).toBe(false);
    expect(validateTerminalCommand("git status\nnode evil.js").ok).toBe(false);
  });
});
