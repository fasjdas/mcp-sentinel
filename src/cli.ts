#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { audit } from "./scanner.js";
import { renderTextReport } from "./report.js";
import type { Severity } from "./types.js";

const severityRank: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

type Options = {
  root: string;
  json: boolean;
  output?: string;
  failOn?: Severity;
};

function printHelp(): void {
  console.log(`mcp-sentinel

Usage:
  mcp-sentinel audit [path] [--json] [--output report.txt] [--fail-on high]

Commands:
  audit    Scan MCP and AI agent configuration files.

Options:
  --json              Print JSON instead of a text report.
  --output <file>     Write the report to a file.
  --fail-on <level>   Exit with code 2 when a finding has this severity or higher.
  --help              Show this help.
`);
}

function parseArgs(argv: string[]): Options | "help" {
  const args = [...argv];
  const command = args.shift();

  if (!command || command === "--help" || command === "-h") return "help";
  if (command !== "audit") {
    throw new Error(`Unknown command: ${command}`);
  }

  const options: Options = {
    root: ".",
    json: false
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) continue;

    if (arg === "--help" || arg === "-h") return "help";
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--output" || arg === "-o") {
      const output = args.shift();
      if (!output) throw new Error("--output requires a file path");
      options.output = output;
      continue;
    }
    if (arg === "--fail-on") {
      const severity = args.shift() as Severity | undefined;
      if (!severity || !(severity in severityRank)) {
        throw new Error("--fail-on requires one of: info, low, medium, high, critical");
      }
      options.failOn = severity;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    options.root = arg;
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options === "help") {
    printHelp();
    return;
  }

  const result = await audit(options.root);
  const rendered = options.json ? JSON.stringify(result, null, 2) : renderTextReport(result);

  if (options.output) {
    const outputPath = path.resolve(options.output);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, rendered, "utf8");
  } else {
    console.log(rendered);
  }

  if (
    options.failOn &&
    result.findings.some((finding) => severityRank[finding.severity] >= severityRank[options.failOn as Severity])
  ) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
