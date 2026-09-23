# Style guide

The defaults of this skill come from a real product launch video that went through many review
rounds with the product owner. These are the rules that survived.

## Structure (90–190 s)

| # | Scene | Length | Purpose |
|---|---|---|---|
| 1 | `hook` | 8 s | Mystery: dark stage, text typed letter by letter, blurred glimpses of screens, a question, then a bloom reveals "App **changed.**" and the tagline. |
| 2 | `zoom` × N | 10–16 s each | One screen per scene: intro card with the benefit, then 2–3 beats (camera, ring, callout). Hold ≥ 3 s where there is data. |
| 3 | `chat` × N | 16–26 s each | Conversational features on a phone (WhatsApp, messenger). ONLY use if the product actually provides a conversational/chat flow. Never add chat scenes to apps that lack them or that are built to replace chat. |
| 4 | climax | 8–10 s | The signature visual of the product (dark stage, big motion). Music opens here. Usually a `custom` scene. |
| 5 | `closing` | 8 s | Logo + name, tagline, one sub line with the accent word, verified website typed, optional badge. |

Always render two variants when announcing: **soon** (teaser: "Coming soon…", a question like
"Are you ready for the new …?", badge "Coming soon") and **launch** (same body, "It's here…", no badge).

## Visual

- White canvas, near-black text, the brand primary only on the accent word and underline.
- An accent trio (default cyan → indigo → purple) for everything "smart": rings, gradients, badges,
  focus labels. Never paint the smart features with the brand primary.
- One font family (Noto Sans by default), bold titles with tight tracking, medium sub lines.
- **In-App Interface as Hero:** Keep the app or website front and center. Avoid excessive decorative
  margins or static external frames that shrink the product. The viewer must see the actual UI
  working to solve their problem.
- Real screens inside the frame; cropping, zoom, rings and callouts on top. Rebuild UI in HTML only
  when it must move and cannot be recorded (the phone chat is the typical case).

## Motion

- **Motion inside the app:** Highlight movements, state changes, and interactions that happen
  *within* the app (taps, inputs, active timers, live metrics, smooth list updates).
- Between scenes: fades (the generators fade every scene in). No hard cuts, no whip zooms, no flashes.
- Inside scenes: a slow camera (`power3.inOut`), dissolves with a touch of blur, rings that fade in.
- Zoom on a button or control: measure its box, use scale 2–2.4, keep it in view ≥ 2 s.
- Give the viewer time: 3.5 s on the first new screen, ≥ 3 s still on any result with numbers.

## Words

- **Quality of Life First:** Frame every scene around how the feature removes stress, saves precious
  time, or brings calm and control to the persona's life (e.g. "Peace of mind during the 3 AM rush"
  instead of "Contraction database table").
- One message for the whole video; every caption serves it.
- Benefit first ("No time to type? Search by voice."), then the proof (a real number or the real flow).
- Captions describe what is on screen. Vague slogans ("the whole screen feels it") were rejected.
- Short lines: titles ≤ 7 words, callouts ≤ 10 words.
- Product and feature names exactly as the brand writes them. Never call an AI assistant a "bot" if
  the brand does not.
- Claims ("the only…", "official partner of…") only as the owner wrote them; ask to confirm.
- **Real website only:** Always obtain the real domain and website from project metadata, configs,
  or the owner. Never invent placeholder domains (`example.com`) or fake URLs.
- **No invented features or channels:** Never assume an app has an AI chatbot, WhatsApp flow, or
  integrations. If an app replaces WhatsApp (e.g. replaces unstructured messaging with organized
  dashboards), highlight that it replaces scattered chats — never simulate a fake chat.

## Data

- Investigate before scripting: search the app repo (`PRODUCT.md`, `README.md`, `DESIGN.md`,
  routes, configs) to ensure every capability mentioned exists in reality.
- Demo tenant only. Blur or replace real people's names, e-mails, phone numbers and IDs.
- No invented metrics: every number on screen must be in a capture.
- If the demo data is unfit for a public video (e.g. real complaints, real customers), inject demo
  content into the real component during capture and tell the owner. Never click actions that
  publish (approve, send, post).

## Sound

- Music: calm, warm and confident. Rejected: buzzy saw pads, a constant eighth-note arpeggio and a
  four-on-the-floor kick with hi-hats ("annoying"). Check the spectrum: body in 400–2000 Hz, restrained lows.
- Prefer a real track picked by the owner (Pixabay Music, Mixkit, YouTube Audio Library; check each
  license). Extend it on the beat grid so the drop lands on the reveal and on the climax.
- Effects are subtle: whoosh between scenes, pop per message, soft click per tap, typing under typed
  text, a chime on results, a riser into the climax. Music bed around 0.32–0.38 under the effects.
- Loudness −14 LUFS for social platforms.
