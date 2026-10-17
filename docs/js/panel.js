/*
 * Control panel for the wax seal sequence.
 *
 * Every control writes to WaxSettings (js/settings.js), which saves the value
 * in this browser and sends it to the scenes right away, so the scene on screen
 * updates as you adjust. Replay, Restore defaults and Copy settings live here.
 */
(() => {
  const S = window.WaxSettings, Q = window.WaxSequence;
  const $ = id => document.getElementById(id);
  const panel = $('panel'), toggle = $('panel-toggle'), closeBtn = $('panel-close');
  const status = $('panel-status');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = S.CONTROLS;

  // ---------- open / collapse ----------
  const OPEN_KEY = 'waxSeal.panelOpen';
  function setOpen(open, focus) {
    panel.hidden = !open;
    document.body.classList.toggle('panel-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch (_) {}
    if (focus) (open ? closeBtn : toggle).focus();
  }
  toggle.addEventListener('click', () => setOpen(true, true));
  closeBtn.addEventListener('click', () => setOpen(false, true));
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false, true); });
  let startOpen = window.innerWidth >= 720;
  try { const v = localStorage.getItem(OPEN_KEY); if (v !== null) startOpen = v === '1'; } catch (_) {}
  setOpen(startOpen, false);

  // ---------- controls ----------
  const fmt = (n, unit) => `${Number.isInteger(n) ? n : n.toFixed(1)}${unit === '%' ? '%' : ' ' + unit}`;

  const ranges = {
    pressDepth: { input: $('c-depth'), out: $('v-depth'), lo: $('e-depth-min'), hi: $('e-depth-max') },
    liftResistance: { input: $('c-resist'), out: $('v-resist'), lo: $('e-resist-min'), hi: $('e-resist-max') },
    releaseThreshold: { input: $('c-thresh'), out: $('v-thresh'), lo: $('e-thresh-min'), hi: $('e-thresh-max') }
  };
  for (const [key, r] of Object.entries(ranges)) {
    const c = C[key];
    Object.assign(r.input, { min: c.min, max: c.max, step: c.step });
    r.lo.textContent = fmt(c.min, c.unit);
    r.hi.textContent = fmt(c.max, c.unit);
    r.input.addEventListener('input', () => S.set({ [key]: Number(r.input.value) }));
  }

  const wax = $('c-wax'), waxVal = $('v-wax');
  wax.addEventListener('input', () => S.set({ waxColor: wax.value }));

  const easingList = $('c-easing');
  for (const [key, e] of Object.entries(S.EASINGS)) {
    const label = document.createElement('label');
    const input = Object.assign(document.createElement('input'), { type: 'radio', name: 'easing', value: key });
    input.addEventListener('change', () => { if (input.checked) { S.set({ easing: key }); playEase(); } });
    label.append(input, document.createTextNode(e.label));
    easingList.append(label);
  }

  // Easing preview: a dot crossing the track with the chosen curve.
  const dot = $('ease-dot');
  let dotAnim = null;
  function playEase() {
    if (dotAnim) dotAnim.cancel();
    const track = dot.parentElement, dist = track.clientWidth - dot.offsetWidth - 6;
    dotAnim = dot.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${dist}px)` }],
      { duration: reduce ? 300 : 800, easing: S.easingCss(), fill: 'forwards' }
    );
  }
  $('ease-play').addEventListener('click', playEase);

  function resistHint(v) {
    const creep = S.creepFor(v.liftResistance);
    return creep < 0.05
      ? 'Before release, the stuck stamp does not follow the pointer at all.'
      : `Before release, the stuck stamp follows the pointer up by at most ${fmt(Math.round(creep * 10) / 10, 'u')}. Higher values make it follow less.`;
  }

  function render(v) {
    wax.value = v.waxColor;
    waxVal.textContent = v.waxColor;
    for (const [key, r] of Object.entries(ranges)) {
      r.input.value = v[key];
      r.out.textContent = fmt(v[key], C[key].unit);
    }
    $('h-resist').textContent = resistHint(v);
    easingList.querySelectorAll('input').forEach(i => { i.checked = i.value === v.easing; });
  }
  S.onChange(render);
  render(S.get());

  // ---------- replay ----------
  const replaySel = $('c-replay');
  (Q ? Q.steps : []).forEach((title, i) => {
    const name = title.replace(/^Step \d+ of \d+:\s*/, '');
    replaySel.append(new Option(`${i + 1}. ${name.charAt(0).toUpperCase()}${name.slice(1)}`, i));
  });
  $('replay').addEventListener('click', () => {
    if (!Q) return;
    const i = Number(replaySel.value);
    if (i === 0) Q.restart(); else Q.replayFrom(i);
    say(`Replaying from step ${i + 1}. Settings kept.`);
  });

  // ---------- restore / copy ----------
  let sayTimer = null;
  function say(msg) {
    status.textContent = msg;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { status.textContent = ''; }, 3500);
  }

  $('restore').addEventListener('click', () => { S.restore(); say('Saved defaults restored.'); });

  const INSTRUCTION = 'Apply these values as the prototype’s saved defaults. Retain the panel code for later adjustments. Commit and push the changes.';
  function settingsText() {
    const v = S.get();
    const lines = [
      'Wax seal prototype — control panel settings',
      '',
      `${C.waxColor.label} — ${C.waxColor.component}: ${v.waxColor}`,
      `${C.pressDepth.label} — ${C.pressDepth.component}: ${v.pressDepth} u (scene units the stamp sinks into the wax; range ${C.pressDepth.min}–${C.pressDepth.max} u)`,
      `${C.liftResistance.label} — ${C.liftResistance.component}: ${v.liftResistance}% (stuck stamp follows the pointer up to ${(Math.round(S.creepFor(v.liftResistance) * 10) / 10)} u before release; range ${C.liftResistance.min}–${C.liftResistance.max}%)`,
      `${C.releaseThreshold.label} — ${C.releaseThreshold.component}: ${v.releaseThreshold} u (upward drag to separate the stamp from the wax; range ${C.releaseThreshold.min}–${C.releaseThreshold.max} u)`,
      `${C.easing.label} — ${C.easing.component}: ${S.EASINGS[v.easing].label}`,
      '',
      INSTRUCTION
    ];
    return lines.join('\n');
  }

  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (_) {}
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.setAttribute('readonly', '');
    Object.assign(ta.style, { position: 'fixed', left: '-9999px', top: '0' });
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    ta.remove();
    return ok;
  }
  $('copy').addEventListener('click', async () => {
    say((await copy(settingsText())) ? 'Settings copied.' : 'Copy failed — your browser blocked the clipboard.');
  });

  window.WaxPanel = { settingsText };
})();
