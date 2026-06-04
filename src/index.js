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
<title>Deploy Mill — join the waitlist</title>
<meta name="description" content="Deploy Mill is rolling out slowly while we watch scale. Leave your email and we'll notify you the moment we open up more signups." />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #0a1628;
    color: #94a3b8;
    line-height: 1.6;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
  a { color: #00e5ff; text-decoration: none; }
  a:hover { color: #e2e8f0; }
  code { font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; }

  .bg {
    position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background:
      radial-gradient(80rem 50rem at 100% -10%, rgba(0,229,255,0.06), transparent 55%),
      radial-gradient(60rem 40rem at -10% 60%, rgba(251,191,36,0.05), transparent 55%),
      radial-gradient(40rem 40rem at 50% 110%, rgba(0,180,255,0.07), transparent 60%);
  }
  .grid-bg {
    position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background-image:
      linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse 85% 55% at 50% 20%, black, transparent 80%);
  }

  nav {
    display: flex; align-items: center; justify-content: space-between;
    max-width: 76rem; width: 100%; margin: 0 auto; padding: 1.1rem 1.5rem;
  }
  .logo {
    font-weight: 800; font-size: 1.05rem; letter-spacing: -0.01em;
    color: #e2e8f0;
    display: flex; align-items: center; gap: 0.45rem;
  }
  .logo .logo-mark {
    display: inline-flex; width: 1.6rem; height: 1.6rem; border-radius: 0.3rem;
    background: linear-gradient(135deg, #00e5ff, #0088cc);
    align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 900; color: #0a1628;
  }
  nav .links { display: flex; gap: 1.5rem; align-items: center; font-size: 0.875rem; color: #64748b; }
  nav .links a { color: #64748b; }
  nav .links a:hover { color: #e2e8f0; }

  main {
    flex: 1; display: flex; align-items: center; justify-content: center;
    max-width: 34rem; width: 100%; margin: 0 auto; padding: 2rem 1.5rem 4rem;
  }
  .card {
    width: 100%;
    padding: 2.25rem;
    background: rgba(10, 22, 40, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 229, 255, 0.12);
    border-radius: 0.875rem;
    box-shadow: 0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.06);
  }
  .pill {
    display: inline-flex; align-items: center; gap: 0.5rem;
    font-size: 0.78rem; color: #00e5ff; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.3rem 0.75rem; margin-bottom: 1.25rem;
    border: 1px solid rgba(0,229,255,0.2); border-radius: 999px;
    background: rgba(0,229,255,0.07);
  }
  .ping { width: 6px; height: 6px; border-radius: 999px; background: #00e5ff; box-shadow: 0 0 8px #00e5ff; animation: blink 2s ease-in-out infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }

  h1 { font-size: 1.85rem; margin: 0 0 0.6rem; letter-spacing: -0.02em; font-weight: 700; color: #e2e8f0; }
  h1 .grad {
    background: linear-gradient(90deg, #00e5ff 0%, #38bdf8 60%, #fbbf24 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  p.sub { color: #64748b; margin: 0 0 1.6rem; font-size: 0.97rem; }

  form { display: flex; flex-direction: column; gap: 0.7rem; }
  .row { display: flex; gap: 0.6rem; }
  input {
    flex: 1; padding: 0.8rem 0.9rem;
    border: 1px solid rgba(0,229,255,0.15); border-radius: 0.6rem;
    font-size: 0.97rem; background: rgba(0,229,255,0.03);
    color: #e2e8f0; font-family: inherit;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }
  input::placeholder { color: #334155; }
  input:focus {
    outline: none; border-color: rgba(0,229,255,0.45);
    background: rgba(0,229,255,0.05); box-shadow: 0 0 0 3px rgba(0,229,255,0.12);
  }
  button {
    padding: 0.8rem 1.2rem; border: none; border-radius: 0.6rem;
    font-size: 0.95rem; font-weight: 700; font-family: inherit; cursor: pointer;
    color: #0a1628; background: linear-gradient(135deg, #00e5ff, #0ea5e9);
    box-shadow: 0 8px 24px -8px rgba(0,229,255,0.4);
    transition: transform 0.1s ease, box-shadow 0.2s ease, opacity 0.15s ease; white-space: nowrap;
  }
  button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 30px -8px rgba(0,229,255,0.55); }
  button:disabled { opacity: 0.6; cursor: default; transform: none; }
  .hint { font-size: 0.8rem; color: #475569; margin-top: 0.2rem; }
  .msg { font-size: 0.88rem; margin-top: 0.4rem; min-height: 1.1rem; }
  .msg.err { color: #fca5a5; }
  .msg.ok { color: #6ee7b7; }

  .done { text-align: center; padding: 0.5rem 0; }
  .done .check {
    width: 3rem; height: 3rem; margin: 0 auto 0.7rem;
    display: flex; align-items: center; justify-content: center;
    border-radius: 999px; font-size: 1.5rem; line-height: 1;
    color: #0a1628; background: linear-gradient(135deg, #00e5ff, #0ea5e9);
    box-shadow: 0 0 24px -4px rgba(0,229,255,0.6);
  }
  .done h2 { font-size: 1.3rem; margin: 0 0 0.4rem; color: #e2e8f0; }
  .done p { color: #64748b; margin: 0; font-size: 0.95rem; }

  footer {
    max-width: 76rem; width: 100%; margin: 0 auto;
    padding: 1.5rem; display: flex; justify-content: space-between;
    border-top: 1px solid rgba(0,229,255,0.08);
    color: #334155; font-size: 0.82rem;
  }
  footer a { color: #64748b; }
  footer a:hover { color: #94a3b8; }
  @media (max-width: 520px) { .row { flex-direction: column; } h1 { font-size: 1.55rem; } }
</style>
</head>
<body>
<div class="bg"></div>
<div class="grid-bg"></div>

<nav>
  <a href="https://deploymill.com" class="logo"><span class="logo-mark">dm</span> Deploy Mill</a>
  <div class="links">
    <a href="https://deploymill.com">Home</a>
  </div>
</nav>

<main>
  <div class="card">
    <div id="form-wrap">
      <span class="pill"><span class="ping"></span> Private beta · rolling out slowly</span>
      <h1>Join the <span class="grad">Deploy Mill</span> waitlist</h1>
      <p class="sub">
        We're opening Deploy Mill up a little at a time so we can keep a close eye on
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
  <div>© <span id="yr"></span> Deploy Mill</div>
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
      const base = body.already
        ? "You were already signed up — we've got you."
        : "Thanks! We'll email you the moment the next signups open.";
      const done = document.createElement("div");
      done.className = "done";
      const check = document.createElement("div");
      check.className = "check";
      check.textContent = "✓";
      const h2 = document.createElement("h2");
      h2.textContent = "You're on the list";
      const p1 = document.createElement("p");
      p1.textContent = base;
      const p2 = document.createElement("p");
      p2.style.cssText = "margin-top:0.85rem;font-size:0.88rem;color:#475569;";
      p2.textContent = "Want to jump the line? Spots open sooner for people who reach out directly. If you want it badly enough, you'll find me — track me down on LinkedIn or figure out my email and make your case.";
      done.append(check, h2, p1, p2);
      wrap.replaceChildren(done);
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
