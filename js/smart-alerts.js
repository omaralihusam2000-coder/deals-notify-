/**
 * smart-alerts.js — Custom rule-based deal alerts
 */
const SmartAlertsModule = (() => {
  const STORAGE_KEY = 'gdn_smart_alerts';
  const MAX_RULES = 10;

  const CONDITION_TYPES = [
    { value: 'price_below', label: 'Price below $X' },
    { value: 'discount_above', label: 'Discount above X%' },
    { value: 'title_contains', label: 'Title contains keyword' },
    { value: 'store_equals', label: 'Store equals' },
  ];

  function getRules() {
    return storageGet(STORAGE_KEY, []);
  }

  function saveRules(rules) {
    storageSet(STORAGE_KEY, rules);
  }

  function addRule(type, value) {
    if (!type || !value) return false;
    const rules = getRules();
    if (rules.length >= MAX_RULES) {
      showToast('Maximum 10 rules allowed', 'warning');
      return false;
    }
    rules.push({ id: Date.now(), type, value });
    saveRules(rules);
    return true;
  }

  function deleteRule(id) {
    const rules = getRules().filter(r => r.id !== id);
    saveRules(rules);
  }

  function checkDeal(deal) {
    const rules = getRules();
    return rules.filter(rule => {
      try {
        const price = parseFloat(deal.salePrice || 0);
        const normal = parseFloat(deal.normalPrice || 0);
        const savings = normal > 0 ? ((normal - price) / normal) * 100 : 0;
        switch (rule.type) {
          case 'price_below': return price < parseFloat(rule.value);
          case 'discount_above': return savings > parseFloat(rule.value);
          case 'title_contains': return (deal.title || '').toLowerCase().includes(rule.value.toLowerCase());
          case 'store_equals': return (deal.storeID || '').toString() === rule.value.toString();
          default: return false;
        }
      } catch { return false; }
    });
  }

  function checkDeals(deals) {
    const rules = getRules();
    if (!rules.length) return;
    deals.forEach(deal => {
      const matched = checkDeal(deal);
      if (matched.length > 0) {
        showToast(`🎯 Alert: "${deal.title}" matches your rule!`, 'info');
        // Highlight matching deal cards
        const cards = document.querySelectorAll('.deal-card');
        cards.forEach(card => {
          if (card.dataset.dealId === deal.dealID) {
            card.classList.add('smart-alert-match');
          }
        });
      }
    });
  }

  function renderSettings() {
    const container = document.getElementById('smart-alerts-container');
    if (!container) return;
    const rules = getRules();
    container.innerHTML = `
      <div class="settings-card smart-alert-card">
        <h3 class="settings-card-title">🎯 Smart Deal Alerts</h3>
        <div class="settings-row">
          <div class="smart-alert-form">
            <select id="alert-condition-type" class="filter-select" aria-label="Condition type">
              ${CONDITION_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
            </select>
            <input type="text" id="alert-condition-value" class="filter-input settings-input" placeholder="Value…" aria-label="Condition value">
            <button id="add-alert-rule-btn" class="btn btn-primary btn-sm">+ Add Rule</button>
          </div>
        </div>
        <div class="smart-alert-rules-list" id="smart-alert-rules-list">
          ${rules.length === 0 ? '<p style="color:var(--text-muted);font-size:0.85rem;">No rules yet. Add your first rule above!</p>' :
            rules.map(r => `
              <div class="smart-alert-rule">
                <span class="smart-alert-rule-text">
                  ${CONDITION_TYPES.find(t => t.value === r.type)?.label || r.type}: <strong>${escapeHtml(r.value)}</strong>
                </span>
                <button class="btn btn-danger btn-sm delete-alert-rule" data-id="${r.id}" aria-label="Delete rule">🗑️</button>
              </div>
            `).join('')
          }
        </div>
        <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;">${rules.length}/${MAX_RULES} rules active</p>
      </div>
    `;

    document.getElementById('add-alert-rule-btn')?.addEventListener('click', () => {
      const type = document.getElementById('alert-condition-type')?.value;
      const value = document.getElementById('alert-condition-value')?.value.trim();
      if (!value) { showToast('Please enter a value', 'warning'); return; }
      if (addRule(type, value)) {
        document.getElementById('alert-condition-value').value = '';
        renderSettings();
        showToast('✅ Rule added!', 'success');
      }
    });

    document.querySelectorAll('.delete-alert-rule').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteRule(parseInt(btn.dataset.id));
        renderSettings();
      });
    });
  }

  function init() {
    renderSettings();
  }

  return { init, checkDeals, checkDeal, renderSettings };
})();
