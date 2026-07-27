import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, User, RefreshCw } from 'lucide-react';

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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-[#ffffff] border border-[#e2e8f0] p-8 rounded-xl shadow-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-[#eff6ff] rounded-lg flex items-center justify-center border border-[#bfdbfe]">
              <Shield className="w-6 h-6 text-[#1e3a8a]" />
            </div>
          </div>
          <h2 className="text-xl font-black text-[#1e293b] uppercase tracking-wide">Register Officer Credentials</h2>
          <p className="text-[10px] text-[#64748b] mt-1 uppercase tracking-widest font-bold">CrimeGPT Agency Authentication System</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-xs mb-6 font-bold" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-lg text-xs mb-6 font-bold" role="alert">
            Onboarding successful! Redirecting to secure login portal...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="text-xs font-bold text-[#1e293b] uppercase tracking-wider block">Full Officer Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#64748b]">
                <User className="w-4 h-4" />
              </span>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Inspector Watson"
                className="w-full bg-[#ffffff] border border-[#e2e8f0] hover:border-[#2563eb] focus:border-[#2563eb] text-[#1e293b] placeholder-[#64748b]/60 pl-9 pr-4 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb] transition-all"
              />
            </div>
          </div>

          {/* Email field */}
          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-xs font-bold text-[#1e293b] uppercase tracking-wider block">Authorized Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#64748b]">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@department.gov"
                className="w-full bg-[#ffffff] border border-[#e2e8f0] hover:border-[#2563eb] focus:border-[#2563eb] text-[#1e293b] placeholder-[#64748b]/60 pl-9 pr-4 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb] transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="text-xs font-bold text-[#1e293b] uppercase tracking-wider block">Security Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#64748b]">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="reg-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#ffffff] border border-[#e2e8f0] hover:border-[#2563eb] focus:border-[#2563eb] text-[#1e293b] placeholder-[#64748b]/60 pl-9 pr-4 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb] transition-all"
              />
            </div>
          </div>

          {/* Role selector field */}
          <div className="space-y-1.5">
            <label htmlFor="reg-role" className="text-xs font-bold text-[#1e293b] uppercase tracking-wider block">Assigned Role</label>
            <select
              id="reg-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#ffffff] border border-[#e2e8f0] hover:border-[#2563eb] focus:border-[#2563eb] text-[#1e293b] py-2 px-3 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb] transition-all"
            >
              <option value="POLICE_OFFICER">Police Officer / Investigator</option>
              <option value="SHO">Station House Officer (SHO)</option>
              <option value="LEGAL_ADVISOR">Legal Advisor</option>
              <option value="ADMIN">Administrative Officer</option>
            </select>
          </div>

          {/* Sign Up button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs uppercase tracking-wider mt-2 shadow-sm"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#b45309]" />
            ) : (
              <span>Submit Request</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#e2e8f0] text-center">
          <p className="text-xs text-[#64748b]">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-[#1e3a8a] hover:underline">
              Sign In Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
