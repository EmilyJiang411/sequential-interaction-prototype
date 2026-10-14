# Wax Seal Study

## What the study does

A five-step, tactile interaction study of sealing a letter with wax. Each step isolates one physical gesture and tunes how it *feels* — weight, resistance, snap, sound — using direct manipulation only (no instructions, no text UI beyond one confirmation line). The steps are designed to be chained in order:

| # | Step | Gesture | Completion moment |
|---|------|---------|-------------------|
| 1 | Fold the Flap | drag the flap's tip down | flap snaps flush, paper snap sound |
| 2 | Pour the Wax | rotate the spoon handle to tilt | spoon runs dry, pool settles over the seam |
| 3 | Align the Stamp | rotate the ring/knob | marker clicks into the notch, "Ready to stamp" |
| 4 | Press the Stamp | press and hold the handle | stamp seats in the wax with a low thud |
| 5 | Lift the Stamp | drag the handle upward | tack breaks, stamp lifts, impression is revealed |

All five are monochrome (greyscale) SVG scenes, one interaction per screen, each with a circular **Reset** button that returns it to its start state. Visual continuity is already partly built in: Step 5 reuses Step 1's closed-envelope artwork, and Steps 3 and 5 share the "Emily" + four-leaf-clover seal design.

## Files

```
steps/01-fold-the-flap/index.html    422 lines
steps/02-pour-the-wax/index.html     610 lines
steps/03-align-the-stamp/index.html  449 lines
steps/04-press-the-stamp/index.html  373 lines
steps/05-lift-the-stamp/index.html   512 lines
index.html                           launcher linking the five steps
study.json                           machine-readable manifest (steps, states, completion hooks)
```

Each step is one self-contained HTML file (markup, CSS, JS inline), exported unchanged from the published artifacts. Each script is a single IIFE with a `requestAnimationFrame` loop. Line numbers below refer to these files.

---

## 1 · Fold the Flap — `steps/01-fold-the-flap/index.html`

**Components**
- Envelope body (static SVG) — L106–113; "seam" overlay that tucks side folds under the closed flap — L115–118
- Flap, a CSS-3D `rotateX` panel hinged on its top edge — L124–156; folded dog-ear corner (`#cornerFill`, `#cornerEdge`, `#foldLine`) — L148–150
- Flap cast shadow on the body (`#cast`) — L120
- Grab target around the corner (`#hit`, focusable, role=button) — L152
- Reset button (bottom-center) — L160

**Actions, feedback, states**
- States: `open | drag | anim | closed` (`state`, L187).
- Hover corner → flap lifts slightly (168°→159°), crease darkens, dog-ear stands up (`is-hot`) — L350–361.
- Drag down → flap angle follows pointer via `acos` of the hinge distance — L366–388. Shadow strengthens mid-fold, brightness darkens with angle — `render()` L244.
- Snap: < 15° while dragging, or released < 34° → `closeFlap()` L321: ease-in to 0°, corner presses flush, tiny 0.7° rebound, unit press-down, synthesized **paper snap** (`paperSnap()` L312) → `state = 'closed'` (L333), body class `is-closed` disables input.
- Released above 34° → `reopen(true)` L339, springs back with overshoot.
- Keyboard: Enter/Space on the corner closes — L402. Reset → reopens — L408.
- Responsive scale-to-fit — `layout()` L195.

## 2 · Pour the Wax — `steps/02-pour-the-wax/index.html`

**Components**
- Envelope with seam (static) — L144–150; target outline `#seal-target` — L162
- Wax pool `#pool` (scales from 0, mounds then slumps) — L153–160
- Wax stream `#stream` (body, sheen, falling head; geometry rebuilt every frame) — L165–169
- Tilt guide arrow `#guide` (shown on hover/drag) — L172
- Spoon `#spoon` (bowl, neck, knurled handle, inner wax, residue, metallic sheens) — L175–209; handle hit area `#hit` (role=slider, −12…42°) — L206
- Label "Pour the Wax" (top-left) L98 and Reset (top-right) L99–104
- Web font: IBM Plex Mono (Google Fonts) — L3–4

**Actions, feedback, states**
- State object `S` from `freshState()` — L245 (tilt, flow, stream head/tail, `out`, `vol`, `emptied`, `done`).
- Hover/grab handle → glow + guide arrow (`setHot()` L366).
- Drag rotates spoon around bowl center (angle delta from pointer) — L374–390; release → spoon returns upright and pour stops (`endDrag()` L391).
- Tilt > 10° starts flow; flow ∝ tilt. Viscous stream grows from lip to target, necks as it falls, detaches when tilt drops — `drawStream()` L445, flow logic in `frame()` L499–551.
- Wax leaving spoon == wax landing in pool (volume bookkeeping L528–539); spoon wax shrinks and leaves residue (L561–571); specular glints slide with tilt (L573–579); pool domes then levels (L581–593).
- Sound: looping filtered-noise **trickle** while flowing, soft **drip** when the stream lands/finishes — `Sound` module L262–356.
- Completion: `S.emptied = true` (L543) when spoon runs dry → handle disabled; `S.done = true` (L549) once the last wax lands; target outline recedes.
- Keyboard: Arrow keys tilt ±4°, Escape returns upright — L400. Reset — L416.

## 3 · Align the Stamp — `steps/03-align-the-stamp/index.html`

**Components**
- Irregular wax circle (generated path) `#wax` — L108, built in `buildWax()` L204
- Ghost knob (demonstration hint) `#ghost` — L115
- Rotor `#rotor` (rotates as one): knob `#knob` L121, direction arrow `#arrow` L134, ridged ring `#ring` L139 (ridges from `buildRidges()` L222), seal face `#design` (clover + "Emily") L146
- Fixed alignment notch at 6 o'clock with pulsing halo `#notch` — L172; rotating marker `#markerRot` — L178
- Confirmation text `#ready` "Ready to stamp" — L183; Reset (top-right) — L81

**Actions, feedback, states**
- Start tilted −58°; ghost knob plays the turn twice on load (`playGhost()` L364), once after reset.
- Hover over ring band or knob → grab cursor (`onGrip()` L282, L411).
- Drag rotates by pointer angle delta — L394–429. Within 35° of upright the turn gets heavier (resistance factor); soft detent **tick** sound every 15° (`tick()` L312).
- Arrow flips to point toward upright (`setArrow()` L259); dims while dragging.
- Snap: within 5° → `snap()` L342: `locked = true`, overshoot ease to 0°, **click** sound + haptic, marker flash, halo burst, arrow hides, "Ready to stamp" fades in.
- Reset → rotates back to −58°, unlocks — L435.

## 4 · Press the Stamp — `steps/04-press-the-stamp/index.html`

**Components**
- Progress ring (top) `#ring` — L82
- Surface `#surface` L89; wax pool `#wax-pool` (outer/inner/gloss ellipses) L95
- Stamp `#stamp` (focusable, role=button, aria-pressed): base, handle, grip glow, downward-chevron cue, focus ring, large invisible hit area — L102–131
- Displaced-wax lip around the seated base `#wax-lip` — L133; Reset (bottom-right) — L140

**Actions, feedback, states**
- Hover/touch → handle sinks a little, grip glows, animated down-chevrons appear.
- Press and hold (pointer, or Space/Enter) → `press()` L250. In `frame()` L288: progress `p` advances with heavy inertia; resistance grows with depth in the wax; wax flattens/widens and a lip bulges; shadow tightens; progress ring fills.
- Release early → `release()` L258; stamp eases back up, wax recovers.
- Sound: soft continuous **compression** noise while sinking (`compSetup`/`compUpdate` L189–227).
- Completion: `p >= 1` → `done = true` (L302), firm seat with no rebound, low **thud** (`thud()` L229) + haptic; input ignored afterward.
- Reset — L281.

## 5 · Lift the Stamp — `steps/05-lift-the-stamp/index.html`

**Components**
- Closed envelope (Step 1's artwork, flattened into perspective) `#envelope` — L163
- Wax seal `#seal` with embossed design `#design` (clover + "Emily") L193–229, covered by matte cooled wax `#matteCover` — L231
- Stamp cast shadow `#cast` — L237
- Stamp `#stamp` (handle, cylindrical base, stem, upward hint outline `#hint`, grab target `#hit` role=slider) — L240–297
- Wax meniscus clinging to the base `#meniscus` — L300; Reset (bottom-right) — L304

**Actions, feedback, states**
- Idle: a faint outline of the handle drifts upward (pull hint); hover → halo and glow.
- Drag up (`beginGrip()` L377, pointermove L405): while stuck, the stamp only creeps (max 9 units) and trembles as tension rises; the meniscus stretches.
- Break: pull ≥ 92 units → `breakFree()` L366: `released = true` (L367), spring-loaded jump, peel + low release **sound**, haptic; hint stops.
- After release: stamp follows the pointer (24–150), settles at a hover height on let-go; matte cover fades out and gloss rises, **revealing the impression** (`frame()` L449–508).
- Let go before breaking → stamp springs back down (`endGrip()` L389).
- Keyboard: ArrowUp/Space repeatedly pulls — L429. Reset — L440.

---

## Shared conventions

- **Reset** button: 44px circle, `id="reset"`, in every step.
- **Sound**: Web Audio API, synthesized at runtime (no audio files). Audio context is created on the first pointer/key interaction to satisfy autoplay rules.
- **Haptics**: `navigator.vibrate` where supported (Steps 3–5), wrapped in try/catch.
- **Accessibility**: focusable hit targets with ARIA roles; `prefers-reduced-motion` shortens or removes animations in every step.
- **Theming**: CSS tokens on `:root` with a dark variant (`prefers-color-scheme` / `data-theme`) in Steps 1–4; Step 5 is light-only.
- **Coordinates**: each scene is an SVG `viewBox` scaled to fit the viewport; pointer input is mapped back with `getScreenCTM().inverse()`.

## Connecting the steps (for the sequential prototype)

The source is unchanged, so no step currently tells the outside world it has finished. The natural hook points are:

| Step | Completion line | Suggested event |
|------|-----------------|-----------------|
| 1 | L333 `state = 'closed'` | `flap:closed` |
| 2 | L549 `S.done = true` | `wax:poured` |
| 3 | L343 `locked = true` (inside `snap()`) | `stamp:aligned` |
| 4 | L302 `done = true` | `stamp:pressed` |
| 5 | L367 `released = true` (inside `breakFree()`) | `seal:revealed` |

A minimal approach is to add `window.parent.postMessage({ step, event }, '*')` at each of those lines and host the steps in iframes, or to dispatch a `CustomEvent` if the steps are merged into one page. `study.json` lists the same data in machine-readable form.

## Dependencies and assets

- **Runtime**: any modern browser (Pointer Events, Web Audio, SVG filters, CSS 3D transforms). No build step, no npm packages, no framework.
- **External request**: Step 2 loads **IBM Plex Mono** from Google Fonts (falls back to system monospace offline). Nothing else is fetched.
- **Assets**: none — all artwork is inline SVG and all sound is synthesized.
- **Serving**: files open directly from disk; a local server (`npx serve .` or `python3 -m http.server`) is recommended so audio and pointer capture behave consistently across browsers.
