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

function escapeAnnotationValue(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/:/g, "%3A").replace(/,/g, "%2C");
}

export function renderGitHubAnnotations(result: AuditResult): string {
  return result.findings
    .map((finding) => {
      const command = finding.severity === "critical" || finding.severity === "high" ? "error" : "warning";
      const file = escapeAnnotationValue(relative(result.root, finding.file));
      const title = escapeAnnotationValue(`${finding.severity.toUpperCase()}: ${finding.title}`);
      const message = escapeAnnotationValue(`${finding.evidence}. ${finding.recommendation}`);
      return `::${command} file=${file},title=${title}::${message}`;
    })
    .join("\n");
}
