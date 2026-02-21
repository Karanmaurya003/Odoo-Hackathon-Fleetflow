# FleetFlow UI — React Frontend

Complete React frontend for the FleetFlow Fleet Management System.

## Tech Stack
- **React 18** with React Router v6
- **Tailwind CSS** — custom design system
- **Recharts** — analytics charts
- **Axios** — API calls with session cookies
- **Lucide React** — icons

## Pages
| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Auth screen, session restore |
| Dashboard | `/dashboard` | KPIs, fleet status, alerts, charts |
| Vehicles | `/vehicles` | Full CRUD, status filters, retire |
| Drivers | `/drivers` | Profiles, safety scores, suspend |
| Trips | `/trips` | Dispatch, complete, cancel workflow |
| Analytics | `/analytics` | ROI, cost/km, top revenue, fuel charts, CSV exports |

---

## ⚡ Quick Start (Step-by-Step)

### Step 1 — Start the Flask backend
```bash
# In your fleetflow/ backend folder:
export DATABASE_URL="mysql+pymysql://root:password@localhost/fleetflow"
export SECRET_KEY="your-secret-key"
python app.py
# Running on http://localhost:5000
```

### Step 2 — Install frontend dependencies
```bash
cd fleetflow-ui/
npm install
```

### Step 3 — Start the React dev server
```bash
npm start
# Opens http://localhost:3000
```
> The `"proxy": "http://localhost:5000"` in package.json automatically forwards
> all `/api/*` calls to Flask — no CORS config needed.

### Step 4 — Login
- URL: **http://localhost:3000/login**
- Email: `admin@fleetflow.com`
- Password: `Admin@123`

---

## Project Structure
```
fleetflow-ui/
├── public/
│   └── index.html              ← Google Fonts loaded here
├── src/
│   ├── index.js                ← React entry point
│   ├── index.css               ← Tailwind + global design tokens
│   ├── App.jsx                 ← Router + protected layout
│   ├── context/
│   │   └── AuthContext.jsx     ← Global user state (login/logout/session)
│   ├── services/
│   │   └── api.js              ← All Axios calls to Flask backend
│   ├── components/
│   │   └── UI.jsx              ← Sidebar, Modal, Toast, KpiCard, etc.
│   └── pages/
│       ├── Login.jsx           ← Auth page
│       ├── Dashboard.jsx       ← Command center
│       ├── Vehicles.jsx        ← Vehicle management
│       ├── Drivers.jsx         ← Driver profiles
│       ├── Trips.jsx           ← Trip dispatcher
│       └── Analytics.jsx       ← Full analytics + CSV exports
├── tailwind.config.js
└── package.json
```

---

## How API Proxy Works
In `package.json`:
```json
"proxy": "http://localhost:5000"
```
This means:
- Frontend calls `/api/auth/login`
- React dev server forwards it to `http://localhost:5000/api/auth/login`
- Session cookie is set and sent back
- All subsequent requests carry the cookie automatically (Axios `withCredentials: true`)

---

## Features by Page

### 🖥 Dashboard
- Live KPI cards (vehicles, trips, revenue, drivers)
- Fleet status pie chart
- Utilization rate gauge (red alert if < 30%)
- Financial summary panel
- License expiry alert table

### 🚛 Vehicles
- Create / Edit / Delete / Retire vehicles
- Filter by status (Available, OnTrip, InShop, Retired)
- Search by name or license plate
- Inline status pills

### 👤 Drivers
- Create / Edit / Delete / Suspend drivers
- License expiry countdown with color coding (green/yellow/red)
- Safety score progress bar
- 7-day expiry banner warning

### 🗺 Trips
- Dispatch new trip (only Available vehicles + OffDuty drivers shown)
- Validation errors shown inline (capacity, license, status)
- Complete trip (enter end odometer → auto-calculates distance)
- Cancel trip
- Status lifecycle: Draft → Dispatched → Completed / Cancelled

### 📊 Analytics
- Cost per KM table with efficiency ratings (Excellent/Good/Average/Poor)
- Top 5 revenue vehicles with ROI and revenue share bars
- Monthly fuel spend bar chart
- Vehicle ROI horizontal bar chart
- Smart alerts strip (license + utilization)
- One-click CSV exports for every dataset

---

## Design System
Colors defined as Tailwind tokens:
```
bg       #070c12   — page background
panel    #0b1520   — card/panel background  
border   #1a3050   — all borders
accent   #00c8ff   — primary cyan (vehicles, links)
accent2  #ff6b2b   — danger/orange (errors, cancel)
accent3  #39ff8f   — success/green (available, profit)
accent4  #ffd93d   — warning/yellow (expiry, in-shop)
muted    #4a6680   — secondary text
```

Fonts:
- Display: **Barlow Condensed** (headings, labels, nav)
- Mono: **Share Tech Mono** (codes, values, tables)
- Body: **Barlow** (descriptions)

---

## Production Build
```bash
npm run build
# Outputs to build/ — serve with any static host or Nginx
```

For production, configure Flask with `CORS` and point the frontend to the real API URL.
