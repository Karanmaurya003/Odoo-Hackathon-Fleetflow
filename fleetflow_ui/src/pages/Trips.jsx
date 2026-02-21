import { useEffect, useState, useCallback } from 'react';
import { tripsAPI, vehiclesAPI, driversAPI } from '../services/api';
import {
  TopBar, StatusPill, Modal, Field, Confirm, EmptyState, Spinner, useToast, Toast
} from '../components/UI';
import { Plus, Search, CheckCircle2, XCircle, Map, RefreshCw, AlertCircle } from 'lucide-react';

const STATUSES = ['', 'Dispatched', 'Completed', 'Cancelled', 'Draft'];

const EMPTY = {
  vehicle_id: '', driver_id: '', cargo_weight: '',
  revenue: '', start_odometer: '',
  start_date: new Date().toISOString().slice(0,10)
};
const COMPLETE_EMPTY = { end_odometer: '', end_date: new Date().toISOString().slice(0,10), revenue: '' };

export default function Trips() {
  const [trips, setTrips]         = useState([]);
  const [vehicles, setVehicles]   = useState([]);
  const [drivers, setDrivers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('');
  const [search, setSearch]       = useState('');
  const [createModal, setCreate]  = useState(false);
  const [completeModal, setComp]  = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [compForm, setCompForm]   = useState(COMPLETE_EMPTY);
  const [saving, setSaving]       = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const [apiError, setApiError]   = useState('');
  const { toasts, toast, remove } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    tripsAPI.list(filter ? { status: filter } : {})
      .then(r => setTrips(r.data.trips))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    vehiclesAPI.list({ status: 'Available' }).then(r => setVehicles(r.data.vehicles));
    driversAPI.list({ status: 'OffDuty' })  .then(r => setDrivers(r.data.drivers));
  }, [createModal]);

  const set     = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setComp2= k => e => setCompForm(p => ({ ...p, [k]: e.target.value }));

  const createTrip = async e => {
    e.preventDefault();
    setSaving(true);
    setApiError('');
    try {
      await tripsAPI.create({
        ...form,
        vehicle_id:     Number(form.vehicle_id),
        driver_id:      Number(form.driver_id),
        cargo_weight:   Number(form.cargo_weight),
        revenue:        Number(form.revenue),
        start_odometer: Number(form.start_odometer),
      });
      toast.success('Trip dispatched successfully');
      setCreate(false); setForm(EMPTY); load();
    } catch (err) {
      setApiError(err.message);
    } finally { setSaving(false); }
  };

  const completeTrip = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await tripsAPI.complete(completeModal.id, {
        end_odometer: Number(compForm.end_odometer),
        end_date:     compForm.end_date,
        revenue:      compForm.revenue ? Number(compForm.revenue) : undefined,
      });
      toast.success('Trip completed');
      setComp(null); setCompForm(COMPLETE_EMPTY); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleCancel = async id => {
    try { await tripsAPI.cancel(id); toast.success('Trip cancelled'); load(); }
    catch (err) { toast.error(err.message); }
    setConfirm(null);
  };

  const filtered = trips.filter(t => {
    const q = search.toLowerCase();
    return String(t.id).includes(q) ||
      String(t.vehicle_id).includes(q) ||
      String(t.driver_id).includes(q);
  });

  return (
    <div className="animate-fade-up">
      <Toast toasts={toasts} remove={remove} />
      <TopBar
        title="Trip Dispatcher"
        subtitle={`${trips.filter(t=>t.status==='Dispatched').length} active · ${trips.filter(t=>t.status==='Completed').length} completed`}
        actions={
          <button className="ff-btn-primary" onClick={() => { setApiError(''); setCreate(true); }}>
            <Plus size={14} /> Dispatch Trip
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="ff-input pl-9" placeholder="Search trip ID..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`ff-btn text-xs py-2 px-4 ${filter === s ? 'bg-accent text-bg border-accent':'ff-btn-ghost'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={load} className="ff-btn-ghost"><RefreshCw size={14}/></button>
      </div>

      {/* Table */}
      <div className="ff-panel overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28}/></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Map} message="No trips found" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Trip #','Vehicle','Driver','Cargo (kg)','Revenue (₹)',
                  'Distance (km)','Status','Dates','Actions'].map(h=>(
                  <th key={h} className="table-head whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="table-row">
                  <td className="table-cell font-bold text-accent">#{t.id}</td>
                  <td className="table-cell">V-{t.vehicle_id}</td>
                  <td className="table-cell">D-{t.driver_id}</td>
                  <td className="table-cell">{t.cargo_weight?.toLocaleString()}</td>
                  <td className="table-cell text-accent3">₹{t.revenue?.toLocaleString()}</td>
                  <td className="table-cell">
                    {t.distance_km != null ? `${t.distance_km.toLocaleString()} km` : '—'}
                  </td>
                  <td className="table-cell"><StatusPill status={t.status}/></td>
                  <td className="table-cell text-muted">
                    <div>{t.start_date}</div>
                    {t.end_date && <div className="text-accent3">{t.end_date}</div>}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {t.status === 'Dispatched' && (
                        <>
                          <button
                            onClick={() => { setCompForm({...COMPLETE_EMPTY, revenue: t.revenue}); setComp(t); }}
                            className="p-1.5 rounded-sm text-muted hover:text-accent3 hover:bg-accent3/10 transition-all"
                            title="Complete Trip">
                            <CheckCircle2 size={14}/>
                          </button>
                          <button
                            onClick={() => setConfirm({ id: t.id })}
                            className="p-1.5 rounded-sm text-muted hover:text-accent2 hover:bg-accent2/10 transition-all"
                            title="Cancel Trip">
                            <XCircle size={14}/>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE TRIP MODAL */}
      <Modal open={createModal} onClose={() => setCreate(false)}
        title="Dispatch New Trip" width="max-w-xl">
        {apiError && (
          <div className="flex items-start gap-2 px-3 py-2.5 mb-4
                          bg-accent2/10 border border-accent2/30 rounded-sm">
            <AlertCircle size={14} className="text-accent2 flex-shrink-0 mt-0.5"/>
            <span className="font-mono text-xs text-accent2 leading-relaxed">{apiError}</span>
          </div>
        )}
        <form onSubmit={createTrip} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vehicle (Available)">
              <select className="ff-select" value={form.vehicle_id} onChange={set('vehicle_id')} required>
                <option value="">Select vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name} — {v.license_plate} ({v.max_capacity}kg)</option>
                ))}
              </select>
            </Field>
            <Field label="Driver (Off Duty)">
              <select className="ff-select" value={form.driver_id} onChange={set('driver_id')} required>
                <option value="">Select driver</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.license_type})</option>
                ))}
              </select>
            </Field>
            <Field label="Cargo Weight (kg)">
              <input className="ff-input" type="number" min="1" value={form.cargo_weight}
                onChange={set('cargo_weight')} placeholder="e.g. 3000" required />
            </Field>
            <Field label="Revenue (₹)">
              <input className="ff-input" type="number" min="0" value={form.revenue}
                onChange={set('revenue')} placeholder="e.g. 12000" />
            </Field>
            <Field label="Start Odometer (km)">
              <input className="ff-input" type="number" min="0" value={form.start_odometer}
                onChange={set('start_odometer')} placeholder="e.g. 45000" required />
            </Field>
            <Field label="Start Date">
              <input className="ff-input" type="date" value={form.start_date} onChange={set('start_date')} required />
            </Field>
          </div>
          <div className="p-3 bg-black/20 border border-border/50 rounded-sm font-mono text-xs text-muted">
            ⚡ System checks: vehicle available · driver off-duty · license valid · cargo ≤ capacity
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" className="ff-btn-ghost" onClick={() => setCreate(false)}>Cancel</button>
            <button type="submit" className="ff-btn-primary" disabled={saving}>
              {saving ? 'Dispatching…' : 'Dispatch Trip'}
            </button>
          </div>
        </form>
      </Modal>

      {/* COMPLETE TRIP MODAL */}
      <Modal open={!!completeModal} onClose={() => setComp(null)}
        title={`Complete Trip #${completeModal?.id}`} width="max-w-md">
        <form onSubmit={completeTrip} className="flex flex-col gap-4">
          <Field label="End Odometer (km)">
            <input className="ff-input" type="number" value={compForm.end_odometer}
              onChange={setComp2('end_odometer')}
              placeholder={`Must be > ${completeModal?.start_odometer}`} required />
          </Field>
          <Field label="End Date">
            <input className="ff-input" type="date" value={compForm.end_date}
              onChange={setComp2('end_date')} />
          </Field>
          <Field label="Final Revenue (₹) — optional update">
            <input className="ff-input" type="number" value={compForm.revenue}
              onChange={setComp2('revenue')} />
          </Field>
          <div className="p-3 bg-accent3/5 border border-accent3/20 rounded-sm font-mono text-xs text-accent3">
            ✓ Vehicle and driver will be released back to Available / OffDuty
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" className="ff-btn-ghost" onClick={() => setComp(null)}>Cancel</button>
            <button type="submit" className="ff-btn-success" disabled={saving}>
              {saving ? 'Completing…' : 'Mark Completed'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        danger
        message={`Cancel trip #${confirm?.id}? Vehicle and driver will be released.`}
        onConfirm={() => handleCancel(confirm.id)}
      />
    </div>
  );
}
