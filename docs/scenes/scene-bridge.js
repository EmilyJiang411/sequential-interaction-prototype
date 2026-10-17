/*
 * Scene bridge — the only shared code the five scenes load.
 *
 * Each scene is one of the original studies, kept intact. At the end of its
 * script it calls SceneBridge.register({...}) and, at the exact moment the
 * study succeeds, SceneBridge.complete(). The bridge relays that to the
 * sequence controller in ../index.html and answers its requests:
 *
 *   host → scene   { type: 'activate', focus }   this step is now the current one
 *                  { type: 'reset' }             run the study's own reset
 *                  { type: 'settings', values }  control-panel values (see ../js/settings.js)
 *                  { type: 'anchor', id }        where is the seal on screen?
 *   scene → host   { type: 'ready' }             loaded and registered
 *                  { type: 'complete' }          the study's success moment
 *                  { type: 'anchor', id, point } reply with {x, y} in px
 *                  { type: 'input', kind }       'key' or 'pointer'
 *
 * Colors: a scene can pass to register()
 *   colors:    [[part, selector, sceneTone], ...]   recolor every fill, stroke and
 *              gradient stop under `selector` with that part's panel color
 *              (later entries win where selectors overlap)
 *   cssColors: [[part, '--css-var', original, sceneTone], ...]   colors used by CSS rules
 *   background: '--css-var'                         the page background variable
 * and calls SceneBridge.paint(part, color, sceneTone) for colors it sets while running.
 * `settings(values)` receives the panel's other values.
 *
 * Opened on its own (not inside the sequence), a scene activates itself, so
 * every scene still runs as a standalone study.
 */
(() => {
  const host = window.parent !== window ? window.parent : null;
  let api = {};

  // ---------- colors ----------
  // Every part is drawn in greys. ART is the grey each part's panel color starts
  // at (the picker's default). Recoloring keeps the drawing's depth:
  //  - each shade keeps its place on the light–dark curve (a power curve, so
  //    pure black and white, shadows and glints, stay put and order is kept),
  //  - every shade takes the new color's hue and saturation,
  //  - for a saturated color the scene's main tone (sceneTone) lands on the
  //    chosen color, so the same part matches across scenes even where the
  //    studies drew it lighter or darker; greys keep the studies' own contrast.
  // At a part's ART color everything is left exactly as drawn.
  const ART = {
    wax: '#727272', envelope: '#c2c2c2', stampHandle: '#8a8a8a', stampMetal: '#959595',
    spoonHandle: '#8a8a8a', spoonBowl: '#9a9a9a', background: '#e9e9e9'
  };
  const KEY = part => part + 'Color';
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const RGB = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i;
  const ATTRS = ['fill', 'stroke', 'stop-color'];
  let colors = {};            // part -> current color (hex)
  let originals = null;       // [{ el, attr, value, part, tone }]

  function parse(c) {
    let m = RGB.exec(c);
    if (m) return [m[1], m[2], m[3]].map(n => Math.min(255, +n) / 255);
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  }
  function hsl([r, g, b]) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }
  function toHex([h, s, l]) {
    const f = n => {
      const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
      const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(c * 255).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  }
  const lum = c => hsl(parse(c))[2];
  const safe = l => Math.min(0.97, Math.max(0.03, l));

  // orig: a drawn grey; part: which panel color; tone: the scene's main tone of this part
  function tint(orig, part, tone) {
    const color = colors[part];
    if (!color || !ART[part] || color.toLowerCase() === ART[part]) return orig;
    const [h, s, lc] = hsl(parse(color));
    const lg = safe(lum(ART[part])), ls = safe(lum(tone || ART[part])), lt = safe(lc);
    const greyTarget = Math.pow(ls, Math.log(lt) / Math.log(lg));   // where a grey pick puts the scene tone
    const target = safe(greyTarget * (1 - s) + lt * s);
    const gamma = Math.log(target) / Math.log(ls);
    const l = lum(orig);
    return toHex([h, s, l <= 0 ? 0 : l >= 1 ? 1 : Math.pow(l, gamma)]);
  }

  function collect() {
    originals = [];
    const seen = new Map();   // "el attr" -> record, so later entries win
    (api.colors || []).forEach(([part, selector, tone]) => {
      document.querySelectorAll(selector).forEach(root => {
        [root, ...root.querySelectorAll('*')].forEach(el => ATTRS.forEach(attr => {
          const value = el.getAttribute(attr);
          if (!value || !HEX.test(value)) return;
          const rec = seen.get(el) && seen.get(el)[attr];
          if (rec) { rec.part = part; rec.tone = tone; return; }
          const r = { el, attr, value, part, tone };
          if (!seen.has(el)) seen.set(el, {});
          seen.get(el)[attr] = r;
          originals.push(r);
        }));
      });
    });
  }

  function applyColors(values) {
    Object.keys(ART).forEach(part => {
      const v = values[KEY(part)];
      if (typeof v === 'string' && HEX.test(v)) colors[part] = v.toLowerCase();
    });
    if (!originals) collect();
    originals.forEach(r => r.el.setAttribute(r.attr, tint(r.value, r.part, r.tone)));
    const root = document.documentElement.style;
    (api.cssColors || []).forEach(([part, name, value, tone]) => root.setProperty(name, tint(value, part, tone)));
    if (api.background && colors.background) root.setProperty(api.background, colors.background);
  }

  function post(msg) {
    if (!host) return;
    host.postMessage(Object.assign({ from: 'wax-scene' }, msg), '*');
  }

  window.SceneBridge = {
    register(handlers) {
      api = handlers || {};
      if (host) post({ type: 'ready' });
      else if (api.activate) api.activate();
    },
    complete() { post({ type: 'complete' }); },
    // a color the scene sets while running, recolored like the drawn ones
    paint(part, color, tone) { return tint(color, part, tone); }
  };

  window.addEventListener('message', e => {
    if (!host || e.source !== host) return;
    const d = e.data || {};
    if (d.from !== 'wax-host') return;
    if (d.type === 'activate') {
      if (api.activate) api.activate();
      if (d.focus && api.focusTarget) {
        const el = api.focusTarget();
        if (el) { try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); } }
      }
    } else if (d.type === 'reset') {
      if (api.reset) api.reset();
    } else if (d.type === 'settings') {
      const v = d.values || {};
      applyColors(v);
      if (api.settings) api.settings(v);
    } else if (d.type === 'anchor') {
      let point = null;
      try { point = api.anchor ? api.anchor() : null; } catch (_) {}
      post({ type: 'anchor', id: d.id, point });
    }
  });

  // Let the host know how the person is interacting, so it only moves
  // keyboard focus into the next step for keyboard users.
  window.addEventListener('keydown', () => post({ type: 'input', kind: 'key' }), true);
  window.addEventListener('pointerdown', () => post({ type: 'input', kind: 'pointer' }), true);
})();
