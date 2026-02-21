import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

// ─── RBAC CONFIG ──────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  dispatcher: {
    label: "Dispatcher",
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
    icon: "🗺",
    description: "Create trips, assign drivers & validate cargo loads",
    pages: ["dashboard", "trips", "vehicles", "drivers"],
    canWrite: ["trips"],
  },
  manager: {
    label: "Fleet Manager",
    color: "#10b981",
    gradient: "linear-gradient(135deg, #065f46, #10b981)",
    icon: "🚛",
    description: "Oversee vehicles, schedules & asset lifecycle",
    pages: ["dashboard", "vehicles", "drivers", "trips", "maintenance", "fuel", "analytics"],
    canWrite: ["vehicles", "drivers", "trips", "maintenance", "fuel"],
  },
  safety_officer: {
    label: "Safety Officer",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #92400e, #f59e0b)",
    icon: "🛡",
    description: "Monitor compliance, license expiry & safety scores",
    pages: ["dashboard", "drivers", "maintenance", "safety"],
    canWrite: ["drivers", "maintenance"],
  },
  financial_analyst: {
    label: "Financial Analyst",
    color: "#a855f7",
    gradient: "linear-gradient(135deg, #6b21a8, #a855f7)",
    icon: "📊",
    description: "Audit fuel spend, maintenance ROI & operational costs",
    pages: ["dashboard", "fuel", "analytics", "maintenance"],
    canWrite: ["fuel"],
  },
};

const canDo  = (role, page) => ROLE_CONFIG[role]?.canWrite?.includes(page) ?? false;
const canSee = (role, page) => ROLE_CONFIG[role]?.pages?.includes(page)    ?? false;

// ─── MOCK USERS ───────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { id:1, name:"Arjun Mehta",   email:"arjun@fleetflow.io",  password:"dispatch1", role:"dispatcher",        avatar:"AM" },
  { id:2, name:"Priya Sharma",  email:"priya@fleetflow.io",  password:"manager1",  role:"manager",           avatar:"PS" },
  { id:3, name:"Rajesh Kumar",  email:"rajesh@fleetflow.io", password:"safety1",   role:"safety_officer",    avatar:"RK" },
  { id:4, name:"Neha Patel",    email:"neha@fleetflow.io",   password:"finance1",  role:"financial_analyst", avatar:"NP" },
];

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const INIT_VEHICLES = [
  { id:1, plate:"MH12-AB-1234", make:"Tata",     model:"LPT 1613",    year:2021, type:"Truck", fuel:"Diesel",   status:"available",   odometer:48230,  capacity:16000, region:"West",  acqCost:2800000 },
  { id:2, plate:"MH12-CD-5678", make:"Ashok",    model:"Ecomet 1015", year:2020, type:"Van",   fuel:"Diesel",   status:"available",   odometer:72100,  capacity:10000, region:"South", acqCost:1900000 },
  { id:3, plate:"MH12-EF-9012", make:"Mahindra", model:"Furio 7",     year:2022, type:"Van",   fuel:"Diesel",   status:"on_trip",     odometer:15340,  capacity:7000,  region:"North", acqCost:1600000 },
  { id:4, plate:"MH12-GH-3456", make:"BYD",      model:"T9 Electric", year:2023, type:"Truck", fuel:"Electric", status:"maintenance", odometer:9870,   capacity:9000,  region:"East",  acqCost:3200000 },
  { id:5, plate:"MH12-IJ-7890", make:"Tata",     model:"Prima 4028",  year:2019, type:"Truck", fuel:"Diesel",   status:"available",   odometer:131500, capacity:28000, region:"West",  acqCost:4500000 },
];
const INIT_DRIVERS = [
  { id:1, name:"Rajan Sharma",   phone:"+91 9876543210", license:"MH-1420050012345", class:"HMV", expiry:"2026-08-10", status:"active",   trips:142, score:94, incidents:0 },
  { id:2, name:"Priya Kulkarni", phone:"+91 9876543211", license:"MH-1420100067890", class:"HMV", expiry:"2027-03-25", status:"active",   trips:98,  score:91, incidents:1 },
  { id:3, name:"Vikram Patil",   phone:"+91 9876543212", license:"MH-1420150011223", class:"LMV", expiry:"2025-11-30", status:"on_leave", trips:67,  score:78, incidents:3 },
  { id:4, name:"Suresh Yadav",   phone:"+91 9876543213", license:"MH-1420180044556", class:"HMV", expiry:"2028-07-14", status:"active",   trips:203, score:88, incidents:1 },
  { id:5, name:"Kavita Nair",    phone:"+91 9876543214", license:"MH-1420200099887", class:"HMV", expiry:"2029-01-09", status:"active",   trips:55,  score:97, incidents:0 },
];
const INIT_TRIPS = [
  { id:1, code:"TRP-001", vehicleId:3, driverId:1, origin:"Mumbai",  destination:"Pune",      cargo:6500,  status:"in_progress", date:"2026-02-20", distance:148 },
  { id:2, code:"TRP-002", vehicleId:1, driverId:4, origin:"Delhi",   destination:"Jaipur",    cargo:12000, status:"completed",   date:"2026-02-18", distance:280 },
  { id:3, code:"TRP-003", vehicleId:2, driverId:2, origin:"Chennai", destination:"Bangalore", cargo:4500,  status:"scheduled",   date:"2026-02-22", distance:346 },
];
const INIT_MAINTENANCE = [
  { id:1, vehicleId:4, type:"oil_change", status:"in_progress", vendor:"AutoCare Hub", cost:4500, date:"2026-02-19", notes:"Synthetic oil + filter" },
  { id:2, vehicleId:1, type:"inspection", status:"scheduled",   vendor:"FleetServ",    cost:2000, date:"2026-02-25", notes:"Annual safety check" },
];
const INIT_FUEL = [
  { id:1, vehicleId:1, driverId:1, litres:180, cost:16200, date:"2026-02-10", station:"HP Fuel Station",  odometer:48050 },
  { id:2, vehicleId:2, driverId:4, litres:140, cost:12600, date:"2026-02-12", station:"BPCL Petrol Pump", odometer:71960 },
  { id:3, vehicleId:3, driverId:2, litres:90,  cost:8100,  date:"2026-02-15", station:"Indian Oil",       odometer:15250 },
  { id:4, vehicleId:5, driverId:4, litres:220, cost:19800, date:"2026-02-16", station:"HP Fuel Station",  odometer:131280},
  { id:5, vehicleId:1, driverId:1, litres:160, cost:14400, date:"2026-02-19", station:"Shell",            odometer:48180 },
];

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#070910;--surface:#0d1119;--s2:#111620;--s3:#161d2c;
  --border:#192030;--border2:#1f2c42;
  --accent:#00d4ff;--accent2:#7c3aed;
  --text:#dde4f0;--muted:#4e5d78;--soft:#8899bb;
  --green:#10b981;--red:#ef4444;--amber:#f59e0b;--blue:#3b82f6;--purple:#a855f7;
  --sw:252px;
}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased}
.app{display:flex;min-height:100vh}

/* ── LOGIN ── */
.lp{min-height:100vh;display:flex;background:var(--bg);
  background-image:radial-gradient(ellipse 900px 700px at 70% 30%,rgba(0,212,255,.04) 0%,transparent 65%),
                   radial-gradient(ellipse 600px 500px at 5% 80%,rgba(124,58,237,.05) 0%,transparent 65%)}
.lp-left{width:460px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;padding:64px 52px;
  border-right:1px solid var(--border);background:linear-gradient(180deg,rgba(0,212,255,.025) 0%,transparent 60%)}
.lp-brand{margin-bottom:52px}
.lp-logo{font-family:'Syne',sans-serif;font-weight:800;font-size:28px;color:var(--accent);letter-spacing:-1px}
.lp-tagline{font-size:12px;color:var(--muted);margin-top:4px;letter-spacing:.3px}
.lp-h{font-family:'Syne',sans-serif;font-weight:700;font-size:22px;margin-bottom:8px}
.lp-sub{font-size:13px;color:var(--soft);margin-bottom:34px;line-height:1.55}
.fg{margin-bottom:17px}
.fl{display:block;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:7px}
.fi{width:100%;padding:11px 15px;background:var(--s2);border:1px solid var(--border2);border-radius:10px;color:var(--text);font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s}
.fi:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,212,255,.08)}
.fi::placeholder{color:var(--muted)}
.btn-login{width:100%;padding:13px;background:var(--accent);color:#000;font-weight:700;font-size:14px;border:none;border-radius:10px;cursor:pointer;font-family:'Syne',sans-serif;letter-spacing:.4px;transition:all .2s;margin-top:6px}
.btn-login:hover{opacity:.87;transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,212,255,.22)}
.err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#fca5a5;padding:11px 15px;border-radius:10px;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.lp-right{flex:1;display:flex;flex-direction:column;justify-content:center;padding:48px}
.lp-rh{font-family:'Syne',sans-serif;font-weight:700;font-size:13px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:22px}
.rc-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.rc{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
.rc:hover{border-color:var(--border2);transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,.3)}
.rc.sel{border-width:1.5px}
.rc-glow{position:absolute;top:-40px;right:-40px;width:120px;height:120px;border-radius:50%;opacity:.08;pointer-events:none}
.rc-icon{font-size:24px;margin-bottom:10px}
.rc-name{font-family:'Syne',sans-serif;font-weight:700;font-size:14px;margin-bottom:4px}
.rc-desc{font-size:12px;color:var(--muted);line-height:1.4}
.rc-creds{margin-top:11px;padding-top:11px;border-top:1px solid var(--border)}
.rc-cred{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:5px;margin-bottom:3px}
.rc-cred code{background:var(--s3);padding:1px 6px;border-radius:4px;font-size:10px;color:var(--soft);font-family:monospace}
.btn-qf{font-size:11px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);padding:4px 10px;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;margin-top:8px}
.btn-qf:hover{border-color:var(--accent);color:var(--accent)}

/* ── SIDEBAR ── */
.sidebar{width:var(--sw);background:var(--surface);border-right:1px solid var(--border);
  display:flex;flex-direction:column;flex-shrink:0;position:fixed;top:0;left:0;height:100vh;z-index:100}
.sb-logo{padding:20px 18px 18px;border-bottom:1px solid var(--border)}
.sb-logo-t{font-family:'Syne',sans-serif;font-weight:800;font-size:20px;color:var(--accent)}
.sb-logo-s{font-size:9px;color:var(--muted);letter-spacing:1.2px;text-transform:uppercase;margin-top:2px}
.sb-role{margin:11px 11px 0;padding:10px 13px;border-radius:10px;display:flex;align-items:center;gap:9px;border:1px solid transparent}
.sb-role-icon{font-size:17px}
.sb-role-name{font-family:'Syne',sans-serif;font-weight:700;font-size:12px}
.sb-role-label{font-size:9px;color:rgba(255,255,255,.45);margin-top:1px;text-transform:uppercase;letter-spacing:.5px}
.sb-nav{flex:1;padding:10px 10px;overflow-y:auto;margin-top:8px}
.sb-sec{margin-bottom:18px}
.sb-sec-lbl{font-size:9px;font-weight:700;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;padding:0 8px;margin-bottom:5px}
.ni{display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:8px;cursor:pointer;color:var(--muted);font-size:13px;font-weight:500;transition:all .15s;margin-bottom:2px;user-select:none}
.ni:hover{background:var(--s2);color:var(--text)}
.ni.active{color:#fff}
.ni.locked{opacity:.28;cursor:not-allowed;pointer-events:none}
.ni-icon{font-size:14px;width:18px;text-align:center;flex-shrink:0}
.ni-lock{font-size:9px;margin-left:auto;opacity:.5}
.sb-foot{padding:12px 10px;border-top:1px solid var(--border)}
.uc{display:flex;align-items:center;gap:9px;padding:9px;border-radius:10px;background:var(--s2);margin-bottom:7px}
.ua{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0;font-family:'Syne',sans-serif}
.un{font-size:12px;font-weight:600;color:var(--text);line-height:1.2}
.ur{font-size:10px;color:var(--muted);margin-top:1px}
.btn-lo{width:100%;padding:7px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:12px;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
.btn-lo:hover{border-color:var(--red);color:var(--red);background:rgba(239,68,68,.04)}

/* ── MAIN ── */
.main{margin-left:var(--sw);flex:1;display:flex;flex-direction:column;min-height:100vh}
.topbar{padding:17px 30px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--surface);position:sticky;top:0;z-index:50}
.pt{font-family:'Syne',sans-serif;font-weight:700;font-size:19px;color:var(--text)}
.ps{font-size:12px;color:var(--muted);margin-top:2px}
.tbr{display:flex;align-items:center;gap:10px}
.content{padding:26px 30px;flex:1}

/* ── RBAC NOTICES ── */
.ro-notice{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:8px;padding:9px 15px;font-size:12px;color:#fcd34d;margin-bottom:18px;display:flex;align-items:center;gap:8px}
.ac-banned{background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.18);border-radius:12px;padding:40px;text-align:center;margin-bottom:20px}
.ac-icon{font-size:36px;margin-bottom:12px}
.ac-title{font-family:'Syne',sans-serif;font-weight:700;font-size:18px;color:var(--red);margin-bottom:6px}
.ac-sub{font-size:13px;color:var(--muted)}

/* ── KPI ── */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;position:relative;overflow:hidden;transition:border-color .2s}
.kpi:hover{border-color:var(--border2)}
.kpi-glow{position:absolute;top:-30px;right:-30px;width:90px;height:90px;border-radius:50%;opacity:.07;pointer-events:none}
.kpi-icon{font-size:18px;margin-bottom:12px}
.kpi-val{font-family:'Syne',sans-serif;font-size:32px;font-weight:800;line-height:1;margin-bottom:4px}
.kpi-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)}
.kpi-delta{font-size:11px;margin-top:7px;color:var(--muted)}

/* ── BADGES ── */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}
.bd{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.badge-available{background:rgba(16,185,129,.12);color:#10b981}.badge-available .bd{background:#10b981}
.badge-on_trip{background:rgba(59,130,246,.12);color:#60a5fa}.badge-on_trip .bd{background:#60a5fa}
.badge-maintenance{background:rgba(239,68,68,.12);color:#f87171}.badge-maintenance .bd{background:#f87171}
.badge-retired{background:rgba(100,116,139,.12);color:#94a3b8}.badge-retired .bd{background:#94a3b8}
.badge-active{background:rgba(16,185,129,.12);color:#10b981}.badge-active .bd{background:#10b981}
.badge-on_leave{background:rgba(245,158,11,.12);color:#fbbf24}.badge-on_leave .bd{background:#fbbf24}
.badge-suspended{background:rgba(239,68,68,.12);color:#f87171}.badge-suspended .bd{background:#f87171}
.badge-scheduled{background:rgba(245,158,11,.12);color:#fbbf24}.badge-scheduled .bd{background:#fbbf24}
.badge-in_progress{background:rgba(59,130,246,.12);color:#60a5fa}.badge-in_progress .bd{background:#60a5fa}
.badge-completed{background:rgba(16,185,129,.12);color:#10b981}.badge-completed .bd{background:#10b981}
.badge-cancelled{background:rgba(239,68,68,.12);color:#f87171}.badge-cancelled .bd{background:#f87171}
.badge-dispatcher{background:rgba(59,130,246,.12);color:#60a5fa}
.badge-manager{background:rgba(16,185,129,.12);color:#10b981}
.badge-safety_officer{background:rgba(245,158,11,.12);color:#fbbf24}
.badge-financial_analyst{background:rgba(168,85,247,.12);color:#c084fc}

/* ── TABLES ── */
.tc{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.th{padding:17px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.tt{font-family:'Syne',sans-serif;font-weight:700;font-size:15px}
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.9px;border-bottom:1px solid var(--border);background:rgba(255,255,255,.01);white-space:nowrap}
td{padding:12px 16px;font-size:13px;border-bottom:1px solid rgba(25,32,48,.7);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(255,255,255,.015)}

/* ── BUTTONS ── */
.btn{padding:7px 15px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all .15s;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.btn-a{background:var(--accent);color:#000}.btn-a:hover{opacity:.85;transform:translateY(-1px)}
.btn-g{background:transparent;border:1px solid var(--border2);color:var(--soft)}.btn-g:hover{border-color:var(--accent);color:var(--accent)}
.btn-d{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}.btn-d:hover{background:rgba(239,68,68,.18)}
.btn-sm{padding:4px 10px;font-size:11px}
.btn:disabled{opacity:.3;cursor:not-allowed;pointer-events:none}

/* ── MODAL ── */
.mo{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)}
.md{background:var(--surface);border:1px solid var(--border2);border-radius:16px;padding:30px;width:520px;max-width:95vw;max-height:88vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.6)}
.md-title{font-family:'Syne',sans-serif;font-weight:700;font-size:18px}
.md-act{display:flex;gap:10px;justify-content:flex-end;margin-top:22px}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fgrid .full{grid-column:1/-1}
.fsel{width:100%;padding:10px 13px;background:var(--s2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:13px;outline:none;font-family:'DM Sans',sans-serif}
.fsel:focus{border-color:var(--accent)}
.v-err{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.25);color:#fca5a5;padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:14px;line-height:1.45}
.v-ok{background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.25);color:#6ee7b7;padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:14px}

/* ── MISC ── */
.fr{display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap}
.finput{padding:8px 13px;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;font-family:'DM Sans',sans-serif}
.finput:focus{border-color:var(--accent)}
.muted{color:var(--muted)}
.soft{color:var(--soft)}
.tag{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;background:var(--s2);color:var(--muted);border:1px solid var(--border);font-family:monospace;white-space:nowrap}
.sbar-wrap{display:flex;align-items:center;gap:7px}
.sbar-bg{height:5px;border-radius:3px;background:var(--border);width:70px}
.sbar-fill{height:5px;border-radius:3px}
.empty{text-align:center;padding:52px;color:var(--muted)}
.empty-icon{font-size:38px;margin-bottom:12px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.three-col{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.cc{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px}
.ct{font-family:'Syne',sans-serif;font-weight:700;font-size:13px;margin-bottom:18px;color:var(--soft);text-transform:uppercase;letter-spacing:.5px}
.alert-r{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--s2);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;font-size:13px}
.alert-r.warn{border-color:rgba(245,158,11,.25);background:rgba(245,158,11,.05)}
.alert-r.danger{border-color:rgba(239,68,68,.25);background:rgba(239,68,68,.05)}
.role-wb{border-radius:14px;padding:16px 22px;margin-bottom:22px;display:flex;align-items:center;gap:14px}
`;

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const lbl = { available:"Available",on_trip:"On Trip",maintenance:"In Shop",retired:"Retired",active:"Active",on_leave:"On Leave",suspended:"Suspended",scheduled:"Scheduled",in_progress:"In Progress",completed:"Completed",cancelled:"Cancelled" };
  return <span className={`badge badge-${status}`}><span className="bd"/>{lbl[status]||status}</span>;
};
const RoleBadge = ({ role }) => {
  const c = ROLE_CONFIG[role];
  return <span className={`badge badge-${role}`}>{c?.icon} {c?.label||role}</span>;
};
const Modal = ({ title, children, onClose }) => (
  <div className="mo" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="md">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <h2 className="md-title">{title}</h2>
        <button onClick={onClose} style={{background:"none",border:"none",color:"var(--muted)",fontSize:19,cursor:"pointer",lineHeight:1}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);
const RONotice = () => <div className="ro-notice">👁 <strong>Read-only access.</strong> Contact your Fleet Manager to make changes.</div>;
const AccessDenied = () => (
  <div className="ac-banned">
    <div className="ac-icon">🔒</div>
    <div className="ac-title">Access Restricted</div>
    <div className="ac-sub">Your role does not have permission to view this section.</div>
  </div>
);

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [err, setErr]     = useState("");

  const fill  = u => { setEmail(u.email); setPass(u.password); setErr(""); };
  const login = () => {
    const u = MOCK_USERS.find(u=>u.email===email&&u.password===pass);
    u ? onLogin(u) : setErr("Invalid credentials — click a role card to quick-fill.");
  };

  return (
    <div className="lp">
      {/* LEFT — form */}
      <div className="lp-left">
        <div className="lp-brand">
          <div className="lp-logo">⚡ FleetFlow</div>
          <div className="lp-tagline">Modular Fleet & Logistics Management</div>
        </div>
        <div className="lp-h">Welcome back</div>
        <div className="lp-sub">Sign in to your workspace. Your dashboard, navigation, and permissions are tailored to your assigned role.</div>
        {err && <div className="err">⚠ {err}</div>}
        <div className="fg">
          <label className="fl">Email Address</label>
          <input className="fi" type="email" placeholder="you@fleetflow.io" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
        </div>
        <div className="fg">
          <label className="fl">Password</label>
          <input className="fi" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
        </div>
        <button className="btn-login" onClick={login}>Sign In →</button>
        <div style={{marginTop:18,fontSize:11,color:"var(--muted)",textAlign:"center"}}>Use the quick-fill buttons on the right to log in as any role</div>
      </div>

      {/* RIGHT — role cards */}
      <div className="lp-right">
        <div className="lp-rh">Choose a role to preview</div>
        <div className="rc-grid">
          {MOCK_USERS.map(u=>{
            const c=ROLE_CONFIG[u.role];
            const sel=email===u.email;
            return (
              <div key={u.id} className={`rc${sel?" sel":""}`} style={sel?{borderColor:c.color,boxShadow:`0 0 0 1px ${c.color}20`}:{}}>
                <div className="rc-glow" style={{background:c.color}}/>
                <div className="rc-icon">{c.icon}</div>
                <div className="rc-name" style={{color:c.color}}>{c.label}</div>
                <div className="rc-desc">{c.description}</div>
                <div className="rc-creds">
                  <div className="rc-cred">👤 <code>{u.name}</code></div>
                  <div className="rc-cred">✉ <code>{u.email}</code></div>
                  <div className="rc-cred">🔑 <code>{u.password}</code></div>
                </div>
                <button className="btn-qf" style={sel?{borderColor:c.color,color:c.color}:{}} onClick={()=>fill(u)}>
                  {sel?"✓ Selected — click Sign In":"Quick Fill →"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({ user, vehicles, drivers, trips, maintenance, fuelLogs }) => {
  const r=user.role; const cfg=ROLE_CONFIG[r];
  const active   = vehicles.filter(v=>v.status==="on_trip").length;
  const inShop   = vehicles.filter(v=>v.status==="maintenance").length;
  const util     = Math.round(vehicles.filter(v=>v.status!=="available").length/vehicles.length*100);
  const pending  = trips.filter(t=>t.status==="scheduled").length;
  const expLics  = drivers.filter(d=>new Date(d.expiry)<new Date()).length;
  const fuel$    = fuelLogs.reduce((s,f)=>s+f.cost,0);
  const maint$   = maintenance.reduce((s,m)=>s+(m.cost||0),0);

  const kpiMap = {
    dispatcher: [
      {l:"Available Vehicles",v:vehicles.filter(v=>v.status==="available").length,i:"🚛",c:"var(--green)"},
      {l:"Active Trips",       v:active,  i:"🗺",c:"var(--blue)"},
      {l:"Pending Trips",      v:pending, i:"📦",c:"var(--amber)"},
      {l:"Available Drivers",  v:drivers.filter(d=>d.status==="active"&&new Date(d.expiry)>new Date()).length,i:"👤",c:"var(--accent)"},
    ],
    manager: [
      {l:"Active Fleet",     v:active,    i:"🚛",c:"var(--blue)"},
      {l:"In Maintenance",   v:inShop,    i:"🔧",c:"var(--red)"},
      {l:"Utilization Rate", v:`${util}%`,i:"📊",c:"var(--green)"},
      {l:"Pending Trips",    v:pending,   i:"📦",c:"var(--amber)"},
    ],
    safety_officer: [
      {l:"Expired Licenses",        v:expLics, i:"⚠", c:"var(--red)"},
      {l:"Active Drivers",          v:drivers.filter(d=>d.status==="active").length,i:"👤",c:"var(--green)"},
      {l:"Suspended Drivers",       v:drivers.filter(d=>d.status==="suspended").length,i:"🚫",c:"var(--amber)"},
      {l:"Open Maintenance Jobs",   v:maintenance.filter(m=>m.status==="in_progress").length,i:"🔧",c:"var(--blue)"},
    ],
    financial_analyst: [
      {l:"Total Fuel Spend",    v:`₹${(fuel$/1000).toFixed(0)}K`,       i:"⛽",c:"var(--amber)"},
      {l:"Maintenance Spend",   v:`₹${(maint$/1000).toFixed(0)}K`,      i:"🔧",c:"var(--red)"},
      {l:"Operational Cost",    v:`₹${((fuel$+maint$)/1000).toFixed(0)}K`,i:"💰",c:"var(--purple)"},
      {l:"Cost Per Vehicle",    v:`₹${Math.round((fuel$+maint$)/vehicles.length/1000)}K`,i:"📈",c:"var(--green)"},
    ],
  };
  const kpis = kpiMap[r]||kpiMap.manager;

  return (
    <>
      <div className="role-wb" style={{background:`${cfg.color}0f`,border:`1px solid ${cfg.color}22`}}>
        <span style={{fontSize:28}}>{cfg.icon}</span>
        <div>
          <div style={{fontFamily:"Syne",fontWeight:700,fontSize:16}}>Welcome, {user.name.split(" ")[0]}</div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>Logged in as <strong style={{color:cfg.color}}>{cfg.label}</strong> — your workspace is customised for your role.</div>
        </div>
      </div>
      <div className="kpi-grid">
        {kpis.map((k,i)=>(
          <div key={i} className="kpi">
            <div className="kpi-glow" style={{background:k.c}}/>
            <div className="kpi-icon">{k.i}</div>
            <div className="kpi-val" style={{color:k.c}}>{k.v}</div>
            <div className="kpi-lbl">{k.l}</div>
          </div>
        ))}
      </div>
      <div className="two-col">
        <div className="tc">
          <div className="th"><span className="tt">Recent Trips</span></div>
          <div className="tw"><table><thead><tr><th>Code</th><th>Route</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{trips.slice(0,4).map(t=>(
              <tr key={t.id}>
                <td><span className="tag">{t.code}</span></td>
                <td>{t.origin} → {t.destination}</td>
                <td><Badge status={t.status}/></td>
                <td className="muted">{t.date}</td>
              </tr>
            ))}</tbody></table></div>
        </div>
        <div className="tc">
          <div className="th"><span className="tt">Fleet Status</span></div>
          <div style={{padding:18}}>
            {[{l:"Available",v:vehicles.filter(v=>v.status==="available").length,c:"var(--green)"},
              {l:"On Trip",  v:active, c:"var(--blue)"},
              {l:"In Shop",  v:inShop, c:"var(--red)"},
              {l:"Retired",  v:vehicles.filter(v=>v.status==="retired").length, c:"var(--muted)"},
            ].map((s,i,arr)=>(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:i<arr.length-1?"1px solid var(--border)":"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.c}}/>
                  <span style={{fontSize:13}}>{s.l}</span>
                </div>
                <span style={{fontFamily:"Syne",fontWeight:700,fontSize:22,color:s.c}}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── VEHICLES ─────────────────────────────────────────────────────────────────
const Vehicles = ({ user, vehicles, setVehicles }) => {
  const wr = canDo(user.role,"vehicles");
  const [q,setQ]=useState(""); const [fs,setFs]=useState("all");
  const [show,setShow]=useState(false); const [ed,setEd]=useState(null);
  const blank={plate:"",make:"",model:"",year:2024,type:"Truck",fuel:"Diesel",capacity:"",region:"West",acqCost:""};
  const [f,setF]=useState(blank);
  const list=vehicles.filter(v=>(fs==="all"||v.status===fs)&&(v.plate.toLowerCase().includes(q.toLowerCase())||v.make.toLowerCase().includes(q.toLowerCase())));
  const openAdd=()=>{setEd(null);setF(blank);setShow(true)};
  const openEd=v=>{setEd(v.id);setF({...v});setShow(true)};
  const save=()=>{ed?setVehicles(vs=>vs.map(v=>v.id===ed?{...v,...f}:v)):setVehicles(vs=>[...vs,{...f,id:Date.now(),status:"available",odometer:0,capacity:Number(f.capacity)}]);setShow(false)};
  const rm=id=>setVehicles(vs=>vs.filter(v=>v.id!==id));
  const retire=id=>setVehicles(vs=>vs.map(v=>v.id===id?{...v,status:v.status==="retired"?"available":"retired"}:v));
  return (<>
    {!wr&&<RONotice/>}
    <div className="fr">
      <input className="finput" placeholder="🔍 Search vehicles…" value={q} onChange={e=>setQ(e.target.value)}/>
      <select className="fsel" style={{width:"auto",minWidth:150}} value={fs} onChange={e=>setFs(e.target.value)}>
        {["all","available","on_trip","maintenance","retired"].map(s=><option key={s} value={s}>{s==="all"?"All Statuses":s.replace("_"," ")}</option>)}
      </select>
      {wr&&<button className="btn btn-a" style={{marginLeft:"auto"}} onClick={openAdd}>+ Add Vehicle</button>}
    </div>
    <div className="tc"><div className="tw"><table>
      <thead><tr><th>Plate</th><th>Vehicle</th><th>Type</th><th>Fuel</th><th>Capacity</th><th>Odometer</th><th>Region</th><th>Status</th>{wr&&<th>Actions</th>}</tr></thead>
      <tbody>{list.map(v=>(
        <tr key={v.id}>
          <td><span className="tag">{v.plate}</span></td>
          <td><strong>{v.make} {v.model}</strong><br/><span className="muted" style={{fontSize:11}}>{v.year}</span></td>
          <td>{v.type}</td><td>{v.fuel}</td>
          <td>{(v.capacity/1000).toFixed(1)} T</td>
          <td>{v.odometer.toLocaleString()} km</td>
          <td>{v.region}</td><td><Badge status={v.status}/></td>
          {wr&&<td><div style={{display:"flex",gap:5}}>
            <button className="btn btn-g btn-sm" onClick={()=>openEd(v)}>Edit</button>
            <button className="btn btn-g btn-sm" style={{color:v.status==="retired"?"var(--green)":"var(--amber)"}} onClick={()=>retire(v.id)}>{v.status==="retired"?"Restore":"Retire"}</button>
            <button className="btn btn-d btn-sm" onClick={()=>rm(v.id)}>✕</button>
          </div></td>}
        </tr>
      ))}</tbody>
    </table>{list.length===0&&<div className="empty"><div className="empty-icon">🚗</div><div>No vehicles found</div></div>}</div></div>
    {show&&<Modal title={ed?"Edit Vehicle":"Add Vehicle"} onClose={()=>setShow(false)}>
      <div className="fgrid">
        {[["Plate","plate"],["Make","make"],["Model","model"],["Year","year"],["Capacity (kg)","capacity"],["Acq. Cost (₹)","acqCost"]].map(([l,k])=>(
          <div className="fg" key={k}><label className="fl">{l}</label><input className="fi" value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))}/></div>
        ))}
        {[["Type","type",["Truck","Van","Bike"]],["Fuel","fuel",["Diesel","Petrol","Electric","CNG"]],["Region","region",["North","South","East","West"]]].map(([l,k,opts])=>(
          <div className="fg" key={k}><label className="fl">{l}</label>
          <select className="fsel" value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>
        ))}
      </div>
      <div className="md-act"><button className="btn btn-g" onClick={()=>setShow(false)}>Cancel</button><button className="btn btn-a" onClick={save}>Save</button></div>
    </Modal>}
  </>);
};

// ─── DRIVERS ──────────────────────────────────────────────────────────────────
const Drivers = ({ user, drivers, setDrivers }) => {
  const wr=canDo(user.role,"drivers");
  const [q,setQ]=useState(""); const [show,setShow]=useState(false); const [ed,setEd]=useState(null);
  const blank={name:"",phone:"",license:"",class:"HMV",expiry:"",status:"active"};
  const [f,setF]=useState(blank);
  const expired=d=>new Date(d.expiry)<new Date();
  const soon=d=>{const x=(new Date(d.expiry)-new Date())/86400000;return x>0&&x<90};
  const scoreC=s=>s>=90?"var(--green)":s>=75?"var(--amber)":"var(--red)";
  const list=drivers.filter(d=>d.name.toLowerCase().includes(q.toLowerCase())||d.license.includes(q));
  const openEd=d=>{setEd(d.id);setF({...d});setShow(true)};
  const save=()=>{ed?setDrivers(ds=>ds.map(d=>d.id===ed?{...d,...f}:d)):setDrivers(ds=>[...ds,{...f,id:Date.now(),trips:0,score:85,incidents:0}]);setShow(false)};
  return (<>
    {!wr&&<RONotice/>}
    {(user.role==="safety_officer"||user.role==="manager")&&(
      <div style={{marginBottom:16}}>
        {drivers.filter(d=>expired(d)).map(d=><div key={d.id} className="alert-r danger">🔴 <strong>{d.name}</strong> — license <span className="tag">{d.license}</span> <strong>EXPIRED</strong> {d.expiry}. Blocked from dispatch.</div>)}
        {drivers.filter(d=>!expired(d)&&soon(d)).map(d=><div key={d.id} className="alert-r warn">🟡 <strong>{d.name}</strong> — expires {d.expiry}. Renew soon.</div>)}
      </div>
    )}
    <div className="fr">
      <input className="finput" placeholder="🔍 Search drivers…" value={q} onChange={e=>setQ(e.target.value)}/>
      {wr&&<button className="btn btn-a" style={{marginLeft:"auto"}} onClick={()=>{setEd(null);setF(blank);setShow(true)}}>+ Add Driver</button>}
    </div>
    <div className="tc"><div className="tw"><table>
      <thead><tr><th>Driver</th><th>Phone</th><th>License</th><th>Class</th><th>Expiry</th><th>Trips</th><th>Score</th><th>Incidents</th><th>Status</th>{wr&&<th>Actions</th>}</tr></thead>
      <tbody>{list.map(d=>(
        <tr key={d.id}>
          <td><strong>{d.name}</strong></td>
          <td className="muted">{d.phone}</td>
          <td><span className="tag">{d.license}</span></td>
          <td>{d.class}</td>
          <td><span style={{color:expired(d)?"var(--red)":soon(d)?"var(--amber)":"inherit",fontWeight:expired(d)||soon(d)?600:400}}>
            {d.expiry} {expired(d)?"⚠ EXPIRED":soon(d)?"⚠ Soon":""}
          </span></td>
          <td>{d.trips}</td>
          <td><div className="sbar-wrap"><span style={{fontFamily:"Syne",fontWeight:700,color:scoreC(d.score),minWidth:26}}>{d.score}</span>
            <div className="sbar-bg"><div className="sbar-fill" style={{width:`${d.score}%`,background:scoreC(d.score)}}/></div></div></td>
          <td style={{color:d.incidents>=2?"var(--red)":d.incidents>0?"var(--amber)":"var(--green)",fontWeight:600}}>{d.incidents}</td>
          <td><Badge status={d.status}/></td>
          {wr&&<td><div style={{display:"flex",gap:5}}>
            <button className="btn btn-g btn-sm" onClick={()=>openEd(d)}>Edit</button>
            <button className="btn btn-d btn-sm" onClick={()=>setDrivers(ds=>ds.filter(x=>x.id!==d.id))}>✕</button>
          </div></td>}
        </tr>
      ))}</tbody>
    </table></div></div>
    {show&&<Modal title={ed?"Edit Driver":"Add Driver"} onClose={()=>setShow(false)}>
      <div className="fgrid">
        {[["Full Name","name"],["Phone","phone"],["License No.","license"]].map(([l,k])=>(
          <div className="fg" key={k}><label className="fl">{l}</label><input className="fi" value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))}/></div>
        ))}
        <div className="fg"><label className="fl">Expiry Date</label><input className="fi" type="date" value={f.expiry} onChange={e=>setF(p=>({...p,expiry:e.target.value}))}/></div>
        <div className="fg"><label className="fl">Class</label><select className="fsel" value={f.class} onChange={e=>setF(p=>({...p,class:e.target.value}))}>{["HMV","LMV","MCWG"].map(c=><option key={c}>{c}</option>)}</select></div>
        <div className="fg"><label className="fl">Status</label><select className="fsel" value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))}>{["active","on_leave","suspended"].map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="md-act"><button className="btn btn-g" onClick={()=>setShow(false)}>Cancel</button><button className="btn btn-a" onClick={save}>Save</button></div>
    </Modal>}
  </>);
};

// ─── TRIPS ────────────────────────────────────────────────────────────────────
const Trips = ({ user, trips, setTrips, vehicles, setVehicles, drivers, setDrivers }) => {
  const wr=canDo(user.role,"trips");
  const [show,setShow]=useState(false);
  const [f,setF]=useState({vehicleId:"",driverId:"",origin:"",destination:"",cargo:"",date:""});
  const [val,setVal]=useState(null);
  const avV=vehicles.filter(v=>v.status==="available");
  const avD=drivers.filter(d=>d.status==="active"&&new Date(d.expiry)>new Date());
  const selV=vehicles.find(v=>v.id===parseInt(f.vehicleId));
  useEffect(()=>{
    if(f.vehicleId&&f.cargo&&selV)
      parseInt(f.cargo)>selV.capacity
        ?setVal({t:"e",m:`⚠ Cargo (${Number(f.cargo).toLocaleString()} kg) exceeds capacity (${selV.capacity.toLocaleString()} kg). Reduce load or pick a larger vehicle.`})
        :setVal({t:"o",m:`✓ Cargo OK: ${Number(f.cargo).toLocaleString()} kg / ${selV.capacity.toLocaleString()} kg`});
  },[f.vehicleId,f.cargo]);
  const dispatch=()=>{
    if(!f.vehicleId||!f.driverId||!f.origin||!f.destination||!f.cargo){setVal({t:"e",m:"⚠ All fields are required."});return}
    if(val?.t==="e")return;
    const t={id:Date.now(),code:`TRP-${String(trips.length+1).padStart(3,"0")}`,vehicleId:parseInt(f.vehicleId),driverId:parseInt(f.driverId),origin:f.origin,destination:f.destination,cargo:parseInt(f.cargo),date:f.date,status:"scheduled",distance:0};
    setTrips(ts=>[...ts,t]);
    setVehicles(vs=>vs.map(v=>v.id===t.vehicleId?{...v,status:"on_trip"}:v));
    setDrivers(ds=>ds.map(d=>d.id===t.driverId?{...d,status:"on_trip"}:d));
    setShow(false);setVal(null);setF({vehicleId:"",driverId:"",origin:"",destination:"",cargo:"",date:""});
  };
  const upd=(id,st)=>{
    const t=trips.find(t=>t.id===id);
    setTrips(ts=>ts.map(x=>x.id===id?{...x,status:st}:x));
    if(st==="completed"||st==="cancelled"){
      setVehicles(vs=>vs.map(v=>v.id===t.vehicleId?{...v,status:"available"}:v));
      setDrivers(ds=>ds.map(d=>d.id===t.driverId?{...d,status:"active",trips:d.trips+1}:d));
    }
  };
  return (<>
    {!wr&&<RONotice/>}
    {wr&&<div style={{marginBottom:16,display:"flex",justifyContent:"flex-end",gap:10,alignItems:"center"}}>
      <span style={{fontSize:12,color:"var(--muted)"}}>{avV.length} vehicles · {avD.length} drivers available</span>
      <button className="btn btn-a" onClick={()=>{setShow(true);setVal(null)}}>+ Create Trip</button>
    </div>}
    <div className="tc"><div className="tw"><table>
      <thead><tr><th>Code</th><th>Vehicle</th><th>Driver</th><th>Route</th><th>Cargo</th><th>Date</th><th>Status</th>{wr&&<th>Actions</th>}</tr></thead>
      <tbody>{trips.map(t=>{
        const v=vehicles.find(vv=>vv.id===t.vehicleId),d=drivers.find(dd=>dd.id===t.driverId);
        return(<tr key={t.id}>
          <td><span className="tag">{t.code}</span></td>
          <td>{v?`${v.make} ${v.model}`:"–"}<br/><span className="muted" style={{fontSize:11}}>{v?.plate}</span></td>
          <td>{d?.name||"–"}</td>
          <td>{t.origin} → {t.destination}</td>
          <td>{t.cargo?.toLocaleString()} kg</td>
          <td className="muted">{t.date}</td><td><Badge status={t.status}/></td>
          {wr&&<td><div style={{display:"flex",gap:5}}>
            {t.status==="scheduled"&&<button className="btn btn-g btn-sm" onClick={()=>upd(t.id,"in_progress")}>▶ Start</button>}
            {t.status==="in_progress"&&<button className="btn btn-g btn-sm" style={{color:"var(--green)"}} onClick={()=>upd(t.id,"completed")}>✓ Done</button>}
            {(t.status==="scheduled"||t.status==="in_progress")&&<button className="btn btn-d btn-sm" onClick={()=>upd(t.id,"cancelled")}>Cancel</button>}
          </div></td>}
        </tr>)
      })}</tbody>
    </table>{trips.length===0&&<div className="empty"><div className="empty-icon">📦</div><div>No trips yet</div></div>}</div></div>
    {show&&<Modal title="Create New Trip" onClose={()=>{setShow(false);setVal(null)}}>
      {val&&<div className={val.t==="e"?"v-err":"v-ok"}>{val.m}</div>}
      <div className="fgrid">
        <div className="fg"><label className="fl">Vehicle {selV&&<span style={{color:"var(--accent)",fontWeight:400}}>· {(selV.capacity/1000).toFixed(1)}T cap</span>}</label>
          <select className="fsel" value={f.vehicleId} onChange={e=>setF(p=>({...p,vehicleId:e.target.value}))}>
            <option value="">Select vehicle…</option>{avV.map(v=><option key={v.id} value={v.id}>{v.plate} — {(v.capacity/1000).toFixed(1)}T</option>)}
          </select></div>
        <div className="fg"><label className="fl">Driver</label>
          <select className="fsel" value={f.driverId} onChange={e=>setF(p=>({...p,driverId:e.target.value}))}>
            <option value="">Select driver…</option>{avD.map(d=><option key={d.id} value={d.id}>{d.name} ({d.class}) · {d.score}</option>)}
          </select></div>
        {[["Origin","origin","City / Hub"],["Destination","destination","City / Hub"]].map(([l,k,ph])=>(
          <div className="fg" key={k}><label className="fl">{l}</label><input className="fi" value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))} placeholder={ph}/></div>
        ))}
        <div className="fg"><label className="fl">Cargo (kg)</label><input className="fi" type="number" value={f.cargo} onChange={e=>setF(p=>({...p,cargo:e.target.value}))} placeholder="e.g. 4500"/></div>
        <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></div>
      </div>
      <div className="md-act"><button className="btn btn-g" onClick={()=>{setShow(false);setVal(null)}}>Cancel</button><button className="btn btn-a" onClick={dispatch}>Dispatch</button></div>
    </Modal>}
  </>);
};

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────
const Maintenance = ({ user, maintenance, setMaintenance, vehicles, setVehicles }) => {
  const wr=canDo(user.role,"maintenance");
  const [show,setShow]=useState(false);
  const [f,setF]=useState({vehicleId:"",type:"oil_change",vendor:"",cost:"",date:"",notes:""});
  const save=()=>{
    setMaintenance(m=>[...m,{...f,id:Date.now(),vehicleId:parseInt(f.vehicleId),cost:parseFloat(f.cost),status:"in_progress"}]);
    setVehicles(vs=>vs.map(v=>v.id===parseInt(f.vehicleId)?{...v,status:"maintenance"}:v));
    setShow(false);
  };
  const done=id=>{
    const lg=maintenance.find(m=>m.id===id);
    setMaintenance(m=>m.map(x=>x.id===id?{...x,status:"completed"}:x));
    setVehicles(vs=>vs.map(v=>v.id===lg.vehicleId?{...v,status:"available"}:v));
  };
  return (<>
    {!wr&&<RONotice/>}
    {wr&&<div style={{marginBottom:16,display:"flex",justifyContent:"flex-end",gap:12,alignItems:"center"}}>
      <span style={{fontSize:12,color:"var(--muted)"}}>⚠ Logging marks vehicle <strong style={{color:"var(--red)"}}>In Shop</strong></span>
      <button className="btn btn-a" onClick={()=>setShow(true)}>+ Log Service</button>
    </div>}
    <div className="tc"><div className="tw"><table>
      <thead><tr><th>Vehicle</th><th>Type</th><th>Vendor</th><th>Cost</th><th>Date</th><th>Notes</th><th>Status</th>{wr&&<th>Actions</th>}</tr></thead>
      <tbody>{maintenance.map(m=>{
        const v=vehicles.find(vv=>vv.id===m.vehicleId);
        return(<tr key={m.id}>
          <td>{v?`${v.make} ${v.model}`:"–"}<br/><span className="muted" style={{fontSize:11}}>{v?.plate}</span></td>
          <td style={{textTransform:"capitalize"}}>{m.type.replace("_"," ")}</td>
          <td>{m.vendor}</td><td>₹{m.cost?.toLocaleString()}</td>
          <td className="muted">{m.date}</td>
          <td style={{maxWidth:180,fontSize:12,color:"var(--muted)"}}>{m.notes}</td>
          <td><Badge status={m.status}/></td>
          {wr&&<td>{m.status==="in_progress"&&<button className="btn btn-g btn-sm" style={{color:"var(--green)"}} onClick={()=>done(m.id)}>Mark Done</button>}</td>}
        </tr>)
      })}</tbody>
    </table>{maintenance.length===0&&<div className="empty"><div className="empty-icon">🔧</div><div>No records</div></div>}</div></div>
    {show&&<Modal title="Log Maintenance" onClose={()=>setShow(false)}>
      <div className="fgrid">
        <div className="fg full"><label className="fl">Vehicle</label>
          <select className="fsel" value={f.vehicleId} onChange={e=>setF(p=>({...p,vehicleId:e.target.value}))}>
            <option value="">Select…</option>{vehicles.filter(v=>v.status!=="retired").map(v=><option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model}</option>)}
          </select></div>
        <div className="fg"><label className="fl">Type</label>
          <select className="fsel" value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>
            {["oil_change","inspection","repair","tire","brake","electrical","bodywork","other"].map(t=><option key={t} value={t}>{t.replace("_"," ")}</option>)}
          </select></div>
        <div className="fg"><label className="fl">Vendor</label><input className="fi" value={f.vendor} onChange={e=>setF(p=>({...p,vendor:e.target.value}))} placeholder="Service center"/></div>
        <div className="fg"><label className="fl">Cost (₹)</label><input className="fi" type="number" value={f.cost} onChange={e=>setF(p=>({...p,cost:e.target.value}))}/></div>
        <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></div>
        <div className="fg full"><label className="fl">Notes</label><input className="fi" value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="Details…"/></div>
      </div>
      <div className="md-act"><button className="btn btn-g" onClick={()=>setShow(false)}>Cancel</button><button className="btn btn-a" onClick={save}>Log Service</button></div>
    </Modal>}
  </>);
};

// ─── FUEL ─────────────────────────────────────────────────────────────────────
const Fuel = ({ user, fuelLogs, setFuelLogs, vehicles, drivers }) => {
  const wr=canDo(user.role,"fuel");
  const [show,setShow]=useState(false);
  const [f,setF]=useState({vehicleId:"",driverId:"",litres:"",cost:"",date:"",station:"",odometer:""});
  const save=()=>{setFuelLogs(fl=>[...fl,{...f,id:Date.now(),vehicleId:parseInt(f.vehicleId),driverId:parseInt(f.driverId),litres:parseFloat(f.litres),cost:parseFloat(f.cost)}]);setShow(false);setF({vehicleId:"",driverId:"",litres:"",cost:"",date:"",station:"",odometer:""})};
  const total$=fuelLogs.reduce((s,x)=>s+x.cost,0),totalL=fuelLogs.reduce((s,x)=>s+x.litres,0);
  return (<>
    {!wr&&<RONotice/>}
    <div className="three-col" style={{marginBottom:22}}>
      {[{l:"Total Spend",v:`₹${total$.toLocaleString()}`,c:"var(--amber)"},{l:"Total Litres",v:`${totalL.toLocaleString()} L`,c:"var(--blue)"},{l:"Avg ₹ / Litre",v:`₹${(total$/totalL||0).toFixed(1)}`,c:"var(--accent)"}].map((k,i)=>(
        <div key={i} className="kpi"><div className="kpi-val" style={{color:k.c,fontSize:26}}>{k.v}</div><div className="kpi-lbl">{k.l}</div></div>
      ))}
    </div>
    {wr&&<div style={{marginBottom:16,display:"flex",justifyContent:"flex-end"}}><button className="btn btn-a" onClick={()=>setShow(true)}>+ Add Fuel Log</button></div>}
    <div className="tc"><div className="tw"><table>
      <thead><tr><th>Vehicle</th><th>Driver</th><th>Litres</th><th>Cost</th><th>₹/L</th><th>Station</th><th>Date</th></tr></thead>
      <tbody>{fuelLogs.map(fl=>{
        const v=vehicles.find(vv=>vv.id===fl.vehicleId),d=drivers.find(dd=>dd.id===fl.driverId);
        return(<tr key={fl.id}>
          <td>{v?`${v.make} ${v.model}`:"–"}<br/><span className="muted" style={{fontSize:11}}>{v?.plate}</span></td>
          <td>{d?.name||"–"}</td><td>{fl.litres} L</td><td>₹{fl.cost?.toLocaleString()}</td>
          <td style={{color:"var(--accent)"}}>{(fl.cost/fl.litres).toFixed(1)}</td>
          <td className="muted">{fl.station}</td><td className="muted">{fl.date}</td>
        </tr>)
      })}</tbody>
    </table></div></div>
    {show&&<Modal title="Add Fuel Log" onClose={()=>setShow(false)}>
      <div className="fgrid">
        <div className="fg"><label className="fl">Vehicle</label><select className="fsel" value={f.vehicleId} onChange={e=>setF(p=>({...p,vehicleId:e.target.value}))}><option value="">Select…</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate}</option>)}</select></div>
        <div className="fg"><label className="fl">Driver</label><select className="fsel" value={f.driverId} onChange={e=>setF(p=>({...p,driverId:e.target.value}))}><option value="">Select…</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        {[["Litres","litres","number"],["Cost (₹)","cost","number"],["Odometer","odometer","number"],["Station","station","text"]].map(([l,k,t])=>(
          <div className="fg" key={k}><label className="fl">{l}</label><input className="fi" type={t} value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))}/></div>
        ))}
        <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></div>
      </div>
      <div className="md-act"><button className="btn btn-g" onClick={()=>setShow(false)}>Cancel</button><button className="btn btn-a" onClick={save}>Save</button></div>
    </Modal>}
  </>);
};

// ─── SAFETY (Safety Officer Only) ─────────────────────────────────────────────
const Safety = ({ user, drivers, maintenance }) => {
  const expired=drivers.filter(d=>new Date(d.expiry)<new Date());
  const soon=drivers.filter(d=>{const x=(new Date(d.expiry)-new Date())/86400000;return x>0&&x<90});
  const hi=drivers.filter(d=>d.incidents>=2);
  const sc=s=>s>=90?"var(--green)":s>=75?"var(--amber)":"var(--red)";
  return (<>
    <div className="three-col" style={{marginBottom:22}}>
      {[{l:"Expired Licenses",v:expired.length,c:"var(--red)"},{l:"Expiring <90 days",v:soon.length,c:"var(--amber)"},{l:"High-Risk Drivers",v:hi.length,c:"var(--purple)"}].map((k,i)=>(
        <div key={i} className="kpi"><div className="kpi-val" style={{color:k.c,fontSize:32}}>{k.v}</div><div className="kpi-lbl">{k.l}</div></div>
      ))}
    </div>
    <div className="two-col">
      <div>
        <div style={{fontFamily:"Syne",fontWeight:700,fontSize:13,marginBottom:12,color:"var(--soft)",textTransform:"uppercase",letterSpacing:".5px"}}>⚠ License Alerts</div>
        {expired.map(d=><div key={d.id} className="alert-r danger">🔴<div><strong>{d.name}</strong><br/><span style={{fontSize:11,color:"var(--muted)"}}>{d.license} · Exp: {d.expiry}</span></div><Badge status="suspended"/></div>)}
        {soon.map(d=><div key={d.id} className="alert-r warn">🟡<div><strong>{d.name}</strong><br/><span style={{fontSize:11,color:"var(--muted)"}}>{d.license} · Exp: {d.expiry}</span></div></div>)}
        {expired.length===0&&soon.length===0&&<div style={{textAlign:"center",padding:24,color:"var(--muted)"}}>✅ All licenses valid</div>}
      </div>
      <div>
        <div style={{fontFamily:"Syne",fontWeight:700,fontSize:13,marginBottom:12,color:"var(--soft)",textTransform:"uppercase",letterSpacing:".5px"}}>🛡 Safety Scores</div>
        {[...drivers].sort((a,b)=>a.score-b.score).map(d=>(
          <div key={d.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid var(--border)"}}>
            <div><div style={{fontSize:13,fontWeight:600}}>{d.name}</div><div style={{fontSize:11,color:"var(--muted)"}}>{d.incidents} incident{d.incidents!==1?"s":""}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:75,height:5,borderRadius:3,background:"var(--border)"}}><div style={{height:5,borderRadius:3,width:`${d.score}%`,background:sc(d.score)}}/></div>
              <span style={{fontFamily:"Syne",fontWeight:700,fontSize:16,color:sc(d.score),minWidth:28}}>{d.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </>);
};

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
const Analytics = ({ user, vehicles, fuelLogs, maintenance, trips }) => {
  const byV=vehicles.map(v=>({plate:v.plate.split("-").slice(-1)[0],litres:fuelLogs.filter(f=>f.vehicleId===v.id).reduce((s,f)=>s+f.litres,0),cost:fuelLogs.filter(f=>f.vehicleId===v.id).reduce((s,f)=>s+f.cost,0)}));
  const roi=vehicles.map(v=>{
    const fuel=fuelLogs.filter(f=>f.vehicleId===v.id).reduce((s,f)=>s+f.cost,0);
    const mt=maintenance.filter(m=>m.vehicleId===v.id).reduce((s,m)=>s+(m.cost||0),0);
    const rev=v.odometer*8,r=((rev-(fuel+mt))/(v.acqCost||3e6)*100).toFixed(1);
    return{vehicle:`${v.make} ${v.model}`,plate:v.plate,roi:parseFloat(r),fuel,mt,rev};
  });
  const pieD=[{name:"Fuel",value:fuelLogs.reduce((s,f)=>s+f.cost,0)},{name:"Maintenance",value:maintenance.reduce((s,m)=>s+(m.cost||0),0)}];
  const PC=["var(--amber)","var(--red)"];
  const tot=pieD.reduce((s,d)=>s+d.value,0);
  return (<>
    {user.role==="financial_analyst"&&<div style={{background:"rgba(168,85,247,.06)",border:"1px solid rgba(168,85,247,.18)",borderRadius:10,padding:"12px 18px",marginBottom:20,fontSize:13,color:"#c084fc",display:"flex",gap:8,alignItems:"center"}}>
      📊 <strong>Financial Analyst</strong> — Full cost breakdown & ROI analysis
    </div>}
    <div className="kpi-grid" style={{marginBottom:22}}>
      {[{l:"Fuel Spend",v:`₹${(fuelLogs.reduce((s,f)=>s+f.cost,0)/1000).toFixed(0)}K`,c:"var(--amber)"},{l:"Maintenance",v:`₹${(maintenance.reduce((s,m)=>s+(m.cost||0),0)/1000).toFixed(0)}K`,c:"var(--red)"},{l:"Operational Total",v:`₹${(tot/1000).toFixed(0)}K`,c:"var(--purple)"},{l:"Completed Trips",v:trips.filter(t=>t.status==="completed").length,c:"var(--green)"}].map((k,i)=>(
        <div key={i} className="kpi"><div className="kpi-val" style={{color:k.c,fontSize:26}}>{k.v}</div><div className="kpi-lbl">{k.l}</div></div>
      ))}
    </div>
    <div className="two-col" style={{marginBottom:22}}>
      <div className="cc">
        <div className="ct">⛽ Fuel by Vehicle</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byV} margin={{top:0,right:10,left:0,bottom:18}}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
            <XAxis dataKey="plate" tick={{fill:"var(--muted)",fontSize:11}} angle={-20} textAnchor="end"/>
            <YAxis tick={{fill:"var(--muted)",fontSize:11}}/>
            <Tooltip contentStyle={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)"}}/>
            <Legend wrapperStyle={{color:"var(--muted)",fontSize:12}}/>
            <Bar dataKey="litres" name="Litres" fill="#00d4ff" radius={[4,4,0,0]}/>
            <Bar dataKey="cost" name="Cost ₹" fill="#7c3aed" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="cc">
        <div className="ct">💰 Cost Breakdown</div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart><Pie data={pieD} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,value})=>`${name}: ₹${(value/1000).toFixed(0)}K`} labelLine={false}>
            {pieD.map((_,i)=><Cell key={i} fill={PC[i]}/>)}
          </Pie><Tooltip contentStyle={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)"}}/></PieChart>
        </ResponsiveContainer>
        <div style={{display:"flex",gap:18,justifyContent:"center",marginTop:6}}>
          {pieD.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}>
            <div style={{width:9,height:9,borderRadius:2,background:PC[i]}}/><span className="muted">{d.name}: </span><strong>₹{(d.value/1000).toFixed(0)}K</strong>
          </div>)}
        </div>
      </div>
    </div>
    <div className="cc">
      <div className="ct">📊 Vehicle ROI</div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["Vehicle","Plate","Revenue","Fuel","Maint.","Net","ROI"].map(h=><th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".8px",borderBottom:"1px solid var(--border)"}}>{h}</th>)}</tr></thead>
        <tbody>{roi.map((r,i)=>(
          <tr key={i}>
            <td style={{padding:"11px 13px",fontSize:13,fontWeight:600}}>{r.vehicle}</td>
            <td style={{padding:"11px 13px"}}><span className="tag">{r.plate}</span></td>
            <td style={{padding:"11px 13px",color:"var(--green)"}}>₹{(r.rev/1000).toFixed(0)}K</td>
            <td style={{padding:"11px 13px",color:"var(--amber)"}}>₹{(r.fuel/1000).toFixed(0)}K</td>
            <td style={{padding:"11px 13px",color:"var(--red)"}}>₹{(r.mt/1000).toFixed(0)}K</td>
            <td style={{padding:"11px 13px",fontFamily:"Syne",fontWeight:700,color:r.rev-r.fuel-r.mt>0?"var(--green)":"var(--red)"}}>₹{((r.rev-r.fuel-r.mt)/1000).toFixed(0)}K</td>
            <td style={{padding:"11px 13px"}}><span style={{fontFamily:"Syne",fontWeight:700,fontSize:15,color:r.roi>=0?"var(--green)":"var(--red)"}}>{r.roi>=0?"+":""}{r.roi}%</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>);
};

// ─── NAV DEFINITION ───────────────────────────────────────────────────────────
const NAV_DEF = [
  {id:"dashboard",  label:"Command Center",  icon:"⬡", section:"Overview"},
  {id:"trips",      label:"Trip Dispatcher", icon:"🗺", section:"Operations"},
  {id:"vehicles",   label:"Vehicle Registry",icon:"🚛", section:"Fleet"},
  {id:"drivers",    label:"Drivers",         icon:"👤", section:"Fleet"},
  {id:"maintenance",label:"Maintenance",     icon:"🔧", section:"Fleet"},
  {id:"fuel",       label:"Fuel Logs",       icon:"⛽", section:"Finance"},
  {id:"safety",     label:"Safety Monitor",  icon:"🛡", section:"Safety"},
  {id:"analytics",  label:"Analytics & ROI", icon:"📊", section:"Finance"},
];

const TITLES = {
  dashboard:  ["Command Center",  "Role-specific fleet overview"],
  trips:      ["Trip Dispatcher", "Create, assign & manage routes"],
  vehicles:   ["Vehicle Registry","Asset management & lifecycle"],
  drivers:    ["Driver Profiles", "Compliance, scores & HR"],
  maintenance:["Maintenance",     "Service & repair tracking"],
  fuel:       ["Fuel Logs",       "Fuel spend per asset"],
  safety:     ["Safety Monitor",  "License compliance & driver safety"],
  analytics:  ["Analytics & ROI", "Financial performance & cost analysis"],
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]               = useState(null);
  const [page, setPage]               = useState("dashboard");
  const [vehicles, setVehicles]       = useState(INIT_VEHICLES);
  const [drivers, setDrivers]         = useState(INIT_DRIVERS);
  const [trips, setTrips]             = useState(INIT_TRIPS);
  const [maintenance, setMaintenance] = useState(INIT_MAINTENANCE);
  const [fuelLogs, setFuelLogs]       = useState(INIT_FUEL);

  const login  = u => { setUser(u); setPage("dashboard"); };
  const logout = () => setUser(null);

  if (!user) return (<><style>{CSS}</style><LoginPage onLogin={login}/></>);

  const cfg = ROLE_CONFIG[user.role];
  const visNav = NAV_DEF.filter(n=>canSee(user.role,n.id));
  const sections = [...new Set(visNav.map(n=>n.section))];
  const [title, sub] = TITLES[page]||["Page",""];
  const isReadonly = !canDo(user.role,page) && page!=="dashboard";

  const props = { user, vehicles, setVehicles, drivers, setDrivers, trips, setTrips, maintenance, setMaintenance, fuelLogs, setFuelLogs };

  const renderPage = () => {
    if(!canSee(user.role,page)) return <AccessDenied/>;
    switch(page){
      case "dashboard":   return <Dashboard   {...props}/>;
      case "vehicles":    return <Vehicles    {...props}/>;
      case "drivers":     return <Drivers     {...props}/>;
      case "trips":       return <Trips       {...props}/>;
      case "maintenance": return <Maintenance {...props}/>;
      case "fuel":        return <Fuel        {...props}/>;
      case "safety":      return <Safety      {...props}/>;
      case "analytics":   return <Analytics   {...props}/>;
      default: return null;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-logo-t">⚡ FleetFlow</div>
            <div className="sb-logo-s">Logistics Platform</div>
          </div>
          <div className="sb-role" style={{background:`${cfg.color}10`,border:`1px solid ${cfg.color}22`}}>
            <span className="sb-role-icon">{cfg.icon}</span>
            <div><div className="sb-role-name" style={{color:cfg.color}}>{cfg.label}</div><div className="sb-role-label">Active Role</div></div>
          </div>
          <nav className="sb-nav">
            {sections.map(sec=>(
              <div key={sec} className="sb-sec">
                <div className="sb-sec-lbl">{sec}</div>
                {NAV_DEF.filter(n=>n.section===sec).map(n=>{
                  const ok=canSee(user.role,n.id);
                  return(
                    <div key={n.id} className={`ni${page===n.id?" active":""}${!ok?" locked":""}`}
                      style={page===n.id?{background:`${cfg.color}14`,color:cfg.color}:{}}
                      onClick={()=>ok&&setPage(n.id)}>
                      <span className="ni-icon">{n.icon}</span>
                      {n.label}
                      {!ok&&<span className="ni-lock">🔒</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="sb-foot">
            <div className="uc">
              <div className="ua" style={{background:cfg.gradient}}>{user.avatar}</div>
              <div><div className="un">{user.name}</div><div className="ur">{cfg.label}</div></div>
            </div>
            <button className="btn-lo" onClick={logout}>Sign Out</button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="main">
          <div className="topbar">
            <div><div className="pt">{title}</div><div className="ps">{sub}</div></div>
            <div className="tbr">
              <span style={{fontSize:11,color:"var(--muted)"}}>
                {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}
              </span>
              {isReadonly&&canSee(user.role,page)&&(
                <span style={{fontSize:11,background:"rgba(245,158,11,.1)",color:"#fbbf24",padding:"3px 9px",borderRadius:20,border:"1px solid rgba(245,158,11,.2)"}}>👁 Read Only</span>
              )}
              <RoleBadge role={user.role}/>
            </div>
          </div>
          <div className="content">{renderPage()}</div>
        </main>
      </div>
    </>
  );
}
