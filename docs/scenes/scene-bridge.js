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
 *                  { type: 'anchor', id }        where is the seal on screen?
 *   scene → host   { type: 'ready' }             loaded and registered
 *                  { type: 'complete' }          the study's success moment
 *                  { type: 'anchor', id, point } reply with {x, y} in px
 *                  { type: 'input', kind }       'key' or 'pointer'
 *
 * Opened on its own (not inside the sequence), a scene activates itself, so
 * every scene still runs as a standalone study.
 */
(() => {
  const host = window.parent !== window ? window.parent : null;
  let api = {};

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
