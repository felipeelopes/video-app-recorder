// Shared helpers for the frame generators.
"use strict";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** WhatsApp-style inline formatting: *bold*, _italic_, URLs, line breaks kept by pre-line. */
function richText(s) {
  return esc(s)
    .replace(/\*([^*\n]+)\*/g, "<b>$1</b>")
    .replace(/(^|\s)_([^_\n]+)_/g, "$1<i>$2</i>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<span class="vr-link">$1</span>');
}

/** Wraps [[word]] in the accent gradient span. */
function accent(s, cls) {
  return esc(s).replace(/\[\[([^\]]+)\]\]/g, `<span class="${cls}">$1</span>`);
}

function brandDefaults(brand = {}) {
  return {
    name: brand.name || "Your App",
    primary: brand.primary || "#4338CA",
    ink: brand.ink || "#111827",
    muted: brand.muted || "#4B5563",
    background: brand.background || "#ffffff",
    accent: brand.accent && brand.accent.length >= 3 ? brand.accent : ["#06B6D4", "#6366F1", "#A855F7"],
    logo: brand.logo || null,
    font: brand.font || { family: "Noto Sans", file: "assets/fonts/NotoSans-Variable.woff2" },
  };
}

function fontFace(brand) {
  const f = brand.font;
  return `@font-face { font-family: "${f.family}"; src: local("${f.family}"), url("${f.file}") format("woff2"); font-weight: 100 900; font-display: block; }`;
}

function gradient(brand, angle = 90) {
  const [a, b, c] = brand.accent;
  return `linear-gradient(${angle}deg, ${a} 0%, ${b} 50%, ${c} 100%)`;
}

// Every scene except the opening fades in from the stage color, so cuts between scenes are soft.
const FADE_IN = '        tl.fromTo(root.querySelectorAll(":scope > .clip"), { opacity: 0 }, { opacity: 1, duration: 0.6, ease: soft }, 0);\n';

/** Wraps a composition body in the HyperFrames sub-composition template. */
function frame({ id, duration, css, body, script, fadeIn = true }) {
  return `<template>
  <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${duration}">
    <style>
${css}
    </style>

${body}

    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      (function () {
        "use strict";
        window.__timelines = window.__timelines || {};
        const root = document.querySelector('[data-composition-id="${id}"]');
        const q = (s) => root.querySelector(s);
        const qa = (s) => root.querySelectorAll(s);
        const tl = gsap.timeline({ paused: true });
        const soft = "power2.inOut";
${fadeIn ? FADE_IN : ""}${script}
        tl.set({}, {}, ${duration});
        window.__timelines["${id}"] = tl;
      })();
    </script>
  </div>
</template>
`;
}

const round = (n) => Math.round(n * 100) / 100;

module.exports = { esc, richText, accent, brandDefaults, fontFace, gradient, frame, round };
