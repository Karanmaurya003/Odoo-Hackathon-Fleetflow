import { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api';
import { TopBar, Spinner, EmptyState, StatusPill, KpiCard } from '../components/UI';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import {
  Download, TrendingUp, Fuel, DollarSign, Activity,
  Trophy, AlertTriangle, BarChart3, RefreshCw
} from 'lucide-react';

const TT_STYLE = {
  contentStyle: {
    background: '#0b1520', border: '1px solid #1a3050',
    borderRadius: '2px', fontFamily: 'Share Tech Mono',
    fontSize: '11px', color: '#c8dff0'
  },
  labelStyle: { color: '#4a6680' }
};

export default function Analytics() {
  const [dash, setDash]         = useState(null);
  const [roi, setRoi]           = useState(null);
  const [cpkm, setCpkm]         = useState(null);
  const [topRev, setTopRev]     = useState(null);
  const [fuelMon, setFuelMon]   = useState(null);
  const [alerts, setAlerts]     = useState(null);
  const [loading, setLoading]   = useState(true);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      analyticsAPI.dashboard(),
      analyticsAPI.roi(),
      analyticsAPI.costPerKm(),
      analyticsAPI.topRevenue({ limit: 5 }),
      analyticsAPI.monthlyFuel(),
      analyticsAPI.alerts(),
    ]).then(([d, r, c, t, f, a]) => {
      setDash(d.data);
      setRoi(r.data);
      setCpkm(c.data);
      setTopRev(t.data);
      setFuelMon(f.data);
      setAlerts(a.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>
  );

  const fin    = dash?.financials || {};
  const roiVehicles = roi?.vehicles || [];
  const cpkmVehicles = cpkm?.vehicles || [];
  const topVehicles  = topRev?.top_vehicles || [];
  const monthlyRollup = fuelMon?.monthly_rollup || [];
  const licenseAlerts = [
    ...(alerts?.license_alerts?.expired || []),
    ...(alerts?.license_alerts?.expiring_soon || [])
  ];
  const utilAlert = alerts?.utilization_alert;

  // Chart data for monthly fuel
  const fuelChartData = [...monthlyRollup].reverse().slice(-6);

  // Chart data for ROI
  const roiChartData = roiVehicles
    .filter(v => v.roi !== null)
    .slice(0,8)
    .map(v => ({ name: v.vehicle_name, roi: (v.roi * 100).toFixed(1), revenue: v.total_revenue }));

  return (
    <div className="animate-fade-up">
      <TopBar
        title="Analytics & Reports"
        subtitle="Smart fleet performance intelligence"
        actions={
          <div className="flex gap-2">
            <button onClick={loadAll} className="ff-btn-ghost"><RefreshCw size={14}/></button>
            <button onClick={analyticsAPI.exportFull} className="ff-btn-primary">
              <Download size={14}/> Export Full CSV
            </button>
          </div>
        }
      />

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Fleet Cost/KM"
          value={cpkm?.fleet_summary?.fleet_cost_per_km != null
            ? `₹${cpkm.fleet_summary.fleet_cost_per_km}/km` : '—'}
          icon={Activity} color="accent" delay={0}
          sub={`Total KM: ${(cpkm?.fleet_summary?.total_km||0).toLocaleString()}`} />
        <KpiCard label="Net Profit"
          value={`₹${(fin.net_profit||0).toLocaleString()}`}
          icon={TrendingUp} color="accent3" delay={80} />
        <KpiCard label="Total Fuel Spend"
          value={`₹${(fin.total_fuel_cost||0).toLocaleString()}`}
          icon={Fuel} color="accent2" delay={160} />
        <KpiCard label="Maint. Cost"
          value={`₹${(fin.total_maintenance_cost||0).toLocaleString()}`}
          icon={DollarSign} color="accent4" delay={240} />
      </div>

      {/* ── ALERTS STRIP ── */}
      {(licenseAlerts.length > 0 || utilAlert?.alert_triggered) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {utilAlert?.alert_triggered && (
            <div className="ff-panel p-4 border-accent2/30 bg-accent2/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-accent2"/>
                <span className="font-display font-bold text-xs uppercase tracking-widest text-accent2">
                  Low Utilization Alert
                </span>
              </div>
              <div className="font-mono text-xs text-muted">
                Current: <span className="text-accent2 font-bold">{utilAlert.utilization_rate_percent}%</span>
                &nbsp;— below {utilAlert.threshold_percent}% threshold.
                {utilAlert.idle_vehicles?.length > 0 &&
                  ` ${utilAlert.idle_vehicles.length} vehicle(s) idle.`}
              </div>
            </div>
          )}
          {licenseAlerts.length > 0 && (
            <div className="ff-panel p-4 border-accent4/30 bg-accent4/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-accent4"/>
                <span className="font-display font-bold text-xs uppercase tracking-widest text-accent4">
                  License Expiry Alerts
                </span>
              </div>
              <div className="font-mono text-xs text-muted">
                {licenseAlerts.map(d => (
                  <span key={d.driver_id} className="inline-flex items-center gap-1 mr-3">
                    <span className={d.severity==='EXPIRED' ? 'text-accent2' : 'text-accent4'}>{d.name}</span>
                    <span>({d.days_until_expiry < 0 ? 'expired' : `${d.days_until_expiry}d`})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ROW 2: Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Monthly Fuel Chart */}
        <div className="ff-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="section-label mb-0">Monthly Fuel Spend</div>
            <button onClick={analyticsAPI.exportMonthlyFuel}
              className="ff-btn-ghost text-[10px] py-1 px-2">
              <Download size={11}/> CSV
            </button>
          </div>
          {fuelChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fuelChartData} {...TT_STYLE}>
                <CartesianGrid stroke="#1a3050" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontFamily:'Share Tech Mono', fontSize:10, fill:'#4a6680' }} />
                <YAxis tick={{ fontFamily:'Share Tech Mono', fontSize:10, fill:'#4a6680' }}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip {...TT_STYLE} formatter={v => [`₹${Number(v).toLocaleString()}`, 'Fuel Cost']} />
                <Bar dataKey="total_cost" fill="#00c8ff" radius={[2,2,0,0]} name="Fuel Cost" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Fuel} message="No fuel log data" />
          )}
        </div>

        {/* ROI Chart */}
        <div className="ff-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="section-label mb-0">Vehicle ROI (%)</div>
          </div>
          {roiChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roiChartData} layout="vertical">
                <CartesianGrid stroke="#1a3050" strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" tick={{ fontFamily:'Share Tech Mono', fontSize:10, fill:'#4a6680' }}
                  tickFormatter={v => `${v}%`} />
                <YAxis dataKey="name" type="category" width={90}
                  tick={{ fontFamily:'Share Tech Mono', fontSize:10, fill:'#4a6680' }} />
                <Tooltip {...TT_STYLE} formatter={v => [`${v}%`, 'ROI']} />
                <Bar dataKey="roi" radius={[0,2,2,0]}
                  fill="#39ff8f" name="ROI %"
                  label={{ position:'right', fill:'#39ff8f', fontSize:10, fontFamily:'Share Tech Mono' }}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} message="Complete trips to see ROI" />
          )}
        </div>
      </div>

      {/* ── TOP REVENUE VEHICLES ── */}
      <div className="ff-panel mb-8">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={15} className="text-accent4"/>
            <span className="font-display font-bold text-sm uppercase tracking-widest text-white">
              Top Revenue Vehicles
            </span>
          </div>
          <button onClick={analyticsAPI.exportTopRevenue} className="ff-btn-ghost text-[10px] py-1 px-3">
            <Download size={11}/> Export
          </button>
        </div>
        {topVehicles.length === 0 ? (
          <EmptyState icon={Trophy} message="No completed trips yet" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Rank','Vehicle','Plate','Trips','Revenue','KM','₹/KM','Share %','Net Profit','ROI'].map(h=>(
                  <th key={h} className="table-head whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topVehicles.map(v => (
                <tr key={v.vehicle_id} className="table-row">
                  <td className="table-cell">
                    <span className={`font-display font-black text-lg ${
                      v.rank===1?'text-accent4':v.rank===2?'text-textBase':'text-muted'
                    }`}>#{v.rank}</span>
                  </td>
                  <td className="table-cell text-white font-semibold">{v.name}</td>
                  <td className="table-cell">
                    <span className="font-mono bg-white/5 border border-border px-2 py-0.5 rounded-sm text-xs">
                      {v.license_plate}
                    </span>
                  </td>
                  <td className="table-cell">{v.completed_trips}</td>
                  <td className="table-cell text-accent3 font-bold">₹{v.total_revenue?.toLocaleString()}</td>
                  <td className="table-cell">{v.total_km?.toLocaleString()} km</td>
                  <td className="table-cell text-accent">
                    {v.revenue_per_km ? `₹${v.revenue_per_km}` : '—'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden" style={{minWidth:60}}>
                        <div className="h-full bg-accent rounded-full"
                          style={{ width: `${v.revenue_share_percent}%` }}/>
                      </div>
                      <span className="font-mono text-xs text-muted">{v.revenue_share_percent}%</span>
                    </div>
                  </td>
                  <td className={`table-cell font-bold ${v.net_profit>=0?'text-accent3':'text-accent2'}`}>
                    ₹{v.net_profit?.toLocaleString()}
                  </td>
                  <td className={`table-cell font-bold ${v.roi>=0?'text-accent3':'text-accent2'}`}>
                    {v.roi != null ? `${(v.roi*100).toFixed(2)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── COST PER KM TABLE ── */}
      <div className="ff-panel mb-8">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="font-display font-bold text-sm uppercase tracking-widest text-white">
            Cost per KM — All Vehicles
          </span>
          <button onClick={analyticsAPI.exportCostKm} className="ff-btn-ghost text-[10px] py-1 px-3">
            <Download size={11}/> Export
          </button>
        </div>
        {cpkmVehicles.length === 0 ? (
          <EmptyState icon={Activity} message="No trip data to calculate cost/km" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Vehicle','Plate','Status','Total KM','Fuel Cost','Maint. Cost','Total Cost','Cost/KM','Rating'].map(h=>(
                  <th key={h} className="table-head whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cpkmVehicles.map(v => {
                const ratingColor = {
                  EXCELLENT: 'text-accent3', GOOD: 'text-accent',
                  AVERAGE: 'text-accent4',   POOR: 'text-accent2',
                  NO_DATA: 'text-muted'
                }[v.efficiency_rating] || 'text-muted';
                return (
                  <tr key={v.vehicle_id} className="table-row">
                    <td className="table-cell text-white font-semibold">{v.name}</td>
                    <td className="table-cell">
                      <span className="font-mono bg-white/5 border border-border px-2 py-0.5 rounded-sm text-xs">
                        {v.license_plate}
                      </span>
                    </td>
                    <td className="table-cell"><StatusPill status={v.status}/></td>
                    <td className="table-cell">{v.total_km?.toLocaleString()} km</td>
                    <td className="table-cell text-accent2">₹{v.fuel_cost?.toLocaleString()}</td>
                    <td className="table-cell text-accent4">₹{v.maintenance_cost?.toLocaleString()}</td>
                    <td className="table-cell">₹{v.total_cost?.toLocaleString()}</td>
                    <td className="table-cell font-bold text-accent">
                      {v.cost_per_km ? `₹${v.cost_per_km}/km` : '—'}
                    </td>
                    <td className={`table-cell font-bold font-display tracking-wider text-xs uppercase ${ratingColor}`}>
                      {v.efficiency_rating}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MONTHLY FUEL DETAIL ── */}
      <div className="ff-panel">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="font-display font-bold text-sm uppercase tracking-widest text-white">
            Monthly Fuel Summary
          </span>
          <button onClick={analyticsAPI.exportMonthlyFuel} className="ff-btn-ghost text-[10px] py-1 px-3">
            <Download size={11}/> Export
          </button>
        </div>
        {monthlyRollup.length === 0 ? (
          <EmptyState icon={Fuel} message="No fuel logs recorded yet" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Month','Fills','Total Liters','Total Cost','Avg ₹/Liter'].map(h=>(
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyRollup.map(m => (
                <tr key={m.month} className="table-row">
                  <td className="table-cell font-bold text-white">{m.month}</td>
                  <td className="table-cell">{m.fill_count}</td>
                  <td className="table-cell">{m.total_liters?.toLocaleString()} L</td>
                  <td className="table-cell text-accent2 font-bold">₹{m.total_cost?.toLocaleString()}</td>
                  <td className="table-cell text-accent">
                    {m.avg_cost_per_liter ? `₹${m.avg_cost_per_liter}/L` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
