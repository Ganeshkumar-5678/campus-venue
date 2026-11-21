import React from 'react';
import { Building2, Info, Bell, LogOut, ShieldCheck, User, Menu } from 'lucide-react';

export default function Navbar({ user, profile, onLogout, onOpenAbout, onToggleMobileNav }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Left: Hamburger menu (mobile) + College Crest & Name */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {/* Hamburger button visible only on mobile (< md) */}
            {user && (
              <button
                type="button"
                onClick={onToggleMobileNav}
                className="md:hidden p-2 -ml-1 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <img
              src="/images/logo.png"
              alt="DRBCCC Hindu College Crest"
              className="h-8 sm:h-11 w-auto object-contain flex-shrink-0"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://www.drbccchinducollege.edu.in/images/logo-hindu-college2.png";
              }}
            />

            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight leading-tight uppercase truncate">
                {profile?.short_name || "DRBCCC Hindu College"}
              </h1>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate hidden xs:block">
                Autonomous &bull; Chennai - 72 &bull; NAAC Re-accredited
              </p>
            </div>
          </div>

          {/* Right: Info button, User badge and actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
            <button
              type="button"
              onClick={onOpenAbout}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition min-h-[40px]"
              title="View College Institutional Profile"
            >
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="hidden sm:inline">About College</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2 sm:space-x-3 pl-1.5 sm:pl-2 border-l border-slate-200">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
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
                  type="button"
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center"
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
