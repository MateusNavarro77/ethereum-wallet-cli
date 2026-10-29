import { mkdir } from "node:fs/promises";

const outfile = `./dist/termiwallet${process.platform === "win32" ? ".exe" : ""}`;
await mkdir("./dist", { recursive: true });

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  compile: { outfile },
  define: {
    "process.env.OPENTUI_LIBC": JSON.stringify("glibc"),
  },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exitCode = 1;
} else {
  console.log(`Built executable: ${outfile}`);
}
