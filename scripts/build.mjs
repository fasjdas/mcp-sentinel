import { promises as fs } from "node:fs";
import { build } from "esbuild";
import ts from "typescript";

const parsed = ts.getParsedCommandLineOfConfigFile("tsconfig.json", {}, ts.sys);

if (!parsed) {
  throw new Error("Unable to read tsconfig.json");
}

const program = ts.createProgram({
  rootNames: parsed.fileNames,
  options: {
    ...parsed.options,
    noEmit: true
  }
});

const diagnostics = ts.getPreEmitDiagnostics(program);

if (diagnostics.length > 0) {
  const host = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine
  };
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  process.exit(1);
}

await fs.rm("dist", { recursive: true, force: true });
await fs.mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/cli.ts"],
  outfile: "dist/cli.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18"
});

await fs.chmod("dist/cli.js", 0o755);
