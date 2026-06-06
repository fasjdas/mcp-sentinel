import assert from "node:assert/strict";
import { test } from "node:test";
import { renderGitHubAnnotations, renderTextReport } from "../dist/cli.js";
import { audit } from "../dist/cli.js";

test("text report includes score and remediation", async () => {
  const result = await audit("examples/unsafe-project");
  const report = renderTextReport(result);

  assert.match(report, /Score: 0\/100/);
  assert.match(report, /CRITICAL/);
  assert.match(report, /Fix:/);
});

test("GitHub annotations emit workflow commands", async () => {
  const result = await audit("examples/unsafe-project");
  const annotations = renderGitHubAnnotations(result);

  assert.match(annotations, /^::warning file=/);
  assert.match(annotations, /::error file=/);
  assert.match(annotations, /title=CRITICAL%3A/);
});
