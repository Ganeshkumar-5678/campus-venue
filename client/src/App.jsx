import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AboutModal from './components/AboutModal';
import LoginView from './views/LoginView';
import DepartmentDashboardView from './views/DepartmentDashboardView';
import NewBookingFlow from './views/NewBookingFlow';
import CalendarView from './views/CalendarView';
import ProgrammeHistoryView from './views/ProgrammeHistoryView';
import AdminDashboardView from './views/AdminDashboardView';
import AIVoiceBookingView from './views/AIVoiceBookingView';
import { api } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showAbout, setShowAbout] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      // 1. Fetch official institutional profile from database
      const prof = await api.getCollegeProfile();
      setProfile(prof);

      // 2. Check if user is logged in
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const currentUser = await api.getMe();
          setUser(currentUser);
        } catch {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Error during initial setup:', err);
    } finally {
      setInitializing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentTab('dashboard');
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentTab('dashboard');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-bold tracking-wide uppercase">
            Connecting to DRBCCC Hindu College Database...
          </div>
        </div>
      </div>
    );
  }

  // If not logged in, render Step 1 Login screen
  if (!user) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          profile={profile}
          onOpenAbout={() => setShowAbout(true)}
        />
        {showAbout && <AboutModal profile={profile} onClose={() => setShowAbout(false)} />}
      </>
    );
  }

  // Render appropriate view based on active tab
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return user.role === 'admin' ? (
          <AdminDashboardView
            activeSubTab="overview"
            profile={profile}
            onProfileUpdated={(p) => setProfile(p)}
          />
        ) : (
          <DepartmentDashboardView
            user={user}
            onNavigateToBooking={() => setCurrentTab('new-booking')}
            onNavigateToVoice={() => setCurrentTab('voice-booking')}
            onNavigateToHistory={() => setCurrentTab('history')}
          />
        );

      case 'new-booking':
        return (
          <NewBookingFlow
            user={user}
            onBookingComplete={() => setCurrentTab('history')}
            onCancel={() => setCurrentTab('dashboard')}
          />
        );

      case 'calendar':
        return <CalendarView user={user} />;

      case 'bookings':
      case 'history':
        return <ProgrammeHistoryView user={user} />;

      case 'voice-booking':
        return (
          <AIVoiceBookingView
            user={user}
            onBookingSuccess={() => setCurrentTab('history')}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        );

      // Admin tabs
      case 'admin-profile':
        return (
          <AdminDashboardView
            activeSubTab="profile"
            profile={profile}
            onProfileUpdated={(p) => setProfile(p)}
          />
        );
      case 'admin-depts':
        return (
          <AdminDashboardView
            activeSubTab="departments"
            profile={profile}
            onProfileUpdated={(p) => setProfile(p)}
          />
        );
      case 'admin-users':
        return (
          <AdminDashboardView
            activeSubTab="users"
            profile={profile}
            onProfileUpdated={(p) => setProfile(p)}
          />
        );
      case 'admin-venues':
        return (
          <AdminDashboardView
            activeSubTab="venues"
            profile={profile}
            onProfileUpdated={(p) => setProfile(p)}
          />
        );
      case 'admin-audit':
        return (
          <AdminDashboardView
            activeSubTab="audit"
            profile={profile}
            onProfileUpdated={(p) => setProfile(p)}
          />
        );

      default:
        return <DepartmentDashboardView user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar with Official Branding & Principal / About info */}
      <Navbar
        user={user}
        profile={profile}
        onLogout={handleLogout}
        onOpenAbout={() => setShowAbout(true)}
      />

      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setTab={setCurrentTab}
          user={user}
          onLogout={handleLogout}
        />

        {/* Main Content Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Official Footer with Verified Contact details */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-center sm:text-left">
          <span>{profile?.college_name}</span>
          <span className="hidden sm:inline">&bull;</span>
          <span className="hidden sm:inline">Ph: {profile?.official_phone_numbers}</span>
        </div>
        <div className="flex items-center space-x-4">
          <a
            href={profile?.official_website || "https://www.drbccchinducollege.edu.in/"}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline font-bold"
          >
            Official Website
          </a>
          <button
            onClick={() => setShowAbout(true)}
            className="text-slate-600 hover:text-slate-900 font-semibold"
          >
            Institutional Info
          </button>
        </div>
      </footer>

      {/* Institutional Info Modal */}
      {showAbout && <AboutModal profile={profile} onClose={() => setShowAbout(false)} />}
    </div>
  );
}
