/**
 * calendar.js — Sale Calendar Tab
 * Shows known gaming sale events in a monthly calendar grid with countdown timers.
 */

const CalendarModule = (() => {
  const STORAGE_KEY = 'calendar_reminders';

  // Known recurring gaming sale events (month is 0-indexed)
  const SALE_EVENTS = [
    // Steam Sales
    { id: 'steam-winter',  name: 'Steam Winter Sale',   store: 'Steam',       color: '#1b2838', months: [11],     startDay: 19, endDay: 31,  emoji: '❄️',  link: 'https://store.steampowered.com/sale/wintergamesale' },
    { id: 'steam-summer',  name: 'Steam Summer Sale',   store: 'Steam',       color: '#1b2838', months: [5],      startDay: 27, endDay: 30,  emoji: '☀️',  link: 'https://store.steampowered.com/sale/summersale' },
    { id: 'steam-autumn',  name: 'Steam Autumn Sale',   store: 'Steam',       color: '#1b2838', months: [10],     startDay: 20, endDay: 30,  emoji: '🍂',  link: 'https://store.steampowered.com/sale/autumnsale' },
    { id: 'steam-spring',  name: 'Steam Spring Sale',   store: 'Steam',       color: '#1b2838', months: [2],      startDay: 14, endDay: 25,  emoji: '🌸',  link: 'https://store.steampowered.com/sale/springsale' },
    // Epic Games weekly free game (every Thursday)
    { id: 'epic-weekly',   name: 'Epic Free Game',      store: 'Epic Games',  color: '#2d2d2d', recurring: 'weekly-thursday', emoji: '🆓',  link: 'https://store.epicgames.com/en-US/free-games' },
    // PlayStation
    { id: 'ps-days-play',  name: 'PS Days of Play',     store: 'PlayStation', color: '#003087', months: [5],      startDay: 1,  endDay: 14,  emoji: '🟦',  link: 'https://store.playstation.com/en-us/category/sale' },
    { id: 'ps-holiday',    name: 'PS Holiday Sale',     store: 'PlayStation', color: '#003087', months: [11, 0],  startDay: 1,  endDay: 15,  emoji: '🎄',  link: 'https://store.playstation.com/en-us/category/sale' },
    // Xbox
    { id: 'xbox-spring',   name: 'Xbox Spring Sale',    store: 'Xbox',        color: '#107c10', months: [2],      startDay: 19, endDay: 31,  emoji: '🟩',  link: 'https://www.xbox.com/en-US/promotions/sales' },
    { id: 'xbox-summer',   name: 'Xbox Summer Sale',    store: 'Xbox',        color: '#107c10', months: [5],      startDay: 8,  endDay: 22,  emoji: '🟩',  link: 'https://www.xbox.com/en-US/promotions/sales' },
    // Nintendo
    { id: 'nin-eshop',     name: 'Nintendo eShop Sale', store: 'Nintendo',    color: '#e4000f', months: [0, 6, 11], startDay: 1, endDay: 14, emoji: '🔴', link: 'https://www.nintendo.com/store/sale/' },
    // Humble Bundle
    { id: 'humble-monthly',name: 'Humble Choice',       store: 'Humble Bundle',color: '#cc0000',recurring: 'monthly-first', emoji: '🎁', link: 'https://www.humblebundle.com/membership' },
    // Amazon Prime Day
    { id: 'prime-day',     name: 'Amazon Prime Day',    store: 'Amazon',      color: '#ff9900', months: [6],      startDay: 11, endDay: 14, emoji: '📦', link: 'https://www.amazon.com/primeday' },
  ];

  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();

  function getReminders() { return storageGet(STORAGE_KEY, []); }
  function setReminders(r) { storageSet(STORAGE_KEY, r); }

  function getEventsForMonth(year, month) {
    const results = [];
    const today = new Date();

    SALE_EVENTS.forEach(evt => {
      if (evt.recurring === 'weekly-thursday') {
        // Generate all Thursdays in this month
        const d = new Date(year, month, 1);
        while (d.getMonth() === month) {
          if (d.getDay() === 4) { // Thursday
            results.push({ ...evt, day: d.getDate(), year, month, dateObj: new Date(d) });
          }
          d.setDate(d.getDate() + 1);
        }
        return;
      }

      if (evt.recurring === 'monthly-first') {
        results.push({ ...evt, day: 1, year, month, dateObj: new Date(year, month, 1) });
        return;
      }

      if (evt.months && evt.months.includes(month)) {
        results.push({ ...evt, day: evt.startDay, year, month, dateObj: new Date(year, month, evt.startDay) });
      }
    });

    return results;
  }

  function getEventDays(year, month) {
    const events = getEventsForMonth(year, month);
    const dayMap = {};
    events.forEach(evt => {
      if (!dayMap[evt.day]) dayMap[evt.day] = [];
      dayMap[evt.day].push(evt);
    });
    return dayMap;
  }

  function formatCountdown(dateObj) {
    const now = new Date();
    const diff = dateObj - now;
    if (diff < 0) return 'Past';
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today!';
    if (days === 1) return 'Tomorrow!';
    return `${days}d away`;
  }

  function buildGoogleCalendarLink(evt, year, month) {
    const start = new Date(year, month, evt.day);
    const end = new Date(year, month, (evt.endDay || evt.day) + 1);
    const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evt.name)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent('Gaming sale event')}`;
  }

  function toggleReminder(evtId) {
    const reminders = getReminders();
    const idx = reminders.indexOf(evtId);
    if (idx === -1) {
      reminders.push(evtId);
      showToast('🔔 Reminder set!', 'success');
      if (typeof NotificationsModule !== 'undefined') {
        NotificationsModule.requestPermission && NotificationsModule.requestPermission();
      }
    } else {
      reminders.splice(idx, 1);
      showToast('🔕 Reminder removed', 'info');
    }
    setReminders(reminders);
    render();
  }

  function render() {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    const reminders = getReminders();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
    const todayDate = isCurrentMonth ? today.getDate() : -1;

    const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' });
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const eventDays = getEventDays(currentYear, currentMonth);

    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let cells = '';
    // Empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells += '<div class="cal-cell cal-cell-empty"></div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const events = eventDays[d] || [];
      const isToday = d === todayDate;
      cells += `
        <div class="cal-cell ${isToday ? 'cal-cell-today' : ''} ${events.length ? 'cal-cell-has-events' : ''}">
          <div class="cal-day-num ${isToday ? 'cal-today-num' : ''}">${d}</div>
          ${events.slice(0, 2).map(evt => `
            <div class="cal-event-dot" style="background:${escapeHtml(evt.color)}" title="${escapeHtml(evt.name)}"></div>
          `).join('')}
        </div>
      `;
    }

    // Upcoming events list
    const upcomingEvents = getEventsForMonth(currentYear, currentMonth)
      .sort((a, b) => a.day - b.day);

    const upcomingHTML = upcomingEvents.length === 0
      ? '<p class="text-muted">No major sales this month.</p>'
      : upcomingEvents.map(evt => {
          const reminder = reminders.includes(evt.id + '_' + evt.day);
          const countdown = formatCountdown(new Date(currentYear, currentMonth, evt.day));
          return `
            <div class="cal-event-card" style="border-left-color:${escapeHtml(evt.color)}">
              <div class="cal-event-main">
                <span class="cal-event-emoji">${evt.emoji}</span>
                <div class="cal-event-info">
                  <div class="cal-event-name">${escapeHtml(evt.name)}</div>
                  <div class="cal-event-meta">
                    <span class="cal-event-store">${escapeHtml(evt.store)}</span>
                    ${evt.startDay ? `<span class="cal-event-date">· ${evt.startDay}${evt.endDay && evt.endDay !== evt.startDay ? `–${evt.endDay}` : ''} ${monthName}</span>` : ''}
                    <span class="cal-event-countdown ${countdown === 'Today!' ? 'cal-today-badge' : ''}">${escapeHtml(countdown)}</span>
                  </div>
                </div>
              </div>
              <div class="cal-event-actions">
                <a class="btn btn-ghost btn-xs" href="${escapeHtml(buildGoogleCalendarLink(evt, currentYear, currentMonth))}" target="_blank" rel="noopener noreferrer" title="Add to Google Calendar">📅 +GCal</a>
                <button class="btn btn-ghost btn-xs cal-remind-btn ${reminder ? 'active' : ''}"
                        data-evt-id="${escapeHtml(evt.id + '_' + evt.day)}"
                        title="${reminder ? 'Remove reminder' : 'Set reminder'}">
                  ${reminder ? '🔔 Reminded' : '🔕 Remind Me'}
                </button>
              </div>
            </div>
          `;
        }).join('');

    container.innerHTML = `
      <div class="cal-nav">
        <button class="btn btn-ghost btn-sm cal-prev" aria-label="Previous month">‹</button>
        <h2 class="cal-month-title">${escapeHtml(monthName)} ${currentYear}</h2>
        <button class="btn btn-ghost btn-sm cal-next" aria-label="Next month">›</button>
      </div>
      <div class="cal-grid">
        ${WEEKDAYS.map(d => `<div class="cal-weekday">${d}</div>`).join('')}
        ${cells}
      </div>
      <div class="cal-events-section">
        <h3 class="section-subtitle">📅 Events This Month</h3>
        <div class="cal-events-list">${upcomingHTML}</div>
      </div>
    `;

    container.querySelector('.cal-prev').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      render();
    });
    container.querySelector('.cal-next').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      render();
    });

    container.querySelectorAll('.cal-remind-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleReminder(btn.dataset.evtId));
    });
  }

  function init() {
    currentYear = new Date().getFullYear();
    currentMonth = new Date().getMonth();
    render();
  }

  return { init, render };
})();
