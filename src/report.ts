import path from "node:path";
import type { AuditResult, Severity } from "./types.js";

const severityOrder: Severity[] = ["critical", "high", "medium", "low", "info"];

function relative(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, "/") || file;
}

export function renderTextReport(result: AuditResult): string {
  const { summary } = result;
  const lines: string[] = [
    "MCP Sentinel Audit",
    "",
    `Root: ${result.root}`,
    `Score: ${summary.score}/100`,
    `Config files scanned: ${summary.filesScanned}`,
    `MCP servers scanned: ${summary.serversScanned}`,
    "",
    "Findings:",
    ...severityOrder.map((severity) => `  ${severity.padEnd(8)} ${summary.findingsBySeverity[severity]}`)
  ];

  if (result.findings.length === 0) {
    lines.push("", "No risky MCP configuration patterns were detected.");
    return lines.join("\n");
  }

  lines.push("");

  for (const finding of result.findings.sort((a, b) => {
    const severityDelta = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
    return severityDelta || a.file.localeCompare(b.file) || a.id.localeCompare(b.id);
  })) {
    lines.push(
      `[${finding.severity.toUpperCase()}] ${finding.title}`,
      `  Rule: ${finding.id}`,
      `  File: ${relative(result.root, finding.file)}`,
      `  Path: ${finding.path}`,
      `  Evidence: ${finding.evidence}`,
      `  Fix: ${finding.recommendation}`,
      ""
    );
  }

  return lines.join("\n").trimEnd();
}
