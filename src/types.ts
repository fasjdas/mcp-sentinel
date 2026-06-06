export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Finding = {
  id: string;
  title: string;
  severity: Severity;
  file: string;
  path: string;
  evidence: string;
  recommendation: string;
};

export type AuditedServer = {
  name: string;
  file: string;
  configPath: string;
  command?: string;
  args: string[];
  env: Record<string, unknown>;
};

export type AuditSummary = {
  score: number;
  filesScanned: number;
  serversScanned: number;
  findingsBySeverity: Record<Severity, number>;
};

export type AuditResult = {
  root: string;
  generatedAt: string;
  summary: AuditSummary;
  findings: Finding[];
  servers: AuditedServer[];
};
