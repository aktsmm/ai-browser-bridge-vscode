export const TERMINAL_COMMAND_BLOCK_REASON =
  "run_terminal only allows a small read-only command set";

const ALLOWED_COMMAND_PATTERNS = [
  /^git\s+(status|diff|log|branch|remote|show|rev-parse|tag\s+--list|submodule\s+status)\b/i,
  /^npm\s+(run\s+(lint|test|build|typecheck|compile|validate:bridge)|audit)\b/i,
  /^node\s+-v$/i,
  /^npm\s+-v$/i,
  /^Get-Location$/i,
  /^Get-Command\b/i,
  /^Test-Path\b/i,
  /^Get-ChildItem\b/i,
  /^Get-Content\b/i,
  /^Select-String\b/i,
  /^gh\s+(auth\s+status|release\s+view|repo\s+view)\b/i,
];

const BLOCKED_COMMAND_PATTERNS = [
  /\brm\b/i,
  /\bdel\b/i,
  /\bremove-item\b/i,
  /\bmove-item\b/i,
  /\bcopy-item\b/i,
  /\brename-item\b/i,
  /\bgit\s+reset\b/i,
  /\bgit\s+clean\b/i,
  /\bcurl\b/i,
  /\binvoke-webrequest\b/i,
  /\bstart-process\b/i,
  /\bpowershell\b/i,
  /\bpwsh\b/i,
  /\bpython\b/i,
  /\bnpx\b/i,
  /(^|\s)--show-token\b/i,
  /(^|\s)(--output(?:=|\s)|-o(?:\s|$))/i,
  /(^|\s)(?:[a-z]:|\\\\)/i,
  // Shell metacharacters that enable command chaining, redirection,
  // grouping, or substitution. Without these, an allowed prefix (e.g.
  // "git status") could smuggle an arbitrary second command, e.g.
  // "git status; node evil.js" or "git status (node evil.js)".
  /[|><`;&()\n\r]/,
  /\$[({]/,
];

export function validateTerminalCommand(command: string): {
  ok: boolean;
  reason?: string;
} {
  const trimmed = command.trim();
  if (!trimmed) {
    return { ok: false, reason: "Empty command is not allowed" };
  }

  if (BLOCKED_COMMAND_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { ok: false, reason: TERMINAL_COMMAND_BLOCK_REASON };
  }

  if (!ALLOWED_COMMAND_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { ok: false, reason: TERMINAL_COMMAND_BLOCK_REASON };
  }

  return { ok: true };
}
