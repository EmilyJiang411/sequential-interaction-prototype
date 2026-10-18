/*
 * Tunable settings for the wax seal sequence.
 *
 * DEFAULTS are the prototype's saved defaults: the values it ships with, and
 * what "Restore defaults" in the control panel returns to. To change a saved
 * default, edit it here.
 *
 * Changes made in the panel are kept in this browser (localStorage), so
 * replaying the sequence or reloading the page keeps them.
 */
(() => {
  const DEFAULTS = {
    // Colors. Each part is drawn in greys and recolored to these (see
    // scenes/scene-bridge.js), keeping its highlights, shadows and detail.
    waxColor: '#8b2933',            // deep red wax
    envelopeColor: '#45546e',       // slate blue envelope
    envelopeLineColor: '#a58d73',   // warm brown outline and fold lines
    cornerCueColor: '#c49a62',      // the draggable corner fold on the open flap
    stampHandleColor: '#704536',    // dark wood stamp handle
    stampMetalColor: '#a6a6a6',     // light steel stamp base and shaft
    spoonHandleColor: '#704536',    // dark wood spoon handle
    spoonBowlColor: '#a6a6a6',      // light steel spoon bowl
    backgroundColor: '#e8ddcb',     // warm paper background
    pressDepth: 12,            // scene units the stamp sinks into the wax (Press the Stamp)
    liftResistance: 70,        // % — 70% lets the stuck stamp creep up to 5.4 units (Lift the Stamp)
    releaseThreshold: 130,     // scene units of upward drag to break the wax's grip (Lift the Stamp)
    easing: 'ease-in-out'      // easing of the glide between steps
  };

  // Each control: what it is called, where it acts, its range and unit.
  const CONTROLS = {
    waxColor:         { label: 'Wax', color: true, component: 'spoon wax, pouring stream and pool (Pour), wax disc (Align), wax pool (Press), finished seal (Lift)' },
    envelopeColor:    { label: 'Envelope', color: true, component: 'envelope fill (Fold, Pour, Lift) and the surface under the wax (Press)' },
    envelopeLineColor: { label: 'Envelope outline and fold lines', color: true, component: 'envelope outline, flap edge and fold lines (Fold, Pour, Lift)' },
    cornerCueColor:   { label: 'Draggable corner cue', color: true, component: 'the small folded corner you drag on the open flap (Fold)' },
    stampHandleColor: { label: 'Stamp handle', color: true, component: 'stamp handle and knob (Align, Press, Lift)' },
    stampMetalColor:  { label: 'Stamp metal base and shaft', color: true, component: 'stamp ring (Align), base, shaft and collar (Press), base and stem (Lift)' },
    spoonHandleColor: { label: 'Spoon handle', color: true, component: 'knurled spoon handle (Pour)' },
    spoonBowlColor:   { label: 'Spoon bowl', color: true, component: 'spoon bowl and neck (Pour)' },
    backgroundColor:  { label: 'Background', color: true, component: 'page background (all scenes)' },
    pressDepth:       { label: 'Stamp press depth', component: 'Press the Stamp', min: 2, max: 14, step: 1, unit: 'u' },
    liftResistance:   { label: 'Lift resistance', component: 'Lift the Stamp', min: 0, max: 100, step: 5, unit: '%' },
    releaseThreshold: { label: 'Release threshold', component: 'Lift the Stamp', min: 30, max: 180, step: 2, unit: 'u' },
    easing:           { label: 'Transition easing', component: 'Sequence hand-offs (the glide between steps and the restart glide)' }
  };

  const EASINGS = {
    'linear':      { label: 'Linear',        css: 'linear' },
    'ease-in':     { label: 'Ease In',       css: 'cubic-bezier(.42, 0, 1, 1)' },
    'ease-out':    { label: 'Ease Out',      css: 'cubic-bezier(0, 0, .25, 1)' },
    'ease-in-out': { label: 'Ease In-Out',   css: 'cubic-bezier(.45, 0, .25, 1)' },
    'spring':      { label: 'Spring/Bounce', css: springCurve() }
  };

  // A damped spring sampled into a CSS linear() curve: overshoots, then settles.
  function springCurve() {
    const fallback = 'cubic-bezier(.34, 1.56, .64, 1)';
    try {
      if (!(window.CSS && CSS.supports('transition-timing-function', 'linear(0, 1)'))) return fallback;
    } catch (_) { return fallback; }
    const pts = [];
    const N = 40, zeta = 0.42, w = 2 * Math.PI * 1.55;   // ~2 visible bounces
    const wd = w * Math.sqrt(1 - zeta * zeta);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const v = i === N ? 1 : 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
      pts.push(v.toFixed(4));
    }
    return `linear(${pts.join(', ')})`;
  }

  // Lift resistance → how far (scene units) the stuck stamp may creep with the pointer.
  // 0% follows up to 18 units, 50% up to 9 (the study's value), 100% not at all.
  const creepFor = resistance => 18 * (1 - resistance / 100);

  const COLOR_KEYS = Object.keys(CONTROLS).filter(k => CONTROLS[k].color);
  const KEY = 'waxSeal.settings.v1';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function sanitize(v) {
    const out = Object.assign({}, DEFAULTS);
    if (!v || typeof v !== 'object') return out;
    for (const k of COLOR_KEYS) {
      if (typeof v[k] === 'string' && /^#[0-9a-f]{6}$/i.test(v[k])) out[k] = v[k].toLowerCase();
    }
    for (const k of ['pressDepth', 'liftResistance', 'releaseThreshold']) {
      const n = Number(v[k]);
      if (Number.isFinite(n)) out[k] = clamp(n, CONTROLS[k].min, CONTROLS[k].max);
    }
    if (typeof v.easing === 'string' && EASINGS[v.easing]) out.easing = v.easing;
    return out;
  }

  let current;
  try { current = sanitize(JSON.parse(localStorage.getItem(KEY))); } catch (_) { current = sanitize(null); }

  const listeners = [];
  function set(patch) {
    current = sanitize(Object.assign({}, current, patch));
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch (_) {}
    listeners.forEach(fn => fn(get()));
  }
  function get() { return Object.assign({}, current); }

  window.WaxSettings = {
    DEFAULTS: Object.freeze(Object.assign({}, DEFAULTS)),
    CONTROLS, EASINGS, COLOR_KEYS, creepFor,
    get, set,
    restore() { set(DEFAULTS); },
    onChange(fn) { listeners.push(fn); },
    easingCss() { return EASINGS[current.easing].css; }
  };
})();
