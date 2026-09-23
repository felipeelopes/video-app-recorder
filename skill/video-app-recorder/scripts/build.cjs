#!/usr/bin/env node
// Builds a HyperFrames project from video.config.json: generates the scene frames, lays them out on
// the timeline, prepares the music bed, places sound effects and writes index.html.
//
// Usage: node build.cjs [--project <dir>] [--variant <name>] [--no-music]
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");
const { brandDefaults, round } = require("./lib/common.cjs");

const GENERATORS = {
  hook: require("./lib/hook.cjs"),
  zoom: require("./lib/zoom.cjs"),
  chat: require("./lib/chat.cjs"),
  closing: require("./lib/closing.cjs"),
};

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const flag = (n) => args.includes(`--${n}`);
const project = path.resolve(arg("project", "."));
const variant = arg("variant", null);
const log = (m) => console.log(`[build] ${m}`);

const configPath = path.join(project, "video.config.json");
if (!fs.existsSync(configPath)) {
  console.error(`[build] ${configPath} not found. Start from the template: node new-project.cjs <dir>`);
  process.exit(2);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const brand = brandDefaults(config.brand);

/** Deep-merges variant overrides into the scene list: variants.<name>.scenes.<sceneId> = { ...fields } */
function applyVariant(scenes) {
  if (!variant) return scenes;
  const v = (config.variants || {})[variant];
  if (!v) throw new Error(`variant "${variant}" not found in video.config.json`);
  return scenes
    .filter((s) => !(v.remove || []).includes(s.id))
    .map((s) => ({ ...s, ...((v.scenes || {})[s.id] || {}) }));
}

function sfxDir() {
  if (config.sound && config.sound.sfxDir) return path.resolve(project, config.sound.sfxDir);
  const candidates = [];
  try {
    const root = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], { shell: process.platform === "win32" }).toString().trim();
    candidates.push(path.join(root, "hyperframes", "dist", "skills", "media-use", "audio", "assets", "sfx"));
  } catch {
    // npm not on PATH: fall back to the usual global locations below
  }
  if (process.env.APPDATA) candidates.push(path.join(process.env.APPDATA, "npm", "node_modules", "hyperframes", "dist", "skills", "media-use", "audio", "assets", "sfx"));
  return candidates.find((c) => fs.existsSync(c)) || null;
}

function mediaDuration(file) {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
}

function main() {
  const scenes = applyVariant(config.scenes || []);
  if (!scenes.length) throw new Error("video.config.json has no scenes");
  const W = config.width || 1920;
  const H = config.height || 1080;
  fs.mkdirSync(path.join(project, "compositions", "frames"), { recursive: true });

  // 1) Frames
  let t = 0;
  let reveal = null;
  const placed = [];
  for (const s of scenes) {
    let out;
    if (s.type === "custom") {
      if (!s.src || !s.duration) throw new Error(`custom scene "${s.id}" needs "src" and "duration"`);
      out = { duration: s.duration, cues: [] };
    } else {
      const gen = GENERATORS[s.type];
      if (!gen) throw new Error(`scene "${s.id}": unknown type "${s.type}" (hook, zoom, chat, closing, custom)`);
      out = gen(s, brand);
      fs.writeFileSync(path.join(project, "compositions", "frames", `${s.id}.html`), out.html);
    }
    if (out.reveal !== undefined && reveal === null) reveal = t + out.reveal;
    placed.push({ ...s, src: s.src || `compositions/frames/${s.id}.html`, start: round(t), duration: out.duration, cues: [...(out.cues || []), ...(s.cues || [])] });
    t += out.duration;
  }
  const total = round(t);
  const climaxId = (config.music && config.music.climax) || (config.sound && config.sound.climax) || null;
  const climax = placed.find((p) => p.id === climaxId) || null;
  log(`${placed.length} scenes, ${total}s${variant ? ` (variant ${variant})` : ""}`);

  // 2) Music bed
  let bgm = null;
  const m = config.music || {};
  if (!flag("no-music") && (m.source || m.calm || m.file)) {
    const wav = path.join(project, "assets", "bgm.wav");
    const py = process.platform === "win32" ? "python" : "python3";
    let r = { status: 0 };
    if (m.source && m.grid) {
      r = spawnSync(py, [path.join(__dirname, "extend-track.py"), "--project", project, "--src", m.source, "--grid", JSON.stringify(m.grid), "--reveal", String(reveal ?? 5.8), "--climax", String(climax ? climax.start : total * 0.85), "--duration", String(total), "--out", wav], { stdio: "inherit", cwd: project });
    } else if (m.calm) {
      r = spawnSync(py, [path.join(__dirname, "calm-track.py"), String(total), String(climax ? climax.start : total * 0.85), String(total - 5), String(reveal ?? 5.6), wav], { stdio: "inherit", cwd: project });
    }
    if (r.status !== 0) throw new Error("music step failed");
    const src = m.source || m.calm ? wav : path.join(project, m.file);
    bgm = "assets/bgm.m4a";
    spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-t", String(total), "-c:a", "aac", "-b:a", "192k", path.join(project, bgm)], { stdio: "inherit" });
  }

  // 3) Sound effects: transitions, climax riser, generator cues and config cues
  const dir = sfxDir();
  const abs = [];
  if (dir && !(config.sound && config.sound.sfx === false)) {
    placed.slice(1).forEach((p) => {
      if (climax && p.id === climax.id) {
        abs.push(["riser", round(p.start - 1.8), 0.35, 1.8], ["whoosh-cinematic", round(p.start - 0.3), 0.4]);
      } else if (config.sound?.transitions !== false) abs.push(["whoosh", round(p.start - 0.4), 0.3]);
    });
    placed.forEach((p) => p.cues.forEach(([name, at, vol, cut]) => abs.push([name, round(p.start + at), vol, cut])));
    fs.mkdirSync(path.join(project, "assets", "sfx"), { recursive: true });
  } else if (!dir) log("sound effects skipped: HyperFrames SFX folder not found (set sound.sfxDir)");

  const audio = [];
  abs.sort((a, b) => a[1] - b[1]).forEach(([name, at, vol, cut], i) => {
    const from = path.join(dir, `${name}.mp3`);
    if (!fs.existsSync(from)) return log(`missing sfx "${name}", skipped`);
    const rel = `assets/sfx/${name}.mp3`;
    const dest = path.join(project, rel);
    if (!fs.existsSync(dest)) fs.copyFileSync(from, dest);
    const d = round(Math.min(cut || mediaDuration(dest), total - at));
    if (d > 0) audio.push(`      <audio id="sfx-${String(i + 1).padStart(3, "0")}-${name}" src="${rel}" data-start="${at}" data-duration="${d}" data-track-index="${20 + i}" data-volume="${vol}"></audio>`);
  });
  if (bgm) audio.push(`      <audio id="bgm" src="${bgm}" data-start="0" data-duration="${total}" data-track-index="11" data-volume="${m.volume ?? 0.35}"></audio>`);

  // 4) Screen recordings placed by scene (local time -> global time)
  const videos = [];
  placed.forEach((p, n) =>
    (p.videos || []).forEach((v, k) => {
      videos.push(
        `      <video id="v-${p.id}-${k}" src="${v.src}"${v.mediaStart ? ` data-media-start="${v.mediaStart}"` : ""} muted playsinline class="clip" style="position:absolute;left:${v.x ?? 0}px;top:${v.y ?? 0}px;width:${v.w ?? W}px;height:${v.h ?? H}px;object-fit:${v.fit || "cover"}" data-start="${round(p.start + (v.start || 0))}" data-duration="${v.duration}" data-track-index="${(n + 2) * 1000 + k}"></video>`,
      );
    }),
  );

  // 5) index.html
  const hosts = placed
    .map((p) => `      <div id="el-${p.id}" class="scene" data-composition-id="${p.id}" data-composition-src="${p.src}" data-start="${p.start}" data-duration="${p.duration}" data-track-index="1"></div>`)
    .join("\n");
  const html = `<!doctype html>
<html lang="${config.lang || "en"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #ffffff; }
      .scene { position: absolute; inset: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
${hosts}
${videos.join("\n")}
${audio.join("\n")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(project, "index.html"), html);
  fs.mkdirSync(path.join(project, ".build"), { recursive: true });
  fs.writeFileSync(
    path.join(project, ".build", "timeline.json"),
    JSON.stringify({ variant, total, reveal, climax: climax && climax.start, scenes: placed.map(({ id, type, start, duration }) => ({ id, type, start, duration })) }, null, 2),
  );
  log(`index.html written: ${videos.length} video(s), ${audio.length} audio clip(s)`);
}

try {
  main();
} catch (e) {
  console.error(`[build] ${e.message}`);
  process.exit(1);
}
