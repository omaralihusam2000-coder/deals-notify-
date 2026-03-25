# 🎮 Gaming Deals Notifier

A fully responsive, single-page gaming deals notification website that aggregates deals from major gaming platforms and delivers browser push notifications when deals match your preferences.

![Dark gaming theme preview](https://via.placeholder.com/900x450/0a0a0f/00d4ff?text=Gaming+Deals+Notifier)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔥 **Live Deals Feed** | Browse current deals from Steam, GOG, Humble Store, Fanatical, Green Man Gaming, and more |
| 🆓 **Free Games Tracker** | See all current free game giveaways (PC, Steam, Epic Games, GOG, itch.io, and more) |
| 🔍 **Search & Filter** | Filter by store, max price, discount %, and sort order |
| 🔔 **Browser Notifications** | Get push notifications when new deals drop below your price threshold |
| ⭐ **Wishlist** | Save games and get alerted when they reach a new low price |
| 📱 **Responsive Design** | Mobile-first, works on all screen sizes |

---

## 🚀 Getting Started

This is a **fully static website** — no build step or server required.

### Option 1: Open locally
```bash
git clone https://github.com/omaralihusam2000-coder/deals-notify-.git
cd deals-notify-
# Open index.html in your browser
open index.html
```

### Option 2: Deploy on GitHub Pages
1. Go to your repository **Settings → Pages**
2. Under "Branch", select `main` and `/ (root)`
3. Click **Save** — your site will be live at `https://omaralihusam2000-coder.github.io/deals-notify-/`

---

## 📁 File Structure

```
├── index.html              # Main page — deals, giveaways, wishlist, settings
├── css/
│   └── styles.css          # All styles, responsive design, dark gaming theme
├── js/
│   ├── app.js              # Main application logic, tab navigation
│   ├── deals.js            # CheapShark API — deals fetching & rendering
│   ├── giveaways.js        # GamerPower API — giveaways fetching & rendering
│   ├── notifications.js    # Browser notification logic & threshold checking
│   ├── wishlist.js         # Wishlist management with localStorage
│   └── utils.js            # Shared helpers (fetch wrapper, formatting, toasts)
└── README.md
```

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **APIs:**
  - [CheapShark API](https://apidocs.cheapshark.com/) — Free, no API key. Tracks deals across 20+ stores.
  - [GamerPower API](https://www.gamerpower.com/api-read) — Free, no API key. Tracks free game giveaways.

---

## 🎨 Design

- **Color palette:** Dark background `#0a0a0f`, card backgrounds `#1a1a2e`, neon blue `#00d4ff`, neon green `#00ff88`
- **Typography:** [Poppins](https://fonts.google.com/specimen/Poppins) via Google Fonts
- **Cards:** Rounded corners, shimmer skeleton loaders, hover lift effect
- **Notifications:** Bottom-right toast messages + browser push notifications

---

## 🔔 Notification Setup

1. Click the **🔔 Notifications** tab
2. Click **Enable** to grant browser notification permission
3. Set your **price threshold** (e.g., "notify me for deals under $5")
4. Set your **discount threshold** (e.g., "notify me for 75%+ off deals")
5. Toggle **Enable Deal Alerts** on
6. Click **Save Preferences**

The app checks for new deals every 5 minutes in the background.

---

## 📦 API Credits

- **[CheapShark](https://www.cheapshark.com/)** — Game deals aggregator. Free API, no registration required.
- **[GamerPower](https://www.gamerpower.com/)** — Free game giveaway tracker. Free API, no registration required.

---

## 📄 License

MIT License — feel free to fork and build upon this project.
