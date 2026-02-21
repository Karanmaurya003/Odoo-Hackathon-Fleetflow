import { useEffect, useState, useCallback } from 'react';
import { driversAPI } from '../services/api';
import {
  TopBar, StatusPill, Modal, Field, Confirm, EmptyState, Spinner, useToast, Toast
} from '../components/UI';
import { Plus, Search, Pencil, Trash2, ShieldOff, Users, RefreshCw, AlertTriangle } from 'lucide-react';

const STATUSES = ['', 'OffDuty', 'OnDuty', 'Suspended'];

const EMPTY = {
  name: '', license_type: '', license_expiry: '',
  status: 'OffDuty', safety_score: 100
};

function SafetyBar({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? '#39ff8f' : pct >= 50 ? '#ffd93d' : '#ff6b2b';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color }}>{score}</span>
    </div>
  );
}

function LicenseExpiry({ dateStr }) {
  if (!dateStr) return <span className="text-muted">—</span>;
  const today = new Date();
  const exp   = new Date(dateStr);
  const days  = Math.ceil((exp - today) / 86400000);
  const color = days < 0 ? 'text-accent2' : days <= 7 ? 'text-accent4' : 'text-accent3';
  return (
    <div>
      <div className={`font-mono text-xs ${color}`}>{dateStr}</div>
      {days < 0
        ? <div className="font-mono text-[10px] text-accent2">{Math.abs(days)}d expired</div>
        : days <= 30
        ? <div className={`font-mono text-[10px] ${color}`}>{days}d left</div>
        : null}
    </div>
  );
}

export default function Drivers() {
  const [drivers, setDrivers]   = useState([]);
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
    driversAPI.list(filter ? { status: filter } : {})
      .then(r => setDrivers(r.data.drivers))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = d   => { setEditing(d); setForm({ ...d }); setModal(true); };
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, safety_score: Number(form.safety_score) };
      if (editing) {
        await driversAPI.update(editing.id, payload);
        toast.success('Driver updated');
      } else {
        await driversAPI.create(payload);
        toast.success('Driver created');
      }
      setModal(false); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    try { await driversAPI.delete(id); toast.success('Driver deleted'); load(); }
    catch (err) { toast.error(err.message); }
    setConfirm(null);
  };

  const handleSuspend = async id => {
    try { await driversAPI.suspend(id); toast.success('Driver suspended'); load(); }
    catch (err) { toast.error(err.message); }
    setConfirm(null);
  };

  const today = new Date();
  const expiryWarnings = drivers.filter(d => {
    const days = Math.ceil((new Date(d.license_expiry) - today) / 86400000);
    return days <= 7;
  });

  const filtered = drivers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.license_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-up">
      <Toast toasts={toasts} remove={remove} />
      <TopBar
        title="Driver Profiles"
        subtitle={`${drivers.length} registered drivers`}
        actions={
          <button className="ff-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Add Driver
          </button>
        }
      />

      {/* License Warning Banner */}
      {expiryWarnings.length > 0 && (
        <div className="mb-5 p-3.5 bg-accent4/5 border border-accent4/30 rounded-sm
                        flex items-center gap-3 animate-fade-down">
          <AlertTriangle size={15} className="text-accent4 flex-shrink-0" />
          <span className="font-mono text-xs text-accent4">
            {expiryWarnings.length} driver license{expiryWarnings.length>1?'s':''} expiring within 7 days:&nbsp;
            {expiryWarnings.map(d => d.name).join(', ')}
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="ff-input pl-9" placeholder="Search drivers..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`ff-btn text-xs py-2 px-4 ${filter === s ? 'bg-accent text-bg border-accent' : 'ff-btn-ghost'}`}>
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
          <EmptyState icon={Users} message="No drivers found" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['#','Name','License Type','License Expiry','Status','Safety Score','Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id} className="table-row">
                  <td className="table-cell text-muted">{i+1}</td>
                  <td className="table-cell text-white font-semibold">{d.name}</td>
                  <td className="table-cell">
                    <span className="font-mono bg-white/5 border border-border px-2 py-0.5 rounded-sm text-xs">
                      {d.license_type}
                    </span>
                  </td>
                  <td className="table-cell"><LicenseExpiry dateStr={d.license_expiry}/></td>
                  <td className="table-cell"><StatusPill status={d.status}/></td>
                  <td className="table-cell w-40"><SafetyBar score={d.safety_score}/></td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(d)}
                        className="p-1.5 rounded-sm text-muted hover:text-accent hover:bg-accent/10 transition-all">
                        <Pencil size={13}/>
                      </button>
                      {d.status !== 'Suspended' && (
                        <button onClick={() => setConfirm({ type:'suspend', id: d.id, name: d.name })}
                          className="p-1.5 rounded-sm text-muted hover:text-accent4 hover:bg-accent4/10 transition-all"
                          title="Suspend Driver">
                          <ShieldOff size={13}/>
                        </button>
                      )}
                      <button onClick={() => setConfirm({ type:'delete', id: d.id, name: d.name })}
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

      {/* MODAL */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Driver' : 'Register Driver'}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name">
              <input className="ff-input" value={form.name} onChange={set('name')}
                placeholder="Driver name" required />
            </Field>
            <Field label="License Type">
              <select className="ff-select" value={form.license_type} onChange={set('license_type')} required>
                <option value="">Select type</option>
                {['LMV','HMV','HTV','HPMV','HGMV'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="License Expiry">
              <input className="ff-input" type="date" value={form.license_expiry}
                onChange={set('license_expiry')} required />
            </Field>
            <Field label="Status">
              <select className="ff-select" value={form.status} onChange={set('status')}>
                {['OffDuty','OnDuty','Suspended'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Safety Score (0–100)">
              <input className="ff-input" type="number" min="0" max="100"
                value={form.safety_score} onChange={set('safety_score')} />
            </Field>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="ff-btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="ff-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Driver' : 'Create Driver'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        danger
        message={
          confirm?.type === 'delete'
            ? `Permanently delete driver "${confirm?.name}"?`
            : `Suspend driver "${confirm?.name}"? They won't be assignable to trips.`
        }
        onConfirm={() =>
          confirm?.type === 'delete' ? handleDelete(confirm.id) : handleSuspend(confirm.id)
        }
      />
    </div>
  );
}
