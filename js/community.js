/**
 * community.js — Deal Voting & Comments stored in localStorage
 */

const CommunityModule = (() => {
  const VOTES_KEY = 'community_votes';
  const COMMENTS_KEY = 'community_comments';

  function getVotes(dealID) {
    const all = storageGet(VOTES_KEY, {});
    const entry = all[dealID] || { up: 0, down: 0, userVote: null };
    return { ...entry };
  }

  function vote(dealID, direction) {
    const all = storageGet(VOTES_KEY, {});
    if (!all[dealID]) all[dealID] = { up: 0, down: 0, userVote: null };
    const entry = all[dealID];

    if (entry.userVote === direction) {
      // undo vote
      entry[direction] = Math.max(0, (entry[direction] || 0) - 1);
      entry.userVote = null;
    } else {
      // remove previous vote if any
      if (entry.userVote) {
        entry[entry.userVote] = Math.max(0, (entry[entry.userVote] || 0) - 1);
      }
      entry[direction] = (entry[direction] || 0) + 1;
      entry.userVote = direction;
    }

    all[dealID] = entry;
    storageSet(VOTES_KEY, all);
    return { ...entry };
  }

  function getComments(dealID) {
    const all = storageGet(COMMENTS_KEY, {});
    return (all[dealID] || []).slice().reverse();
  }

  function addComment(dealID, text) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) return false;
    const all = storageGet(COMMENTS_KEY, {});
    if (!all[dealID]) all[dealID] = [];
    all[dealID].push({
      id: Date.now(),
      text: trimmed,
      timestamp: new Date().toISOString(),
      author: 'You'
    });
    storageSet(COMMENTS_KEY, all);
    return true;
  }

  function renderVotingUI(dealID) {
    const votes = getVotes(dealID);
    return `
      <div class="community-votes" data-deal-id="${escapeHtml(dealID)}">
        <button class="vote-btn vote-up ${votes.userVote === 'up' ? 'voted' : ''}"
                data-deal="${escapeHtml(dealID)}" data-dir="up"
                aria-label="Upvote" aria-pressed="${votes.userVote === 'up'}">
          👍 <span class="vote-count">${votes.up}</span>
        </button>
        <button class="vote-btn vote-down ${votes.userVote === 'down' ? 'voted' : ''}"
                data-deal="${escapeHtml(dealID)}" data-dir="down"
                aria-label="Downvote" aria-pressed="${votes.userVote === 'down'}">
          👎 <span class="vote-count">${votes.down}</span>
        </button>
      </div>
    `;
  }

  function renderCommentsUI(dealID) {
    const comments = getComments(dealID);
    const commentsHTML = comments.length === 0
      ? '<p class="no-comments">No comments yet. Be the first!</p>'
      : comments.map(c => `
          <div class="comment-item">
            <div class="comment-header">
              <span class="comment-author">👤 ${escapeHtml(c.author)}</span>
              <span class="comment-date">${new Date(c.timestamp).toLocaleDateString()}</span>
            </div>
            <p class="comment-text">${escapeHtml(c.text)}</p>
          </div>`).join('');

    return `
      <div class="community-comments" data-deal-id="${escapeHtml(dealID)}">
        <h4 class="comments-title">💬 Community Comments</h4>
        <div class="comments-list">${commentsHTML}</div>
        <div class="comment-form">
          <textarea class="comment-input" placeholder="Share your thoughts about this deal…" maxlength="500" rows="2" aria-label="Add comment"></textarea>
          <button class="btn btn-sm btn-primary comment-submit" data-deal="${escapeHtml(dealID)}">Post</button>
        </div>
      </div>
    `;
  }

  function showDealModal(deal) {
    const existing = document.getElementById('community-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'community-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Community — ${deal.title}`);
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h2 class="modal-title">💬 ${escapeHtml(deal.title)}</h2>
          <button class="modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          ${renderVotingUI(deal.dealID)}
          ${renderCommentsUI(deal.dealID)}
        </div>
      </div>
    `;

    overlay.querySelector('.modal-close').addEventListener('click', () => {
      overlay.classList.remove('modal-visible');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('modal-visible');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      }
    });

    // Bind vote buttons
    overlay.querySelectorAll('.vote-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const updated = vote(btn.dataset.deal, btn.dataset.dir);
        overlay.querySelectorAll('.vote-btn').forEach(b => {
          b.classList.toggle('voted', b.dataset.dir === updated.userVote);
          b.querySelector('.vote-count').textContent = updated[b.dataset.dir] || 0;
          b.setAttribute('aria-pressed', b.dataset.dir === updated.userVote);
        });
      });
    });

    // Bind comment submit
    const submitBtn = overlay.querySelector('.comment-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const textarea = overlay.querySelector('.comment-input');
        if (!textarea) return;
        const ok = addComment(deal.dealID, textarea.value);
        if (ok) {
          textarea.value = '';
          const list = overlay.querySelector('.comments-list');
          if (list) {
            const updatedComments = getComments(deal.dealID);
            const newest = updatedComments[0];
            const div = document.createElement('div');
            div.className = 'comment-item comment-new';
            div.innerHTML = `
              <div class="comment-header">
                <span class="comment-author">👤 ${escapeHtml(newest.author)}</span>
                <span class="comment-date">${new Date(newest.timestamp).toLocaleDateString()}</span>
              </div>
              <p class="comment-text">${escapeHtml(newest.text)}</p>
            `;
            const noComments = list.querySelector('.no-comments');
            if (noComments) noComments.remove();
            list.insertBefore(div, list.firstChild);
            showToast('Comment posted!', 'success');
          }
        } else {
          showToast('Comment cannot be empty or exceed 500 characters.', 'warning');
        }
      });
    }

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));
  }

  function bindVoteButtons(container, dealID) {
    container.querySelectorAll('.vote-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const updated = vote(dealID, btn.dataset.dir);
        container.querySelectorAll('.vote-btn').forEach(b => {
          b.classList.toggle('voted', b.dataset.dir === updated.userVote);
          b.querySelector('.vote-count').textContent = updated[b.dataset.dir] || 0;
        });
      });
    });
  }

  return { getVotes, vote, getComments, addComment, renderVotingUI, renderCommentsUI, showDealModal, bindVoteButtons };
})();
