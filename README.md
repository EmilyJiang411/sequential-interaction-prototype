# sequential-interaction-prototype
Codebase for my sequential interaction project in IXD 107-03, working with claude code

**Live site:** https://emilyjiang411.github.io/sequential-interaction-prototype/

## Sealing a Letter

One continuous, linear interaction: sealing a personal letter with wax. It starts on an open envelope and runs through five steps, each unlocking only after the previous one succeeds:

1. **Fold the Flap** – drag the flap's tip down until it snaps shut.
2. **Pour the Wax** – tilt the spoon by its handle and pour until it runs dry.
3. **Align the Stamp** – turn the stamp until its marker clicks into the notch.
4. **Press the Stamp** – press and hold the handle until it seats in the wax.
5. **Lift the Stamp** – pull the handle up to break the tack and reveal the seal.

It ends at rest on the sealed envelope. The round button (bottom-right) starts over from the open envelope at any time.

## Control panel

A collapsible panel on the left (the round sliders button, top-left) tunes the seal while you play. When it is open, the scenes lay out to its right, so it never covers the envelope, wax or stamp. On narrow screens it starts collapsed.

| Control | Acts on | Range | Saved default |
|---|---|---|---|
| Wax | spoon wax, pouring stream and pool (Pour), wax disc (Align), wax pool (Press), finished seal (Lift) | any color | `#727272` |
| Envelope | envelope (Fold, Pour, Lift) and the surface under the wax (Press) | any color | `#c2c2c2` |
| Stamp handle | handle and knob (Align, Press, Lift) | any color | `#8a8a8a` |
| Stamp metal base and shaft | ring (Align), base, shaft and collar (Press), base and stem (Lift) | any color | `#959595` |
| Spoon handle | knurled handle (Pour) | any color | `#8a8a8a` |
| Spoon bowl | bowl and neck (Pour) | any color | `#9a9a9a` |
| Background | page background (all scenes) | any color | `#e9e9e9` |
| Stamp press depth | Press the Stamp: how far the stamp sinks into the wax | 2–14 u | 12 u |
| Lift resistance | Lift the Stamp: how little the stuck stamp follows the pointer before it releases | 0–100% | 50% (follows up to 9 u) |
| Release threshold | Lift the Stamp: upward drag needed to separate the stamp from the wax | 30–180 u | 92 u |
| Transition easing | the glide between steps and the restart glide (Linear, Ease In, Ease Out, Ease In-Out, Spring/Bounce) | — | Ease In-Out |

Each color default is the grey the studies draw that part in, so nothing changes until a color is adjusted. Recoloring keeps every highlight, shadow, gradient, texture and seal detail: each shade keeps its place from light to dark and takes the new hue. For a saturated color, each scene's main tone of that part lands on the chosen color, so the wax in the spoon, the pouring stream and the finished seal match even though the studies drew them in different greys.

*u* is a scene unit: the Press stamp's base is 120 u wide, the Lift stamp's handle about 165 u tall. Dragging always follows the pointer directly; easing applies only to animated transitions.

Changes apply live and are kept in your browser, so **Replay from** (any step) and reloading keep them. **Restore defaults** returns to the saved defaults in `docs/js/settings.js`. **Copy settings** copies every control's name and value, with an instruction to make them the new saved defaults.

## Structure

```
docs/                     the published site (GitHub Pages serves this folder)
  index.html              sequence shell: five stacked scenes + restart button
  .nojekyll               serve files as-is
  css/sequence.css        shell layout, scene visibility, restart button
  css/panel.css           control panel layout
  js/settings.js          saved defaults and current values of the panel's controls
  js/sequence.js          sequence controller: gating, hold times, anchored crossfade, restart, replay
  js/panel.js             control panel: controls, replay, restore defaults, copy settings
  scenes/
    scene-bridge.js       messaging between each scene and the controller
    01-fold-the-flap.html … 05-lift-the-stamp.html   the studies, adapted
studies/wax-seal-study/   the original studies, unchanged (unzipped from wax-seal-study.zip)
```

Everything in `docs/` is plain HTML, CSS and JavaScript with relative paths. There is no build step; `docs/` is also the editable source.

**How the studies were adapted.** Each scene is its study with only these changes:
- light theme only, with one shared background grey (`#e9e9e9`) so the page never changes tint between steps
- its own reset button hidden, in favor of the single restart
- Pour the Wax's text label and web font removed
- in Pour the Wax only: its envelope drawing replaced with the closed envelope from Fold the Flap (the same art Lift the Stamp uses), with the flap tip on the wax target, so the envelope you close is the one you pour onto
- a `SceneBridge.complete()` call at the study's success moment
- the control panel's hooks: which parts are wax (for the wax color), and in Press and Lift the press depth, lift resistance and release threshold, which replace the study's fixed values (its defaults are the study's own)
- a small `SceneBridge.register({...})` block at the end of the script
- in Align the Stamp only: arrow-key turning, so the whole sequence works by keyboard. It uses the drag's own resistance, ticks and snap.

All gestures, physics, thresholds, sounds and haptics are the studies' own. Compare any scene with its original in `studies/` to see the exact difference.

**Hand-offs.** After a step succeeds, its feedback gets a moment to land (`HOLD` in `js/sequence.js`). The next scene then fades in while both slide, so the seal area glides from its old position to its new one. When both scenes show the envelope, they also scale so the envelope keeps its size through the hand-off.

## Run locally

```sh
cd docs && python3 -m http.server 8000
# open http://localhost:8000
```

## Publishing

In the repository's **Settings → Pages**, set **Source** to *Deploy from a branch*, branch `main`, folder **`/docs`**.
