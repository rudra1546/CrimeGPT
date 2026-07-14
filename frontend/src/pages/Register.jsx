import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User, RefreshCw } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('POLICE_OFFICER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);
    try {
      await register(name, email, password, role);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(
        err._parsedMessage || 
        'Onboarding request failed. Email might already be registered.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-police-dark flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Decorative Grid and Glow Backgrounds */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0b132b_1px,transparent_1px),linear-gradient(to_bottom,#0b132b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-police-accent/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-police-card border border-police-border p-8 rounded-2xl shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 bg-police-border rounded-2xl flex items-center justify-center border border-police-accent/30 shadow-lg shadow-police-accent/10">
              <ShieldCheck className="w-8 h-8 text-police-accent" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-wider">Register Officer Credentials</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">CrimeGPT Agency Authentication System</p>
        </div>

        {error && (
          <div className="bg-rose-950/30 border border-rose-900/50 text-rose-300 p-4 rounded-xl text-xs mb-6 font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 p-4 rounded-xl text-xs mb-6 font-medium">
            Onboarding successful! Redirecting to secure login portal...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Full Officer Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Inspector Watson"
                className="w-full bg-police-dark border border-police-border hover:border-police-accent/50 focus:border-police-accent text-slate-100 placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
              />
            </div>
          </div>

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Authorized Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@department.gov"
                className="w-full bg-police-dark border border-police-border hover:border-police-accent/50 focus:border-police-accent text-slate-100 placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Security Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-police-dark border border-police-border hover:border-police-accent/50 focus:border-police-accent text-slate-100 placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
              />
            </div>
          </div>

          {/* Role selector field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Authorized Clearance Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-police-dark border border-police-border hover:border-police-accent/50 focus:border-police-accent text-slate-100 py-2.5 px-3.5 rounded-xl text-sm transition-all duration-200 outline-none"
            >
              <option value="POLICE_OFFICER">POLICE_OFFICER (Standard Clearance)</option>
              <option value="ADMIN">ADMIN (System Administrator)</option>
            </select>
          </div>

          {/* Register button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-police-accent hover:bg-police-accent/90 text-police-dark font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-police-accent/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 mt-4"
          >
            {submitting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              'Submit Registry Form'
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 text-center border-t border-police-border/40 pt-4">
          <p className="text-xs text-slate-400">
            Already have credentials?{' '}
            <Link to="/login" className="text-police-accent hover:text-police-glow font-semibold transition-all">
              Sign In Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
