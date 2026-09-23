// Screen tour scene: a real 1920x1080 screenshot, an intro card, then "beats" where the camera
// glides to a measured point, a ring highlights a region and a callout explains the value.
"use strict";
const { esc, accent, fontFace, gradient, frame, round } = require("./common.cjs");

const W = 1920;
const H = 1080;

/** Camera translation that puts image point `f` at screen point `alvo`, clamped to keep the image covering the frame. */
function camera(scale, f, alvo) {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  return {
    x: round(clamp(alvo[0] - scale * f[0], W - scale * W, 0)),
    y: round(clamp(alvo[1] - scale * f[1], H - scale * H, 0)),
  };
}

/**
 * @param {object} s scene: image, intro {kicker, title, sub}, beats [{focus:[x,y], scale, ring:[x,y,w,h], callout, hold}]
 */
module.exports = function zoom(s, brand) {
  const id = s.id;
  const beats = s.beats || [];
  const introHold = s.intro ? (s.introHold ?? 2.6) : 0.8;
  const pad = 8;

  const css = `      ${fontFace(brand)}
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; container-type: size; font-family: "${brand.font.family}", sans-serif; background: #f3f4f6; }
      .z-cam { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; will-change: transform; }
      .z-shot { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
      .z-ring { position: absolute; border-radius: 14px; border: 3px solid ${brand.accent[1]}; box-shadow: 0 0 0 6px ${brand.accent[1]}24, 0 0 26px ${brand.accent[2]}59; opacity: 0; }
      .z-card { position: absolute; left: 70px; bottom: 90px; max-width: 980px; padding: 30px 38px; border-radius: 26px; background: #ffffff; box-shadow: 0 22px 60px rgba(31, 35, 40, 0.2); opacity: 0; }
      .z-kicker { font-size: 1.15cqw; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${brand.accent[1]}; }
      .z-title { margin-top: 10px; font-size: 3.1cqw; font-weight: 700; line-height: 1.1; color: ${brand.ink}; letter-spacing: -0.02em; }
      .z-grad { background: ${gradient(brand)}; -webkit-background-clip: text; background-clip: text; color: transparent; }
      .z-sub { margin-top: 12px; font-size: 1.55cqw; font-weight: 500; color: ${brand.muted}; }
      .z-callout { position: absolute; left: 0; right: 0; top: 900px; text-align: center; opacity: 0; }
      .z-callout span { display: inline-flex; align-items: center; gap: 18px; padding: 20px 36px 20px 22px; border-radius: 999px; background: #ffffff; box-shadow: 0 18px 48px rgba(31, 35, 40, 0.22); font-size: 2.05cqw; font-weight: 700; color: ${brand.ink}; white-space: nowrap; }
      .z-dot { width: 54px; height: 54px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: ${gradient(brand, 135)}; }`;

  const check = '<svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.4z"/></svg>';
  const body = `    <div class="clip" data-start="0" data-duration="__DUR__" data-track-index="0" style="position:absolute;inset:0">
      <div class="z-cam" id="z-cam">
        <img class="z-shot" src="${esc(s.image)}" alt="" />
${beats
  .map((b, i) =>
    b.ring
      ? `        <div class="z-ring" id="z-r${i}" style="left:${b.ring[0] - pad}px;top:${b.ring[1] - pad}px;width:${b.ring[2] + pad * 2}px;height:${b.ring[3] + pad * 2}px"></div>`
      : "",
  )
  .join("\n")}
      </div>
${
  s.intro
    ? `      <div class="z-card" id="z-intro">
        ${s.intro.kicker ? `<div class="z-kicker">${esc(s.intro.kicker)}</div>` : ""}
        <div class="z-title">${accent(s.intro.title || "", "z-grad")}</div>
        ${s.intro.sub ? `<div class="z-sub">${esc(s.intro.sub)}</div>` : ""}
      </div>`
    : ""
}
${beats.map((b, i) => (b.callout ? `      <div class="z-callout" id="z-c${i}"><span><i class="z-dot">${check}</i>${esc(b.callout)}</span></div>` : "")).join("\n")}
    </div>`;

  const lines = [];
  const cues = [];
  if (s.intro) lines.push(`tl.fromTo(q("#z-intro"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.4);`);
  let t = introHold;
  let prev = { x: 0, y: 0, scale: 1 };
  beats.forEach((b, i) => {
    const scale = b.scale ?? 1.4;
    const cam = camera(scale, b.focus || [W / 2, H / 2], b.callout ? [960, 470] : [960, 540]);
    if (i === 0 && s.intro) lines.push(`tl.to(q("#z-intro"), { opacity: 0, y: -10, duration: 0.4, ease: soft }, ${round(t)});`);
    lines.push(`tl.fromTo(q("#z-cam"), { scale: ${prev.scale}, x: ${prev.x}, y: ${prev.y} }, { scale: ${scale}, x: ${cam.x}, y: ${cam.y}, duration: 1.0, ease: "power3.inOut", immediateRender: false }, ${round(t)});`);
    cues.push(["whoosh-short", round(t), 0.2]);
    const on = round(t + 0.9);
    if (b.ring) lines.push(`tl.fromTo(q("#z-r${i}"), { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, ease: soft }, ${on});`);
    if (b.callout) lines.push(`tl.fromTo(q("#z-c${i}"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, ${on});`);
    cues.push(["pop", on, 0.22]);
    const hold = b.hold ?? 2.4;
    const off = round(t + 0.9 + hold);
    const last = i === beats.length - 1;
    if (!last) {
      if (b.ring) lines.push(`tl.to(q("#z-r${i}"), { opacity: 0, duration: 0.4, ease: soft }, ${off});`);
      if (b.callout) lines.push(`tl.to(q("#z-c${i}"), { opacity: 0, y: -10, duration: 0.4, ease: soft }, ${off});`);
    }
    prev = { x: cam.x, y: cam.y, scale };
    t = off + (last ? 0 : 0.4);
  });
  const duration = round(Math.max(t + 0.8, introHold + 1.5));
  return {
    html: frame({ id, duration, css, body: body.replace("__DUR__", duration), script: "\n        " + lines.join("\n        ") }),
    duration,
    cues,
  };
};
