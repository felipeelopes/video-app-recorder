#!/usr/bin/env node
// Creates a video project from the template: config, capture plan, HyperFrames settings and the font.
// Usage: node new-project.cjs <dir> [--example] [--no-font]
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const dest = args.find((a) => !a.startsWith("--"));
if (!dest) {
  console.error("[new-project] usage: node new-project.cjs <dir> [--example] [--no-font]");
  process.exit(2);
}
const target = path.resolve(dest);
if (fs.existsSync(target) && fs.readdirSync(target).length) {
  console.error(`[new-project] ${target} is not empty`);
  process.exit(2);
}
const skill = path.resolve(__dirname, "..");
const from = args.includes("--example") ? path.join(skill, "examples", "demo") : path.join(skill, "template");
if (!fs.existsSync(from)) {
  console.error(`[new-project] source not found: ${from}`);
  process.exit(2);
}
fs.cpSync(from, target, { recursive: true });
for (const d of ["assets", "capture/assets", "compositions/frames", "renders"]) fs.mkdirSync(path.join(target, d), { recursive: true });
if (!args.includes("--no-font")) spawnSync(process.execPath, [path.join(__dirname, "fetch-font.cjs"), "--project", target], { stdio: "inherit" });
console.log(`[new-project] ${target}
Next (inside the project):
  1. Edit capture.plan.json (base URL, login steps, shots) and export the credentials it references.
  2. video-app-recorder capture
  3. Edit video.config.json (brand, scenes, variants, music).
  4. video-app-recorder build --variant <name> && video-app-recorder check
  5. video-app-recorder render`);
