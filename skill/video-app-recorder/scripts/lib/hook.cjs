// Opening scene (8 s): mystery teaser on a dark stage, blurred glimpses of real screens, a
// question or claim, then a white bloom reveals the headline and the tagline.
"use strict";
const { esc, fontFace, gradient, frame } = require("./common.cjs");

/**
 * @param {object} s scene config: teaser, teaserSub, middle, flashes[], headline, tagline
 * @param {object} brand normalized brand
 */
module.exports = function hook(s, brand) {
  const id = s.id;
  const flashes = (s.flashes || []).slice(0, 3);
  const words = String(s.headline || `${brand.name} [[changed.]]`).split(/\s+(?![^\[]*\]\])/);
  const headline = words
    .map((w) => {
      const m = w.match(/^\[\[(.+)\]\]$/);
      return m
        ? `<span class="h-word h-w1 h-accent">${esc(m[1])}<span class="h-ul"></span></span>`
        : `<span class="h-word h-w1">${esc(w)}</span>`;
    })
    .join(" ");
  const tagline = esc(s.tagline || "").replace(
    /\[\[([^\]]+)\]\]/,
    '<span class="h-word">$1<span class="h-glow"></span><span class="h-thread"></span></span>',
  );
  const middle = esc(s.middle || "").replace(/\n/g, "<br>").replace(/\[\[([^\]]+)\]\]/g, '<span class="h-grad">$1</span>');
  const middleLong = String(s.middle || "").length > 34;
  const [a, b, c] = brand.accent;

  const css = `      ${fontFace(brand)}
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; container-type: size; font-family: "${brand.font.family}", sans-serif; }
      .h-layer { position: absolute; inset: 0; }
      .h-ground { background: ${brand.background}; }
      .h-dark { overflow: hidden; }
      .h-dark-in { position: absolute; inset: 0; background: #0f1114; overflow: hidden; }
      .h-blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.55; }
      .h-blob-a { width: 900px; height: 620px; left: 180px; top: 160px; background: ${a}; }
      .h-blob-b { width: 820px; height: 640px; left: 560px; top: 260px; background: ${b}; }
      .h-blob-c { width: 880px; height: 600px; left: 900px; top: 120px; background: ${c}; }
      .h-shot { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; object-fit: cover; opacity: 0; filter: blur(34px) saturate(1.2); }
      .h-frost { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 42%, rgba(15, 17, 20, 0.35) 0%, rgba(15, 17, 20, 0.78) 70%); }
      .h-bloom { position: absolute; left: 560px; top: 90px; width: 800px; height: 800px; border-radius: 50%; background: radial-gradient(circle, #ffffff 0%, rgba(255, 255, 255, 0.85) 40%, rgba(255, 255, 255, 0) 70%); opacity: 0; }
      .h-line { position: absolute; left: 0; right: 0; text-align: center; line-height: 1.1; letter-spacing: -0.02em; white-space: nowrap; }
      .h-teaser { top: 330px; font-size: 6cqw; font-weight: 700; color: #ffffff; }
      .h-teaser-sub { top: 500px; font-size: 2.4cqw; font-weight: 500; color: rgba(255, 255, 255, 0.72); letter-spacing: 0; }
      .h-mid { top: ${middleLong ? 330 : 380}px; font-size: ${middleLong ? 4.6 : 6}cqw; line-height: 1.18; font-weight: 700; color: #ffffff; opacity: 0; visibility: hidden; }
      .h-grad { background: linear-gradient(90deg, color-mix(in srgb, ${a} 70%, #fff) 0%, color-mix(in srgb, ${b} 70%, #fff) 50%, color-mix(in srgb, ${c} 70%, #fff) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
      .h-l1 { top: 320px; font-size: 7.5cqw; font-weight: 700; color: ${brand.ink}; }
      .h-l2 { top: 530px; font-size: 3.6cqw; font-weight: 600; color: ${brand.muted}; opacity: 0; visibility: hidden; }
      .h-ch { display: inline-block; white-space: pre; }
      .h-word { display: inline-block; position: relative; }
      .h-accent { color: ${brand.primary}; }
      .h-ul { position: absolute; left: 0; right: 0.28em; bottom: -0.06em; height: 10px; border-radius: 6px; background: ${brand.primary}; transform-origin: left center; }
      .h-thread { position: absolute; left: 0; right: 0.28em; bottom: -0.1em; height: 6px; border-radius: 6px; background: ${gradient(brand)}; transform-origin: left center; }
      .h-glow { position: absolute; left: 0; right: 0.28em; bottom: -0.2em; height: 20px; border-radius: 20px; background: ${gradient(brand)}; filter: blur(12px); opacity: 0.35; transform-origin: left center; }`;

  const body = `    <div class="h-layer h-ground clip" data-start="0" data-duration="8" data-track-index="0"></div>
    <div class="h-layer clip" data-start="0" data-duration="8" data-track-index="1">
      <div class="h-line h-l1">${headline}</div>
      <div class="h-line h-l2">${tagline}</div>
    </div>
    <div class="h-layer h-dark clip" data-start="0" data-duration="8" data-track-index="2">
      <div class="h-dark-in">
        <div class="h-blob h-blob-a"></div>
        <div class="h-blob h-blob-b"></div>
        <div class="h-blob h-blob-c"></div>
${flashes.map((f, i) => `        <img class="h-shot" id="h-shot-${i}" src="${esc(f)}" alt="" />`).join("\n")}
        <div class="h-frost"></div>
        <div class="h-line h-teaser"><span class="h-split">${esc(s.teaser || "Something new is coming…")}</span></div>
        <div class="h-line h-teaser-sub">${esc(s.teaserSub || "")}</div>
        <div class="h-line h-mid">${middle}</div>
        <div class="h-bloom"></div>
      </div>
    </div>`;

  const script = `
        const split = q(".h-split");
        if (split && !split.dataset.done) {
          const text = split.textContent;
          split.textContent = "";
          for (const ch of text) {
            const sp = document.createElement("span");
            sp.className = "h-ch";
            sp.textContent = ch;
            split.appendChild(sp);
          }
          split.dataset.done = "1";
        }
        tl.fromTo(q(".h-blob-a"), { x: -60, y: 20, scale: 0.92 }, { x: 80, y: -40, scale: 1.08, duration: 2.8, ease: "sine.inOut" }, 0);
        tl.to(q(".h-blob-a"), { x: -20, y: 30, scale: 0.96, duration: 2.6, ease: "sine.inOut" }, 2.8);
        tl.fromTo(q(".h-blob-b"), { x: 40, y: -30, scale: 1.05 }, { x: -70, y: 40, scale: 0.9, duration: 2.6, ease: "sine.inOut" }, 0);
        tl.to(q(".h-blob-b"), { x: 30, y: -20, scale: 1.1, duration: 2.8, ease: "sine.inOut" }, 2.6);
        tl.fromTo(q(".h-blob-c"), { x: 50, y: 30, scale: 0.95 }, { x: -60, y: -30, scale: 1.1, duration: 3.0, ease: "sine.inOut" }, 0);
        tl.to(q(".h-blob-c"), { x: 20, y: 40, scale: 0.94, duration: 2.4, ease: "sine.inOut" }, 3.0);
        tl.fromTo(qa(".h-blob"), { opacity: 0.3 }, { opacity: 0.6, duration: 1.6, ease: soft, stagger: 0.2 }, 0);

        tl.fromTo(qa(".h-teaser .h-ch"), { autoAlpha: 0, y: 18, filter: "blur(6px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "power3.out", stagger: 0.05 }, 0.25);
        tl.fromTo(q(".h-teaser-sub"), { autoAlpha: 0, filter: "blur(8px)" }, { autoAlpha: 1, filter: "blur(0px)", duration: 0.7, ease: soft }, 1.75);
        tl.to([q(".h-teaser"), q(".h-teaser-sub")], { autoAlpha: 0, filter: "blur(12px)", duration: 0.6, ease: soft }, 2.8);

        [${flashes.map((_, i) => `["#h-shot-${i}", ${(3.2 + i * 0.65).toFixed(2)}]`).join(", ")}].forEach(([sel, t]) => {
          tl.fromTo(q(sel), { opacity: 0, scale: 1.08 }, { opacity: 0.6, scale: 1.02, duration: 0.3, ease: soft, immediateRender: false }, t);
          tl.to(q(sel), { opacity: 0, scale: 1, duration: 0.35, ease: soft }, t + 0.5);
        });

        tl.fromTo(q(".h-mid"), { autoAlpha: 0, filter: "blur(12px)" }, { autoAlpha: 1, filter: "blur(0px)", duration: 0.6, ease: soft, immediateRender: false }, 3.0);
        tl.fromTo(q(".h-bloom"), { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 3.2, duration: 1.0, ease: soft, immediateRender: false }, 5.1);
        tl.to(q(".h-mid"), { autoAlpha: 0, filter: "blur(12px)", duration: 0.6, ease: soft }, 5.2);
        tl.to(q(".h-dark-in"), { opacity: 0, duration: 0.8, ease: soft }, 5.5);

        tl.fromTo(qa(".h-w1"), { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, ease: "power3.out", stagger: 0.14 }, 5.75);
        tl.fromTo(qa(".h-ul"), { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: soft }, 6.35);
        tl.fromTo(q(".h-l2"), { autoAlpha: 0, y: 16, filter: "blur(8px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.6, ease: "power3.out", immediateRender: false }, 6.6);
        tl.fromTo(qa(".h-thread"), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: soft }, 7.05);
        tl.fromTo(qa(".h-glow"), { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 0.35, duration: 0.7, ease: soft }, 7.1);`;

  const cues = [
    ["sparkle", 0.9, 0.25],
    ...flashes.map((_, i) => ["whoosh-short", 3.1 + i * 0.65, 0.18]),
    ["chime", 5.5, 0.35],
    ["sparkle", 7.0, 0.3],
  ];
  return { html: frame({ id, duration: 8, css, body, script, fadeIn: false }), duration: 8, cues, reveal: 5.75 };
};
