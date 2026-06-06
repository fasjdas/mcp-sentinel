import { promises as fs } from "node:fs";
import path from "node:path";
import { runRules } from "./rules.js";
import type { AuditedServer, AuditResult, Severity } from "./types.js";

const configFileNames = new Set([
  ".mcp.json",
  "mcp.json",
  "mcp.config.json",
  "claude_desktop_config.json",
  "claude_desktop_config.local.json"
]);

const configRelativePaths = new Set([
  ".cursor/mcp.json",
  ".vscode/mcp.json",
  ".zed/settings.json"
]);

const ignoredDirs = new Set([
  ".git",
  "dist",
  "node_modules",
  ".next",
  ".turbo",
  "coverage",
  "target",
  "vendor"
]);

const severityWeights: Record<Severity, number> = {
  critical: 35,
  high: 20,
  medium: 10,
  low: 4,
  info: 0
};

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkForConfigs(root: string): Promise<string[]> {
  const found = new Set<string>();

  async function visit(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!ignoredDirs.has(entry.name)) {
            await visit(fullPath);
          }
          return;
        }

        const rel = path.relative(root, fullPath).replace(/\\/g, "/");
        if (configFileNames.has(entry.name) || configRelativePaths.has(rel)) {
          found.add(fullPath);
        }
      })
    );
  }

  if (await pathExists(root)) {
    await visit(root);
  }

  return [...found].sort();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function extractServers(file: string, data: unknown): AuditedServer[] {
  const root = asRecord(data);
  if (!root) return [];

  const candidates: Array<{ path: string; servers: unknown }> = [
    { path: "mcpServers", servers: root.mcpServers },
    { path: "context_servers", servers: root.context_servers },
    { path: "servers", servers: root.servers }
  ];

  return candidates.flatMap((candidate) => {
    const servers = asRecord(candidate.servers);
    if (!servers) return [];

    return Object.entries(servers).flatMap(([name, serverValue]) => {
      const server = asRecord(serverValue);
      if (!server) return [];

      return [
        {
          name,
          file,
          configPath: `${candidate.path}.${name}`,
          command: typeof server.command === "string" ? server.command : undefined,
          args: asStringArray(server.args),
          env: asRecord(server.env) ?? {}
        }
      ];
    });
  });
}

function emptySeverityCounts(): Record<Severity, number> {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };
}

export async function audit(rootInput: string): Promise<AuditResult> {
  const root = path.resolve(rootInput);
  const configFiles = await walkForConfigs(root);
  const servers: AuditedServer[] = [];

  for (const file of configFiles) {
    try {
      const raw = await fs.readFile(file, "utf8");
      servers.push(...extractServers(file, JSON.parse(raw)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      servers.push({
        name: "unparseable-config",
        file,
        configPath: "root",
        args: [message],
        env: {}
      });
    }
  }

  const findings = servers.flatMap(runRules);
  const findingsBySeverity = emptySeverityCounts();
  let penalty = 0;

  for (const finding of findings) {
    findingsBySeverity[finding.severity] += 1;
    penalty += severityWeights[finding.severity];
  }

  return {
    root,
    generatedAt: new Date().toISOString(),
    summary: {
      score: Math.max(0, 100 - penalty),
      filesScanned: configFiles.length,
      serversScanned: servers.filter((server) => server.name !== "unparseable-config").length,
      findingsBySeverity
    },
    findings,
    servers
  };
}
