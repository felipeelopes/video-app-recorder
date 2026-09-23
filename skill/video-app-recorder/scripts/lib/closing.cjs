// Closing scene (8 s): logo + brand name inside a drawn outline, tagline, a sub line with an accent
// word, the website typed letter by letter with a blinking cursor, and an optional badge.
"use strict";
const { esc, fontFace, gradient, frame } = require("./common.cjs");

/**
 * @param {object} s scene: logo, brand, tagline, sub ("... [[word]] ..."), url, highlight (part of url), badge
 */
module.exports = function closing(s, brand) {
  const id = s.id;
  const logo = s.logo ?? brand.logo;
  const name = s.brand ?? brand.name;
  const words = (txt, cls) =>
    esc(txt || "")
      .split(/\s+/)
      .map((w) => `<span class="f-w">${w.replace(/\[\[([^\]]+)\]\]/, `<span class="${cls}">$1</span>`)}</span>`)
      .join(" ");
  const tagline = words(String(s.tagline || "").replace(/\[\[|\]\]/g, ""), "");
  const sub = words(s.sub || "", "f-grad").replace(/\[\[/g, "").replace(/\]\]/g, "");
  const url = String(s.url || "");
  const hi = s.highlight || "";
  const chars = [...url].map((c, i) => {
    const inHi = hi && url.indexOf(hi) >= 0 && i >= url.indexOf(hi) && i < url.indexOf(hi) + hi.length;
    return `<span class="f-ch${inHi ? " f-g" : ""}">${esc(c)}</span>`;
  });
  const badge = s.badge ? `<div class="f-badge"><span>${esc(s.badge)}</span></div>` : "";

  const css = `      ${fontFace(brand)}
      #root { position: absolute; inset: 0; width: 1920px; height: 1080px; overflow: hidden; container-type: size; font-family: "${brand.font.family}", sans-serif; }
      .f-bg { position: absolute; inset: 0; background: ${brand.background}; }
      .f-stage { position: absolute; inset: 0; transform-origin: 50% 45%; }
      .f-ring { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
      .f-lockup { position: absolute; left: 0; right: 0; top: 220px; height: 300px; display: flex; align-items: center; justify-content: center; gap: 56px; }
      .f-logo { display: block; max-width: 320px; max-height: 180px; }
      .f-name { margin: 0; font-size: 7.3cqw; font-weight: 700; line-height: 1; letter-spacing: -0.02em; color: ${brand.ink}; white-space: nowrap; padding-bottom: 12px; }
      .f-title { position: absolute; left: 0; right: 0; top: 604px; margin: 0; text-align: center; font-size: 4.2cqw; font-weight: 700; line-height: 1.08; letter-spacing: -0.02em; color: ${brand.ink}; white-space: nowrap; }
      .f-sub { position: absolute; left: 0; right: 0; top: 712px; margin: 0; text-align: center; font-size: 2.1cqw; font-weight: 500; color: ${brand.muted}; white-space: nowrap; }
      .f-w { display: inline-block; }
      .f-grad, .f-g { font-weight: 700; background: ${gradient(brand)}; -webkit-background-clip: text; background-clip: text; color: transparent; }
      .f-url { position: absolute; left: 0; right: 0; top: 800px; text-align: center; font-size: 2.6cqw; font-weight: 600; color: ${brand.ink}; white-space: nowrap; }
      .f-wrap { position: relative; display: inline-block; }
      .f-ghost { visibility: hidden; }
      .f-typed { position: absolute; left: 0; top: 0; white-space: nowrap; }
      .f-ch { display: none; }
      .f-cursor { display: inline-block; width: 4px; height: 0.95em; margin-left: 6px; vertical-align: -0.12em; background: ${brand.accent[1]}; opacity: 0; }
      .f-badge { position: absolute; left: 0; right: 0; top: 900px; text-align: center; }
      .f-badge span { display: inline-block; padding: 14px 48px; border-radius: 999px; background: ${gradient(brand)}; color: #ffffff; font-size: 2.4cqw; font-weight: 700; box-shadow: 0 14px 36px ${brand.accent[1]}4d; opacity: 0; }`;

  const [a, b, c] = brand.accent;
  const body = `    <div class="clip f-bg" data-start="0" data-duration="8" data-track-index="0"></div>
    <div class="clip f-stage" data-start="0" data-duration="8" data-track-index="1">
      <svg class="f-ring" viewBox="0 0 1920 1080" aria-hidden="true">
        <defs><linearGradient id="f-ring-grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}" /><stop offset="0.5" stop-color="${b}" /><stop offset="1" stop-color="${c}" /></linearGradient></defs>
        <path class="f-arc" d="M 960 220 H 1374 A 150 150 0 0 1 1374 520 H 546 A 150 150 0 0 1 546 220 Z" fill="none" stroke="url(#f-ring-grad)" stroke-width="4" stroke-linecap="round" stroke-dasharray="2598.48" stroke-dashoffset="2598.48" />
      </svg>
      <div class="f-lockup">
        ${logo ? `<img class="f-logo" src="${esc(logo)}" alt="" />` : ""}
        <p class="f-name">${esc(name)}</p>
      </div>
      <p class="f-title">${tagline}</p>
      <p class="f-sub">${sub}</p>
      ${url ? `<div class="f-url"><span class="f-wrap"><span class="f-ghost">${esc(url)}</span><span class="f-typed">${chars.join("")}<span class="f-cursor"></span></span></span></div>` : ""}
      ${badge}
    </div>`;

  const script = `
        if (q(".f-logo")) tl.fromTo(q(".f-logo"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 0.05);
        tl.fromTo(q(".f-name"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 0.35);
        tl.fromTo(q(".f-ring"), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: soft }, 0.6);
        tl.fromTo(q(".f-arc"), { attr: { "stroke-dashoffset": 2598.48 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.5, ease: soft }, 0.65);
        tl.fromTo(qa(".f-title .f-w"), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.09 }, 2.2);
        tl.fromTo(qa(".f-sub .f-w"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.06 }, 3.1);
        if (q(".f-cursor")) {
          tl.set(q(".f-cursor"), { opacity: 1 }, 4.1);
          qa(".f-ch").forEach((ch, i) => tl.set(ch, { display: "inline" }, 4.35 + i * 0.09));
          for (let k = 0; k < 6; k++) {
            tl.set(q(".f-cursor"), { opacity: 0 }, 5.9 + k * 0.5);
            tl.set(q(".f-cursor"), { opacity: 1 }, 6.15 + k * 0.5);
          }
        }
        if (q(".f-badge span")) tl.fromTo(q(".f-badge span"), { opacity: 0, y: 14, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, 5.9);
        tl.fromTo(q(".f-stage"), { scale: 1 }, { scale: 1.012, duration: 8, ease: "none" }, 0);`;

  const cues = [["chime", 0.6, 0.4], ["ping", 2.2, 0.25]];
  if (url) cues.push(["typing", 4.35, 0.3, Math.min(1.6, url.length * 0.09)]);
  if (s.badge) cues.push(["ping", 5.9, 0.2]);
  return { html: frame({ id, duration: 8, css, body, script }), duration: 8, cues };
};
