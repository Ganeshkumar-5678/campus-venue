import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldAlert, ArrowLeft, Building2 } from 'lucide-react';
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
    <div className="min-h-screen relative flex flex-col justify-between bg-slate-900 overflow-x-hidden">
      {/* Background with college imagery and dark overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 scale-105 transition-all duration-1000"
        style={{ backgroundImage: "url('/images/college-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#061224] via-[#091b34]/90 to-[#0c2446]/80" />

      {/* Top Bar with College Brand Header */}
      <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          <img
            src="/images/logo.png"
            alt="College Crest"
            className="h-10 sm:h-14 w-auto object-contain drop-shadow-md flex-shrink-0"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://www.drbccchinducollege.edu.in/images/logo-hindu-college2.png";
            }}
          />
          <div className="min-w-0">
            <h1 className="text-white font-extrabold text-xs sm:text-base tracking-wide uppercase leading-tight drop-shadow truncate">
              Dharmamurthi Rao Bahadur
            </h1>
            <h2 className="text-blue-300 font-bold text-[11px] sm:text-sm tracking-wide uppercase truncate">
              Calavala Cunnan Chetty's Hindu College
            </h2>
            <p className="text-slate-400 text-[10px] sm:text-[11px] font-medium truncate">
              (Autonomous) &bull; Pattabiram, Chennai - 72
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAbout}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl backdrop-blur-xs transition min-h-[44px] flex-shrink-0"
        >
          <Building2 className="w-4 h-4 text-blue-300" />
          <span>Institutional Info</span>
        </button>
      </div>

      {/* Central Login Card */}
      <div className="relative z-10 flex items-center justify-center px-3 sm:px-6 py-6 sm:py-8 w-full">
        <div className="w-full max-w-md bg-[#0e213e]/90 backdrop-blur-md p-5 sm:p-8 rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-950/50">
          <div className="text-left mb-5 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-blue-500/30 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition min-h-[44px]"
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
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-900/80 border border-blue-500/30 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 min-w-[44px] min-h-[44px] justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button (min-h-[44px] touch target) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 min-h-[44px] flex items-center justify-center"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>

          {/* Institutional Info (Mobile view only) & Back to College Website */}
          <div className="mt-5 space-y-2 text-center">
            <button
              type="button"
              onClick={onOpenAbout}
              className="sm:hidden inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-white transition py-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>About College Institutional Profile</span>
            </button>

            <div>
              <a
                href="https://www.drbccchinducollege.edu.in/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-300 transition py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to College Website</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 p-3 sm:p-4 text-center text-[10px] sm:text-[11px] text-slate-400 border-t border-slate-800 bg-[#061224]/80">
        <p>&copy; {new Date().getFullYear()} Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College. All master data verified from official college records.</p>
      </div>
    </div>
  );
}
