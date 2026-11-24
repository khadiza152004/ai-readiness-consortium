/* Global University Consortium of AI Readiness — frontend */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

async function api(path, opts = {}) {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2800);
}

/* ---------- Navigation ---------- */
function goPage(name) {
  $$(".page").forEach((p) => p.classList.remove("active"));
  $$(".nav button[data-page]").forEach((b) => b.classList.remove("active"));
  const page = $("#page-" + name);
  if (page) page.classList.add("active");
  $$('.nav button[data-page="' + name + '"]').forEach((b) => b.classList.add("active"));
  $("#nav").classList.remove("open");
  window.scrollTo(0, 0);
  if (name === "universities") loadUniversities();
  if (name === "resources") loadResources();
  if (name === "events") loadEvents();
  if (name === "assess") loadAssessments();
  if (name === "home") loadHome();
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-page]");
  if (t && t.dataset.page) {
    e.preventDefault();
    goPage(t.dataset.page);
  }
});

$("#menuBtn").onclick = () => $("#nav").classList.toggle("open");

/* ---------- Home ---------- */
async function loadHome() {
  try {
    const s = await api("/stats");
    const boxes = $$("#homeStats .stat b");
    if (boxes[0]) boxes[0].textContent = s.universities;
    if (boxes[1]) boxes[1].textContent = s.avgScore ?? "—";
    if (boxes[2]) boxes[2].textContent = s.resources;
    if (boxes[3]) boxes[3].textContent = s.events;

    const list = await api("/universities");
    $("#homeUnis").innerHTML = list
      .slice(0, 6)
      .map(
        (u) => `
      <div class="card">
        <div class="uni-img-wrap">
          <img class="uni-img" src="${esc(u.image_url || "/images/universities/default.jpg")}" alt="${esc(u.name)}" onerror="this.src='/images/universities/default.jpg'" />
        </div>
        <span class="badge">${u.region || u.country}</span>
        <h3>${esc(u.name)}</h3>
        <p>${esc(u.description || "")}</p>
        <div class="score">Readiness ${u.ai_score}/100</div>
        <div class="meta">${esc(u.country)} · ${esc(u.focus_areas || "")}</div>
      </div>`
      )
      .join("");
  } catch (err) {
    toast("Server offline? Run npm start — " + err.message);
  }
}

/* ---------- Universities ---------- */
async function loadUniversities() {
  const q = $("#uniQ").value.trim();
  const region = $("#uniRegion").value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (region) params.set("region", region);
  try {
    const list = await api("/universities?" + params.toString());
    $("#uniGrid").innerHTML = list.length
      ? list
          .map(
            (u) => `
      <div class="card">
        <div class="uni-img-wrap">
          <img class="uni-img" src="${esc(u.image_url || "/images/universities/default.jpg")}" alt="${esc(u.name)}" onerror="this.src='/images/universities/default.jpg'" />
        </div>
        <span class="badge">${esc(u.region || "—")}</span>
        <h3>${esc(u.name)}</h3>
        <p>${esc(u.description || "")}</p>
        <div class="score">AI readiness ${u.ai_score}/100</div>
        <div class="meta">${esc(u.country)} · Joined ${u.joined_year || "—"}</div>
        <div class="meta">${esc(u.focus_areas || "")}</div>
      </div>`
          )
          .join("")
      : `<div class="empty">No universities match your search.</div>`;
  } catch (err) {
    toast(err.message);
  }
}
$("#uniQ").addEventListener("input", debounce(loadUniversities, 300));
$("#uniRegion").addEventListener("change", loadUniversities);

/* ---------- Resources ---------- */
async function loadResources() {
  const cat = $("#resCat").value;
  const q = cat ? "?category=" + encodeURIComponent(cat) : "";
  try {
    const list = await api("/resources" + q);
    $("#resGrid").innerHTML = list
      .map(
        (r) => `
      <div class="card">
        <span class="badge">${esc(r.category || "Resource")}</span>
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.summary || "")}</p>
      </div>`
      )
      .join("");
  } catch (err) {
    toast(err.message);
  }
}
$("#resCat").addEventListener("change", loadResources);

/* ---------- Events ---------- */
async function loadEvents() {
  try {
    const list = await api("/events");
    $("#eventGrid").innerHTML = list
      .map(
        (e) => `
      <div class="card">
        <span class="badge">${esc(e.mode || "Event")}</span>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.description || "")}</p>
        <div class="meta">${esc(e.event_date || "")} · ${esc(e.location || "")}</div>
      </div>`
      )
      .join("");
  } catch (err) {
    toast(err.message);
  }
}

/* ---------- Assessment ---------- */
$$("input[type=range]").forEach((el) => {
  const label = $(`.range-val[data-for="${el.id}"]`);
  const sync = () => {
    if (label) label.textContent = el.value;
  };
  el.addEventListener("input", sync);
  sync();
});

$("#assessForm").onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  ["score_governance", "score_curriculum", "score_research", "score_infrastructure", "score_ethics"].forEach(
    (k) => (body[k] = Number(body[k]))
  );
  try {
    const data = await api("/assessments", { method: "POST", body: JSON.stringify(body) });
    $("#assessResult").style.display = "block";
    $("#assessScore").textContent = data.total_score + " / 100";
    toast("Assessment saved to SQLite");
    loadAssessments();
  } catch (err) {
    toast(err.message);
  }
};

async function loadAssessments() {
  try {
    const list = await api("/assessments");
    $("#assessList").innerHTML = list.length
      ? list
          .map(
            (a) =>
              `<div style="margin-bottom:0.4rem"><strong>${esc(a.university_name)}</strong> — ${a.total_score}/100 <span style="opacity:0.7">(${esc(a.country || "—")})</span></div>`
          )
          .join("")
      : "No assessments yet.";
  } catch {
    $("#assessList").textContent = "Could not load list.";
  }
}

/* ---------- Join ---------- */
$("#joinForm").onsubmit = async (e) => {
  e.preventDefault();
  const body = {
    name: $("#jName").value,
    email: $("#jEmail").value,
    organization: $("#jOrg").value,
    country: $("#jCountry").value,
    message: $("#jMsg").value,
  };
  try {
    await api("/join", { method: "POST", body: JSON.stringify(body) });
    e.target.reset();
    toast("Join request submitted");
  } catch (err) {
    toast(err.message);
  }
};

/* ---------- Auth ---------- */
let authMode = "login";
const userKey = "aic_user";

function setUser(u) {
  if (u) localStorage.setItem(userKey, JSON.stringify(u));
  else localStorage.removeItem(userKey);
  const btn = $("#authBtn");
  if (u) {
    btn.textContent = u.name.split(" ")[0];
    btn.classList.add("btn-primary");
    btn.classList.remove("btn-ghost");
  } else {
    btn.textContent = "Log in";
    btn.classList.add("btn-ghost");
    btn.classList.remove("btn-primary");
  }
}

$("#authBtn").onclick = () => {
  const u = localStorage.getItem(userKey);
  if (u) {
    if (confirm("Log out?")) setUser(null);
    return;
  }
  $("#authModal").classList.add("open");
};
$("#authClose").onclick = () => $("#authModal").classList.remove("open");
$("#authModal").addEventListener("click", (e) => {
  if (e.target === $("#authModal")) $("#authModal").classList.remove("open");
});

$$(".modal-tabs button").forEach((b) => {
  b.onclick = () => {
    authMode = b.dataset.mode;
    $$(".modal-tabs button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    $$(".reg-only").forEach((el) => (el.style.display = authMode === "register" ? "block" : "none"));
  };
});

$("#authForm").onsubmit = async (e) => {
  e.preventDefault();
  const email = $("#auEmail").value;
  const password = $("#auPass").value;
  try {
    if (authMode === "register") {
      const name = $("#auName").value;
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setUser(data.user);
      toast("Account created");
    } else {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      toast("Logged in");
    }
    $("#authModal").classList.remove("open");
    e.target.reset();
  } catch (err) {
    toast(err.message);
  }
};

/* ---------- Utils ---------- */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/* ---------- Boot ---------- */
try {
  const raw = localStorage.getItem(userKey);
  if (raw) setUser(JSON.parse(raw));
} catch {}
loadHome();
