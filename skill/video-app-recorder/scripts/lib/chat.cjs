// Messenger simulator scene: a phone with a WhatsApp-like dark chat driven by a JSON conversation.
// Timing is computed from the conversation (typing indicator, composer typing, taps, reading time).
"use strict";
const { esc, richText, fontFace, gradient, frame, round } = require("./common.cjs");

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const plain = (s) => String(s || "").replace(/[*_]/g, "");
const ICON_CHECK = '<svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.4z"/></svg>';
const ICON_FORM = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zm2 16H8v-2h8zm0-4H8v-2h8zm-3-5V3.5L18.5 9z"/></svg>';

function css(brand) {
  return `      ${fontFace(brand)}
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; container-type: size; font-family: "${brand.font.family}", sans-serif; background: #f5f6f8; }
      .c-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at 72% 45%, ${brand.accent[2]}29 0%, rgba(245, 246, 248, 0) 55%), radial-gradient(ellipse at 20% 80%, ${brand.accent[0]}1a 0%, rgba(245, 246, 248, 0) 50%), #f5f6f8; }
      .ph { position: absolute; left: 1150px; top: 28px; width: 500px; height: 1024px; border-radius: 66px; background: #121416; box-shadow: 0 40px 90px rgba(15, 17, 20, 0.35), inset 0 0 0 2px #2b2f33; }
      .ph-screen { position: absolute; left: 14px; top: 14px; right: 14px; bottom: 14px; border-radius: 54px; overflow: hidden; background: #0b141a; color: #e9edef; font-size: 17px; line-height: 1.36; }
      .ph-island { position: absolute; left: 50%; top: 12px; width: 122px; height: 34px; margin-left: -61px; border-radius: 20px; background: #000; z-index: 7; }
      .ph-status { position: absolute; left: 0; right: 0; top: 0; height: 56px; background: #202c33; display: flex; align-items: center; justify-content: space-between; padding: 8px 34px 0 42px; font-size: 16px; font-weight: 600; z-index: 4; }
      .ph-header { position: absolute; left: 0; right: 0; top: 56px; height: 66px; background: #202c33; display: flex; align-items: center; gap: 10px; padding: 0 14px 0 8px; z-index: 4; }
      .ph-avatar { width: 42px; height: 42px; border-radius: 50%; background: #6b7c85; overflow: hidden; flex: none; display: flex; align-items: center; justify-content: center; font-weight: 700; }
      .ph-avatar img { width: 100%; height: 100%; object-fit: cover; background: #fff; }
      .ph-contact { flex: 1; min-width: 0; }
      .ph-name { font-size: 18px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ph-sub { font-size: 13.5px; color: #8696a0; height: 18px; position: relative; }
      .ph-sub span { position: absolute; left: 0; top: 0; }
      .ph-typing { color: #00a884; display: none; }
      .ph-icons { display: flex; gap: 22px; }
      .ph-chat { position: absolute; left: 0; right: 0; top: 122px; bottom: 74px; overflow: hidden; background-color: #0b141a;
        background-image: radial-gradient(rgba(134, 150, 160, 0.07) 1.2px, transparent 1.3px), radial-gradient(rgba(134, 150, 160, 0.05) 1px, transparent 1.1px);
        background-size: 26px 26px, 38px 38px; background-position: 0 0, 13px 19px; }
      .ph-list { position: absolute; left: 0; right: 0; bottom: 10px; display: flex; flex-direction: column; gap: 5px; padding: 0 12px; }
      .ph-chip { align-self: center; background: #182229; color: #8696a0; font-size: 13.5px; padding: 5px 12px; border-radius: 8px; margin: 4px 0; }
      .ph-sys { align-self: center; background: #182229; color: #ffd279; font-size: 13px; text-align: center; padding: 7px 12px; border-radius: 8px; max-width: 86%; margin-bottom: 6px; }
      .ph-m { display: flex; flex-direction: column; max-width: 84%; }
      .ph-in { align-self: flex-start; }
      .ph-out { align-self: flex-end; }
      .ph-bub { position: relative; padding: 7px 10px 8px 10px; border-radius: 10px; white-space: pre-line; word-wrap: break-word; }
      .ph-in .ph-bub { background: #202c33; border-top-left-radius: 2px; }
      .ph-out .ph-bub { background: #005c4b; border-top-right-radius: 2px; }
      .ph-meta { float: right; margin: 8px 0 -4px 12px; font-size: 12px; color: rgba(233, 237, 239, 0.82); display: inline-flex; align-items: center; gap: 3px; }
      .ph-tick { color: #53bdeb; }
      .ph-quote { background: rgba(0, 0, 0, 0.2); border-left: 4px solid #06cf9c; border-radius: 7px; padding: 5px 9px; margin-bottom: 5px; font-size: 14px; white-space: normal; }
      .ph-quote b { display: block; color: #06cf9c; font-size: 13.5px; }
      .ph-quote i { font-style: normal; color: #aebac1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .ph-btns { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
      .ph-btn { flex: 1 1 45%; background: #202c33; color: #00a884; text-align: center; font-size: 16px; font-weight: 500; padding: 10px 8px; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; }
      .vr-link { color: #53bdeb; }
      .ph-card .ph-bub { padding: 0; overflow: hidden; width: 330px; }
      .ph-card-body { padding: 10px 12px 8px; white-space: normal; }
      .ph-card-title { font-weight: 700; }
      .ph-card-foot { color: #8696a0; font-size: 13.5px; margin-top: 6px; }
      .ph-card-btn { border-top: 1px solid rgba(134, 150, 160, 0.18); color: #00a884; text-align: center; padding: 11px; font-weight: 500; font-size: 16px; display: flex; justify-content: center; gap: 8px; align-items: center; }
      .ph-resp { display: flex; align-items: center; gap: 10px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 8px 10px; white-space: normal; color: #e9edef; }
      .ph-resp small { display: block; color: #aebac1; font-size: 14px; }
      .ph-composer { position: absolute; left: 0; right: 0; bottom: 0; height: 74px; background: #0b141a; display: flex; align-items: center; gap: 8px; padding: 0 10px 12px; }
      .ph-input { flex: 1; height: 48px; border-radius: 24px; background: #202c33; display: flex; align-items: center; padding: 0 16px; gap: 12px; color: #8696a0; font-size: 17px; overflow: hidden; }
      .ph-field-txt { flex: 1; position: relative; height: 24px; }
      .ph-field-txt > span { position: absolute; left: 0; top: 0; white-space: nowrap; }
      .ph-typed { color: #e9edef; }
      .ph-mic { width: 50px; height: 50px; border-radius: 50%; background: #00a884; display: flex; align-items: center; justify-content: center; flex: none; }
      .ph-sheet { position: absolute; left: 0; right: 0; top: 70px; bottom: 0; background: #1b1c1e; border-radius: 18px 18px 0 0; z-index: 6; overflow: hidden; transform: translateY(105%); }
      .ph-sh-head { height: 60px; display: flex; align-items: center; gap: 14px; padding: 0 18px; font-size: 19px; font-weight: 500; }
      .ph-sh-head span { flex: 1; }
      .ph-sh-t { font-style: normal; }
      .ph-prog { margin: 0 16px; height: 4px; border-radius: 2px; background: #3a3c3e; position: relative; overflow: hidden; }
      .ph-prog i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: #21c063; border-radius: 2px; }
      .ph-panes { position: absolute; left: 0; right: 0; top: 70px; bottom: 0; }
      .ph-pane { position: absolute; inset: 0; padding: 20px 16px; transform: translateX(105%); }
      .ph-h2 { font-size: 21px; font-weight: 700; margin: 2px 0 22px; }
      .ph-opt { padding: 12px 4px 14px; border-radius: 8px; }
      .ph-opt b { display: block; font-weight: 500; font-size: 17.5px; }
      .ph-opt span { display: block; color: #9ba0a3; font-size: 14.5px; line-height: 1.45; margin-top: 3px; }
      .ph-fld { position: relative; border: 1px solid #6b6f71; border-radius: 9px; height: 54px; display: flex; align-items: center; padding: 0 14px; font-size: 17px; margin-bottom: 24px; }
      .ph-fld label { position: absolute; left: 10px; top: -10px; padding: 0 5px; background: #1b1c1e; font-size: 12.5px; color: #9ba0a3; }
      .ph-chk { display: flex; align-items: center; gap: 12px; color: #c4c8cb; font-size: 15px; margin: 4px 0 14px; }
      .ph-box { width: 20px; height: 20px; border-radius: 4px; border: 2px solid #aebac1; display: inline-flex; align-items: center; justify-content: center; }
      .ph-box svg { opacity: 0; }
      .ph-note { color: #9ba0a3; font-size: 14.5px; margin-top: 6px; }
      .ph-cta { position: absolute; left: 16px; right: 16px; bottom: 22px; height: 50px; border-radius: 25px; background: #21c063; color: #0b141a; font-weight: 700; font-size: 17px; display: flex; align-items: center; justify-content: center; }
      .c-cap { position: absolute; left: 130px; top: 170px; width: 880px; }
      .c-kicker { display: inline-flex; align-items: center; gap: 12px; font-size: 1.2cqw; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #128c7e; }
      .c-kicker i { width: 14px; height: 14px; border-radius: 50%; background: #25d366; display: inline-block; }
      .c-title { margin-top: 14px; font-size: 3.6cqw; font-weight: 700; line-height: 1.08; letter-spacing: -0.02em; color: ${brand.ink}; }
      .c-sub { margin-top: 14px; font-size: 1.7cqw; font-weight: 500; color: ${brand.muted}; }
      .c-items { margin-top: 38px; display: flex; flex-direction: column; gap: 18px; }
      .c-item { display: flex; align-items: center; gap: 18px; font-size: 1.75cqw; font-weight: 600; color: ${brand.ink}; opacity: 0; }
      .c-check { width: 44px; height: 44px; border-radius: 50%; flex: none; display: inline-flex; align-items: center; justify-content: center; background: ${gradient(brand, 135)}; }
      .c-badge { margin-top: 38px; display: inline-flex; align-items: center; gap: 14px; padding: 16px 28px; border-radius: 999px; color: #ffffff; font-size: 1.6cqw; font-weight: 700; background: ${gradient(brand)}; box-shadow: 0 16px 40px ${brand.accent[1]}4d; opacity: 0; }
      .c-focus { position: absolute; left: 380px; top: 460px; padding: 18px 26px; border-radius: 20px; background: #ffffff; box-shadow: 0 20px 50px rgba(31, 35, 40, 0.22); opacity: 0; z-index: 3; }
      .c-focus b { display: block; font-size: 1.1cqw; letter-spacing: 0.06em; text-transform: uppercase; color: ${brand.accent[1]}; }
      .c-focus span { display: block; margin-top: 4px; font-size: 1.6cqw; font-weight: 700; color: ${brand.ink}; }
      .c-focus i { position: absolute; right: -14px; top: 50%; margin-top: -10px; border: 10px solid transparent; border-left: 14px solid #ffffff; border-right: 0; }`;
}

function sheetHtml(sh, k) {
  const screens = sh.screens || [];
  return `          <div class="ph-sheet" id="sheet${k}">
            <div class="ph-sh-head"><span>${screens.map((sc, j) => `<em class="ph-sh-t" id="sheet${k}-t${j}"${j ? ' style="display:none"' : ""}>${esc(sc.title || sh.title || "")}</em>`).join("")}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="#e9edef"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg></div>
            <div class="ph-prog"><i id="sheet${k}-prog"></i></div>
            <div class="ph-panes">
${screens
  .map(
    (sc, j) => `              <div class="ph-pane" id="sheet${k}-p${j}">
${sc.heading ? `                <div class="ph-h2">${esc(sc.heading)}</div>` : ""}
${(sc.options || []).map((o, n) => `                <div class="ph-opt" id="sheet${k}-p${j}-o${n}"><b>${esc(o.title)}</b>${o.desc ? `<span>${esc(o.desc)}</span>` : ""}</div>`).join("\n")}
${(sc.fields || []).map((f) => `                <div class="ph-fld"><label>${esc(f.label)}</label><span class="ph-v">${esc(f.value)}</span></div>`).join("\n")}
${(sc.checks || []).map((c) => `                <div class="ph-chk"><span class="ph-box${c.checked ? " ph-box--on" : ""}"><svg width="14" height="14" viewBox="0 0 24 24" fill="#0b141a"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.4z"/></svg></span>${esc(c.label)}</div>`).join("\n")}
${sc.note ? `                <div class="ph-note">${esc(sc.note)}</div>` : ""}
${sc.cta ? `                <div class="ph-cta" id="sheet${k}-p${j}-cta">${esc(sc.cta)}</div>` : ""}
              </div>`,
  )
  .join("\n")}
            </div>
          </div>`;
}

/**
 * @param {object} s scene: contact {name, avatar, status, typing}, clock, captions {kicker,title,sub,items[],badge}, messages[]
 */
module.exports = function chat(s, brand) {
  const id = s.id;
  const contact = { name: "Your Business", status: "online", typing: "typing…", ...(s.contact || {}) };
  const msgs = s.messages || [];
  const cap = s.captions || {};
  const items = cap.items || [];

  // Markup of the conversation
  let lastIn = null;
  const sheets = [];
  const listHtml = msgs
    .map((m, i) => {
      const hidden = m.visible ? "" : ' style="display:none"';
      if (m.type === "date") return `              <div class="ph-chip" id="m${i}"${hidden}>${esc(m.text)}</div>`;
      if (m.type === "system") return `              <div class="ph-sys" id="m${i}"${hidden}>${esc(m.text)}</div>`;
      if (m.type === "sheet") {
        sheets.push({ sh: m, k: i });
        return "";
      }
      if (m.type === "pause") return "";
      const out = m.from === "out";
      const meta = `<span class="ph-meta">${esc(m.time || "")}${out ? ' <span class="ph-tick">✓✓</span>' : ""}</span>`;
      let inner;
      if (m.card) {
        inner = `<div class="ph-bub"><div class="ph-card-body"><div class="ph-card-title">${esc(m.card.title)}</div>${esc(m.card.body || "")}<div class="ph-card-foot">${esc(m.card.footer || contact.name)} · ${esc(m.time || "")}</div></div><div class="ph-card-btn" id="m${i}-b0">${ICON_FORM}${esc(m.card.button)}</div></div>`;
      } else if (m.formReply) {
        inner = `<div class="ph-bub"><div class="ph-resp">${ICON_FORM}<div>${esc(m.formReply)}<small>${esc(m.formReplySub || "Response sent.")}</small></div></div>${meta}</div>`;
      } else {
        const quoteText = m.quote === true && lastIn ? plain(lastIn.text).replace(/\s+/g, " ").slice(0, 90) : typeof m.quote === "string" ? m.quote : null;
        const quote = quoteText ? `<div class="ph-quote"><b>${esc(contact.name)}</b><i>${esc(quoteText)}</i></div>` : "";
        inner = `<div class="ph-bub">${quote}${richText(m.text)}${meta}</div>`;
      }
      const btns = (m.buttons || []).length
        ? `<div class="ph-btns">${m.buttons.map((b, n) => `<div class="ph-btn" id="m${i}-b${n}">${esc(b)}</div>`).join("")}</div>`
        : "";
      if (!out) lastIn = m;
      return `              <div class="ph-m ${out ? "ph-out" : "ph-in"}${m.card ? " ph-card" : ""}" id="m${i}"${hidden}>
                ${inner}
                ${btns}
              </div>`;
    })
    .filter(Boolean)
    .join("\n");

  const avatar = contact.avatar ? `<img src="${esc(contact.avatar)}" alt="" />` : esc(contact.name.slice(0, 1));
  const body = `    <div class="clip" data-start="0" data-duration="__DUR__" data-track-index="0" style="position:absolute;inset:0">
      <div class="c-bg"></div>
      <div class="c-cap" id="c-cap">
        ${cap.kicker ? `<div class="c-kicker"><i></i>${esc(cap.kicker)}</div>` : ""}
        ${cap.title ? `<div class="c-title">${esc(cap.title)}</div>` : ""}
        ${cap.sub ? `<div class="c-sub">${esc(cap.sub)}</div>` : ""}
        <div class="c-items">
${items.map((it, n) => `          <div class="c-item" id="c-i${n}"><span class="c-check">${ICON_CHECK}</span>${esc(it)}</div>`).join("\n")}
        </div>
        ${cap.badge ? `<div class="c-badge" id="c-badge">${esc(cap.badge)}</div>` : ""}
      </div>
${msgs.map((m, i) => (m.focus ? `      <div class="c-focus" id="c-focus${i}"><b>${esc(m.focus.label || "")}</b><span>${esc(m.focus.text || "")}</span><i></i></div>` : "")).filter(Boolean).join("\n")}
      <div class="ph" id="ph">
        <div class="ph-screen">
          <div class="ph-island"></div>
          <div class="ph-status"><span>${esc(s.clock || "9:41")}</span><span><svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="#e9edef" opacity="0.5"/><rect x="2" y="2" width="17" height="9" rx="2" fill="#e9edef"/><rect x="24.5" y="4" width="2" height="5" rx="1" fill="#e9edef" opacity="0.5"/></svg></span></div>
          <div class="ph-header">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#aebac1"><path d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8z"/></svg>
            <div class="ph-avatar">${avatar}</div>
            <div class="ph-contact"><div class="ph-name">${esc(contact.name)}</div><div class="ph-sub"><span class="ph-online">${esc(contact.status)}</span><span class="ph-typing">${esc(contact.typing)}</span></div></div>
            <div class="ph-icons"><svg width="6" height="22" viewBox="0 0 6 22" fill="#aebac1"><circle cx="3" cy="3" r="2.4"/><circle cx="3" cy="11" r="2.4"/><circle cx="3" cy="19" r="2.4"/></svg></div>
          </div>
          <div class="ph-chat">
            <div class="ph-list">
${listHtml}
            </div>
          </div>
          <div class="ph-composer">
            <div class="ph-input"><div class="ph-field-txt"><span class="ph-ph">${esc(s.placeholder || "Message")}</span><span class="ph-typed" id="typed"></span></div></div>
            <div class="ph-mic"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0b141a"><path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11z"/></svg></div>
          </div>
${sheets.map(({ sh, k }) => sheetHtml(sh, k)).join("\n")}
        </div>
      </div>
    </div>`;

  // Timeline
  const L = [];
  const cues = [];
  const typedPhrases = [];
  const revealed = new Set();
  const reveal = (ref, t) => {
    if (ref === undefined || ref === null) return;
    for (const r of [].concat(ref)) {
      if (r === "badge") {
        L.push(`tl.fromTo(q("#c-badge"), { opacity: 0, y: 16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.5)" }, ${round(t)});`);
        cues.push(["chime", round(t), 0.3]);
      } else if (!revealed.has(r)) {
        revealed.add(r);
        L.push(`tl.fromTo(q("#c-i${r}"), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, ${round(t)});`);
      }
    }
  };
  const show = (sel, t) => {
    L.push(`tl.set(q("${sel}"), { display: "flex" }, ${round(t)});`);
    L.push(`tl.fromTo(q("${sel}"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", immediateRender: false }, ${round(t)});`);
  };
  const typing = (a, b) => {
    L.push(`tl.set(q(".ph-online"), { display: "none" }, ${round(a)}); tl.set(q(".ph-typing"), { display: "inline" }, ${round(a)});`);
    L.push(`tl.set(q(".ph-typing"), { display: "none" }, ${round(b)}); tl.set(q(".ph-online"), { display: "inline" }, ${round(b)});`);
  };
  const tap = (sel, t, cta) => {
    const on = cta ? "#1a9e52" : "#2a3942";
    const offc = cta ? "#21c063" : "#202c33";
    L.push(`tl.to(q("${sel}"), { backgroundColor: "${on}", scale: 0.96, duration: 0.12, ease: "power1.out" }, ${round(t)});`);
    L.push(`tl.to(q("${sel}"), { backgroundColor: "${offc}", scale: 1, duration: 0.2, ease: "power1.out" }, ${round(t + 0.14)});`);
    cues.push(["click-soft", round(t), 0.25]);
  };

  L.push(`tl.fromTo(q("#ph"), { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: "power3.out" }, 0);`);
  ["c-kicker", "c-title", "c-sub"].forEach((c, n) =>
    L.push(`if (q(".${c}")) tl.fromTo(q(".${c}"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${0.3 + n * 0.2});`),
  );

  let t = 1.3;
  let lastInIdx = null;
  msgs.forEach((m, i) => {
    if (m.visible) {
      if (m.from !== "out" && !m.type) lastInIdx = i;
      return;
    }
    if (m.type === "pause") {
      t += m.seconds ?? 1;
      return;
    }
    if (m.type === "date" || m.type === "system") {
      show(`#m${i}`, t);
      t += 0.4;
      return;
    }
    if (m.type === "sheet") {
      const k = i;
      const screens = m.screens || [];
      if (m.tap && lastInIdx !== null) {
        tap(`#m${lastInIdx}-b0`, t);
        t += 0.25;
      }
      L.push(`tl.to(q("#sheet${k}"), { y: 0, duration: 0.5, ease: "power3.out" }, ${round(t)});`);
      L.push(`tl.set(q("#sheet${k}-p0"), { x: 0 }, ${round(t)});`);
      cues.push(["whoosh-short", round(t), 0.18]);
      L.push(`tl.set([q(".ph-chat"), q(".ph-contact")], { visibility: "hidden" }, ${round(t + 0.55)});`);
      reveal(m.reveal, t + 0.4);
      t += 0.8;
      screens.forEach((sc, j) => {
        if (j > 0) {
          L.push(`tl.to(q("#sheet${k}-p${j - 1}"), { x: "-30%", opacity: 0, duration: 0.35, ease: soft }, ${round(t)});`);
          L.push(`tl.to(q("#sheet${k}-p${j}"), { x: 0, duration: 0.4, ease: "power3.out" }, ${round(t)});`);
          L.push(`tl.set(q("#sheet${k}-t${j - 1}"), { display: "none" }, ${round(t)}); tl.set(q("#sheet${k}-t${j}"), { display: "inline" }, ${round(t)});`);
          t += 0.6;
        }
        if (sc.progress !== undefined) L.push(`tl.to(q("#sheet${k}-prog"), { width: "${Math.round(sc.progress * 100)}%", duration: 0.4, ease: soft }, ${round(t - 0.3)});`);
        const fields = (sc.fields || []).length;
        if (fields) {
          L.push(`tl.fromTo(q("#sheet${k}-p${j}").querySelectorAll(".ph-v"), { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.32 }, ${round(t + 0.2)});`);
          t += 0.2 + fields * 0.32 + 0.3;
        }
        (sc.checks || []).forEach((c) => {
          if (c.checked) {
            L.push(`tl.set(q("#sheet${k}-p${j}").querySelectorAll(".ph-box--on"), { backgroundColor: "#21c063", borderColor: "#21c063" }, ${round(t)});`);
            L.push(`tl.set(q("#sheet${k}-p${j}").querySelectorAll(".ph-box--on svg"), { opacity: 1 }, ${round(t)});`);
          }
        });
        if ((sc.checks || []).length) t += 0.5;
        reveal(sc.reveal, t);
        if ((sc.options || []).length) {
          t += sc.hold ?? 1.3;
          tap(`#sheet${k}-p${j}-o${sc.choose ?? 0}`, t);
          t += 0.35;
        } else {
          t += sc.hold ?? 0.6;
          if (sc.cta) {
            tap(`#sheet${k}-p${j}-cta`, t, true);
            t += 0.3;
          }
        }
      });
      L.push(`tl.to(q("#sheet${k}"), { y: "105%", duration: 0.45, ease: "power3.in" }, ${round(t)});`);
      L.push(`tl.set([q(".ph-chat"), q(".ph-contact")], { visibility: "inherit" }, ${round(t)});`);
      cues.push(["whoosh-short", round(t), 0.18]);
      t += 0.6;
      return;
    }
    const out = m.from === "out";
    let appear;
    if (out) {
      const via = m.via || (m.tap ? "tap" : "sent");
      if (via === "typed") {
        const d = clamp(0.3 + plain(m.text).length * 0.03, 0.6, 1.6);
        typedPhrases.push({ text: plain(m.text), ini: round(t), fim: round(t + d) });
        cues.push(["typing", round(t), 0.22, round(d)]);
        appear = t + d + 0.1;
      } else if (via === "tap" && lastInIdx !== null) {
        const src = msgs[lastInIdx];
        const label = m.tap || plain(m.text);
        const n = Math.max(0, (src.buttons || []).findIndex((b) => b === label));
        tap(`#m${lastInIdx}-b${n}`, t);
        appear = t + 0.25;
      } else appear = t;
      show(`#m${i}`, appear);
      cues.push(["pop", round(appear), 0.15]);
      reveal(m.reveal, appear + 0.1);
      t = appear + 0.45;
    } else {
      typing(t, t + 0.7);
      appear = t + 0.7;
      show(`#m${i}`, appear);
      cues.push([m.notify ? "notification" : "pop", round(appear), m.notify ? 0.25 : 0.15]);
      lastInIdx = i;
      const read = clamp(0.9 + plain(m.text || (m.card && m.card.body)).length * 0.016, 1.1, 2.8);
      if (m.focus) {
        const z = appear + 0.2;
        L.push(`tl.to(q("#ph"), { scale: 1.5, x: -150, y: -330, transformOrigin: "250px 900px", duration: 0.8, ease: "power3.inOut" }, ${round(z)});`);
        L.push(`tl.to(q("#c-cap"), { opacity: 0, duration: 0.3, ease: soft }, ${round(z)});`);
        L.push(`tl.to(q("#m${i} .ph-bub"), { boxShadow: "0 0 0 3px ${brand.accent[1]}e6, 0 0 26px ${brand.accent[2]}8c", duration: 0.5, ease: soft }, ${round(z + 0.6)});`);
        L.push(`tl.fromTo(q("#c-focus${i}"), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, ${round(z + 0.7)});`);
        cues.push(["whoosh-short", round(z), 0.18], ["sparkle", round(z + 0.6), 0.3]);
        const hold = m.focus.hold ?? 2.4;
        const back = z + 0.7 + hold;
        L.push(`tl.to(q("#c-focus${i}"), { opacity: 0, duration: 0.4, ease: soft }, ${round(back)});`);
        L.push(`tl.to(q("#m${i} .ph-bub"), { boxShadow: "0 0 0 0px rgba(0,0,0,0)", duration: 0.4, ease: soft }, ${round(back)});`);
        L.push(`tl.to(q("#ph"), { scale: 1, x: 0, y: 0, duration: 0.8, ease: "power3.inOut" }, ${round(back + 0.1)});`);
        L.push(`tl.to(q("#c-cap"), { opacity: 1, duration: 0.3, ease: soft }, ${round(back + 0.3)});`);
        cues.push(["whoosh-short", round(back + 0.1), 0.18]);
        reveal(m.reveal, back + 0.5);
        t = back + 1.1;
      } else {
        reveal(m.reveal, appear + 0.1);
        t = appear + read;
      }
    }
  });
  // Caption items never referenced by a message appear one by one at the start
  items.forEach((_, n) => {
    if (!revealed.has(n)) reveal(n, 1.2 + n * 0.4);
  });

  const typedScript = typedPhrases.length
    ? `
        const typed = q("#typed");
        ${JSON.stringify(typedPhrases)}.forEach((p) => {
          const grp = document.createElement("span");
          grp.style.display = "none";
          const chars = [...p.text].map((c) => { const ch = document.createElement("span"); ch.textContent = c; ch.style.display = "none"; grp.appendChild(ch); return ch; });
          typed.appendChild(grp);
          tl.set(q(".ph-ph"), { display: "none" }, p.ini);
          tl.set(grp, { display: "inline" }, p.ini);
          const step = (p.fim - p.ini) / chars.length;
          chars.forEach((ch, n) => tl.set(ch, { display: "inline" }, p.ini + (n + 1) * step));
          tl.set(grp, { display: "none" }, p.fim + 0.05);
          tl.set(q(".ph-ph"), { display: "inline" }, p.fim + 0.05);
        });`
    : "";

  const duration = round(t + (s.tail ?? 2.5));
  return {
    html: frame({ id, duration, css: css(brand), body: body.replace("__DUR__", duration), script: typedScript + "\n        " + L.join("\n        ") }),
    duration,
    cues,
  };
};
