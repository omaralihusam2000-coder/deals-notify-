/**
 * sounds.js — Subtle UI sound effects for a gaming feel
 * Uses Web Audio API for tiny procedural sounds (no external files needed)
 */
const SoundsModule = (() => {
  let audioCtx = null;
  let enabled = true;

  function getContext() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        enabled = false;
      }
    }
    return audioCtx;
  }

  function isEnabled() {
    return enabled && storageGet('sounds_enabled', true);
  }

  function toggle() {
    const current = storageGet('sounds_enabled', true);
    storageSet('sounds_enabled', !current);
    return !current;
  }

  function playTone(frequency, duration, type = 'sine', volume = 0.08) {
    if (!isEnabled()) return;
    const ctx = getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) { /* silently fail */ }
  }

  // Predefined sounds
  function click() { playTone(800, 0.06, 'square', 0.04); }
  function success() {
    playTone(523, 0.1, 'sine', 0.06);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.06), 80);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.06), 160);
  }
  function wishlistAdd() { playTone(880, 0.12, 'sine', 0.06); }
  function wishlistRemove() { playTone(440, 0.15, 'triangle', 0.05); }
  function achievement() {
    playTone(523, 0.1, 'sine', 0.08);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.08), 100);
    setTimeout(() => playTone(784, 0.1, 'sine', 0.08), 200);
    setTimeout(() => playTone(1047, 0.2, 'sine', 0.08), 300);
  }
  function notification() { playTone(660, 0.15, 'sine', 0.07); setTimeout(() => playTone(880, 0.2, 'sine', 0.07), 150); }
  function error() { playTone(200, 0.2, 'sawtooth', 0.04); }
  function tabSwitch() { playTone(600, 0.04, 'sine', 0.03); }

  return { click, success, wishlistAdd, wishlistRemove, achievement, notification, error, tabSwitch, toggle, isEnabled };
})();
