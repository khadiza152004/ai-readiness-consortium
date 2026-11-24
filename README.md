# Global University Consortium of AI Readiness

Full-stack web platform for universities measuring and improving **AI readiness** (governance, curriculum, research, infrastructure, ethics).

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js 22+ (built-in SQLite), Express |
| Database | **SQLite** via Node.js built-in `node:sqlite` |
| Auth | bcryptjs password hashing |

## Features

- **Home** — mission, live stats from SQLite, featured member universities  
- **Universities** — search & filter members by region  
- **Assessment** — 5-pillar AI readiness form; scores saved in SQLite  
- **Resources** — frameworks, ethics, curriculum playbooks  
- **Events** — upcoming summits and workshops  
- **Join** — membership request form (stored as pending)  
- **Register / Login** — accounts with hashed passwords  

## Run locally

```bash
cd ai-consortium
npm install
npm start
```

Open **http://localhost:3000**

API checks:
- http://localhost:3000/api/health  
- http://localhost:3000/api/universities  
- http://localhost:3000/api/stats  

## Project structure

```
ai-consortium/
├── package.json
├── README.md
├── public/           # frontend
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── server/
│   ├── index.js      # Express APIs
│   └── db.js         # SQLite schema + seed
└── data/             # consortium.db created at runtime
```

## Deploy on Render (with GitHub)

1. Push this folder to a **GitHub** repository.  
2. Go to [https://render.com](https://render.com) → **New** → **Web Service**.  
3. Connect the GitHub repo.  
4. Settings:
   - **Runtime:** Node  
   - **Build Command:** `npm install`  
   - **Start Command:** `npm start`  
5. Add environment variable if you want a custom DB path (optional):
   - `DB_PATH` = `/opt/render/project/src/data/consortium.db`  
6. Deploy. Render sets `PORT` automatically; the app already uses `process.env.PORT`.

### Important on Render free tier

SQLite files on the free filesystem can reset on redeploy. For a durable demo, either:
- Accept seed data reloading on each deploy, or  
- Attach a **persistent disk** on a paid plan and point `DB_PATH` at that disk.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Status |
| GET | `/api/stats` | Counts & average score |
| GET | `/api/universities` | List (`?q=&region=`) |
| GET | `/api/resources` | List (`?category=`) |
| GET | `/api/events` | List |
| POST | `/api/assessments` | Save readiness assessment |
| GET | `/api/assessments` | Recent assessments |
| POST | `/api/join` | Membership request |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |

