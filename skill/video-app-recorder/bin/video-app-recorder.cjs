#!/usr/bin/env node
// video-app-recorder: single command line for the whole pipeline.
//
//   video-app-recorder init <dir> [--example] [--no-font]
//   video-app-recorder capture [--plan capture.plan.json] [--only <regex>] [--headed] [--allow-remote]
//   video-app-recorder build [--variant <name>] [--no-music]
//   video-app-recorder check | snapshot --at 4,12,30
//   video-app-recorder render [--variant a,b] [--out <dir>] [--skip-check]
//   video-app-recorder analyze-track <file>
//   video-app-recorder font [--family "Noto Sans"]
//   video-app-recorder demo-app [--port 8080]
//   video-app-recorder install-skill [--for claude|codex|cursor|agents] [--project [dir]]
//
// Every project command runs in the current directory (or --project <dir>).
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");

const VERSION = "0.1.0";
const ROOT = path.resolve(__dirname, "..");
const SCRIPTS = path.join(ROOT, "scripts");
const pkg = (() => {
  for (const p of [path.join(ROOT, "package.json"), path.join(ROOT, "..", "..", "package.json")]) {
    try {
      const j = JSON.parse(fs.readFileSync(p, "utf8"));
      if (j.name === "video-app-recorder") return j;
    } catch {
      // not found here, try the next location
    }
  }
  return { version: VERSION };
})();

const [cmd, ...rest] = process.argv.slice(2);
const win = process.platform === "win32";
const has = (n) => rest.includes(`--${n}`);
const val = (n, d) => {
  const v = has(n) ? rest[rest.indexOf(`--${n}`) + 1] : undefined;
  return v === undefined || v.startsWith("--") ? d : v;
};
const withProject = (list) => (has("project") ? list : [...list, "--project", process.cwd()]);

function run(bin, list, opts = {}) {
  const r = spawnSync(bin, list, { stdio: "inherit", ...opts });
  if (r.error) {
    console.error(`[video-app-recorder] could not run ${bin}: ${r.error.message}`);
    process.exit(1);
  }
  process.exit(r.status ?? 1);
}
const node = (script, list) => run(process.execPath, [path.join(SCRIPTS, script), ...list]);

function python() {
  for (const p of win ? ["python", "py", "python3"] : ["python3", "python"]) {
    const r = spawnSync(p, ["--version"], { stdio: "ignore" });
    if (r.status === 0) return p;
  }
  console.error("[video-app-recorder] Python 3 not found (needed for music scripts).");
  process.exit(1);
}

function serveDemo(port) {
  const dir = path.join(ROOT, "examples", "demo-app");
  const types = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".css": "text/css", ".js": "text/javascript" };
  http
    .createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
      const file = path.join(dir, rel);
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        return res.end("not found");
      }
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    })
    .listen(port, "127.0.0.1", () => console.log(`[video-app-recorder] demo app on http://localhost:${port} (Ctrl+C to stop)`));
}

// Where each agent looks for skills (user level, and project level with --project).
const SKILL_TARGETS = {
  claude: { user: [".claude", "skills"], project: [".claude", "skills"] },
  codex: { user: [".codex", "skills"], project: [".agents", "skills"] },
  cursor: { user: [".cursor", "skills"], project: [".cursor", "skills"] },
  agents: { user: [".agents", "skills"], project: [".agents", "skills"] },
  antigravity: { user: [".gemini", "config", "skills"], project: [".agents", "skills"] },
  gemini: { user: [".gemini", "config", "skills"], project: [".agents", "skills"] },
};

function installSkill() {
  const os = require("os");
  const names = String(val("for", "claude")).split(",");
  for (const name of names) {
    const t = SKILL_TARGETS[name];
    if (!t) {
      console.error(`[video-app-recorder] unknown target "${name}" (claude, codex, cursor, agents, antigravity, gemini)`);
      process.exit(2);
    }
    const base = has("project") ? path.resolve(val("project", process.cwd())) : os.homedir();
    const dest = path.join(base, ...(has("project") ? t.project : t.user), "video-app-recorder");
    if (path.resolve(dest) === path.resolve(ROOT)) {
      console.log(`[video-app-recorder] already installed at ${dest}`);
      continue;
    }
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(ROOT, dest, { recursive: true });
    console.log(`[video-app-recorder] skill installed for ${name}: ${dest}`);
  }
}

const HELP = `video-app-recorder ${pkg.version}

Usage: video-app-recorder <command> [options]

Project
  init <dir> [--example] [--no-font]   Create a video project (template, or the Acme demo with --example)
  capture [--plan <file>] [--only <regex>] [--headed] [--allow-remote]
                                       Capture screens and recordings of the local app
  build [--variant <name>] [--no-music]
                                       Generate frames, music, sound effects and index.html
  check                                Validate the composition (hyperframes check)
  snapshot --at <t1,t2,...>            Contact sheet of chosen instants (hyperframes snapshot)
  render [--variant a,b] [--out <dir>] [--skip-check]
                                       Render every variant and normalize loudness to -14 LUFS

Setup
  install-skill [--for claude|codex|cursor|agents] [--project [dir]]
                                       Copy the agent skill to where the agent looks for skills
                                       (user level by default; --project installs into the repo)

Tools
  analyze-track <file>                 BPM, downbeat and energy per bar of a music track
  font [--family "Noto Sans"]          Download a Google Fonts variable font into assets/fonts
  demo-app [--port 8080]               Serve the fictional Acme Bistro app to try the pipeline

Project commands run in the current directory; use --project <dir> to point elsewhere.
Docs: REFERENCE.md and STYLE.md next to this command's skill folder.`;

switch (cmd) {
  case "init":
    node("new-project.cjs", rest);
    break;
  case "capture":
    node("capture.mjs", withProject(has("plan") ? rest : ["--plan", path.join(val("project", process.cwd()), "capture.plan.json"), ...rest]));
    break;
  case "build":
    node("build.cjs", withProject(rest));
    break;
  case "render":
    node("render.cjs", withProject(rest));
    break;
  case "check":
  case "snapshot":
    run("npx", ["hyperframes", cmd, ...rest], { shell: win, cwd: val("project", process.cwd()) });
    break;
  case "install-skill":
    installSkill();
    break;
  case "analyze-track":
    if (!rest[0]) {
      console.error("usage: video-app-recorder analyze-track <file>");
      process.exit(2);
    }
    run(python(), [path.join(SCRIPTS, "analyze-track.py"), ...rest]);
    break;
  case "font":
    node("fetch-font.cjs", withProject(rest));
    break;
  case "demo-app":
    serveDemo(Number(val("port", 8080)));
    break;
  case "-v":
  case "--version":
  case "version":
    console.log(pkg.version);
    break;
  case undefined:
  case "-h":
  case "--help":
  case "help":
    console.log(HELP);
    break;
  default:
    console.error(`Unknown command "${cmd}".\n\n${HELP}`);
    process.exit(2);
}
