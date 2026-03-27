/**
 * compare.js — Side-by-side deal comparison
 */
const CompareModule = (() => {
  let selectedDeals = [];

  function addDeal(deal) {
    if (selectedDeals.find(d => d.dealID === deal.dealID)) return;
    if (selectedDeals.length >= 3) {
      showToast('Max 3 deals for comparison', 'warning');
      return;
    }
    selectedDeals.push(deal);
    updateBar();
    updateCheckboxes();
  }

  function removeDeal(dealID) {
    selectedDeals = selectedDeals.filter(d => d.dealID !== dealID);
    updateBar();
    updateCheckboxes();
  }

  function clearAll() {
    selectedDeals = [];
    updateBar();
    updateCheckboxes();
  }

  function updateCheckboxes() {
    document.querySelectorAll('.compare-checkbox').forEach(cb => {
      const dealID = cb.dataset.dealId;
      cb.classList.toggle('compare-checked', selectedDeals.some(d => d.dealID === dealID));
      cb.textContent = selectedDeals.some(d => d.dealID === dealID) ? '✅ Compare' : '☐ Compare';
    });
  }

  function updateBar() {
    let bar = document.getElementById('compare-bar');
    if (selectedDeals.length === 0) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'compare-bar';
      bar.className = 'compare-bar';
      document.body.appendChild(bar);
    }
    bar.innerHTML = `
      <span>🔄 Compare (${selectedDeals.length})</span>
      <div style="display:flex;gap:0.5rem;">
        ${selectedDeals.map(d => `<span class="compare-bar-item">${escapeHtml(d.title?.slice(0, 20) || 'Deal')}…</span>`).join('')}
      </div>
      <div style="display:flex;gap:0.5rem;">
        ${selectedDeals.length >= 2 ? `<button class="btn btn-primary btn-sm" id="compare-open-btn">View Comparison</button>` : '<span style="font-size:0.8rem;color:var(--text-muted);">Select at least 2</span>'}
        <button class="btn btn-ghost btn-sm" id="compare-clear-btn">✕ Clear</button>
      </div>
    `;
    requestAnimationFrame(() => bar.classList.add('compare-bar-visible'));
    document.getElementById('compare-open-btn')?.addEventListener('click', openModal);
    document.getElementById('compare-clear-btn')?.addEventListener('click', clearAll);
  }

  function openModal() {
    const existing = document.getElementById('compare-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'compare-modal';
    modal.id = 'compare-modal';
    const deals = selectedDeals;

    const rows = [
      { label: 'Game', key: d => escapeHtml(d.title || 'N/A') },
      { label: 'Store', key: d => escapeHtml(d.storeID || 'N/A') },
      { label: 'Sale Price', key: d => `$${parseFloat(d.salePrice || 0).toFixed(2)}`, numKey: d => parseFloat(d.salePrice || 0), best: (vals, deals) => { const nums = deals.map(d => parseFloat(d.salePrice || 0)); return nums.indexOf(Math.min(...nums)); } },
      { label: 'Normal Price', key: d => `$${parseFloat(d.normalPrice || 0).toFixed(2)}` },
      { label: 'Savings', key: d => `${Math.round(parseFloat(d.savings || 0))}%`, best: (vals, deals) => { const nums = deals.map(d => parseFloat(d.savings || 0)); return nums.indexOf(Math.max(...nums)); } },
      { label: 'Rating', key: d => parseFloat(d.dealRating || 0).toFixed(1), best: (vals, deals) => { const nums = deals.map(d => parseFloat(d.dealRating || 0)); return nums.indexOf(Math.max(...nums)); } },
    ];

    modal.innerHTML = `
      <div class="compare-modal-content">
        <div class="compare-modal-header">
          <h2>🔄 Deal Comparison</h2>
          <button class="btn btn-ghost btn-sm" id="compare-modal-close">✕ Close</button>
        </div>
        <div class="compare-modal-body">
          <table class="compare-table">
            <thead>
              <tr class="compare-header">
                <th>Feature</th>
                ${deals.map(d => `<th>${escapeHtml(d.title?.slice(0, 25) || 'Deal')}…<br><img src="${escapeHtml(d.thumb || '')}" style="width:60px;border-radius:4px;margin-top:4px;" alt="" loading="lazy"></th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => {
                const vals = deals.map(d => row.key(d));
                const bestIdx = row.best ? row.best(vals, deals) : -1;
                return `<tr>
                  <td><strong>${row.label}</strong></td>
                  ${vals.map((v, i) => `<td class="${i === bestIdx ? 'compare-best' : ''}">${v}</td>`).join('')}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('compare-modal-visible'));
    document.getElementById('compare-modal-close')?.addEventListener('click', () => {
      modal.classList.remove('compare-modal-visible');
      modal.addEventListener('transitionend', () => modal.remove(), { once: true });
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('compare-modal-visible');
        modal.addEventListener('transitionend', () => modal.remove(), { once: true });
      }
    });
  }

  function addCompareButton(card, deal) {
    if (!deal || card.querySelector('.compare-checkbox')) return;
    const btn = document.createElement('button');
    btn.className = 'compare-checkbox btn btn-ghost btn-sm';
    btn.dataset.dealId = deal.dealID;
    btn.textContent = '☐ Compare';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (selectedDeals.find(d => d.dealID === deal.dealID)) {
        removeDeal(deal.dealID);
      } else {
        addDeal(deal);
      }
      if (typeof SoundsModule !== 'undefined') SoundsModule.click();
    });
    const cardFooter = card.querySelector('.card-footer, .card-actions');
    if (cardFooter) cardFooter.appendChild(btn);
    else card.appendChild(btn);
  }

  function addCompareButtons() {
    const cards = document.querySelectorAll('.deal-card[data-deal]');
    cards.forEach(card => {
      try {
        const deal = JSON.parse(card.dataset.deal || '{}');
        addCompareButton(card, deal);
      } catch {}
    });
  }

  function init() {
    const grid = document.getElementById('deals-grid');
    if (!grid) return;
    const observer = new MutationObserver(() => addCompareButtons());
    observer.observe(grid, { childList: true, subtree: false });
    addCompareButtons();
  }

  return { init, addDeal, removeDeal, clearAll, openModal };
})();
