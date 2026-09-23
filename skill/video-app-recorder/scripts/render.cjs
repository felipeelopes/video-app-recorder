#!/usr/bin/env node
// Builds, validates and renders every variant of the video, then normalizes loudness to -14 LUFS.
//
// Usage: node render.cjs [--project <dir>] [--variant soon,launch] [--out <dir>] [--skip-check]
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const flag = (n) => args.includes(`--${n}`);
const project = path.resolve(arg("project", "."));
const config = JSON.parse(fs.readFileSync(path.join(project, "video.config.json"), "utf8"));
const slug = config.slug || path.basename(project);
const outDir = path.resolve(project, arg("out", (config.output && config.output.dir) || "renders/final"));
const variants = arg("variant") ? arg("variant").split(",") : Object.keys(config.variants || {}).length ? Object.keys(config.variants) : [null];
const win = process.platform === "win32";

function run(cmd, list, opts = {}) {
  const r = spawnSync(cmd, list, { stdio: "inherit", cwd: project, shell: win, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${list.join(" ")} failed (exit ${r.status})`);
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(project, "renders"), { recursive: true });
for (const v of variants) {
  const name = v ? `${slug}-${v}` : slug;
  console.log(`\n[render] ${name}`);
  run(process.execPath, [path.join(__dirname, "build.cjs"), "--project", project, ...(v ? ["--variant", v] : [])], { shell: false });
  if (!flag("skip-check")) run("npx", ["hyperframes", "check"]);
  const raw = path.join(project, "renders", `${name}.mp4`);
  run("npx", ["hyperframes", "render", "-o", raw]);
  const final = path.join(outDir, `${name}.mp4`);
  run("ffmpeg", ["-v", "error", "-y", "-i", raw, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", final], { shell: false });
  console.log(`[render] ${final}`);
}
