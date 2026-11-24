/* SQLite via Node built-in (node:sqlite) — requires Node 22+ */
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "consortium.db");

let db;
try {
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = DELETE;");
  db.exec("PRAGMA foreign_keys = ON;");
} catch (err) {
  // Fallback if project data dir is not writable (some sandboxes)
  const fallback = path.join(require("os").tmpdir(), "ai-consortium.db");
  console.warn("SQLite open failed at", DB_PATH, "→ using", fallback);
  db = new DatabaseSync(fallback);
  db.exec("PRAGMA journal_mode = DELETE;");
  db.exec("PRAGMA foreign_keys = ON;");
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS universities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      region TEXT,
      website TEXT,
      ai_score INTEGER DEFAULT 50,
      focus_areas TEXT,
      joined_year INTEGER,
      description TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT,
      summary TEXT,
      url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      event_date TEXT,
      location TEXT,
      mode TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      country TEXT,
      score_governance INTEGER,
      score_curriculum INTEGER,
      score_research INTEGER,
      score_infrastructure INTEGER,
      score_ethics INTEGER,
      total_score INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS join_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      organization TEXT,
      country TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try {
    db.exec("ALTER TABLE universities ADD COLUMN image_url TEXT");
  } catch (_) {}
    const row = db.prepare("SELECT COUNT(*) AS n FROM universities").get();
  if (!row || row.n === 0) seed();
}

function seed() {
  const uni = db.prepare(`
    INSERT INTO universities (name, country, region, website, ai_score, focus_areas, joined_year, description, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ["Massachusetts Institute of Technology", "USA", "North America", "https://mit.edu", 95, "Research, Ethics, Infrastructure", 2022, "Pioneer in AI research and responsible AI education.", "/images/universities/mit.jpg"],
    ["University of Oxford", "UK", "Europe", "https://ox.ac.uk", 92, "Governance, Ethics, Curriculum", 2022, "Strong focus on AI ethics and public policy.", "/images/universities/oxford.jpg"],
    ["National University of Singapore", "Singapore", "Asia", "https://nus.edu.sg", 90, "Curriculum, Research, Infrastructure", 2023, "Leading Asian hub for AI-ready graduates.", "/images/universities/nus.jpg"],
    ["University of Tokyo", "Japan", "Asia", "https://u-tokyo.ac.jp", 88, "Research, Infrastructure", 2023, "Advanced robotics and machine learning programs.", "/images/universities/tokyo.jpg"],
    ["University of Cape Town", "South Africa", "Africa", "https://uct.ac.za", 78, "Curriculum, Ethics, Access", 2024, "Expanding inclusive AI education in Africa.", "/images/universities/uct.jpg"],
    ["University of Sao Paulo", "Brazil", "Latin America", "https://usp.br", 80, "Research, Curriculum", 2024, "Regional leader in applied AI and data science.", "/images/universities/usp.jpg"],
    ["Technical University of Munich", "Germany", "Europe", "https://tum.de", 91, "Infrastructure, Research", 2023, "Engineering-driven AI readiness framework.", "/images/universities/tum.jpg"],
    ["Indian Institute of Technology Delhi", "India", "Asia", "https://iitd.ac.in", 85, "Curriculum, Research, Access", 2024, "Scaling AI skills for large student populations.", "/images/universities/iitd.jpg"],
    ["University of Melbourne", "Australia", "Oceania", "https://unimelb.edu.au", 87, "Governance, Curriculum, Ethics", 2023, "Comprehensive AI strategy across faculties.", "/images/universities/melbourne.jpg"],
    ["Cairo University", "Egypt", "Africa", "https://cu.edu.eg", 72, "Curriculum, Access", 2025, "Building foundational AI capacity in North Africa.", "/images/universities/cairo.jpg"],
  ].forEach((u) => uni.run(...u));

  const res = db.prepare("INSERT INTO resources (title, category, summary, url) VALUES (?, ?, ?, ?)");
  [
    ["AI Readiness Self-Assessment Guide", "Framework", "Checklist for governance, teaching, and research maturity.", "#"],
    ["Curriculum Integration Playbook", "Education", "Embed AI literacy across non-CS degrees.", "#"],
    ["Responsible AI Policy Template", "Ethics", "Policy language for student data and generative AI use.", "#"],
    ["Infrastructure Minimum Standards", "Infrastructure", "Compute and lab baselines for public universities.", "#"],
    ["Faculty Upskilling Pathways", "Education", "Short courses for non-technical staff.", "#"],
    ["Global Benchmark Report 2025", "Report", "Aggregate scores from consortium members by region.", "#"],
  ].forEach((r) => res.run(...r));

  const ev = db.prepare("INSERT INTO events (title, event_date, location, mode, description) VALUES (?, ?, ?, ?, ?)");
  [
    ["Annual AI Readiness Summit", "2026-03-18", "Singapore", "Hybrid", "Keynotes and workshops on assessment frameworks."],
    ["Ethics in Generative AI Roundtable", "2026-04-10", "Online", "Online", "Discussion for faculty and policy leads."],
    ["Curriculum Design Sprint", "2026-05-22", "Berlin", "In-person", "Collaborative redesign of intro AI modules."],
    ["Africa Regional Hub Meet-up", "2026-06-15", "Cape Town", "Hybrid", "Networking for African members."],
  ].forEach((e) => ev.run(...e));
}

initSchema();
module.exports = { db, DB_PATH };
