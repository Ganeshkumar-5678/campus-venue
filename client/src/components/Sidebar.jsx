import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  BookmarkCheck,
  History,
  CalendarDays,
  Mic,
  Database,
  Building,
  Users,
  DoorOpen,
  FileClock,
  ShieldCheck,
  Settings,
  LogOut
} from 'lucide-react';

export default function Sidebar({ currentTab, setTab, user, onLogout }) {
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { id: 'dashboard', label: isAdmin ? 'Admin Dashboard' : 'Dashboard', icon: LayoutDashboard },
    { id: 'new-booking', label: 'New Programme', icon: PlusCircle, highlight: true },
    { id: 'bookings', label: isAdmin ? 'All Bookings' : 'My Bookings', icon: BookmarkCheck },
    { id: 'history', label: 'Programme History', icon: History },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'voice-booking', label: 'AI Voice Booking', icon: Mic, badge: 'AI' },
  ];

  const adminItems = [
    { id: 'admin-profile', label: 'College Profile', icon: Building },
    { id: 'admin-depts', label: 'Departments', icon: Database },
    { id: 'admin-users', label: 'Department Users', icon: Users },
    { id: 'admin-venues', label: 'Venues (4 Halls)', icon: DoorOpen },
    { id: 'admin-audit', label: 'Audit Logs', icon: FileClock },
  ];

  return (
    <aside className="w-64 bg-[#0a192f] text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
          <DoorOpen className="w-6 h-6" />
        </div>
        <div>
          <div className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
            CampusVenue
          </div>
          <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">
            DRBCCC Hindu College
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-bold text-slate-500 uppercase px-3 py-1 tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : item.highlight
                  ? 'text-blue-400 hover:bg-blue-950/60 hover:text-white'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-gradient-to-r from-blue-500 to-indigo-500 text-white uppercase">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Admin Master Data Section */}
        {isAdmin && (
          <div className="pt-5 space-y-1">
            <div className="text-[11px] font-bold text-amber-400/90 uppercase px-3 py-1 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Master Data Management
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info / Logout */}
      <div className="p-4 border-t border-slate-800 bg-[#081325]">
        <div className="flex items-center justify-between">
          <div className="text-left overflow-hidden">
            <div className="text-xs font-bold text-slate-200 truncate">
              {user?.user_name || 'Department User'}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {user?.role === 'admin' ? 'Administrator' : `${user?.department_code || ''} Department`}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
