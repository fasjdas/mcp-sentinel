# Contributing

Thanks for improving MCP Sentinel.

The most useful contributions are:

- New detection rules for real MCP or agent config risks.
- Safer recommendations for existing findings.
- Tests that capture known safe and unsafe configuration patterns.
- Output formats for CI and security tooling.

## Development

```bash
npm install
npm test
```

Run the unsafe demo:

```bash
npm run audit:example
```

## Adding Rules

Rules live in `src/rules.ts`. Keep each rule focused, explain the risk in the title, and include a clear remediation. Add or update tests when the rule changes expected findings.
