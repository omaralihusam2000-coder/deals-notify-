/**
 * daily-streak.js — Daily login streak tracker
 */
const DailyStreakModule = (() => {
  const STORAGE_KEY = 'gdn_login_streak';

  function getData() {
    return storageGet(STORAGE_KEY, {
      currentStreak: 0,
      lastVisit: null,
      longestStreak: 0,
      totalVisits: 0,
    });
  }

  function saveData(data) {
    storageSet(STORAGE_KEY, data);
  }

  function getToday() {
    return new Date().toISOString().split('T')[0];
  }

  function checkMilestone(streak) {
    const milestones = {
      1: { msg: 'Welcome back! 🎉 Day 1 streak!', badge: null, confetti: false },
      3: { msg: '🔥 3-Day Warrior! Keep it up!', badge: { emoji: '🗡️', name: '3-Day Warrior' }, confetti: false },
      7: { msg: '⚔️ Weekly Warrior! 7 days straight!', badge: { emoji: '⚔️', name: 'Weekly Warrior' }, confetti: true },
      14: { msg: '🏆 Two Week Champion!', badge: { emoji: '🏆', name: 'Two Week Champion' }, confetti: true },
      30: { msg: '👑 Legendary Hunter! 30 day streak!', badge: { emoji: '👑', name: 'Legendary Hunter' }, confetti: true },
    };
    return milestones[streak] || null;
  }

  function awardBadge(badge) {
    if (!badge) return;
    const badges = storageGet('gdn_profile_badges', []);
    if (!badges.find(b => b.name === badge.name)) {
      badges.push(badge);
      storageSet('gdn_profile_badges', badges);
    }
  }

  function updateStreakBadge(streak) {
    const el = document.getElementById('streak-counter');
    if (el) {
      el.textContent = `🔥 ${streak}`;
      el.style.display = streak > 0 ? 'inline-flex' : 'none';
    }
  }

  function init() {
    const data = getData();
    const today = getToday();

    if (!data.lastVisit) {
      // First ever visit
      data.currentStreak = 1;
      data.longestStreak = 1;
      data.totalVisits = 1;
      data.lastVisit = today;
      saveData(data);
      setTimeout(() => showToast('🎉 Welcome! Your streak journey begins!', 'success'), 2000);
    } else if (data.lastVisit === today) {
      // Already visited today, just update UI
    } else {
      const last = new Date(data.lastVisit);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - last) / (1000 * 60 * 60 * 24));
      data.totalVisits = (data.totalVisits || 0) + 1;

      if (diffDays === 1) {
        // Consecutive day
        data.currentStreak = (data.currentStreak || 0) + 1;
        data.longestStreak = Math.max(data.longestStreak || 0, data.currentStreak);
        data.lastVisit = today;
        saveData(data);

        const milestone = checkMilestone(data.currentStreak);
        if (milestone) {
          setTimeout(() => {
            showToast(`${milestone.msg}`, 'success');
            if (milestone.badge) awardBadge(milestone.badge);
            if (milestone.confetti && typeof ConfettiModule !== 'undefined') ConfettiModule.burst();
            if (typeof SoundsModule !== 'undefined') SoundsModule.achievement();
          }, 1500);
        } else {
          setTimeout(() => showToast(`🔥 Day ${data.currentStreak} streak! Keep it going!`, 'info'), 1500);
        }
      } else if (diffDays > 1) {
        // Streak broken
        data.currentStreak = 1;
        data.lastVisit = today;
        saveData(data);
        setTimeout(() => showToast('💔 Streak lost! Starting over at Day 1.', 'warning'), 1500);
      }
    }

    updateStreakBadge(data.currentStreak || 0);

    // Add streak badge to header
    const logoArea = document.querySelector('.site-logo');
    if (logoArea && !document.getElementById('streak-counter')) {
      const badge = document.createElement('span');
      badge.className = 'streak-badge';
      badge.id = 'streak-counter';
      badge.textContent = `🔥 ${data.currentStreak || 0}`;
      badge.style.display = data.currentStreak > 0 ? 'inline-flex' : 'none';
      badge.setAttribute('title', `${data.currentStreak} day streak!`);
      logoArea.parentNode.insertBefore(badge, logoArea.nextSibling);
    }
  }

  return { init, getData };
})();
