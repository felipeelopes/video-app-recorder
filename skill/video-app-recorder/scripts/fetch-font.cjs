#!/usr/bin/env node
// Downloads a Google Fonts variable font (latin subset, woff2) into <project>/assets/fonts.
// Usage: node fetch-font.cjs [--project <dir>] [--family "Noto Sans"] [--file NotoSans-Variable.woff2]
"use strict";
const fs = require("fs");
const path = require("path");
const https = require("https");

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const project = path.resolve(arg("project", "."));
const family = arg("family", "Noto Sans");
const file = arg("file", `${family.replace(/\s+/g, "")}-Variable.woff2`);

// A modern browser user agent makes the CSS API answer with woff2 sources.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const get = (url) =>
  new Promise((ok, fail) =>
    https
      .get(url, { headers: { "User-Agent": UA } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return get(r.headers.location).then(ok, fail);
        if (r.statusCode !== 200) return fail(new Error(`HTTP ${r.statusCode} for ${url}`));
        const parts = [];
        r.on("data", (d) => parts.push(d));
        r.on("end", () => ok(Buffer.concat(parts)));
      })
      .on("error", fail),
  );

(async () => {
  const css = (await get(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100..900&display=block`)).toString();
  const latin = css.split("/*").find((b) => /^\s*latin \*\//.test(b));
  const src = (latin || css).match(/url\((https:[^)]+\.woff2)\)/);
  if (!src) throw new Error("woff2 source not found in the Google Fonts CSS");
  const dir = path.join(project, "assets", "fonts");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), await get(src[1]));
  console.log(`[fetch-font] ${family} -> assets/fonts/${file} (SIL Open Font License)`);
})().catch((e) => {
  console.error(`[fetch-font] ${e.message}`);
  process.exit(1);
});
