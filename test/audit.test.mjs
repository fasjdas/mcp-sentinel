import assert from "node:assert/strict";
import { test } from "node:test";
import { audit } from "../dist/cli.js";

test("safe project reports a clean score", async () => {
  const result = await audit("examples/safe-project");

  assert.equal(result.summary.score, 100);
  assert.equal(result.summary.filesScanned, 1);
  assert.equal(result.summary.serversScanned, 1);
  assert.equal(result.findings.length, 0);
});

test("unsafe project reports critical and high findings", async () => {
  const result = await audit("examples/unsafe-project");
  const ids = new Set(result.findings.map((finding) => finding.id));

  assert.equal(result.summary.filesScanned, 1);
  assert.equal(result.summary.serversScanned, 2);
  assert.equal(result.summary.findingsBySeverity.critical, 1);
  assert.equal(result.summary.findingsBySeverity.high, 3);
  assert.ok(ids.has("shell-command"));
  assert.ok(ids.has("broad-filesystem-access"));
  assert.ok(ids.has("inline-secret-value"));
  assert.ok(ids.has("risky-arguments"));
});
