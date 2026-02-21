import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent2/4 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-up">

        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16
                          bg-accent/10 border border-accent/30 rounded-sm mb-5
                          relative">
            <Truck size={28} className="text-accent" />
            <div className="absolute inset-0 bg-accent/5 rounded-sm animate-pulse-slow" />
          </div>
          <h1 className="font-display font-black text-4xl text-white uppercase tracking-tight">
            Fleet<span className="text-accent">Flow</span>
          </h1>
          <p className="font-mono text-xs text-muted tracking-widest mt-2 uppercase">
            Fleet & Logistics Management
          </p>
        </div>

        {/* Card */}
        <div className="bg-panel border border-border rounded-sm p-8 relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

          <div className="font-mono text-xs text-muted tracking-widest uppercase mb-6">
            // Authenticate
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 mb-5
                            bg-accent2/10 border border-accent2/30 rounded-sm">
              <AlertCircle size={14} className="text-accent2 flex-shrink-0" />
              <span className="font-mono text-xs text-accent2">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="ff-label">Email Address</label>
              <input
                type="email"
                className="ff-input"
                placeholder="admin@fleetflow.com"
                value={form.email}
                onChange={set('email')}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="ff-label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="ff-input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <button type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ff-btn-primary w-full justify-center py-3 text-sm mt-2"
            >
              {loading ? (
                <span className="font-mono text-xs tracking-widest">Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Default creds hint */}
          <div className="mt-6 pt-5 border-t border-border/50">
            <div className="font-mono text-[10px] text-muted/60 leading-relaxed text-center">
              Default: admin@fleetflow.com / Admin@123
            </div>
          </div>
        </div>

        {/* Roles legend */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          {['FleetManager','Dispatcher','SafetyOfficer','FinancialAnalyst'].map(r => (
            <div key={r}
              className="font-mono text-[10px] text-muted/50 text-center py-1.5
                         border border-border/40 rounded-sm tracking-wider">
              {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
