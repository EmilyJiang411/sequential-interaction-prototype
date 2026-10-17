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
 * A scene can also pass `wax: '<selector>'` to register(): the bridge recolors
 * the fills, strokes and gradient stops under it to the panel's wax color, and
 * `settings(values)` to apply the other values.
 *
 * Opened on its own (not inside the sequence), a scene activates itself, so
 * every scene still runs as a standalone study.
 */
(() => {
  const host = window.parent !== window ? window.parent : null;
  let api = {};

  // ---------- wax color ----------
  // The studies draw their wax in greys around ART_WAX. A new wax color keeps
  // each shade's lightness relative to ART_WAX and takes the new hue and
  // saturation; pure black and white (shadows, glints) stay as they are.
  // At ART_WAX itself every color is left exactly as drawn.
  const ART_WAX = '#727272';
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const ATTRS = ['fill', 'stroke', 'stop-color'];
  let waxOriginals = null;   // [{ el, attr, value }]

  function rgb(hex) {
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
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
  function tint(orig, color) {
    const [, , l] = hsl(rgb(orig));
    const [h, s, lc] = hsl(rgb(color));
    const lRef = hsl(rgb(ART_WAX))[2];
    const nl = Math.min(1, Math.max(0, l + (lc - lRef) * 4 * l * (1 - l)));
    return toHex([h, s, nl]);
  }
  function applyWax(color) {
    if (!api.wax || !color) return;
    if (!waxOriginals) {
      waxOriginals = [];
      document.querySelectorAll(api.wax).forEach(root => {
        [root, ...root.querySelectorAll('*')].forEach(el => ATTRS.forEach(attr => {
          const value = el.getAttribute(attr);
          if (value && HEX.test(value)) waxOriginals.push({ el, attr, value });
        }));
      });
    }
    const same = color.toLowerCase() === ART_WAX;
    waxOriginals.forEach(({ el, attr, value }) => el.setAttribute(attr, same ? value : tint(value, color)));
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
    complete() { post({ type: 'complete' }); }
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
      applyWax(v.waxColor);
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
