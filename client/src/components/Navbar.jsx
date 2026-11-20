import React from 'react';
import { Building2, Info, Bell, LogOut, ShieldCheck, User } from 'lucide-react';

export default function Navbar({ user, profile, onLogout, onOpenAbout }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* College Crest & Name */}
          <div className="flex items-center space-x-3">
            <img
              src="/images/logo.png"
              alt="DRBCCC Hindu College Crest"
              className="h-11 w-auto object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://www.drbccchinducollege.edu.in/images/logo-hindu-college2.png";
              }}
            />
            <div className="hidden sm:block">
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug uppercase">
                {profile?.short_name || "DRBCCC Hindu College"}
              </h1>
              <p className="text-[11px] font-medium text-slate-500">
                Autonomous &bull; Pattabiram, Chennai - 72 &bull; Re-accredited by NAAC
              </p>
            </div>
          </div>

          {/* User badge and actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenAbout}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition"
              title="View Verified College Profile"
            >
              <Info className="w-4 h-4 text-blue-600" />
              <span>About College</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    user.role === 'admin' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {user.department_code ? user.department_code.slice(0, 3) : (user.role === 'admin' ? 'AD' : 'DP')}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      {user.department_name || user.user_name}
                      {user.role === 'admin' && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-semibold">Admin</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ID: {user.user_id} {user.shift ? `(${user.shift})` : ''}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
