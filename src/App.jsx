import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const USERS = {
  admin: { password: "admin123", role: "Admin", name: "Dr. Sarah Chen", avatar: "SC" },
  analyst: { password: "analyst123", role: "Analyst", name: "James Okafor", avatar: "JO" },
};

const ATTACK_TYPES = [
  { id: "fdia", label: "False Data Injection", icon: "⚡", color: "#ef4444", desc: "Injects falsified measurements into PMU data stream" },
  { id: "replay", label: "Replay Attack", icon: "🔄", color: "#f97316", desc: "Retransmits previously captured valid PMU packets" },
  { id: "mitm", label: "Man-in-the-Middle", icon: "👤", color: "#a855f7", desc: "Intercepts and alters PMU communication channel" },
  { id: "timestamp", label: "Timestamp Manipulation", icon: "🕐", color: "#eab308", desc: "Corrupts GPS-synchronized timestamps in PMU data" },
  { id: "packet", label: "Packet Loss Attack", icon: "📦", color: "#06b6d4", desc: "Deliberately drops or delays PMU data packets" },
  { id: "dos", label: "Denial of Service", icon: "🌊", color: "#ff2d55", desc: "Floods PMU network, disrupting communication & availability" },
];

const COLORS = { normal: "#10b981", suspicious: "#f59e0b", attack: "#ef4444" };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700&family=Share+Tech+Mono&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#060d1a;}
@keyframes pulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.8;transform:scale(1.5)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes scanLine{0%{top:-5%}100%{top:105%}}
@keyframes toastIn{from{opacity:0;transform:translateX(120%)}to{opacity:1;transform:translateX(0)}}
@keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(120%)}}
@keyframes dos-flood{0%{opacity:.2}50%{opacity:1}100%{opacity:.2}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0f172a}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:4px}
.grid-bg{background-image:linear-gradient(rgba(59,130,246,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.05) 1px,transparent 1px);background-size:40px 40px;}
.nav-btn{width:100%;display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;border:none;cursor:pointer;font-size:12px;text-align:left;transition:all .15s;white-space:nowrap;overflow:hidden;}
.nav-btn:hover{background:rgba(59,130,246,.12);color:#93c5fd;}
.login-input{width:100%;background:rgba(15,23,42,.8);border:1px solid rgba(99,179,237,.25);border-radius:8px;padding:10px 14px;color:#e2e8f0;font-size:14px;outline:none;transition:border-color .2s;}
.login-input:focus{border-color:rgba(59,130,246,.6);}
.card{background:rgba(15,23,42,.7);border:1px solid rgba(99,179,237,.15);border-radius:12px;padding:16px 20px;backdrop-filter:blur(10px);}
.card-glow{background:rgba(15,23,42,.8);border:1px solid rgba(59,130,246,.3);border-radius:12px;padding:16px 20px;}
.btn-primary{border:none;border-radius:8px;padding:10px 18px;color:#fff;font-weight:600;cursor:pointer;font-size:13px;letter-spacing:.05em;transition:all .2s;}
.btn-primary:hover{filter:brightness(1.15);transform:translateY(-1px);}
.drill-btn{background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);border-radius:8px;padding:6px 14px;color:#60a5fa;font-size:11px;cursor:pointer;transition:all .2s;}
.drill-btn:hover{background:rgba(59,130,246,.2);}
.tab-btn{padding:7px 16px;border-radius:6px;border:none;cursor:pointer;font-size:11px;font-weight:600;transition:all .15s;}
.filter-btn{padding:7px 14px;border-radius:8px;cursor:pointer;font-size:11px;transition:all .15s;}
@media(max-width:768px){
  .sidebar-desktop{display:none!important;}
  .main-content{max-width:100vw!important;padding:12px!important;}
  .responsive-grid-4{grid-template-columns:repeat(2,1fr)!important;}
  .responsive-grid-3{grid-template-columns:repeat(1,1fr)!important;}
  .responsive-grid-2{grid-template-columns:1fr!important;}
  .topbar{flex-wrap:wrap;gap:8px!important;}
}
@media(min-width:769px){
  .mobile-drawer{display:none!important;}
}
`;

// ── DATA GENERATORS ────────────────────────────────────────────────────────────
function genNormal(i = 0) {
  const t = Date.now() + i * 100;
  return {
    id: t,
    timestamp: new Date(t).toISOString().replace("T", " ").slice(0, 19),
    voltage: +(230 + (Math.random() - 0.5) * 4).toFixed(3),
    current: +(10 + (Math.random() - 0.5) * 0.8).toFixed(3),
    frequency: +(50 + (Math.random() - 0.5) * 0.05).toFixed(4),
    phaseAngle: +(0 + (Math.random() - 0.5) * 2).toFixed(3),
    status: "Normal", confidence: +(92 + Math.random() * 7).toFixed(1),
    availability: 100,
  };
}

function genAttacked(type, severity) {
  const base = genNormal();
  const m = severity === "low" ? 1.15 : severity === "medium" ? 1.4 : severity === "high" ? 1.8 : 2.3;
  if (type === "fdia") { base.voltage = +(base.voltage * m).toFixed(3); base.current = +(base.current * m * .9).toFixed(3); }
  else if (type === "replay") { base.timestamp = new Date(Date.now() - 30000).toISOString().replace("T", " ").slice(0, 19); base.phaseAngle = +(base.phaseAngle + 15 * (m - 1)).toFixed(3); }
  else if (type === "mitm") { base.voltage = +(base.voltage * (2 - m)).toFixed(3); base.current = +(base.current * m).toFixed(3); base.phaseAngle = +(base.phaseAngle + 30 * (m - 1)).toFixed(3); }
  else if (type === "timestamp") { base.timestamp = new Date(Date.now() + 999999).toISOString().replace("T", " ").slice(0, 19); base.frequency = +(base.frequency + 0.5 * (m - 1)).toFixed(4); }
  else if (type === "packet") { base.voltage = null; base.current = null; base.availability = Math.round(30 + Math.random() * 30); }
  else if (type === "dos") {
    base.voltage = Math.random() > 0.4 ? null : +(base.voltage * (1 + (Math.random() - .5) * .5)).toFixed(3);
    base.current = Math.random() > 0.4 ? null : base.current;
    base.frequency = +(base.frequency + (Math.random() - .5) * 0.8).toFixed(4);
    base.availability = Math.round(5 + Math.random() * 20);
    base.delay = Math.round(500 + Math.random() * 2000);
  }
  base.status = severity === "low" ? "Suspicious" : "Attack Detected";
  base.confidence = +(55 + Math.random() * 30).toFixed(1);
  base.attackType = type;
  return base;
}

function seedHistory() {
  return Array.from({ length: 60 }, (_, i) => genNormal(-(59 - i) * 10));
}

// ── STYLE HELPERS ──────────────────────────────────────────────────────────────
const S = {
  card: { background: "rgba(15,23,42,.7)", border: "1px solid rgba(99,179,237,.15)", borderRadius: 12, padding: "16px 20px" },
  cardGlow: { background: "rgba(15,23,42,.8)", border: "1px solid rgba(59,130,246,.3)", borderRadius: 12, padding: "16px 20px" },
  badge: c => ({ background: c + "22", color: c, border: `1px solid ${c}44`, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", display: "inline-block" }),
  statCard: accent => ({ background: "rgba(15,23,42,.7)", border: `1px solid ${accent}33`, borderRadius: 10, padding: "12px 16px", borderLeft: `3px solid ${accent}` }),
};

const TT = { contentStyle: { background: "#0f172a", border: "1px solid rgba(59,130,246,.3)", borderRadius: 8, color: "#e2e8f0", fontSize: 11 } };

function Badge({ status }) {
  const c = status === "Normal" ? "#10b981" : status === "Suspicious" ? "#f59e0b" : "#ef4444";
  return <span style={S.badge(c)}>{status}</span>;
}
function PulsingDot({ color, size = 10 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, animation: "pulse 2s infinite", opacity: .5 }} />
      <span style={{ position: "absolute", inset: 1, borderRadius: "50%", background: color }} />
    </span>
  );
}
function Spinner() { return <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin .7s linear infinite" }} />; }

// ── TOAST SYSTEM ───────────────────────────────────────────────────────────────
function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.type === "error" ? "rgba(239,68,68,.95)" : t.type === "warning" ? "rgba(245,158,11,.95)" : t.type === "attack" ? "rgba(255,45,85,.95)" : "rgba(16,185,129,.95)", color: "#fff", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 600, maxWidth: 320, animation: "toastIn .35s ease", display: "flex", gap: 10, alignItems: "center", pointerEvents: "all", boxShadow: "0 8px 32px rgba(0,0,0,.4)" }}>
          <span style={{ fontSize: 16 }}>{t.type === "error" ? "❌" : t.type === "warning" ? "⚠️" : t.type === "attack" ? "🚨" : "✅"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── LOGIN ──────────────────────────────────────────────────────────────────────
function Login({ onLogin, addToast }) {
  const [username, setUsername] = useState("admin");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const submit = () => {
    if (!pass) { setErr("Please enter your password"); return; }
    setLoading(true); setErr("");
    setTimeout(() => {
      const u = USERS[username];
      if (u && u.password === pass) {
        if (remember) localStorage.setItem("cg_user", username);
        onLogin({ username, ...u });
      } else { setErr("Invalid credentials — try admin/admin123"); setLoading(false); }
    }, 900);
  };

  const sendForgot = () => {
    if (!forgotEmail) return;
    addToast("Password reset link sent (demo only)", "success");
    setForgotMode(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060d1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Exo 2', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      <div className="grid-bg" style={{ position: "absolute", inset: 0, opacity: .5 }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 60%,rgba(30,58,138,.4) 0%,transparent 55%),radial-gradient(ellipse at 80% 20%,rgba(124,58,237,.2) 0%,transparent 50%)" }} />
      {/* Scan line */}
      <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(59,130,246,.4),transparent)", animation: "scanLine 4s linear infinite", pointerEvents: "none" }} />

      <div className="card-glow" style={{ width: "min(420px,95vw)", position: "relative", animation: "fadeIn .6s ease" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(59,130,246,.6))" }}>🛡️</div>
          <h1 style={{ color: "#60a5fa", fontFamily: "'Share Tech Mono', monospace", fontSize: 17, letterSpacing: ".18em", margin: 0 }}>CYBERGUARD PMU</h1>
          <p style={{ color: "#475569", fontSize: 10, letterSpacing: ".22em", marginTop: 5 }}>AI-DRIVEN CYBERSECURITY FRAMEWORK</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 10 }}>
            <PulsingDot color="#10b981" size={8} />
            <span style={{ color: "#10b981", fontSize: 10, letterSpacing: ".1em" }}>SYSTEM ONLINE — SECURE</span>
          </div>
        </div>

        {!forgotMode ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", display: "block", marginBottom: 6 }}>USER ROLE</label>
              <select className="login-input" value={username} onChange={e => setUsername(e.target.value)} style={{ fontFamily: "inherit" }}>
                <option value="admin" style={{ background: "#0f172a" }}>👑 Admin — Dr. Sarah Chen</option>
                <option value="analyst" style={{ background: "#0f172a" }}>🔍 Analyst — James Okafor</option>
              </select>
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", display: "block", marginBottom: 6 }}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input className="login-input" type={showPass ? "text" : "password"} placeholder="Enter password…" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ paddingRight: 44 }} />
                <button onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: showPass ? "#60a5fa" : "#475569", fontSize: 16, padding: 2, transition: "color .2s", lineHeight: 1 }} title={showPass ? "Hide password" : "Show password"}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#64748b", fontSize: 12 }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: "#3b82f6" }} />
                Remember me
              </label>
              <button onClick={() => setForgotMode(true)} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Forgot password?</button>
            </div>
            {err && <p style={{ color: "#f87171", fontSize: 12, textAlign: "center", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "8px" }}>{err}</p>}
            <button className="btn-primary" onClick={submit} disabled={loading} style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)", fontSize: 14, padding: 13, letterSpacing: ".1em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? <><Spinner /> AUTHENTICATING…</> : "🔐 SECURE LOGIN"}
            </button>
            <p style={{ color: "#334155", fontSize: 11, textAlign: "center" }}>Demo: admin / admin123 · analyst / analyst123</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .3s" }}>
            <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center" }}>Enter your email to receive a reset link</p>
            <input className="login-input" type="email" placeholder="your@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            <button className="btn-primary" onClick={sendForgot} style={{ background: "linear-gradient(135deg,#0369a1,#0e7490)", padding: 12 }}>📧 Send Reset Link</button>
            <button onClick={() => setForgotMode(false)} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 12, cursor: "pointer" }}>← Back to Login</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SIDEBAR ────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", icon: "📊", label: "Analytics Dashboard" },
  { id: "analyst", icon: "🔍", label: "Analyst Dashboard" },
  { id: "monitoring", icon: "📡", label: "PMU Monitoring" },
  { id: "attack", icon: "⚔️", label: "Attack Simulation" },
  { id: "detection", icon: "🤖", label: "AI Detection" },
  { id: "security", icon: "🔐", label: "Security Center" },
  { id: "model", icon: "📈", label: "Model Performance" },
  { id: "reports", icon: "📋", label: "Reports" },
];

function Sidebar({ page, setPage, user, onLogout, threatLevel, collapsed, setCollapsed }) {
  const tlColor = threatLevel === "Critical" ? "#ef4444" : threatLevel === "Warning" ? "#f59e0b" : "#10b981";
  const w = collapsed ? 58 : 220;

  const go = (id) => { setPage(id); };

  return (
    <div style={{ width: w, minHeight: "100vh", background: "rgba(6,13,26,.97)", borderRight: "1px solid rgba(59,130,246,.15)", display: "flex", flexDirection: "column", flexShrink: 0, transition: "width .25s cubic-bezier(.4,0,.2,1)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: collapsed ? "16px 10px" : "18px 14px 14px", borderBottom: "1px solid rgba(59,130,246,.1)", display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "space-between" }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <div style={{ color: "#60a5fa", fontSize: 12, fontWeight: 700, letterSpacing: ".1em", whiteSpace: "nowrap" }}>CyberGuard</div>
              <div style={{ color: "#334155", fontSize: 9, letterSpacing: ".15em", whiteSpace: "nowrap" }}>PMU FRAMEWORK</div>
            </div>
          </div>
        )}
        {collapsed && <span style={{ fontSize: 20 }}>🛡️</span>}
        <button onClick={() => setCollapsed(c => !c)} style={{ background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 6, padding: "5px 7px", cursor: "pointer", color: "#60a5fa", fontSize: 14, lineHeight: 1, flexShrink: 0 }} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? "☰" : "✕"}
        </button>
      </div>

      {/* User */}
      {!collapsed && (
        <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(59,130,246,.08)" }}>
          <div style={{ background: "rgba(15,23,42,.8)", borderRadius: 8, padding: "8px 10px", border: "1px solid rgba(59,130,246,.12)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(59,130,246,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#60a5fa", flexShrink: 0 }}>{user.avatar}</div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <span style={{ ...S.badge("#60a5fa"), fontSize: 9 }}>{user.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
        {NAV.map(n => (
          <button key={n.id} className="nav-btn" onClick={() => go(n.id)} title={collapsed ? n.label : ""} style={{ marginBottom: 2, background: page === n.id ? "rgba(59,130,246,.2)" : "transparent", color: page === n.id ? "#60a5fa" : "#64748b", borderLeft: page === n.id ? "2px solid #3b82f6" : "2px solid transparent", fontWeight: page === n.id ? 600 : 400, justifyContent: collapsed ? "center" : "flex-start" }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{n.icon}</span>
            {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>}
          </button>
        ))}
      </div>

      {/* Threat + Logout */}
      <div style={{ padding: collapsed ? "10px 8px" : "12px 14px", borderTop: "1px solid rgba(59,130,246,.1)" }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <PulsingDot color={tlColor} size={8} />
            <span style={{ color: tlColor, fontSize: 10, fontWeight: 600, letterSpacing: ".08em" }}>THREAT: {threatLevel.toUpperCase()}</span>
          </div>
        )}
        <button onClick={onLogout} title="Logout" style={{ width: "100%", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.18)", borderRadius: 8, padding: collapsed ? "8px 0" : "8px", color: "#f87171", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: collapsed ? 0 : 6 }}>
          🚪{!collapsed && " Logout"}
        </button>
      </div>
    </div>
  );
}

// ── MOBILE DRAWER ──────────────────────────────────────────────────────────────
function MobileDrawer({ open, page, setPage, user, onLogout, threatLevel, onClose }) {
  const tlColor = threatLevel === "Critical" ? "#ef4444" : threatLevel === "Warning" ? "#f59e0b" : "#10b981";
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 240, background: "#060d1a", borderRight: "1px solid rgba(59,130,246,.2)", zIndex: 201, display: "flex", flexDirection: "column", animation: "slideIn .25s ease" }}>
        <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid rgba(59,130,246,.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <span style={{ color: "#60a5fa", fontSize: 13, fontWeight: 700, letterSpacing: ".08em" }}>CyberGuard</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
          {NAV.map(n => (
            <button key={n.id} className="nav-btn" onClick={() => { setPage(n.id); onClose(); }} style={{ marginBottom: 3, background: page === n.id ? "rgba(59,130,246,.2)" : "transparent", color: page === n.id ? "#60a5fa" : "#94a3b8", borderLeft: page === n.id ? "2px solid #3b82f6" : "2px solid transparent", fontWeight: page === n.id ? 600 : 400 }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span> {n.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "12px", borderTop: "1px solid rgba(59,130,246,.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <PulsingDot color={tlColor} size={8} />
            <span style={{ color: tlColor, fontSize: 10, fontWeight: 600 }}>THREAT: {threatLevel.toUpperCase()}</span>
          </div>
          <button onClick={onLogout} style={{ width: "100%", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.18)", borderRadius: 8, padding: "8px", color: "#f87171", fontSize: 12, cursor: "pointer" }}>🚪 Logout</button>
        </div>
      </div>
    </>
  );
}

// ── PMU MONITORING ─────────────────────────────────────────────────────────────
function PMUMonitoring({ data }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const filtered = data.filter(r => (filter === "All" || r.status === filter) && (!search || r.timestamp.includes(search) || r.status.toLowerCase().includes(search.toLowerCase())));

  const stats = [
    { label: "Total", val: data.length, color: "#3b82f6" },
    { label: "Normal", val: data.filter(d => d.status === "Normal").length, color: "#10b981" },
    { label: "Suspicious", val: data.filter(d => d.status === "Suspicious").length, color: "#f59e0b" },
    { label: "Attacks", val: data.filter(d => d.status === "Attack Detected").length, color: "#ef4444" },
  ];

  return (
    <div style={{ animation: "fadeIn .4s" }}>
      <h2 style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, marginBottom: 18 }}>📡 PMU Data Monitoring</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }} className="responsive-grid-4">
        {stats.map(s => <div key={s.label} style={S.statCard(s.color)}><div style={{ color: "#64748b", fontSize: 10, letterSpacing: ".1em" }}>{s.label.toUpperCase()}</div><div style={{ color: s.color, fontSize: 26, fontWeight: 700 }}>{s.val}</div></div>)}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records…" style={{ background: "rgba(15,23,42,.8)", border: "1px solid rgba(99,179,237,.2)", borderRadius: 8, padding: "7px 12px", color: "#e2e8f0", fontSize: 12, outline: "none", width: 180 }} />
        {["All", "Normal", "Suspicious", "Attack Detected"].map(f => (
          <button key={f} className="filter-btn" onClick={() => setFilter(f)} style={{ border: "1px solid", borderColor: filter === f ? "#3b82f6" : "rgba(99,179,237,.2)", background: filter === f ? "rgba(59,130,246,.2)" : "transparent", color: filter === f ? "#60a5fa" : "#64748b", fontWeight: filter === f ? 600 : 400 }}>{f}</button>
        ))}
      </div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(59,130,246,.2)" }}>
              {["Timestamp", "Voltage (V)", "Current (A)", "Frequency (Hz)", "Phase (°)", "Avail %", "Status", "Confidence"].map(h => <th key={h} style={{ color: "#60a5fa", fontWeight: 600, padding: "10px 12px", textAlign: "left", fontSize: 11, letterSpacing: ".05em", whiteSpace: "nowrap" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(-40).reverse().map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid rgba(30,41,59,.5)", background: i % 2 === 0 ? "rgba(15,23,42,.3)" : "transparent" }}>
                <td style={{ padding: "7px 12px", color: "#94a3b8", fontFamily: "monospace", whiteSpace: "nowrap" }}>{r.timestamp}</td>
                <td style={{ padding: "7px 12px", color: r.voltage == null ? "#475569" : (r.voltage > 235 || r.voltage < 225) ? "#f59e0b" : "#e2e8f0" }}>{r.voltage ?? "—"}</td>
                <td style={{ padding: "7px 12px", color: r.current == null ? "#475569" : "#e2e8f0" }}>{r.current ?? "—"}</td>
                <td style={{ padding: "7px 12px", color: Math.abs((r.frequency ?? 50) - 50) > 0.1 ? "#f59e0b" : "#e2e8f0" }}>{r.frequency}</td>
                <td style={{ padding: "7px 12px", color: Math.abs(r.phaseAngle ?? 0) > 5 ? "#f59e0b" : "#e2e8f0" }}>{r.phaseAngle}</td>
                <td style={{ padding: "7px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ height: 4, width: 40, borderRadius: 2, background: "rgba(30,41,59,.8)" }}><div style={{ height: "100%", borderRadius: 2, background: (r.availability ?? 100) > 70 ? "#10b981" : "#ef4444", width: `${r.availability ?? 100}%` }} /></div>
                    <span style={{ color: "#94a3b8", fontSize: 10 }}>{r.availability ?? 100}%</span>
                  </div>
                </td>
                <td style={{ padding: "7px 12px" }}><Badge status={r.status} /></td>
                <td style={{ padding: "7px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ height: 4, flex: 1, borderRadius: 2, background: "rgba(30,41,59,.8)", minWidth: 40 }}><div style={{ height: "100%", borderRadius: 2, background: r.confidence > 80 ? "#10b981" : r.confidence > 60 ? "#f59e0b" : "#ef4444", width: `${r.confidence}%` }} /></div>
                    <span style={{ color: "#94a3b8", minWidth: 32, textAlign: "right", fontSize: 10 }}>{r.confidence}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ATTACK SIMULATION ──────────────────────────────────────────────────────────
function AttackSimulation({ onAttack, lastAttack }) {
  const [sel, setSel] = useState(null);
  const [sev, setSev] = useState("medium");
  const [running, setRunning] = useState(false);
  const [dosStatus, setDosStatus] = useState(null);

  const execute = () => {
    if (!sel) return;
    setRunning(true);
    if (sel === "dos") {
      setDosStatus("flooding");
      setTimeout(() => setDosStatus("disrupted"), 800);
      setTimeout(() => setDosStatus("recovering"), 2500);
      setTimeout(() => { setDosStatus(null); setRunning(false); }, 4000);
    } else {
      setTimeout(() => setRunning(false), 2000);
    }
    onAttack(sel, sev);
  };

  const sevColors = { low: "#10b981", medium: "#f59e0b", high: "#ef4444", critical: "#ff2d55" };
  const sevLevels = sel === "dos" ? ["low", "medium", "high", "critical"] : ["low", "medium", "high"];
  const selInfo = ATTACK_TYPES.find(a => a.id === sel);

  return (
    <div style={{ animation: "fadeIn .4s" }}>
      <h2 style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, marginBottom: 18 }}>⚔️ Cyberattack Simulation</h2>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }} className="responsive-grid-2">
        <div>
          <p style={{ color: "#64748b", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>SELECT ATTACK TYPE</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ATTACK_TYPES.map(a => (
              <div key={a.id} onClick={() => setSel(a.id)} style={{ ...S.card, cursor: "pointer", border: sel === a.id ? `1px solid ${a.color}66` : "1px solid rgba(99,179,237,.1)", background: sel === a.id ? `${a.color}11` : "rgba(15,23,42,.5)", padding: "11px 14px", transition: "all .2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: sel === a.id ? a.color : "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{a.label}</span>
                      {a.id === "dos" && <span style={{ ...S.badge("#ff2d55"), fontSize: 9 }}>NEW</span>}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{a.desc}</div>
                  </div>
                  {sel === a.id && <span style={{ color: a.color, fontSize: 16 }}>✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p style={{ color: "#64748b", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>CONFIGURATION</p>
          <div className="card" style={{ marginBottom: 12 }}>
            <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 10 }}>SEVERITY LEVEL</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {sevLevels.map(s => (
                <button key={s} onClick={() => setSev(s)} style={{ flex: 1, minWidth: 60, padding: "9px 4px", borderRadius: 8, border: `1px solid ${sev === s ? sevColors[s] : "rgba(99,179,237,.15)"}`, background: sev === s ? `${sevColors[s]}22` : "transparent", color: sev === s ? sevColors[s] : "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "uppercase", letterSpacing: ".08em" }}>{s}</button>
              ))}
            </div>

            {selInfo && (
              <div style={{ background: "rgba(15,23,42,.6)", borderRadius: 8, padding: "10px 12px", margin: "14px 0", border: `1px solid ${selInfo.color}22` }}>
                <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>SELECTED ATTACK</div>
                <div style={{ color: selInfo.color, fontWeight: 700, fontSize: 14 }}>{selInfo.icon} {selInfo.label}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{selInfo.desc}</div>
              </div>
            )}

            {/* DoS special visualizer */}
            {sel === "dos" && dosStatus && (
              <div style={{ background: "rgba(255,45,85,.07)", border: "1px solid rgba(255,45,85,.25)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                <div style={{ color: "#ff2d55", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                  {dosStatus === "flooding" && "🌊 FLOODING NETWORK…"}
                  {dosStatus === "disrupted" && "💥 COMMUNICATION DISRUPTED"}
                  {dosStatus === "recovering" && "🔄 SYSTEM RECOVERING…"}
                </div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: dosStatus === "disrupted" ? "#ef4444" : dosStatus === "recovering" ? (i < 10 ? "#10b981" : "#ef4444") : "#ff2d55", animation: `dos-flood ${.3 + Math.random() * .5}s infinite`, animationDelay: `${i * .05}s` }} />
                  ))}
                </div>
                {dosStatus !== "flooding" && <div style={{ color: "#64748b", fontSize: 10, marginTop: 6 }}>Packet TX failures · Avg delay: {sev === "critical" ? "2400ms" : sev === "high" ? "1200ms" : "600ms"}</div>}
              </div>
            )}

            <button onClick={execute} disabled={!sel || running} style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: !sel ? "#1e293b" : running ? "#374151" : `linear-gradient(135deg,${selInfo?.color || "#dc2626"},${selInfo?.color + "aa" || "#b91c1c"})`, color: !sel ? "#475569" : "#fff", fontSize: 13, fontWeight: 700, cursor: !sel ? "not-allowed" : "pointer", letterSpacing: ".08em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {running ? <><Spinner /> EXECUTING…</> : "🚨 EXECUTE ATTACK"}
            </button>
          </div>

          {lastAttack && (
            <div className="card" style={{ border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.04)" }}>
              <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>⚠ LAST EXECUTED</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                {[["Type", ATTACK_TYPES.find(a => a.id === lastAttack.type)?.label], ["Severity", lastAttack.severity], ["Records", lastAttack.count + " injected"], ["Time", lastAttack.time]].map(([k, v]) => (
                  <div key={k}><span style={{ color: "#64748b" }}>{k}: </span><span style={{ color: "#e2e8f0", fontWeight: 600 }}>{v}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DRILL-DOWN PAGE ────────────────────────────────────────────────────────────
function DrillDown({ metric, data, onBack }) {
  const [range, setRange] = useState("all");
  const cfg = {
    voltage: { label: "Voltage", unit: "V", color: "#3b82f6", key: "voltage", normal: 230 },
    frequency: { label: "Frequency", unit: "Hz", color: "#10b981", key: "frequency", normal: 50 },
    phaseAngle: { label: "Phase Angle", unit: "°", color: "#a855f7", key: "phaseAngle", normal: 0 },
    current: { label: "Current", unit: "A", color: "#f59e0b", key: "current", normal: 10 },
  }[metric] || { label: metric, unit: "", color: "#60a5fa", key: metric, normal: 0 };

  const sliced = range === "last20" ? data.slice(-20) : range === "last50" ? data.slice(-50) : data;
  const vals = sliced.map(d => d[cfg.key]).filter(v => v != null);
  const avg = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3) : 0;
  const max = vals.length ? +Math.max(...vals).toFixed(3) : 0;
  const min = vals.length ? +Math.min(...vals).toFixed(3) : 0;
  const stdDev = vals.length ? +(Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length)).toFixed(4) : 0;
  const anomalies = sliced.filter(d => d.status !== "Normal").length;

  const chartData = sliced.map((r, i) => ({ i, value: r[cfg.key], status: r.status }));

  const exportCSV = () => {
    const csv = ["Index,Value,Status", ...chartData.map(r => `${r.i},${r.value},${r.status}`)].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${cfg.label}_data.csv`; a.click();
  };

  return (
    <div style={{ animation: "fadeIn .3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} className="drill-btn">← Back to Dashboard</button>
        <h2 style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, margin: 0 }}>{cfg.label} Trend Analysis</h2>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["last20", "last50", "all"].map(r => (
            <button key={r} className="tab-btn" onClick={() => setRange(r)} style={{ background: range === r ? "rgba(59,130,246,.25)" : "rgba(15,23,42,.6)", border: `1px solid ${range === r ? "#3b82f6" : "rgba(99,179,237,.15)"}`, color: range === r ? "#60a5fa" : "#64748b" }}>
              {r === "last20" ? "Last 20" : r === "last50" ? "Last 50" : "All"}
            </button>
          ))}
          <button className="drill-btn" onClick={exportCSV}>📥 CSV</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 18 }} className="responsive-grid-4">
        {[["Average", avg, cfg.unit], ["Maximum", max, cfg.unit], ["Minimum", min, cfg.unit], ["Std Dev", stdDev, ""], ["Anomalies", anomalies, ""]].map(([l, v, u]) => (
          <div key={l} style={S.statCard(cfg.color)}>
            <div style={{ color: "#64748b", fontSize: 10, letterSpacing: ".08em" }}>{l.toUpperCase()}</div>
            <div style={{ color: cfg.color, fontSize: 20, fontWeight: 700 }}>{v}{u}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 12 }}>INTERACTIVE {cfg.label.toUpperCase()} CHART</div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cfg.color} stopOpacity={.3} />
                <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,.5)" />
            <XAxis dataKey="i" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 10 }} width={55} />
            <Tooltip {...TT} formatter={(v) => [`${v} ${cfg.unit}`, cfg.label]} />
            <Area type="monotone" dataKey="value" stroke={cfg.color} fill="url(#dg)" strokeWidth={2} dot={false} name={cfg.label} />
            <Line type="monotone" dataKey={() => cfg.normal} stroke="rgba(255,255,255,.2)" strokeDasharray="4 4" dot={false} name="Baseline" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>ANOMALY DETECTION RESULTS</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["Normal", "Suspicious", "Attack Detected"].map(s => {
            const c = s === "Normal" ? "#10b981" : s === "Suspicious" ? "#f59e0b" : "#ef4444";
            const cnt = sliced.filter(d => d.status === s).length;
            return <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${c}11`, border: `1px solid ${c}33`, borderRadius: 8 }}><PulsingDot color={c} size={8} /><span style={{ color: c, fontWeight: 600, fontSize: 13 }}>{cnt}</span><span style={{ color: "#64748b", fontSize: 11 }}>{s}</span></div>
          })}
        </div>
      </div>
    </div>
  );
}

// ── ANALYTICS DASHBOARD ────────────────────────────────────────────────────────
function AnalyticsDashboard({ data, threatLevel, systemHealth, setDrill }) {
  const recent = data.slice(-60);
  const chartData = recent.map((r, i) => ({ i, voltage: r.voltage, current: r.current, frequency: r.frequency, phaseAngle: r.phaseAngle }));
  const tlColor = threatLevel === "Critical" ? "#ef4444" : threatLevel === "Warning" ? "#f59e0b" : "#10b981";
  const attackDist = ATTACK_TYPES.map(a => ({ name: a.label.split(" ")[0], count: data.filter(d => d.attackType === a.id).length })).filter(a => a.count > 0);

  const kpis = [
    { label: "System Health", val: `${systemHealth}%`, color: systemHealth > 70 ? "#10b981" : systemHealth > 40 ? "#f59e0b" : "#ef4444", icon: "💚" },
    { label: "Threat Level", val: threatLevel, color: tlColor, icon: "⚠️" },
    { label: "Total Records", val: data.length, color: "#3b82f6", icon: "📊" },
    { label: "Attacks", val: data.filter(d => d.status === "Attack Detected").length, color: "#ef4444", icon: "🚨" },
  ];

  const ChartCard = ({ title, metric, color, children }) => (
    <div className="card" style={{ cursor: "pointer", transition: "border-color .2s" }} onClick={() => setDrill(metric)} title={`Click to drill down into ${title}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em" }}>{title.toUpperCase()}</div>
        <span className="drill-btn" style={{ fontSize: 10, padding: "3px 8px" }}>🔍 Detail</span>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ animation: "fadeIn .4s" }}>
      <h2 style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, marginBottom: 18 }}>📊 Analytics Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }} className="responsive-grid-4">
        {kpis.map(s => (
          <div key={s.label} style={S.statCard(s.color)}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ color: "#64748b", fontSize: 10, letterSpacing: ".08em" }}>{s.label.toUpperCase()}</div><div style={{ color: s.color, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{s.val}</div></div>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="responsive-grid-2">
        <ChartCard title="Voltage Trend (V)" metric="voltage">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}><defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,.4)" /><XAxis dataKey="i" hide /><YAxis domain={["auto","auto"]} tick={{ fill:"#64748b",fontSize:10 }} width={40} /><Tooltip {...TT} /><Area type="monotone" dataKey="voltage" stroke="#3b82f6" fill="url(#vg)" strokeWidth={1.5} dot={false} /></AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Frequency Trend (Hz)" metric="frequency">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,.4)" /><XAxis dataKey="i" hide /><YAxis domain={["auto","auto"]} tick={{ fill:"#64748b",fontSize:10 }} width={45} /><Tooltip {...TT} /><Area type="monotone" dataKey="frequency" stroke="#10b981" fill="url(#fg)" strokeWidth={1.5} dot={false} /></AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Phase Angle Trend (°)" metric="phaseAngle">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,.4)" /><XAxis dataKey="i" hide /><YAxis tick={{ fill:"#64748b",fontSize:10 }} width={40} /><Tooltip {...TT} /><Line type="monotone" dataKey="phaseAngle" stroke="#a855f7" strokeWidth={1.5} dot={false} /></LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Current Trend (A)" metric="current">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,.4)" /><XAxis dataKey="i" hide /><YAxis domain={["auto","auto"]} tick={{ fill:"#64748b",fontSize:10 }} width={40} /><Tooltip {...TT} /><Area type="monotone" dataKey="current" stroke="#f59e0b" fill="url(#cg)" strokeWidth={1.5} dot={false} /></AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="card">
        <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>ATTACK DISTRIBUTION</div>
        {attackDist.length === 0 ? (
          <div style={{ color: "#10b981", fontSize: 13, padding: "20px 0", textAlign: "center" }}>✅ No attacks detected — System Secure</div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={attackDist}><CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,.4)" /><XAxis dataKey="name" tick={{ fill:"#64748b",fontSize:10 }} /><YAxis tick={{ fill:"#64748b",fontSize:10 }} /><Tooltip {...TT} /><Bar dataKey="count" fill="#ef4444" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── ANALYST DASHBOARD ──────────────────────────────────────────────────────────
function AnalystDashboard({ data, alerts, systemHealth, threatLevel }) {
  const tlColor = threatLevel === "Critical" ? "#ef4444" : threatLevel === "Warning" ? "#f59e0b" : "#10b981";
  const recent = data.slice(-30);
  const chartData = recent.map((r, i) => ({ i, voltage: r.voltage, frequency: r.frequency, current: r.current, phaseAngle: r.phaseAngle }));

  const total = data.length;
  const tp = data.filter(d => d.status !== "Normal").length;
  const tn = total - tp;
  const fp = Math.max(0, Math.floor(tn * 0.03));
  const fn = Math.max(0, Math.floor(tp * 0.05));
  const accuracy = total > 0 ? +(((tp + tn - fp - fn) / total) * 100).toFixed(1) : 97.2;
  const precision = tp > 0 ? +((tp / (tp + fp)) * 100).toFixed(1) : 96.8;
  const recall = tp > 0 ? +((tp / (tp + fn)) * 100).toFixed(1) : 95.1;
  const f1 = precision + recall > 0 ? +((2 * precision * recall) / (precision + recall)).toFixed(1) : 96.0;

  const radarData = [
    { metric: "Accuracy", val: accuracy }, { metric: "Precision", val: precision },
    { metric: "Recall", val: recall }, { metric: "F1", val: f1 }, { metric: "Health", val: systemHealth },
  ];

  return (
    <div style={{ animation: "fadeIn .4s" }}>
      <h2 style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, marginBottom: 18 }}>🔍 Analyst Dashboard</h2>

      {/* Overview KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }} className="responsive-grid-3">
        {[
          { label: "System Health", val: `${systemHealth}%`, color: systemHealth > 70 ? "#10b981" : "#f59e0b", icon: "💪" },
          { label: "Threat Level", val: threatLevel, color: tlColor, icon: "🛡️" },
          { label: "Active Alerts", val: alerts.length, color: alerts.length > 0 ? "#ef4444" : "#10b981", icon: "🔔" },
          { label: "Total Records", val: total, color: "#3b82f6", icon: "📋" },
          { label: "Attacks Detected", val: data.filter(d => d.status === "Attack Detected").length, color: "#ef4444", icon: "🚨" },
          { label: "PMU Status", val: "ONLINE", color: "#10b981", icon: "📡" },
        ].map(s => (
          <div key={s.label} style={S.statCard(s.color)}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ color: "#64748b", fontSize: 10 }}>{s.label.toUpperCase()}</div><div style={{ color: s.color, fontSize: 20, fontWeight: 700, marginTop: 3 }}>{s.val}</div></div>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="responsive-grid-2">
        {/* Real-time monitoring */}
        <div className="card">
          <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>REAL-TIME MONITORING</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,.4)" />
              <XAxis dataKey="i" hide />
              <YAxis yAxisId="v" domain={["auto","auto"]} tick={{ fill:"#64748b",fontSize:9 }} width={38} />
              <YAxis yAxisId="f" orientation="right" domain={["auto","auto"]} tick={{ fill:"#64748b",fontSize:9 }} width={38} />
              <Tooltip {...TT} />
              <Legend formatter={v => <span style={{ color:"#94a3b8",fontSize:10 }}>{v}</span>} />
              <Line yAxisId="v" type="monotone" dataKey="voltage" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Voltage (V)" />
              <Line yAxisId="f" type="monotone" dataKey="frequency" stroke="#10b981" strokeWidth={1.5} dot={false} name="Freq (Hz)" />
              <Line yAxisId="v" type="monotone" dataKey="current" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Current (A)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Radar performance */}
        <div className="card">
          <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>ML MODEL PERFORMANCE RADAR</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(59,130,246,.2)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill:"#64748b",fontSize:10 }} />
              <Radar name="Score" dataKey="val" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.25} />
              <Tooltip {...TT} formatter={v => [`${v}%`, "Score"]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="responsive-grid-2">
        {/* Live attack feed */}
        <div className="card">
          <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>LIVE ATTACK FEED</div>
          {data.filter(d => d.attackType).slice(-8).reverse().map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(30,41,59,.4)", alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>{ATTACK_TYPES.find(a => a.id === r.attackType)?.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 600 }}>{ATTACK_TYPES.find(a => a.id === r.attackType)?.label}</div>
                <div style={{ color: "#475569", fontSize: 10 }}>{r.timestamp}</div>
              </div>
              <Badge status={r.status} />
            </div>
          ))}
          {data.filter(d => d.attackType).length === 0 && <div style={{ color: "#475569", fontSize: 12, padding: "16px 0" }}>No attacks recorded yet</div>}
        </div>

        {/* Performance metrics */}
        <div className="card">
          <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 12 }}>PERFORMANCE METRICS</div>
          {[{ label: "Accuracy", val: accuracy, color: "#10b981" }, { label: "Precision", val: precision, color: "#3b82f6" }, { label: "Recall", val: recall, color: "#a855f7" }, { label: "F1 Score", val: f1, color: "#f59e0b" }].map(m => (
            <div key={m.label} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{m.label}</span>
                <span style={{ color: m.color, fontSize: 12, fontWeight: 700 }}>{m.val}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(30,41,59,.8)" }}>
                <div style={{ height: "100%", borderRadius: 3, background: m.color, width: `${m.val}%`, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI DETECTION ───────────────────────────────────────────────────────────────
function AIDetection({ data }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [history, setHistory] = useState([]);

  const stats = { normal: data.filter(d => d.status === "Normal").length, suspicious: data.filter(d => d.status === "Suspicious").length, attack: data.filter(d => d.status === "Attack Detected").length };

  const runAI = async () => {
    setAnalyzing(true);
    const recent = data.slice(-10);
    const anomalies = recent.filter(r => r.status !== "Normal");
    const prompt = `You are an AI cybersecurity expert analyzing PMU (Phasor Measurement Unit) power grid data.

Recent PMU readings (last 10):
${recent.map(r => `- ${r.timestamp}: V=${r.voltage}V, I=${r.current}A, f=${r.frequency}Hz, φ=${r.phaseAngle}°, Avail=${r.availability ?? 100}%, Status=${r.status}${r.attackType ? `, Attack=${r.attackType}` : ""}${r.delay ? `, Delay=${r.delay}ms` : ""}`).join("\n")}

Anomaly count: ${anomalies.length}/10
Attack types: ${[...new Set(anomalies.map(a => a.attackType).filter(Boolean))].join(", ") || "None"}

Provide a concise SOC analyst report with:
1. THREAT ASSESSMENT
2. ANOMALY PATTERNS  
3. ATTACK CLASSIFICATION (for each detected attack)
4. IMMEDIATE RECOMMENDATIONS
Use professional power-grid cybersecurity terminology.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const d = await res.json();
      const text = d.content?.map(c => c.text || "").join("") || "Analysis unavailable.";
      setAiResponse(text);
      setHistory(p => [{ time: new Date().toLocaleTimeString(), anomalies: anomalies.length, preview: text.slice(0, 70) + "…" }, ...p.slice(0, 4)]);
    } catch {
      setAiResponse(`LOCAL RULE-BASED ANALYSIS\n\nAnomalous records: ${anomalies.length}/10\nAttacks: ${data.filter(d => d.status === "Attack Detected").length} total\nSuspicious: ${data.filter(d => d.status === "Suspicious").length} total\n\nStatus: ${anomalies.length > 3 ? "⚠ ELEVATED THREAT" : "✅ SYSTEM NOMINAL"}`);
      setHistory(p => [{ time: new Date().toLocaleTimeString(), anomalies: anomalies.length, preview: "Local rule-based analysis completed" }, ...p.slice(0, 4)]);
    }
    setAnalyzing(false);
  };

  return (
    <div style={{ animation: "fadeIn .4s" }}>
      <h2 style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, marginBottom: 18 }}>🤖 AI Intrusion Detection</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="responsive-grid-2">
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
            {[{ l: "Normal", c: "#10b981", v: stats.normal }, { l: "Suspicious", c: "#f59e0b", v: stats.suspicious }, { l: "Attacks", c: "#ef4444", v: stats.attack }].map(s => (
              <div key={s.l} style={S.statCard(s.c)}><div style={{ color: "#64748b", fontSize: 10 }}>{s.l.toUpperCase()}</div><div style={{ color: s.c, fontSize: 22, fontWeight: 700 }}>{s.v}</div></div>
            ))}
          </div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 6 }}>CLASSIFICATION</div>
            <div style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: "Normal", value: stats.normal }, { name: "Suspicious", value: stats.suspicious }, { name: "Attack", value: stats.attack }]} cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={3} dataKey="value">
                    {[COLORS.normal, COLORS.suspicious, COLORS.attack].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip {...TT} />
                  <Legend formatter={v => <span style={{ color:"#94a3b8",fontSize:10 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 8 }}>DETECTION HISTORY</div>
            {history.length === 0 ? <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: "14px 0" }}>Run AI analysis to see history</div> :
              history.map((h, i) => <div key={i} style={{ borderBottom: "1px solid rgba(30,41,59,.4)", padding: "7px 0", fontSize: 11 }}><span style={{ color: "#60a5fa" }}>{h.time}</span> — <span style={{ color: h.anomalies > 0 ? "#f59e0b" : "#10b981" }}>{h.anomalies} anomalies</span><div style={{ color: "#475569", marginTop: 2, fontSize: 10 }}>{h.preview}</div></div>)
            }
          </div>
        </div>
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <button onClick={runAI} disabled={analyzing} style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: analyzing ? "#374151" : "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: analyzing ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
              {analyzing ? <><Spinner /> ANALYZING…</> : "🤖 RUN AI ANALYSIS"}
            </button>
            <p style={{ color: "#475569", fontSize: 11, textAlign: "center" }}>Claude AI analyzes latest 10 PMU readings</p>
          </div>
          {aiResponse && (
            <div className="card" style={{ border: "1px solid rgba(59,130,246,.3)", whiteSpace: "pre-wrap", color: "#94a3b8", fontSize: 12, lineHeight: 1.75, fontFamily: "monospace", maxHeight: 420, overflowY: "auto" }}>
              <div style={{ color: "#60a5fa", fontSize: 10, letterSpacing: ".1em", marginBottom: 10 }}>🤖 AI ANALYSIS — {new Date().toLocaleTimeString()}</div>
              {aiResponse}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SECURITY CENTER ────────────────────────────────────────────────────────────
function SecurityCenter({ data, alerts }) {
  const tlColor = alerts.length === 0 ? "#10b981" : alerts.some(a => a.level === "Critical") ? "#ef4444" : "#f59e0b";
  const tlLabel = alerts.length === 0 ? "Secure" : alerts.some(a => a.level === "Critical") ? "Critical" : "Warning";
  const riskPct = tlLabel === "Secure" ? 12 : tlLabel === "Warning" ? 55 : 90;

  return (
    <div style={{ animation: "fadeIn .4s" }}>
      <h2 style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, marginBottom: 18 }}>🔐 Security Monitoring Center</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 16 }} className="responsive-grid-2">
        <div className="card" style={{ border: `1px solid ${tlColor}33`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{tlLabel === "Secure" ? "🟢" : tlLabel === "Warning" ? "🟡" : "🔴"}</div>
          <div style={{ color: tlColor, fontSize: 18, fontWeight: 700 }}>{tlLabel.toUpperCase()}</div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>SYSTEM STATUS</div>
          <div style={{ width: "100%", marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 10, marginBottom: 5 }}><span>RISK LEVEL</span><span style={{ color: tlColor }}>{riskPct}%</span></div>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(30,41,59,.8)" }}><div style={{ height: "100%", borderRadius: 4, background: tlColor, width: `${riskPct}%`, transition: "width .6s" }} /></div>
          </div>
        </div>
        <div className="card">
          <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>ACTIVE ALERTS ({alerts.length})</div>
          {alerts.length === 0 ? <div style={{ color: "#10b981", fontSize: 13, padding: "20px 0" }}>✅ No active security alerts</div> :
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ background: a.level === "Critical" ? "rgba(239,68,68,.08)" : "rgba(245,158,11,.08)", border: `1px solid ${a.level === "Critical" ? "rgba(239,68,68,.25)" : "rgba(245,158,11,.25)"}`, borderRadius: 8, padding: "9px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: a.level === "Critical" ? "#ef4444" : "#f59e0b", fontWeight: 600, fontSize: 12 }}>{a.level === "Critical" ? "🚨" : "⚠️"} {a.message}</span>
                    <span style={{ color: "#475569", fontSize: 10 }}>{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="responsive-grid-2">
        <div className="card">
          <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>EVENT LOG</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, maxHeight: 220, overflowY: "auto" }}>
            {data.slice(-20).reverse().map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "3px 0", borderBottom: "1px solid rgba(30,41,59,.3)", flexWrap: "wrap" }}>
                <span style={{ color: "#475569" }}>{r.timestamp?.slice(11)}</span>
                <span style={{ color: r.status === "Normal" ? "#10b981" : r.status === "Suspicious" ? "#f59e0b" : "#ef4444" }}>[{r.status.replace(/ /g, "_").toUpperCase()}]</span>
                {r.attackType && <span style={{ color: "#a855f7" }}>← {r.attackType.toUpperCase()}{r.delay ? ` delay:${r.delay}ms` : ""}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 12 }}>SECURITY RECOMMENDATIONS</div>
          {[
            { icon: "🔒", text: "Enable E2E encryption on all PMU data channels", p: "High" },
            { icon: "🛡️", text: "Deploy anomaly-based IDS with sub-100ms detection", p: "High" },
            { icon: "🔄", text: "Redundant PMU paths with automatic failover", p: "High" },
            { icon: "📡", text: "Monitor GPS time synchronization continuously", p: "Medium" },
            { icon: "📋", text: "Conduct regular SCADA penetration testing", p: "Low" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 9 }}>
              <span style={{ fontSize: 14 }}>{r.icon}</span>
              <div><div style={{ color: "#e2e8f0", fontSize: 11 }}>{r.text}</div><span style={{ ...S.badge(r.p === "High" ? "#ef4444" : r.p === "Medium" ? "#f59e0b" : "#10b981"), fontSize: 9, marginTop: 3 }}>{r.p}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MODEL PERFORMANCE ──────────────────────────────────────────────────────────
function ModelPerformance({ data }) {
  const total = data.length;
  const tp = data.filter(d => d.status !== "Normal").length;
  const tn = total - tp;
  const fp = Math.max(0, Math.floor(tn * .03));
  const fn = Math.max(0, Math.floor(tp * .05));
  const acc = total > 0 ? +(((tp + tn - fp - fn) / total) * 100).toFixed(1) : 97.2;
  const prec = tp > 0 ? +((tp / (tp + fp)) * 100).toFixed(1) : 96.8;
  const rec = tp > 0 ? +((tp / (tp + fn)) * 100).toFixed(1) : 95.1;
  const f1 = prec + rec > 0 ? +((2 * prec * rec) / (prec + rec)).toFixed(1) : 96.0;

  const hist = [{ e: 1, a: 78 }, { e: 2, a: 84 }, { e: 3, a: 88 }, { e: 4, a: 91 }, { e: 5, a: 93 }, { e: 6, a: 95 }, { e: 7, a: 96 }, { e: 8, a: 97 }];

  return (
    <div style={{ animation: "fadeIn .4s" }}>
      <h2 style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, marginBottom: 18 }}>📈 Model Performance</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }} className="responsive-grid-4">
        {[{ l: "Accuracy", v: acc, c: "#10b981" }, { l: "Precision", v: prec, c: "#3b82f6" }, { l: "Recall", v: rec, c: "#a855f7" }, { l: "F1 Score", v: f1, c: "#f59e0b" }].map(m => (
          <div key={m.l} style={S.statCard(m.c)}>
            <div style={{ color: "#64748b", fontSize: 10, letterSpacing: ".08em" }}>{m.l.toUpperCase()}</div>
            <div style={{ color: m.c, fontSize: 26, fontWeight: 700 }}>{m.v}%</div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(30,41,59,.8)", marginTop: 8 }}><div style={{ height: "100%", borderRadius: 2, background: m.c, width: `${m.v}%` }} /></div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="responsive-grid-2">
        <div className="card">
          <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>TRAINING ACCURACY CURVE</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hist}><CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,.4)" /><XAxis dataKey="e" tick={{ fill:"#64748b",fontSize:10 }} label={{ value:"Epoch",position:"insideBottom",fill:"#64748b",fontSize:10 }} /><YAxis tick={{ fill:"#64748b",fontSize:10 }} domain={[70,100]} /><Tooltip {...TT} formatter={v=>[`${v}%`,"Accuracy"]} /><Line type="monotone" dataKey="a" stroke="#10b981" strokeWidth={2} dot={{ fill:"#10b981",r:3 }} /></LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", marginBottom: 10 }}>CONFUSION MATRIX</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
            {[{ l: "True Positive", v: tp, c: "#10b981", d: "Attacks correctly caught" }, { l: "False Positive", v: fp, c: "#f59e0b", d: "False alarms generated" }, { l: "False Negative", v: fn, c: "#ef4444", d: "Attacks missed" }, { l: "True Negative", v: tn, c: "#3b82f6", d: "Normal correctly cleared" }].map(c => (
              <div key={c.l} style={{ background: `${c.c}11`, border: `1px solid ${c.c}33`, borderRadius: 8, padding: "11px", textAlign: "center" }}>
                <div style={{ color: c.c, fontSize: 22, fontWeight: 700 }}>{c.v}</div>
                <div style={{ color: c.c, fontSize: 11, fontWeight: 600 }}>{c.l}</div>
                <div style={{ color: "#475569", fontSize: 10, marginTop: 3 }}>{c.d}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(15,23,42,.5)", borderRadius: 8, fontSize: 10, color: "#64748b" }}>
            Model: Isolation Forest + Random Forest ensemble | Features: V, I, f, φ, Availability
          </div>
        </div>
      </div>
    </div>
  );
}

// ── REPORTS ────────────────────────────────────────────────────────────────────
function Reports({ data }) {
  const [gen, setGen] = useState(null);
  const [report, setReport] = useState(null);

  const genReport = async (type) => {
    setGen(type);
    const attacks = data.filter(d => d.status !== "Normal");
    const prompt = `Generate a professional ${type} for a PMU power grid cybersecurity monitoring system.

Data: Total=${data.length}, Normal=${data.filter(d=>d.status==="Normal").length}, Suspicious=${data.filter(d=>d.status==="Suspicious").length}, Attacks=${data.filter(d=>d.status==="Attack Detected").length}
Attack types: ${[...new Set(attacks.map(a=>a.attackType).filter(Boolean))].join(", ")||"None"}
DoS attacks: ${data.filter(d=>d.attackType==="dos").length}

Write: Executive Summary, Key Findings, Statistical Analysis, Risk Assessment, Conclusions.
Professional cybersecurity language for power grid operators and academic review.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const d = await res.json();
      setReport({ type, content: d.content?.map(c => c.text || "").join("") || "Generation failed." });
    } catch {
      setReport({ type, content: `${type}\n\nExecutive Summary:\n${data.length} PMU records monitored.\n${attacks.length} anomalies detected.\n\nKey Findings:\n- ${data.filter(d=>d.status==="Attack Detected").length} confirmed attacks\n- ${data.filter(d=>d.attackType==="dos").length} DoS incidents\n\nConclusion: System requires enhanced monitoring.` });
    }
    setGen(null);
  };

  const dl = (content, name, mime = "text/plain") => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type: mime })); a.download = name; a.click();
  };

  const dlCSV = () => {
    const csv = ["Timestamp,Voltage,Current,Frequency,PhaseAngle,Availability,Status,Confidence,AttackType,Delay", ...data.map(r => `${r.timestamp},${r.voltage??""},${r.current??""},${r.frequency},${r.phaseAngle},${r.availability??100},${r.status},${r.confidence},${r.attackType??""},${r.delay??""}`)].join("\n");
    dl(csv, "pmu_data_export.csv", "text/csv");
  };

  const types = [
    { id: "PMU Monitoring Report", icon: "📡", desc: "Comprehensive PMU measurement analysis & trends", color: "#3b82f6" },
    { id: "Cyberattack Analysis Report", icon: "⚔️", desc: "Attack simulation & detection summary incl. DoS", color: "#ef4444" },
    { id: "AI Detection Performance Report", icon: "🤖", desc: "ML model accuracy & detection metrics report", color: "#a855f7" },
  ];

  return (
    <div style={{ animation: "fadeIn .4s" }}>
      <h2 style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, marginBottom: 18 }}>📋 Report Generation</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }} className="responsive-grid-3">
        {types.map(r => (
          <div key={r.id} className="card-glow">
            <div style={{ fontSize: 24, marginBottom: 8 }}>{r.icon}</div>
            <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{r.id}</div>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 14 }}>{r.desc}</div>
            <button onClick={() => genReport(r.id)} disabled={!!gen} style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px solid ${r.color}44`, background: `${r.color}11`, color: r.color, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {gen === r.id ? <><Spinner /> Generating…</> : "📄 Generate AI Report"}
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <button onClick={dlCSV} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(16,185,129,.35)", background: "rgba(16,185,129,.08)", color: "#10b981", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📥 Export PMU Data (CSV)</button>
        <button onClick={() => genReport("Full System Security Report")} disabled={!!gen} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(59,130,246,.35)", background: "rgba(59,130,246,.08)", color: "#60a5fa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📊 Full System Report (AI)</button>
      </div>
      {report && (
        <div className="card" style={{ border: "1px solid rgba(59,130,246,.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: "#60a5fa", fontSize: 12, fontWeight: 700 }}>📄 {report.type}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => dl(report.content, `${report.type}.txt`)} className="drill-btn">📥 TXT</button>
              <button onClick={() => dl(report.content, `${report.type}.md`, "text/markdown")} className="drill-btn">📝 MD</button>
            </div>
          </div>
          <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: 320, overflowY: "auto" }}>{report.content}</div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [drill, setDrill] = useState(null);
  const [data, setData] = useState(seedHistory);
  const [alerts, setAlerts] = useState([]);
  const [lastAttack, setLastAttack] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const timer = useRef(null);
  const toastId = useRef(0);

  const systemHealth = Math.max(0, Math.min(100, Math.round(100 - (data.filter(d => d.status !== "Normal").length / Math.max(data.length, 1)) * 100)));
  const threatLevel = alerts.some(a => a.level === "Critical") ? "Critical" : alerts.length > 0 ? "Warning" : "Secure";
  const tlColor = threatLevel === "Critical" ? "#ef4444" : threatLevel === "Warning" ? "#f59e0b" : "#10b981";

  const addToast = useCallback((msg, type = "success") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    if (!user) return;
    timer.current = setInterval(() => {
      setData(p => [...p.slice(-199), genNormal()]);
      setClock(new Date().toLocaleTimeString());
    }, 2000);
    return () => clearInterval(timer.current);
  }, [user]);

  const handleAttack = useCallback((type, severity) => {
    const count = severity === "low" ? 3 : severity === "medium" ? 6 : severity === "high" ? 10 : 15;
    const records = Array.from({ length: count }, () => genAttacked(type, severity));
    setData(p => [...p.slice(-(200 - count)), ...records]);
    const info = ATTACK_TYPES.find(a => a.id === type);
    const level = (severity === "high" || severity === "critical") ? "Critical" : "Warning";
    const alert = { message: `${info?.label} detected [${severity.toUpperCase()}]`, level, time: new Date().toLocaleTimeString() };
    setAlerts(p => [alert, ...p.slice(0, 14)]);
    setLastAttack({ type, severity, count, time: new Date().toLocaleTimeString() });
    addToast(`${info?.icon} ${info?.label} — ${severity.toUpperCase()} severity executed`, "attack");
  }, [addToast]);

  if (!user) return <Login onLogin={u => { setUser(u); addToast(`Welcome back, ${u.name}!`, "success"); }} addToast={addToast} />;

  const mainStyle = { flex: 1, padding: 20, overflowY: "auto", maxWidth: `calc(100vw - ${collapsed ? 58 : 220}px)`, transition: "max-width .25s" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#060d1a", fontFamily: "'Exo 2', sans-serif", color: "#e2e8f0" }}>
      <style>{CSS}</style>
      <ToastContainer toasts={toasts} />

      {/* Desktop Sidebar */}
      <div className="sidebar-desktop" style={{ display: "flex" }}>
        <Sidebar page={page} setPage={p => { setPage(p); setDrill(null); }} user={user} onLogout={() => { setUser(null); setAlerts([]); setData(seedHistory()); }} threatLevel={threatLevel} collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer open={mobileOpen} page={page} setPage={p => { setPage(p); setDrill(null); }} user={user} onLogout={() => setUser(null)} threatLevel={threatLevel} onClose={() => setMobileOpen(false)} />

      {/* Main */}
      <div className="main-content" style={mainStyle}>
        {/* Top Bar */}
        <div className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid rgba(59,130,246,.1)", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Hamburger for mobile */}
            <button onClick={() => setMobileOpen(true)} style={{ background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 7, padding: "6px 9px", color: "#60a5fa", cursor: "pointer", fontSize: 15 }} className="mobile-menu-btn">☰</button>
            <PulsingDot color="#10b981" size={8} />
            <span style={{ color: "#475569", fontSize: 11, letterSpacing: ".08em", whiteSpace: "nowrap" }}>LIVE · PMU_STATION_01</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "#334155", fontSize: 11 }}>{data.length} records</span>
            <span style={{ color: "#334155", fontSize: 11, whiteSpace: "nowrap" }}>{clock}</span>
            <span style={{ ...S.badge(tlColor), cursor: "pointer" }} onClick={() => setPage("security")}>{threatLevel === "Critical" ? "🔴" : threatLevel === "Warning" ? "🟡" : "🟢"} {threatLevel}</span>
            {alerts.length > 0 && <span style={{ ...S.badge("#ef4444"), cursor: "pointer" }} onClick={() => setPage("security")}>🚨 {alerts.length}</span>}
          </div>
        </div>

        {/* Mobile hamburger inline */}
        <div style={{ display: "none" }} className="mobile-only">
          <button onClick={() => setMobileOpen(true)} style={{ marginBottom: 12, background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 8, padding: "8px 14px", color: "#60a5fa", cursor: "pointer", fontSize: 13 }}>☰ Menu</button>
        </div>

        {/* Page Router */}
        {drill && page === "dashboard"
          ? <DrillDown metric={drill} data={data} onBack={() => setDrill(null)} />
          : page === "dashboard" ? <AnalyticsDashboard data={data} threatLevel={threatLevel} systemHealth={systemHealth} setDrill={m => { setDrill(m); }} />
          : page === "analyst" ? <AnalystDashboard data={data} alerts={alerts} systemHealth={systemHealth} threatLevel={threatLevel} />
          : page === "monitoring" ? <PMUMonitoring data={data} />
          : page === "attack" ? <AttackSimulation onAttack={handleAttack} lastAttack={lastAttack} />
          : page === "detection" ? <AIDetection data={data} />
          : page === "security" ? <SecurityCenter data={data} alerts={alerts} />
          : page === "model" ? <ModelPerformance data={data} />
          : page === "reports" ? <Reports data={data} />
          : null
        }
      </div>

      {/* Mobile Menu Button (always visible on mobile) */}
      <style>{`
        @media(max-width:768px){
          .mobile-menu-btn{display:flex!important;}
          .sidebar-desktop{display:none!important;}
          .mobile-only{display:block!important;}
        }
        @media(min-width:769px){
          .mobile-menu-btn{display:none!important;}
          .mobile-only{display:none!important;}
          .sidebar-desktop{display:flex!important;}
        }
      `}</style>
    </div>
  );
}