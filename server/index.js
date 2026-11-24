/**
 * Global University Consortium of AI Readiness
 * Full-stack API + static frontend  |  SQLite
 *
 * Run:  npm install && npm start
 * Open: http://localhost:3000
 */
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const { db } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..", "public");

app.use(cors());
app.use(express.json());
app.use(express.static(ROOT));

/* ---------- Health ---------- */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "AI Readiness Consortium", time: new Date().toISOString() });
});

/* ---------- Stats ---------- */
app.get("/api/stats", (_req, res) => {
  const universities = db.prepare("SELECT COUNT(*) AS n FROM universities").get().n;
  const resources = db.prepare("SELECT COUNT(*) AS n FROM resources").get().n;
  const events = db.prepare("SELECT COUNT(*) AS n FROM events").get().n;
  const assessments = db.prepare("SELECT COUNT(*) AS n FROM assessments").get().n;
  const avg = db.prepare("SELECT ROUND(AVG(ai_score),1) AS a FROM universities").get().a;
  const regions = db
    .prepare("SELECT region, COUNT(*) AS n FROM universities GROUP BY region ORDER BY n DESC")
    .all();
  res.json({ universities, resources, events, assessments, avgScore: avg, regions });
});

/* ---------- Universities ---------- */
app.get("/api/universities", (req, res) => {
  const q = (req.query.q || "").trim();
  const region = (req.query.region || "").trim();
  let sql = "SELECT * FROM universities WHERE 1=1";
  const params = [];
  if (q) {
    sql += " AND (name LIKE ? OR country LIKE ? OR focus_areas LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (region) {
    sql += " AND region = ?";
    params.push(region);
  }
  sql += " ORDER BY ai_score DESC, name ASC";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/universities/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM universities WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "University not found" });
  res.json(row);
});

/* ---------- Resources ---------- */
app.get("/api/resources", (req, res) => {
  const cat = (req.query.category || "").trim();
  if (cat) {
    return res.json(
      db.prepare("SELECT * FROM resources WHERE category = ? ORDER BY id DESC").all(cat)
    );
  }
  res.json(db.prepare("SELECT * FROM resources ORDER BY id DESC").all());
});

/* ---------- Events ---------- */
app.get("/api/events", (_req, res) => {
  res.json(db.prepare("SELECT * FROM events ORDER BY event_date ASC").all());
});

/* ---------- AI Readiness Assessment ---------- */
app.post("/api/assessments", (req, res) => {
  const {
    university_name,
    contact_email,
    country,
    score_governance,
    score_curriculum,
    score_research,
    score_infrastructure,
    score_ethics,
    notes,
  } = req.body || {};

  if (!university_name || !contact_email) {
    return res.status(400).json({ error: "University name and email are required" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact_email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const scores = [
    Number(score_governance),
    Number(score_curriculum),
    Number(score_research),
    Number(score_infrastructure),
    Number(score_ethics),
  ];
  if (scores.some((s) => isNaN(s) || s < 0 || s > 100)) {
    return res.status(400).json({ error: "Each score must be a number from 0 to 100" });
  }
  const total = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  const info = db
    .prepare(
      `INSERT INTO assessments
      (university_name, contact_email, country, score_governance, score_curriculum,
       score_research, score_infrastructure, score_ethics, total_score, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      university_name.trim(),
      contact_email.trim().toLowerCase(),
      (country || "").trim(),
      scores[0],
      scores[1],
      scores[2],
      scores[3],
      scores[4],
      total,
      (notes || "").trim()
    );

  res.status(201).json({
    ok: true,
    id: info.lastInsertRowid,
    total_score: total,
    message: "Assessment saved",
  });
});

app.get("/api/assessments", (_req, res) => {
  res.json(
    db
      .prepare(
        "SELECT id, university_name, country, total_score, created_at FROM assessments ORDER BY id DESC LIMIT 50"
      )
      .all()
  );
});

/* ---------- Join consortium ---------- */
app.post("/api/join", (req, res) => {
  const { name, email, organization, country, message } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  const info = db
    .prepare(
      `INSERT INTO join_requests (name, email, organization, country, message)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      name.trim(),
      email.trim().toLowerCase(),
      (organization || "").trim(),
      (country || "").trim(),
      (message || "").trim()
    );
  res.status(201).json({ ok: true, id: info.lastInsertRowid, message: "Request submitted" });
});

/* ---------- Auth ---------- */
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const hash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name.trim(), email.trim().toLowerCase(), hash);

  res.status(201).json({
    ok: true,
    user: { id: info.lastInsertRowid, name: name.trim(), email: email.trim().toLowerCase() },
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

/* ---------- SPA fallback ---------- */
app.get("*", (_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.listen(PORT, () => {
  console.log("");
  console.log("  AI Readiness Consortium running");
  console.log("  → http://localhost:" + PORT);
  console.log("  → API /api/health  /api/universities  /api/stats");
  console.log("");
});
