import { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api';
import { KpiCard, StatusPill, Spinner, EmptyState } from '../components/UI';
import { TopBar } from '../components/UI';
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  Truck, Users, Map, DollarSign, Gauge, AlertTriangle,
  TrendingUp, Fuel, Wrench, Activity, ArrowUp, ArrowDown
} from 'lucide-react';

const COLORS = ['#00c8ff','#1a3050','#ffd93d','#4a6680'];

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [alerts, setAlerts]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsAPI.dashboard(), analyticsAPI.alerts()])
      .then(([d, a]) => { setData(d.data); setAlerts(a.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  );

  const fleet = data?.fleet || {};
  const trips = data?.trips || {};
  const fin   = data?.financials || {};
  const eff   = data?.efficiency || {};
  const activeAlerts = data?.active_alerts || {};

  const pieData = [
    { name: 'On Trip',   value: fleet.on_trip    || 0 },
    { name: 'Idle',      value: (fleet.total_vehicles - fleet.on_trip - (fleet.in_shop||0) - (fleet.retired||0)) || 0 },
    { name: 'In Shop',   value: fleet.in_shop    || 0 },
    { name: 'Retired',   value: fleet.retired    || 0 },
  ].filter(d => d.value > 0);

  const licenseAlerts = alerts?.license_alerts?.expiring_soon || [];
  const expiredAlerts = alerts?.license_alerts?.expired       || [];
  const allLicenseAlerts = [...expiredAlerts, ...licenseAlerts];

  return (
    <div className="animate-fade-up">
      <TopBar
        title="Command Center"
        subtitle={`Fleet overview · ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}`}
      />

      {/* ── ALERT BANNER ── */}
      {(activeAlerts.total_critical > 0 || activeAlerts.total_warnings > 0) && (
        <div className="mb-6 p-4 bg-accent2/5 border border-accent2/30 rounded-sm
                        flex items-center gap-4 animate-fade-down">
          <AlertTriangle size={18} className="text-accent2 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-display font-bold text-sm text-accent2 uppercase tracking-wider">
              Active Alerts
            </span>
            <span className="font-mono text-xs text-muted ml-3">
              {activeAlerts.total_critical} critical · {activeAlerts.total_warnings} warnings
            </span>
          </div>
          <a href="#alerts" className="font-mono text-xs text-accent2 underline underline-offset-2">
            View below ↓
          </a>
        </div>
      )}

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Vehicles" value={fleet.total_vehicles}
          icon={Truck} color="accent" delay={0} />
        <KpiCard label="Active Trips" value={trips.dispatched}
          icon={Map} color="accent2" delay={80}
          sub={`${trips.completed} completed total`} />
        <KpiCard label="Total Drivers" value={fleet.total_drivers}
          icon={Users} color="accent3" delay={160} />
        <KpiCard label="Net Profit" value={`₹${(fin.net_profit||0).toLocaleString()}`}
          icon={DollarSign} color="accent4" delay={240}
          sub={`Revenue: ₹${(fin.total_revenue||0).toLocaleString()}`} />
      </div>

      {/* ── ROW 2: Charts + Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Fleet Composition Pie */}
        <div className="ff-panel p-5 animate-fade-up" style={{animationDelay:'100ms'}}>
          <div className="section-label">Fleet Status</div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50}
                       outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background:'#0b1520', border:'1px solid #1a3050',
                                    borderRadius:'2px', fontFamily:'Share Tech Mono',
                                    fontSize:'11px', color:'#c8dff0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 font-mono text-xs text-muted">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:COLORS[i]}}/>
                    {d.name}: <span className="text-textBase ml-1">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={Truck} message="No vehicle data" />
          )}
        </div>

        {/* Utilization Gauge */}
        <div className="ff-panel p-5 animate-fade-up" style={{animationDelay:'200ms'}}>
          <div className="section-label">Utilization Rate</div>
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={140}>
                <RadialBarChart cx={100} cy={110} innerRadius={60} outerRadius={90}
                  startAngle={180} endAngle={0}
                  data={[{ name:'util', value: fleet.utilization_rate_percent || 0, fill:'#00c8ff' }]}>
                  <RadialBar dataKey="value" cornerRadius={4} background={{ fill:'#0e1a28' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
                <div className="font-display font-black text-3xl text-accent">
                  {fleet.utilization_rate_percent ?? 0}%
                </div>
                <div className="font-mono text-[10px] text-muted tracking-widest uppercase">Utilization</div>
              </div>
            </div>
            <div className={`mt-3 font-mono text-xs px-3 py-1 rounded-sm border ${
              fleet.utilization_rate_percent >= 30
                ? 'bg-accent3/10 border-accent3/30 text-accent3'
                : 'bg-accent2/10 border-accent2/30 text-accent2'
            }`}>
              {fleet.utilization_rate_percent >= 30 ? '✓ Normal' : '⚠ Low — below 30% threshold'}
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="ff-panel p-5 animate-fade-up" style={{animationDelay:'300ms'}}>
          <div className="section-label">Financials</div>
          <div className="flex flex-col gap-3">
            {[
              { label:'Total Revenue',   value: fin.total_revenue,           color:'text-accent3', prefix:'₹' },
              { label:'Fuel Cost',       value: fin.total_fuel_cost,         color:'text-accent2', prefix:'₹' },
              { label:'Maintenance',     value: fin.total_maintenance_cost,  color:'text-accent4', prefix:'₹' },
              { label:'Operational Cost',value: fin.total_operational_cost,  color:'text-muted',   prefix:'₹' },
              { label:'Cost / KM',       value: fin.fleet_cost_per_km,       color:'text-accent',  prefix:'₹', suffix:'/km' },
            ].map(({ label, value, color, prefix = '', suffix = '' }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <span className="font-display font-bold text-xs text-muted uppercase tracking-wider">{label}</span>
                <span className={`font-mono text-sm font-bold ${color}`}>
                  {value != null ? `${prefix}${Number(value).toLocaleString()}${suffix}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Trip Stats + KM ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total KM" value={`${(trips.total_km||0).toLocaleString()} km`}
          icon={Activity} color="accent" delay={0} />
        <KpiCard label="Fuel Efficiency"
          value={eff.fuel_efficiency_km_per_liter ? `${eff.fuel_efficiency_km_per_liter} km/L` : '—'}
          icon={Fuel} color="accent3" delay={80} />
        <KpiCard label="Completed Trips" value={trips.completed}
          icon={Map} color="accent2" delay={160}
          sub={`${trips.cancelled} cancelled`} />
        <KpiCard label="Operational Cost" value={`₹${(fin.total_operational_cost||0).toLocaleString()}`}
          icon={DollarSign} color="accent4" delay={240} />
      </div>

      {/* ── ALERTS TABLE ── */}
      <div id="alerts" className="ff-panel animate-fade-up" style={{animationDelay:'400ms'}}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="font-display font-bold text-sm uppercase tracking-widest text-white">
            🔔 Driver License Alerts
          </span>
          <span className="font-mono text-xs text-muted">
            {allLicenseAlerts.length} driver{allLicenseAlerts.length !== 1 ? 's' : ''} flagged
          </span>
        </div>
        {allLicenseAlerts.length === 0 ? (
          <div className="p-8 text-center font-mono text-sm text-accent3">
            ✓ All driver licenses are valid
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Driver','License Type','Expiry Date','Days Left','Status','Severity'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allLicenseAlerts.map(d => (
                <tr key={d.driver_id} className="table-row">
                  <td className="table-cell text-white font-semibold">{d.name}</td>
                  <td className="table-cell">{d.license_type}</td>
                  <td className="table-cell">{d.license_expiry}</td>
                  <td className={`table-cell font-bold ${d.days_until_expiry < 0 ? 'text-accent2' : 'text-accent4'}`}>
                    {d.days_until_expiry < 0 ? `${Math.abs(d.days_until_expiry)}d overdue` : `${d.days_until_expiry}d`}
                  </td>
                  <td className="table-cell"><StatusPill status={d.status} /></td>
                  <td className="table-cell">
                    <span className={`status-pill ${
                      d.severity === 'EXPIRED'  ? 'bg-accent2/15 text-accent2 border-accent2/30' :
                      d.severity === 'CRITICAL' ? 'bg-accent4/15 text-accent4 border-accent4/30' :
                                                  'bg-accent/15  text-accent  border-accent/30'
                    }`}>{d.severity}</span>
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
