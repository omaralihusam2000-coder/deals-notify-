/**
 * ambient-mode.js — Ambient Mode with animated background effects
 * Toggle in Settings > Appearance. Floating particles + aurora gradient.
 * Lightweight — auto-disables on low-end devices.
 */

const AmbientModeModule = (() => {
  const PREF_KEY   = 'ambient_mode';
  const MUSIC_KEY  = 'ambient_music';
  let canvas = null;
  let ctx    = null;
  let animID = null;
  let particles = [];
  let audioCtx   = null;
  let musicNode  = null;
  let isEnabled  = false;

  const PARTICLE_COUNT = (navigator.hardwareConcurrency || 4) >= 4 ? 50 : 20;

  // ── Particles ─────────────────────────────────────────────────────
  function createParticle(w, h) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      color: `hsl(${Math.random() * 60 + 180}, 100%, 70%)`,
    };
  }

  function initParticles() {
    if (!canvas) return;
    particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(canvas.width, canvas.height));
  }

  let auroraOffset = 0;

  function draw() {
    if (!ctx || !canvas) return;
    const { width: w, height: h } = canvas;

    ctx.clearRect(0, 0, w, h);

    // Aurora gradient
    auroraOffset += 0.003;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0,   `hsla(${200 + Math.sin(auroraOffset) * 30}, 100%, 15%, 0.15)`);
    grad.addColorStop(0.5, `hsla(${260 + Math.cos(auroraOffset) * 20}, 80%, 20%, 0.10)`);
    grad.addColorStop(1,   `hsla(${160 + Math.sin(auroraOffset * 0.7) * 40}, 100%, 12%, 0.12)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(')', `, ${p.alpha})`).replace('hsl', 'hsla');
      ctx.fill();
    });

    animID = requestAnimationFrame(draw);
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  }

  // ── Lo-fi music via Web Audio API ─────────────────────────────────
  function startMusic() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // Generate a soft ambient drone
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(110, audioCtx.currentTime);  // A2
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(164.81, audioCtx.currentTime); // E3

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      osc1.start();
      osc2.start();
      musicNode = { osc1, osc2, gain };
    } catch { /* no audio support */ }
  }

  function stopMusic() {
    if (!musicNode) return;
    try {
      musicNode.osc1.stop();
      musicNode.osc2.stop();
    } catch {}
    audioCtx?.close();
    audioCtx = null;
    musicNode = null;
  }

  // ── Enable / Disable ──────────────────────────────────────────────
  function enable() {
    // Low-end device guard
    if (navigator.hardwareConcurrency < 2) {
      showToast('⚠️ Ambient mode disabled — device performance too low', 'warning');
      return;
    }

    isEnabled = true;
    localStorage.setItem(PREF_KEY, '1');

    canvas = document.getElementById('ambient-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'ambient-canvas';
      canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
      document.body.insertBefore(canvas, document.body.firstChild);
    }

    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    document.body.classList.add('ambient-mode-on');
    draw();

    updateToggle(true);
    showToast('🌙 Ambient Mode enabled', 'info');
  }

  function disable() {
    isEnabled = false;
    localStorage.removeItem(PREF_KEY);

    if (animID) { cancelAnimationFrame(animID); animID = null; }
    window.removeEventListener('resize', resizeCanvas);
    canvas?.remove();
    canvas = null;
    ctx    = null;
    document.body.classList.remove('ambient-mode-on');
    stopMusic();

    updateToggle(false);
    showToast('🌙 Ambient Mode disabled', 'info');
  }

  function toggle() {
    isEnabled ? disable() : enable();
  }

  function updateToggle(state) {
    const toggle = document.getElementById('ambient-mode-toggle');
    if (toggle) toggle.checked = state;
  }

  function toggleMusic(enabled) {
    localStorage.setItem(MUSIC_KEY, enabled ? '1' : '0');
    if (enabled && isEnabled) startMusic();
    else stopMusic();
  }

  function init() {
    // Restore from prefs
    if (localStorage.getItem(PREF_KEY) === '1') {
      // Delay slightly to avoid blocking initial render
      setTimeout(enable, 500);
    }

    // Bind toggle in Settings
    const toggle = document.getElementById('ambient-mode-toggle');
    toggle?.addEventListener('change', () => {
      if (toggle.checked) enable(); else disable();
    });
    // The settings-row toggle points to the same element, no duplicate binding needed

    const musicToggle = document.getElementById('ambient-music-toggle');
    musicToggle?.addEventListener('change', () => toggleMusic(musicToggle.checked));

    // Main toggle button
    document.getElementById('ambient-toggle-btn')?.addEventListener('click', toggle);
  }

  return { init, enable, disable, toggle, isEnabled: () => isEnabled };
})();

document.addEventListener('DOMContentLoaded', () => AmbientModeModule.init());
