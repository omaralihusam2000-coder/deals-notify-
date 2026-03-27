/**
 * image-zoom.js — Image zoom on hover (desktop) / tap (mobile)
 */
const ImageZoomModule = (() => {
  let hoverTimer = null;
  let zoomPopup = null;
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  function showPopup(img, e) {
    removePopup();
    zoomPopup = document.createElement('div');
    zoomPopup.className = 'image-zoom-popup';
    zoomPopup.id = 'image-zoom-popup';
    const zoomImg = document.createElement('img');
    zoomImg.src = img.src;
    zoomImg.alt = img.alt;
    zoomImg.width = 300;
    zoomImg.height = 180;
    zoomImg.style.cssText = 'width:300px;height:180px;object-fit:cover;display:block;';
    zoomPopup.appendChild(zoomImg);
    document.body.appendChild(zoomPopup);

    positionPopup(e);
    requestAnimationFrame(() => zoomPopup.classList.add('image-zoom-popup-visible'));
  }

  function positionPopup(e) {
    if (!zoomPopup) return;
    const W = window.innerWidth, H = window.innerHeight;
    let x = e.clientX + 15, y = e.clientY - 90;
    if (x + 350 > W) x = e.clientX - 365;
    if (y < 0) y = 10;
    if (y + 200 > H) y = H - 210;
    zoomPopup.style.left = x + 'px';
    zoomPopup.style.top = y + 'px';
  }

  function removePopup() {
    if (zoomPopup) {
      zoomPopup.remove();
      zoomPopup = null;
    }
  }

  function showLightbox(img) {
    const existing = document.getElementById('image-zoom-lightbox');
    if (existing) existing.remove();
    const lb = document.createElement('div');
    lb.className = 'image-zoom-lightbox';
    lb.id = 'image-zoom-lightbox';
    const lbImg = document.createElement('img');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lb.appendChild(lbImg);
    document.body.appendChild(lb);
    requestAnimationFrame(() => lb.classList.add('image-zoom-lightbox-visible'));
    lb.addEventListener('click', () => {
      lb.classList.remove('image-zoom-lightbox-visible');
      lb.addEventListener('transitionend', () => lb.remove(), { once: true });
    });
  }

  function bindToImg(img) {
    if (img.dataset.zoomBound) return;
    img.dataset.zoomBound = '1';

    if (isMobile()) {
      img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showLightbox(img);
      });
    } else {
      img.addEventListener('mouseenter', (e) => {
        hoverTimer = setTimeout(() => showPopup(img, e), 500);
      });
      img.addEventListener('mousemove', positionPopup);
      img.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
        removePopup();
      });
    }
  }

  function bindImages() {
    document.querySelectorAll('.deal-card img').forEach(bindToImg);
  }

  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        removePopup();
        const lb = document.getElementById('image-zoom-lightbox');
        if (lb) { lb.classList.remove('image-zoom-lightbox-visible'); lb.addEventListener('transitionend', () => lb.remove(), { once: true }); }
      }
    });

    const grid = document.getElementById('deals-grid');
    if (grid) {
      const observer = new MutationObserver(() => bindImages());
      observer.observe(grid, { childList: true, subtree: true });
    }
    bindImages();
  }

  return { init, bindImages };
})();
