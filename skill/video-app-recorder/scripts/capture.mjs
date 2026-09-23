#!/usr/bin/env node
// Captures real screens and interactions of a locally running web app as video material.
//
// Usage:
//   node capture.mjs --plan capture.plan.json --project <dir> [--only "<regex>"] [--headed] [--allow-remote]
//
// Each shot opens a route, runs steps in the page (clicks, typing, your own JS), and saves a
// 1920x1080 PNG plus, optionally, an H.264 .mp4 of the interaction. A manifest and an asset list with
// measured coordinates are written for the storyboard. The browser profile persists between runs, so
// login only happens when the session is missing. Credentials come from environment variables.
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const flag = (n) => args.includes(`--${n}`);
const log = (m) => console.log(`[capture] ${m}`);

const planPath = arg("plan");
const project = arg("project");
const outDir = arg("out") || (project && path.join(project, "capture", "assets"));
if (!planPath || !outDir) {
  console.error("[capture] usage: --plan capture.plan.json (--project <dir> | --out <dir>) [--only <regex>] [--headed] [--allow-remote]");
  process.exit(2);
}

const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const base = String(plan.base || "http://localhost:3000").replace(/\/$/, "");
const vp = { width: 1920, height: 1080, scale: 1, ...(plan.viewport || {}) };

// Safety: capture against a local or staging instance, never production data by accident.
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(base);
if (!isLocal && !(flag("allow-remote") || plan.allowRemote)) {
  console.error(`[capture] base "${base}" refused: only localhost by default. Use --allow-remote for a staging host you are allowed to record (never production).`);
  process.exit(2);
}
if (!isLocal) log(`WARNING: recording a remote host (${base}). Make sure it holds demo data only.`);

/** Replaces ${env:NAME} with the environment value; values are never printed. */
function fromEnv(v) {
  return String(v ?? "").replace(/\$\{env:([A-Z0-9_]+)\}/gi, (_, name) => {
    if (process.env[name] === undefined) throw new Error(`environment variable ${name} is not set`);
    return process.env[name];
  });
}

function loadPuppeteer() {
  const req = createRequire(import.meta.url);
  const candidates = ["puppeteer-core", "puppeteer"];
  const globalRoots = [];
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], { shell: process.platform === "win32" });
  if (r.status === 0) globalRoots.push(r.stdout.toString().trim());
  if (process.env.APPDATA) globalRoots.push(path.join(process.env.APPDATA, "npm", "node_modules"));
  for (const root of globalRoots) {
    candidates.push(path.join(root, "hyperframes", "node_modules", "puppeteer-core"), path.join(root, "puppeteer-core"), path.join(root, "puppeteer"));
  }
  for (const c of candidates) {
    try {
      return req(c);
    } catch {
      // try the next location
    }
  }
  throw new Error("puppeteer-core not found. Install HyperFrames globally (npm i -g hyperframes) or run: npm i puppeteer-core");
}

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const system = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  if (flag("headed")) {
    const s = system.find((p) => fs.existsSync(p));
    if (s) return s;
  }
  const root = path.join(os.homedir(), ".cache", "hyperframes", "chrome", "chrome-headless-shell");
  if (fs.existsSync(root)) {
    for (const v of fs.readdirSync(root).sort().reverse()) {
      for (const dir of fs.readdirSync(path.join(root, v))) {
        const exe = path.join(root, v, dir, process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell");
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  const s = system.find((p) => fs.existsSync(p));
  if (s) return s;
  throw new Error("Chrome not found. Run 'npx hyperframes doctor' or set CHROME_PATH.");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// HyperFrames seeks frame videos precisely only in H.264 yuv420p at a constant frame rate.
function toMp4(webm) {
  const mp4 = webm.replace(/\.webm$/, ".mp4");
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", "-crf", "18", "-movflags", "+faststart", "-an", mp4], { stdio: "inherit" });
  if (r.status !== 0) {
    log(`ffmpeg failed on ${path.basename(webm)}; keeping the .webm`);
    return path.basename(webm);
  }
  fs.rmSync(webm, { force: true });
  return path.basename(mp4);
}

/** Runs one declarative step in the page. Returns the value of `js`/`measure` steps. */
async function runStep(page, step, defaultPause) {
  const s = typeof step === "string" ? { js: step } : step;
  let value;
  if (s.click) {
    await page.waitForSelector(s.click, { visible: true, timeout: 20000 });
    await page.click(s.click);
  } else if (s.fill) {
    // Native value setter + input event works with React, Vue, Angular and most component libraries.
    await page.waitForSelector(s.fill, { visible: true, timeout: 20000 });
    await page.$eval(s.fill, (el, v) => {
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
      setter ? setter.call(el, v) : (el.value = v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, fromEnv(s.value));
  } else if (s.type) {
    await page.waitForSelector(s.type, { visible: true, timeout: 20000 });
    await page.click(s.type);
    await page.keyboard.type(fromEnv(s.text), { delay: s.delay ?? 45 });
  } else if (s.press) {
    await page.keyboard.press(s.press);
  } else if (s.js || s.code) {
    const code = `(async () => { ${s.js || s.code} })()`;
    try {
      value = await page.evaluate(code);
    } catch (e) {
      // A previous step navigated (location.href, form submit): wait for the new page and retry once.
      if (!/context was destroyed|navigation/i.test(e.message)) throw e;
      await page.waitForNavigation({ waitUntil: "load", timeout: 30000 }).catch(() => {});
      value = await page.evaluate(code);
    }
  }
  await sleep(s.pause ?? defaultPause);
  return { value, measure: s.measure };
}

async function loginIfNeeded(page) {
  const L = plan.login;
  if (!L) return;
  await page.goto(`${base}${L.check || "/"}`, { waitUntil: "load", timeout: 90000 });
  const onLogin = () => new RegExp(L.loginUrlPattern || "login|signin|auth", "i").test(page.url());
  if (!onLogin()) return;
  log("session missing, signing in with the credentials from the environment");
  const captcha = async () =>
    L.captchaSelector ? page.$eval(L.captchaSelector, (el) => !!(el && el.offsetParent !== null)).catch(() => false) : false;
  for (const step of L.steps || []) await runStep(page, step, 400);
  const limit = Date.now() + (flag("headed") ? 300000 : (L.timeout ?? 90) * 1000);
  while (Date.now() < limit) {
    await sleep(800);
    if (!onLogin()) return;
    // A captcha is solved by a human in the visible window, never bypassed.
    if (!flag("headed") && (await captcha())) throw new Error("the login asked for a captcha: run again with --headed and solve it yourself");
  }
  throw new Error("login did not finish (credentials, lock or captcha)");
}

async function applyState(page, state) {
  if (!state) return;
  await page.evaluate((items) => {
    for (const [k, v] of Object.entries(items)) {
      if (k.endsWith("*") && v === null) {
        const prefix = k.slice(0, -1);
        Object.keys(localStorage).filter((x) => x.startsWith(prefix)).forEach((x) => localStorage.removeItem(x));
      } else if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }, state);
}

async function shoot(page, t) {
  const name = t.name.replace(/[^a-z0-9-_]/gi, "-");
  if (!t.keepState) await applyState(page, { ...(plan.state || {}), ...(t.state || {}) });
  if (t.route) {
    // "load", not "networkidle": apps with live connections (chat, websockets) never go idle.
    await page.goto(`${base}${t.route.startsWith("/") ? "" : "/"}${t.route}`, { waitUntil: "load", timeout: 90000 });
  }
  if (t.waitFor) await page.waitForSelector(t.waitFor, { visible: true, timeout: 30000 });
  await sleep(t.delay ?? 1500);

  const rec = t.record
    ? await page.screencast({ path: path.join(outDir, `${name}.webm`), speed: 1 }).catch((e) => {
        log(`screencast unavailable for ${name}: ${e.message}`);
        return null;
      })
    : null;

  const measures = {};
  for (const step of [...(t.keepState ? [] : plan.beforeEach || []), ...(t.steps || [])]) {
    const r = await runStep(page, step, t.stepPause ?? 900);
    if (r.measure) measures[r.measure] = r.value;
  }

  let video = null;
  if (rec) {
    await sleep((Number(t.record) || 0) * 1000);
    await rec.stop();
    video = toMp4(path.join(outDir, `${name}.webm`));
  }
  const file = path.join(outDir, `${name}.png`);
  if (t.selector) {
    const el = await page.$(t.selector);
    if (!el) throw new Error(`selector "${t.selector}" not found in ${name}`);
    await el.screenshot({ path: file });
  } else await page.screenshot({ path: file, fullPage: !!t.fullPage });
  return { file: path.basename(file), video, route: t.route || null, description: t.description || "", ...(Object.keys(measures).length ? { measures } : {}) };
}

function writeInventory(all) {
  if (!project) return;
  const dir = path.join(project, "capture", "extracted");
  fs.mkdirSync(dir, { recursive: true });
  const lines = all.map(
    (t) =>
      `- \`${t.file}\`${t.video ? ` (+ video \`${t.video}\`)` : ""} — ${t.description || "no description"}${t.route ? ` (route ${t.route})` : ""}` +
      (t.measures ? `\n  - measures: \`${JSON.stringify(t.measures)}\`` : ""),
  );
  fs.writeFileSync(path.join(dir, "asset-descriptions.md"), `# Captured assets\n\nReal captures at ${vp.width}x${vp.height} from ${base}.\n\n${lines.join("\n")}\n`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const puppeteer = loadPuppeteer();
  const profile = plan.profileDir ? path.resolve(plan.profileDir) : path.join(os.homedir(), ".cache", "video-app-recorder", "profile");
  fs.mkdirSync(profile, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: !flag("headed"),
    userDataDir: profile,
    acceptInsecureCerts: true,
    defaultViewport: { width: vp.width, height: vp.height, deviceScaleFactor: vp.scale },
    args: ["--hide-scrollbars", `--window-size=${vp.width},${vp.height}`, ...(isLocal ? ["--ignore-certificate-errors"] : [])],
  });

  const done = [];
  const failed = [];
  try {
    const page = await browser.newPage();
    page.on("dialog", (d) => d.dismiss().catch(() => {}));
    await loginIfNeeded(page);
    const only = arg("only") ? new RegExp(arg("only")) : null;
    for (const t of (plan.shots || []).filter((x) => !only || only.test(x.name))) {
      try {
        const r = await shoot(page, t);
        done.push(r);
        log(`ok ${r.file}${r.video ? ` + ${r.video}` : ""}`);
      } catch (e) {
        failed.push({ name: t.name, error: e.message });
        console.error(`[capture] failed ${t.name}: ${e.message}`);
      }
    }
  } finally {
    // Leave the profile clean so the next run does not inherit collapsed panels or filters.
    const pages = await browser.pages();
    if (pages.length) await applyState(pages[pages.length - 1], plan.state).catch(() => {});
    await browser.close();
  }

  for (const x of plan.extras || []) {
    if (!fs.existsSync(x.from)) {
      failed.push({ name: x.name, error: `extra not found: ${x.from}` });
      continue;
    }
    fs.copyFileSync(x.from, path.join(outDir, x.name));
    done.push({ file: x.name, video: null, route: null, description: x.description || "" });
  }

  const manifestPath = path.join(outDir, "manifest.json");
  let previous = [];
  try {
    previous = JSON.parse(fs.readFileSync(manifestPath, "utf8")).shots || [];
  } catch {
    previous = [];
  }
  const fresh = new Set(done.map((t) => t.file));
  const all = [...previous.filter((t) => !fresh.has(t.file)), ...done].sort((a, b) => a.file.localeCompare(b.file));
  fs.writeFileSync(manifestPath, JSON.stringify({ base, shots: all, failed }, null, 2));
  writeInventory(all);
  log(`${done.length} shot(s), ${failed.length} failure(s). Manifest: ${manifestPath}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(`[capture] ${e.message}`);
  process.exit(1);
});
