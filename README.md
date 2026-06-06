# MCP Sentinel

Audit MCP server and AI agent configs before they get a quiet path into your terminal, filesystem, or secrets.

`mcp-sentinel` is a TypeScript CLI that scans common MCP configuration files and reports risky patterns such as shell launchers, broad filesystem access, inline secrets, destructive startup arguments, and suspicious prompt-injection language.

## Why this exists

MCP servers and coding agents are becoming normal developer infrastructure. That also means a small config file can grant broad file access, run package-manager bootstrap commands, or carry API keys in plain text. MCP Sentinel gives teams a fast first-pass review before those configs land in a repo or local setup.

## Quick start

```bash
npm install
npm run build
npx mcp-sentinel audit .
```

Run the bundled unsafe demo:

```bash
npm run audit:example
```

Print JSON for CI or dashboards:

```bash
npx mcp-sentinel audit . --json
```

Fail a pipeline when high-risk findings appear:

```bash
npx mcp-sentinel audit . --fail-on high
```

## What it scans

MCP Sentinel currently looks for these config files:

- `.mcp.json`
- `mcp.json`
- `mcp.config.json`
- `.cursor/mcp.json`
- `.vscode/mcp.json`
- `claude_desktop_config.json`
- `claude_desktop_config.local.json`
- `.zed/settings.json`

## Current rules

- `shell-command`: MCP server starts through `bash`, `sh`, `cmd`, PowerShell, or another interactive shell.
- `package-runner`: MCP server launches through `npx`, `pnpm`, `yarn`, `bun`, or `uvx`.
- `risky-arguments`: startup args include destructive commands or pipe-to-shell installers.
- `broad-filesystem-access`: args appear to grant root, drive, parent-directory, or unrestricted workspace access.
- `secret-env-key`: env keys look like tokens, API keys, passwords, or private credentials.
- `inline-secret-value`: env values look like literal secrets rather than environment references.
- `prompt-injection-language`: config text contains suspicious override or exfiltration language.

## Example output

```text
MCP Sentinel Audit

Root: /repo
Score: 0/100
Config files scanned: 1
MCP servers scanned: 2

Findings:
  critical 1
  high     3
  medium   3
  low      0
  info     0
```

## Roadmap

- HTML report with copyable remediation snippets.
- GitHub Action with PR annotations.
- Policy files for teams, for example allowed commands and approved MCP packages.
- Dependency reputation checks for MCP packages.
- SARIF output for code-scanning integrations.

## License

MIT
