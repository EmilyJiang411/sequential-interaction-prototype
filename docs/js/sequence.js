/*
 * Sequence controller — Sealing a Letter
 *
 * One linear path through the five studies:
 *   Fold the Flap → Pour the Wax → Align the Stamp → Press the Stamp → Lift the Stamp
 *
 * Each study runs unchanged inside its own scene (an iframe, so the studies'
 * SVG ids, styles and audio never collide). Only the current scene is visible
 * and interactive; the others are inert. When a scene reports success, its
 * feedback is given time to land (HOLD), then the next scene fades in on top
 * while both slide so the seal area glides from where it was to where it will
 * be next (anchored crossfade). The last step ends at rest on the sealed
 * envelope. The restart button takes everything back to the open envelope.
 */
(() => {
  const frames = Array.from(document.querySelectorAll('.scene'));
  const restartBtn = document.getElementById('restart');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LAST = frames.length - 1;
  // Time each step's success feedback gets before the hand-off, in ms:
  // Fold (paper snap), Pour (pool settles), Align ("Ready to stamp"), Press (thud).
  const HOLD = [650, 1100, 1500, 900];
  const FADE = reduce ? 300 : 800;
  // Easing of the hand-offs comes from the control panel (js/settings.js);
  // the default, Ease In-Out, is cubic-bezier(.45, 0, .25, 1).
  const ease = () => (window.WaxSettings ? WaxSettings.easingCss() : 'cubic-bezier(.45, 0, .25, 1)');

  let current = 0;
  let run = 0;              // bumped on every restart; stale async work checks it and stops
  let holdTimer = null;
  let transitioning = false;
  let lastInput = 'pointer';
  let anchorSeq = 0;

  const readyWaiters = frames.map(() => []);
  const anchorWaiters = new Map();

  // ---------- messaging ----------
  const indexOf = win => frames.findIndex(f => f.contentWindow === win);

  function send(i, msg) {
    const w = frames[i].contentWindow;
    if (w) w.postMessage(Object.assign({ from: 'wax-host' }, msg), '*');
  }

  window.addEventListener('message', e => {
    const d = e.data || {};
    if (d.from !== 'wax-scene') return;
    const i = indexOf(e.source);
    if (i < 0) return;
    if (d.type === 'ready') {
      sendSettings(i);
      readyWaiters[i].splice(0).forEach(resolve => resolve());
    } else if (d.type === 'complete') {
      onComplete(i);
    } else if (d.type === 'anchor') {
      const resolve = anchorWaiters.get(d.id);
      if (resolve) { anchorWaiters.delete(d.id); resolve(d.point); }
    } else if (d.type === 'input') {
      lastInput = d.kind;
    }
  });
  window.addEventListener('keydown', () => { lastInput = 'key'; }, true);
  window.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);

  // Control-panel values go to every scene as it loads and whenever they change.
  function sendSettings(i) {
    if (window.WaxSettings) send(i, { type: 'settings', values: WaxSettings.get() });
  }
  // The shell's own background (behind and between the scenes) follows the panel too.
  function applyShell(v) { document.documentElement.style.setProperty('--bg', v.backgroundColor); }
  if (window.WaxSettings) {
    applyShell(WaxSettings.get());
    WaxSettings.onChange(v => { applyShell(v); frames.forEach((_, i) => sendSettings(i)); });
  }

  // (Re)load a scene from scratch; resolves when the study has registered.
  function load(i) {
    return new Promise(resolve => {
      readyWaiters[i].push(resolve);
      frames[i].setAttribute('src', frames[i].dataset.src);
    });
  }

  // Where the seal area is on screen in scene i, in px (null if unknown).
  function anchor(i) {
    return new Promise(resolve => {
      const id = ++anchorSeq;
      anchorWaiters.set(id, resolve);
      send(i, { type: 'anchor', id });
      setTimeout(() => {
        if (anchorWaiters.has(id)) { anchorWaiters.delete(id); resolve(null); }
      }, 250);
    });
  }

  // ---------- state ----------
  function setInert(f, on) {
    f.inert = on;
    if (on) f.setAttribute('inert', ''); else f.removeAttribute('inert');
  }

  function show(i) {
    frames.forEach((f, k) => {
      f.getAnimations().forEach(a => a.cancel());
      f.style.transformOrigin = '';
      f.classList.remove('is-leaving', 'is-entering');
      f.classList.toggle('is-current', k === i);
      setInert(f, k !== i);
    });
    current = i;
  }

  // The step becomes available: its own cues start, keyboard users get focus.
  function activate(i) {
    const focus = lastInput === 'key';
    if (focus) frames[i].focus();
    send(i, { type: 'activate', focus });
  }

  function onComplete(i) {
    if (i !== current || transitioning) return;
    if (i === LAST) return;                    // ending: rest on the sealed envelope
    const token = run;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => advance(i, i + 1, token), HOLD[i]);
  }

  async function advance(from, to, token) {
    if (token !== run) return;
    if (await crossfade(from, to, token)) activate(to);
  }

  // Anchored crossfade: incoming fades in on top; both scenes slide so the seal
  // area travels from its old screen position to its new one.
  async function crossfade(from, to, token) {
    transitioning = true;
    const A = frames[from], B = frames[to];
    setInert(A, true);
    setInert(B, true);

    // When both scenes show the envelope (they report its width), also scale them
    // so the envelope keeps its size through the hand-off.
    let dx = 0, dy = 0, s = 1, a = null, b = null;
    if (!reduce) {
      [a, b] = await Promise.all([anchor(from), anchor(to)]);
      if (a && b) {
        dx = a.x - b.x; dy = a.y - b.y;
        if (a.w > 0 && b.w > 0) s = a.w / b.w;
      }
    }
    if (token !== run) { transitioning = false; return false; }

    A.classList.remove('is-current');
    A.classList.add('is-leaving');
    B.classList.add('is-entering');
    // scale about each scene's own anchor, so the anchor is what travels
    A.style.transformOrigin = a && b ? `${a.x}px ${a.y}px` : '';
    B.style.transformOrigin = a && b ? `${b.x}px ${b.y}px` : '';

    const anims = [
      B.animate([
        { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${s})` },
        { opacity: 1, transform: 'translate(0, 0) scale(1)' }
      ], { duration: FADE, easing: ease(), fill: 'forwards' }),
      A.animate([
        { transform: 'translate(0, 0) scale(1)' },
        { transform: `translate(${-dx}px, ${-dy}px) scale(${1 / s})` }
      ], { duration: FADE, easing: ease(), fill: 'forwards' })
    ];
    await Promise.all(anims.map(a => a.finished.catch(() => {})));
    transitioning = false;
    if (token !== run) return false;
    show(to);
    return true;
  }

  // ---------- restart ----------
  async function restart() {
    const token = ++run;
    clearTimeout(holdTimer);

    // Already on the first step: let the study reopen its own flap.
    if (current === 0 && !transitioning) {
      send(0, { type: 'reset' });
      return;
    }

    // Mid hand-off: start cleanly from the open envelope.
    if (transitioning) {
      transitioning = false;
      frames.forEach(f => f.classList.remove('is-current', 'is-leaving', 'is-entering'));
      await Promise.all(frames.map((_, i) => load(i)));
      if (token !== run) return;
      show(0);
      activate(0);
      return;
    }

    // Otherwise: refresh every step behind the scenes, glide back to the open
    // envelope, then refresh the step we just left.
    const from = current;
    const fresh = frames.map((_, i) => (i === from ? null : load(i)));
    await fresh[0];
    if (token !== run) return;
    if (await crossfade(from, 0, token)) {
      load(from);
      activate(0);
    }
  }

  restartBtn.addEventListener('click', restart);

  // ---------- replay from a step (control panel) ----------
  // Starts the sequence again at step i, fresh, keeping the panel's settings.
  // The steps after it are refreshed too, so the rest of the run stays linear.
  async function replayFrom(i) {
    const token = ++run;
    clearTimeout(holdTimer);

    // The step on screen, not mid hand-off: its own reset replays it in place.
    if (i === current && !transitioning) {
      send(i, { type: 'reset' });
      frames.forEach((_, k) => { if (k > i) load(k); });
      activate(i);
      return;
    }

    transitioning = false;
    await load(i);
    if (token !== run) return;
    show(i);
    frames[i].animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 150 : 400, easing: 'ease-out' });
    frames.forEach((_, k) => { if (k !== i) load(k); });
    activate(i);
  }

  window.WaxSequence = {
    steps: frames.map(f => f.getAttribute('title')),
    current: () => current,
    restart,
    replayFrom
  };

  // ---------- start: the open envelope ----------
  frames.forEach((_, i) => { setInert(frames[i], true); });
  const boot = frames.map((_, i) => load(i));
  boot[0].then(() => {
    if (run !== 0) return;
    show(0);
    activate(0);
  });
})();
