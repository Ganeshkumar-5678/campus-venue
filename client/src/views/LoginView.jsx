import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldAlert, ArrowLeft, Building2, Sparkles } from 'lucide-react';
import { api } from '../api';

export default function LoginView({ onLoginSuccess, profile, onOpenAbout }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(userId, password);
      localStorage.setItem('token', data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between bg-slate-900 overflow-hidden">
      {/* Background with college imagery and dark overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 scale-105 transition-all duration-1000"
        style={{ backgroundImage: "url('/images/college-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#061224] via-[#091b34]/90 to-[#0c2446]/80" />

      {/* Top Bar with College Brand Header */}
      <div className="relative z-10 p-6 sm:p-8 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <img
            src="/images/logo.png"
            alt="College Crest"
            className="h-14 w-auto object-contain drop-shadow-md"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://www.drbccchinducollege.edu.in/images/logo-hindu-college2.png";
            }}
          />
          <div>
            <h1 className="text-white font-extrabold text-sm sm:text-base tracking-wide uppercase leading-tight drop-shadow">
              Dharmamurthi Rao Bahadur
            </h1>
            <h2 className="text-blue-300 font-bold text-xs sm:text-sm tracking-wide uppercase">
              Calavala Cunnan Chetty's Hindu College
            </h2>
            <p className="text-slate-400 text-[11px] font-medium">
              (Autonomous) &bull; Pattabiram, Chennai - 72
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAbout}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl backdrop-blur-sm transition"
        >
          <Building2 className="w-4 h-4 text-blue-300" />
          <span>Institutional Info</span>
        </button>
      </div>

      {/* Central Login Card (Step 1 from UI Workflow) */}
      <div className="relative z-10 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-[#0e213e]/90 backdrop-blur-md p-8 rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-950/50">
          <div className="text-left mb-6">
            <h3 className="text-xl font-black text-white tracking-tight">
              Department Login
            </h3>
            <p className="text-xs text-blue-200/80 mt-1">
              Enter your department credentials to continue
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Department ID Input */}
            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                Department ID / User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. CSA001"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-blue-500/30 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-blue-500/30 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>

          {/* Back to College Website */}
          <div className="mt-6 text-center">
            <a
              href="https://www.drbccchinducollege.edu.in/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to College Website</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 p-4 text-center text-[11px] text-slate-400 border-t border-slate-800 bg-[#061224]/80">
        <p>&copy; {new Date().getFullYear()} Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College. All master data verified from official college records.</p>
      </div>
    </div>
  );
}
