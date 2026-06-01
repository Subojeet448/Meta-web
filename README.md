# 🎬 MetaSaver — Meta Video Downloader

Download videos from Facebook, Instagram & Meta — fast, free, no login needed.

## ✨ Features

- ⬇ Download Meta / Facebook / Instagram videos
- 🌙 Dark & Light theme (saved to device)
- 📷 Custom background image (set from your phone gallery)
- 🕐 Download history (last 20 videos, saved locally)
- 📱 Mobile-first, smooth UI
- 🔒 No data stored on server

---

## 🚀 Deploy to Vercel (3 steps)

### Option 1 — Vercel CLI

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Go to project folder
cd meta-saver

# 3. Deploy
vercel
```

### Option 2 — GitHub + Vercel Dashboard

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import the repo → Click **Deploy**
4. Done! ✅

---

## 🗂 File Structure

```
meta-saver/
├── pages/
│   ├── index.jsx          ← Main UI (all-in-one)
│   └── api/
│       └── meta-video.js  ← Backend (replaces PHP)
├── public/                ← Static assets (optional)
├── package.json
├── next.config.js
├── vercel.json
└── .gitignore
```

---

## 💻 Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📱 Settings Panel

| Option | What it does |
|--------|-------------|
| 🌙 Dark / ☀️ Light | Switch theme (saved to phone) |
| 📷 Choose Image | Set custom background from gallery |
| ✕ Remove | Remove custom background |
| 🗑 Clear History | Delete all saved download history |

---

## ⚙️ API Route

`GET /api/meta-video?url=<VIDEO_URL>`

Returns:
```json
{
  "success": true,
  "platform": "facebook",
  "title": "Video title",
  "video_id": "...",
  "thumbnail": "https://...",
  "video": "https://...",
  "width": "1280",
  "height": "720"
}
```
