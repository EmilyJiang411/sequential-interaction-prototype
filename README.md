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

## Structure

```
docs/                     the published site (GitHub Pages serves this folder)
  index.html              sequence shell: five stacked scenes + restart button
  .nojekyll               serve files as-is
  css/sequence.css        shell layout, scene visibility, restart button
  js/sequence.js          sequence controller: gating, hold times, anchored crossfade, restart
  scenes/
    scene-bridge.js       messaging between each scene and the controller
    01-fold-the-flap.html … 05-lift-the-stamp.html   the studies, adapted
studies/wax-seal-study/   the original studies, unchanged (unzipped from wax-seal-study.zip)
```

Everything in `docs/` is plain HTML, CSS and JavaScript with relative paths. There is no build step; `docs/` is also the editable source.

**How the studies were adapted.** Each scene is its study with only these changes:
- light theme only
- its own reset button hidden, in favor of the single restart
- Pour the Wax's text label and web font removed
- a `SceneBridge.complete()` call at the study's success moment
- a small `SceneBridge.register({...})` block at the end of the script
- in Align the Stamp only: arrow-key turning, so the whole sequence works by keyboard. It uses the drag's own resistance, ticks and snap.

All gestures, physics, thresholds, sounds and haptics are the studies' own. Compare any scene with its original in `studies/` to see the exact difference.

**Hand-offs.** After a step succeeds, its feedback gets a moment to land (`HOLD` in `js/sequence.js`). The next scene then fades in while both slide, so the seal area glides from its old position to its new one.

## Run locally

```sh
cd docs && python3 -m http.server 8000
# open http://localhost:8000
```

## Publishing

In the repository's **Settings → Pages**, set **Source** to *Deploy from a branch*, branch `main`, folder **`/docs`**.
