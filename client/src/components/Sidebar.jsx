import React, { useEffect } from 'react';
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
  LogOut,
  X
} from 'lucide-react';

export default function Sidebar({ currentTab, setTab, user, onLogout, isOpen, onClose }) {
  const isAdmin = user?.role === 'admin';

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  const handleSelectTab = (tabId) => {
    setTab(tabId);
    if (onClose) onClose();
  };

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Brand & Mobile Close button */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 flex-shrink-0">
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

        {/* Close Button for mobile drawer */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
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
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : item.highlight
                  ? 'text-blue-400 hover:bg-blue-950/60 hover:text-white'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
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
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[40px] ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
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
        <div className="flex items-center justify-between gap-2">
          <div className="text-left overflow-hidden min-w-0">
            <div className="text-xs font-bold text-slate-200 truncate">
              {user?.user_name || 'Department User'}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {user?.role === 'admin' ? 'Administrator' : `${user?.department_code || ''} Department`}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar (Preserved exactly for desktop monitors & tablets) */}
      <aside className="hidden md:flex w-64 bg-[#0a192f] text-slate-300 flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
        {navContent}
      </aside>

      {/* 2. Mobile Drawer Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 3. Mobile Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0a192f] text-slate-300 flex flex-col border-r border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation Drawer"
      >
        {navContent}
      </aside>
    </>
  );
}
