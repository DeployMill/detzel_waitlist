import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { query } from "./db.js";

const app = new Hono();

// Basic, defensive email check. The DB has a UNIQUE constraint on email, so
// duplicates are deduped there; this just rejects obvious garbage early.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>deploymill — join the waitlist</title>
<meta name="description" content="deploymill is rolling out slowly while we watch scale. Leave your email and we'll notify you the moment we open up more signups." />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #0a0a0f;
    color: #e6e7eb;
    line-height: 1.6;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
  a { color: #c4b5fd; text-decoration: none; }
  a:hover { color: #fff; }
  code { font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; }

  .bg {
    position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background:
      radial-gradient(60rem 40rem at 80% -10%, rgba(120, 80, 255, 0.18), transparent 60%),
      radial-gradient(50rem 30rem at -10% 30%, rgba(0, 200, 255, 0.12), transparent 60%),
      radial-gradient(40rem 30rem at 50% 110%, rgba(255, 80, 180, 0.10), transparent 60%);
  }
  .grid-bg {
    position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 80%);
  }

  nav {
    display: flex; align-items: center; justify-content: space-between;
    max-width: 72rem; width: 100%; margin: 0 auto; padding: 1.25rem 1.5rem;
  }
  .logo { font-weight: 700; font-size: 1.05rem; letter-spacing: -0.01em; color: #e6e7eb; }
  .logo .dot { color: #a78bfa; }
  nav .links { display: flex; gap: 1.25rem; align-items: center; font-size: 0.9rem; color: #9ca3af; }
  nav .links a { color: #9ca3af; }
  nav .links a:hover { color: #fff; }

  main {
    flex: 1; display: flex; align-items: center; justify-content: center;
    max-width: 34rem; width: 100%; margin: 0 auto; padding: 2rem 1.5rem 4rem;
  }
  .card {
    width: 100%;
    padding: 2.25rem;
    background: rgba(20, 20, 30, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 1rem;
    box-shadow: 0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.08);
  }
  .pill {
    display: inline-flex; align-items: center; gap: 0.5rem;
    font-size: 0.78rem; color: #c9cad1; font-weight: 500;
    padding: 0.3rem 0.7rem; margin-bottom: 1.25rem;
    border: 1px solid rgba(167,139,250,0.25); border-radius: 999px;
    background: rgba(167,139,250,0.06);
  }
  .ping { width: 7px; height: 7px; border-radius: 999px; background: #34d399; box-shadow: 0 0 0 0 rgba(52,211,153,0.6); animation: ping 1.8s ease-out infinite; }
  @keyframes ping { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); } 70% { box-shadow: 0 0 0 8px rgba(52,211,153,0); } 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); } }

  h1 { font-size: 1.85rem; margin: 0 0 0.6rem; letter-spacing: -0.02em; font-weight: 700; }
  h1 .grad {
    background: linear-gradient(135deg, #a78bfa 0%, #f472b6 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  p.sub { color: #9ca3af; margin: 0 0 1.6rem; font-size: 0.97rem; }

  form { display: flex; flex-direction: column; gap: 0.7rem; }
  .row { display: flex; gap: 0.6rem; }
  input {
    flex: 1; padding: 0.8rem 0.9rem;
    border: 1px solid rgba(255,255,255,0.1); border-radius: 0.6rem;
    font-size: 0.97rem; background: rgba(255,255,255,0.03);
    color: #e6e7eb; font-family: inherit;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }
  input::placeholder { color: #4b5563; }
  input:focus {
    outline: none; border-color: rgba(167,139,250,0.6);
    background: rgba(255,255,255,0.05); box-shadow: 0 0 0 3px rgba(167,139,250,0.15);
  }
  button {
    padding: 0.8rem 1.2rem; border: none; border-radius: 0.6rem;
    font-size: 0.95rem; font-weight: 600; font-family: inherit; cursor: pointer;
    color: #fff; background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
    transition: transform 0.1s ease, opacity 0.15s ease; white-space: nowrap;
  }
  button:hover { transform: translateY(-1px); }
  button:disabled { opacity: 0.6; cursor: default; transform: none; }
  .hint { font-size: 0.8rem; color: #6b7280; margin-top: 0.2rem; }
  .msg { font-size: 0.88rem; margin-top: 0.4rem; min-height: 1.1rem; }
  .msg.err { color: #fca5a5; }
  .msg.ok { color: #6ee7b7; }

  .done { text-align: center; padding: 0.5rem 0; }
  .done .check { font-size: 2.5rem; line-height: 1; margin-bottom: 0.6rem; }
  .done h2 { font-size: 1.3rem; margin: 0 0 0.4rem; }
  .done p { color: #9ca3af; margin: 0; font-size: 0.95rem; }

  footer {
    max-width: 72rem; width: 100%; margin: 0 auto;
    padding: 1.5rem; display: flex; justify-content: space-between;
    color: #6b7280; font-size: 0.82rem;
  }
  @media (max-width: 520px) { .row { flex-direction: column; } h1 { font-size: 1.55rem; } }
</style>
</head>
<body>
<div class="bg"></div>
<div class="grid-bg"></div>

<nav>
  <a href="https://deploymill.com" class="logo">deploy<span class="dot">.</span>mill</a>
  <div class="links">
    <a href="https://deploymill.com">Home</a>
  </div>
</nav>

<main>
  <div class="card">
    <div id="form-wrap">
      <span class="pill"><span class="ping"></span> Private beta · rolling out slowly</span>
      <h1>Join the <span class="grad">deploymill</span> waitlist</h1>
      <p class="sub">
        We're opening deploymill up a little at a time so we can keep a close eye on
        scale and reliability. If you'd like to test or start using it, drop your email
        and we'll notify you the moment we open the next round of signups.
      </p>
      <form id="f">
        <div class="row">
          <input id="email" name="email" type="email" autocomplete="email" required
                 placeholder="you@company.com" aria-label="Email address" />
          <button type="submit" id="btn">Notify me</button>
        </div>
        <div class="hint">No spam — just one email when your spot opens up.</div>
        <div class="msg" id="msg"></div>
      </form>
    </div>
  </div>
</main>

<footer>
  <div>© <span id="yr"></span> deploymill</div>
  <div><a href="https://deploymill.com">deploymill.com</a></div>
</footer>

<script>
  document.getElementById("yr").textContent = new Date().getFullYear();
  const f = document.getElementById("f");
  const btn = document.getElementById("btn");
  const msg = document.getElementById("msg");
  const wrap = document.getElementById("form-wrap");

  function show(text, kind) { msg.textContent = text; msg.className = "msg " + (kind || ""); }

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    show("", "");
    const email = document.getElementById("email").value.trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      show("Please enter a valid email address.", "err");
      return;
    }
    btn.disabled = true;
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        show(body.error || "Something went wrong. Please try again.", "err");
        btn.disabled = false;
        return;
      }
      wrap.innerHTML =
        '<div class="done"><div class="check">✓</div>' +
        '<h2>You\\'re on the list</h2>' +
        '<p>' + (body.already ? "You were already signed up — we\\'ve got you." : "Thanks! We\\'ll email you the moment the next signups open.") + '</p></div>';
    } catch (err) {
      show("Network error. Please try again.", "err");
      btn.disabled = false;
    }
  });
</script>
</body>
</html>`;

app.get("/", (c) => c.html(PAGE));

app.post("/api/join", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Invalid request." }, 400);
  }
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return c.json({ ok: false, error: "Please enter a valid email address." }, 400);
  }
  try {
    const r = await query(
      `INSERT INTO waitlist (email, referrer, user_agent)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, c.req.header("referer") ?? null, c.req.header("user-agent") ?? null]
    );
    // No row returned ⇒ the email already existed (ON CONFLICT DO NOTHING).
    return c.json({ ok: true, already: r.rowCount === 0 });
  } catch (e) {
    console.error("waitlist insert failed:", e);
    return c.json({ ok: false, error: "Something went wrong. Please try again." }, 500);
  }
});

// Liveness — deploymill's canonical deploy-health signal.
app.get("/healthz", (c) => c.json({ ok: true }));

// Readiness — proves the database is reachable + migrations ran.
app.get("/db", async (c) => {
  try {
    const r = await query("SELECT 1 AS ok");
    return c.json({ ok: true, result: r.rows[0] });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.log(`Listening on :${port}`);
