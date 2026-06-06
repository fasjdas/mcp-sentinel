import type { AuditedServer, Finding, Severity } from "./types.js";

type Rule = {
  id: string;
  title: string;
  severity: Severity;
  test: (server: AuditedServer) => string[];
  recommendation: string;
};

const shellCommands = new Set([
  "bash",
  "sh",
  "zsh",
  "fish",
  "cmd",
  "cmd.exe",
  "powershell",
  "powershell.exe",
  "pwsh",
  "pwsh.exe"
]);

const packageRunnerCommands = new Set(["npx", "pnpm", "pnpm.exe", "yarn", "yarn.cmd", "bun", "uvx"]);

const secretKeyPattern =
  /(api[_-]?key|token|secret|password|passwd|credential|private[_-]?key|access[_-]?key|client[_-]?secret)/i;

const riskyArgPattern =
  /\b(rm\s+-rf|del\s+\/[sq]|format\b|curl\b.*\|\s*(sh|bash)|wget\b.*\|\s*(sh|bash)|Invoke-WebRequest\b.*iex|iwr\b.*iex|chmod\s+777|sudo\s+)/i;

const broadPathPattern =
  /(^|[=\s"'`])((\/|~\/|[A-Za-z]:\\)(?:$|[\s"'`])|(\.\.\/|\.\.\\)|--root\b|--workspace\b|--allow-all\b|--full-access\b|--dangerously-skip-permissions\b)/i;

const promptInjectionTerms =
  /(ignore previous instructions|bypass safety|exfiltrate|send.*secret|read.*env|arbitrary command|execute any command|full filesystem)/i;

function basename(command: string | undefined): string {
  if (!command) return "";
  const normalized = command.replace(/\\/g, "/");
  return normalized.slice(normalized.lastIndexOf("/") + 1).toLowerCase();
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  return JSON.stringify(value);
}

export const rules: Rule[] = [
  {
    id: "shell-command",
    title: "Server starts through an interactive shell",
    severity: "high",
    test(server) {
      const command = basename(server.command);
      return shellCommands.has(command) ? [`command: ${server.command}`] : [];
    },
    recommendation:
      "Call the MCP server binary directly instead of routing through bash, sh, cmd, or PowerShell."
  },
  {
    id: "package-runner",
    title: "Server launches from a package runner",
    severity: "medium",
    test(server) {
      const command = basename(server.command);
      return packageRunnerCommands.has(command) ? [`command: ${server.command}`] : [];
    },
    recommendation:
      "Pin the package and version, prefer a locked local install, and review the package before enabling it."
  },
  {
    id: "risky-arguments",
    title: "Arguments contain destructive or pipe-to-shell behavior",
    severity: "critical",
    test(server) {
      return server.args.filter((arg) => riskyArgPattern.test(arg)).map((arg) => `arg: ${arg}`);
    },
    recommendation:
      "Remove destructive shell fragments and bootstrap scripts from MCP startup arguments."
  },
  {
    id: "broad-filesystem-access",
    title: "Server appears to receive broad filesystem access",
    severity: "high",
    test(server) {
      const values = [server.command ?? "", ...server.args];
      return values.filter((value) => broadPathPattern.test(value)).map((value) => `value: ${value}`);
    },
    recommendation:
      "Scope file access to the smallest project directory needed by the server."
  },
  {
    id: "secret-env-key",
    title: "Environment variable may contain a secret",
    severity: "medium",
    test(server) {
      return Object.keys(server.env)
        .filter((key) => secretKeyPattern.test(key))
        .map((key) => `env: ${key}`);
    },
    recommendation:
      "Move secrets to a dedicated secret manager or host-level environment, and avoid committing them in agent config."
  },
  {
    id: "inline-secret-value",
    title: "Inline environment value looks like a real secret",
    severity: "high",
    test(server) {
      return Object.entries(server.env)
        .filter(([, value]) => {
          const text = stringify(value);
          return text.length >= 24 && !text.startsWith("$") && !text.startsWith("${");
        })
        .map(([key]) => `env: ${key}`);
    },
    recommendation:
      "Reference secrets through environment variables instead of storing literal values in config files."
  },
  {
    id: "prompt-injection-language",
    title: "Config text contains prompt-injection or exfiltration language",
    severity: "medium",
    test(server) {
      const haystack = [server.command, ...server.args, JSON.stringify(server.env)].join(" ");
      return promptInjectionTerms.test(haystack) ? ["matched suspicious language"] : [];
    },
    recommendation:
      "Review tool descriptions and arguments for instructions that attempt to override model or policy behavior."
  }
];

export function runRules(server: AuditedServer): Finding[] {
  return rules.flatMap((rule) =>
    rule.test(server).map((evidence) => ({
      id: rule.id,
      title: rule.title,
      severity: rule.severity,
      file: server.file,
      path: server.configPath,
      evidence,
      recommendation: rule.recommendation
    }))
  );
}
