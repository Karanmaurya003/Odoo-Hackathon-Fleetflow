import { useEffect, useState, useCallback } from 'react';
import { vehiclesAPI } from '../services/api';
import {
  TopBar, StatusPill, Modal, Field, Confirm, EmptyState, Spinner, useToast, Toast
} from '../components/UI';
import { Plus, Search, Pencil, Trash2, PowerOff, Truck, RefreshCw } from 'lucide-react';

const STATUSES = ['', 'Available', 'OnTrip', 'InShop', 'Retired'];

const EMPTY = {
  name: '', license_plate: '', max_capacity: '', odometer: '',
  acquisition_cost: '', status: 'Available'
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const { toasts, toast, remove } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    vehiclesAPI.list(filter ? { status: filter } : {})
      .then(r => setVehicles(r.data.vehicles))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = v   => { setEditing(v); setForm({ ...v }); setModal(true); };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        max_capacity:     Number(form.max_capacity),
        odometer:         Number(form.odometer),
        acquisition_cost: Number(form.acquisition_cost),
      };
      if (editing) {
        await vehiclesAPI.update(editing.id, payload);
        toast.success('Vehicle updated');
      } else {
        await vehiclesAPI.create(payload);
        toast.success('Vehicle created');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    try {
      await vehiclesAPI.delete(id);
      toast.success('Vehicle deleted');
      load();
    } catch (err) { toast.error(err.message); }
    setConfirm(null);
  };

  const handleRetire = async id => {
    try {
      await vehiclesAPI.retire(id);
      toast.success('Vehicle retired');
      load();
    } catch (err) { toast.error(err.message); }
    setConfirm(null);
  };

  const filtered = vehicles.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.license_plate.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-up">
      <Toast toasts={toasts} remove={remove} />
      <TopBar
        title="Vehicles"
        subtitle={`${vehicles.length} registered assets`}
        actions={
          <button className="ff-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Add Vehicle
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="ff-input pl-9" placeholder="Search name or plate..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              className={`ff-btn text-xs py-2 px-4 ${
                filter === s ? 'bg-accent text-bg border-accent' : 'ff-btn-ghost'
              }`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={load} className="ff-btn-ghost">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="ff-panel overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28}/></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Truck} message="No vehicles found" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['#','Name','License Plate','Capacity (kg)','Odometer (km)',
                  'Acq. Cost (₹)','Status','Actions'].map(h => (
                  <th key={h} className="table-head whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.id} className="table-row">
                  <td className="table-cell text-muted">{i+1}</td>
                  <td className="table-cell text-white font-semibold">{v.name}</td>
                  <td className="table-cell">
                    <span className="font-mono bg-white/5 border border-border px-2 py-0.5 rounded-sm text-xs">
                      {v.license_plate}
                    </span>
                  </td>
                  <td className="table-cell">{v.max_capacity.toLocaleString()}</td>
                  <td className="table-cell">{v.odometer.toLocaleString()}</td>
                  <td className="table-cell">₹{v.acquisition_cost.toLocaleString()}</td>
                  <td className="table-cell"><StatusPill status={v.status}/></td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(v)}
                        className="p-1.5 rounded-sm text-muted hover:text-accent hover:bg-accent/10 transition-all">
                        <Pencil size={13}/>
                      </button>
                      <button onClick={() => setConfirm({ type:'retire', id: v.id, name: v.name })}
                        className="p-1.5 rounded-sm text-muted hover:text-accent4 hover:bg-accent4/10 transition-all"
                        title="Retire">
                        <PowerOff size={13}/>
                      </button>
                      <button onClick={() => setConfirm({ type:'delete', id: v.id, name: v.name })}
                        className="p-1.5 rounded-sm text-muted hover:text-accent2 hover:bg-accent2/10 transition-all">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Vehicle' : 'Register Vehicle'}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vehicle Name">
              <input className="ff-input" value={form.name} onChange={set('name')}
                placeholder="e.g. Truck Alpha" required />
            </Field>
            <Field label="License Plate">
              <input className="ff-input" value={form.license_plate} onChange={set('license_plate')}
                placeholder="MH12AB1234" required />
            </Field>
            <Field label="Max Capacity (kg)">
              <input className="ff-input" type="number" min="1" value={form.max_capacity}
                onChange={set('max_capacity')} placeholder="5000" required />
            </Field>
            <Field label="Odometer (km)">
              <input className="ff-input" type="number" min="0" value={form.odometer}
                onChange={set('odometer')} placeholder="0" />
            </Field>
            <Field label="Acquisition Cost (₹)">
              <input className="ff-input" type="number" min="1" value={form.acquisition_cost}
                onChange={set('acquisition_cost')} placeholder="850000" required />
            </Field>
            <Field label="Status">
              <select className="ff-select" value={form.status} onChange={set('status')}>
                {['Available','InShop','Retired'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="ff-btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="ff-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Vehicle' : 'Create Vehicle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM */}
      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        danger
        message={
          confirm?.type === 'delete'
            ? `Permanently delete "${confirm?.name}"? This cannot be undone.`
            : `Retire "${confirm?.name}"? It will be removed from dispatch pool.`
        }
        onConfirm={() =>
          confirm?.type === 'delete' ? handleDelete(confirm.id) : handleRetire(confirm.id)
        }
      />
    </div>
  );
}
