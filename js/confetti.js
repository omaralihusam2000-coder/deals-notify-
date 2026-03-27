/**
 * confetti.js — Lightweight confetti particles for celebrations
 */
const ConfettiModule = (() => {
  const COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#a855f7', '#ff85a1', '#00d4ff'];
  const PARTICLE_COUNT = 50;

  function burst() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const size = Math.random() * 8 + 4;
      const startX = 50 + (Math.random() - 0.5) * 30;
      const driftX = (Math.random() - 0.5) * 200;
      const delay = Math.random() * 0.3;
      const duration = Math.random() * 1.5 + 1.5;
      const rotation = Math.random() * 720 - 360;
      const shape = Math.random() > 0.5 ? '50%' : '0';

      particle.style.cssText = `
        left: ${startX}%;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${shape};
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
        --drift-x: ${driftX}px;
        --rotation: ${rotation}deg;
      `;
      container.appendChild(particle);
    }

    setTimeout(() => container.remove(), 4000);
  }

  return { burst };
})();
