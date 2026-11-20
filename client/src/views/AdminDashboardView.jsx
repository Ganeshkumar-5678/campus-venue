import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  DoorOpen,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Edit2,
  Power,
  KeyRound,
  ShieldCheck,
  Save,
  Globe,
  Database,
  Search,
  FileClock,
  Check,
  Flag,
  Mail,
  Bell,
  Trash2,
  AlertTriangle,
  Send,
  Ban
} from 'lucide-react';
import { api } from '../api';

export default function AdminDashboardView({ activeSubTab = 'overview', profile, onProfileUpdated }) {
  const [subTab, setSubTab] = useState(activeSubTab);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  // Master data lists
  const [departments, setDepartments] = useState([]);
  const [venues, setVenues] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);

  // College Profile edit state
  const [profileForm, setProfileForm] = useState(profile || {});
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Department Modal
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ department_code: '', department_name: '', shift: 'Shift II', programme_name: '' });

  // User Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ user_id: '', password: '', user_name: '', role: 'department', department_id: '', email: '', contact_number: '' });

  // Password reset
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Venue Modal
  const [editingVenue, setEditingVenue] = useState(null);
  const [venueForm, setVenueForm] = useState({ venue_name: '', venue_code: '', capacity: '', description: '' });

  // Holiday Modal
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ holiday_date: '', holiday_name: '', holiday_type: 'Government Holiday' });
  const [holidayError, setHolidayError] = useState('');

  // Reminder trigger status
  const [triggeringReminders, setTriggeringReminders] = useState(false);
  const [reminderStatus, setReminderStatus] = useState(null);

  useEffect(() => {
    loadAllAdminData();
  }, []);

  useEffect(() => {
    if (activeSubTab) setSubTab(activeSubTab);
  }, [activeSubTab]);

  useEffect(() => {
    if (profile) setProfileForm(profile);
  }, [profile]);

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const [statsData, deptsData, venuesData, usersData, logsData, hData, eData] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getDepartments(true),
        api.getVenues(true),
        api.getUsers(),
        api.getAuditLogs(),
        api.getHolidays().catch(() => []),
        api.getEmailLogs().catch(() => [])
      ]);
      setAnalytics(statsData);
      setDepartments(deptsData || []);
      setVenues(venuesData || []);
      setUsersList(usersData || []);
      setAuditLogs(logsData || []);
      setHolidays(Array.isArray(hData) ? hData : []);
      setEmailLogs(Array.isArray(eData) ? eData : []);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. College Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const updated = await api.updateCollegeProfile(profileForm);
      setProfileSaveSuccess(true);
      if (onProfileUpdated) onProfileUpdated(updated);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
      loadAllAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 2. Department Handlers
  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await api.updateDepartment(editingDept.id, deptForm);
      } else {
        await api.createDepartment(deptForm);
      }
      setShowDeptModal(false);
      setEditingDept(null);
      setDeptForm({ department_code: '', department_name: '', shift: 'Shift II', programme_name: '' });
      loadAllAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleDept = async (id) => {
    try {
      await api.toggleDepartment(id);
      loadAllAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. User Handlers
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(userForm);
      setShowUserModal(false);
      setUserForm({ user_id: '', password: '', user_name: '', role: 'department', department_id: '', email: '', contact_number: '' });
      loadAllAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.resetPassword(resetModalUser.id, newPassword);
      setResetModalUser(null);
      setNewPassword('');
      alert('Password updated successfully');
      loadAllAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleUser = async (id) => {
    try {
      await api.toggleUser(id);
      loadAllAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.user_name}" (${user.user_id})?`)) return;
    try {
      await api.deleteUser(user.id);
      loadAllAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteDepartment = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete department "${dept.department_name}" (${dept.department_code})?`)) return;
    try {
      const res = await api.deleteDepartment(dept.id);
      alert(res.message);
      loadAllAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 4. Venue Handlers
  const handleSaveVenue = async (e) => {
    e.preventDefault();
    try {
      if (editingVenue) {
        await api.updateVenue(editingVenue.id, venueForm);
      }
      setEditingVenue(null);
      loadAllAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleVenue = async (id) => {
    try {
      await api.toggleVenue(id);
      loadAllAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 5. Holiday Handlers
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      setHolidayError('');
      await api.createHoliday(holidayForm);
      setShowHolidayModal(false);
      setHolidayForm({ holiday_date: '', holiday_name: '', holiday_type: 'Government Holiday' });
      const hData = await api.getHolidays();
      setHolidays(Array.isArray(hData) ? hData : []);
    } catch (err) {
      setHolidayError(err.message);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Are you sure you want to remove this holiday?')) return;
    try {
      await api.deleteHoliday(id);
      const hData = await api.getHolidays();
      setHolidays(Array.isArray(hData) ? hData : []);
    } catch (err) {
      alert(err.message);
    }
  };

  // 6. Reminder Trigger
  const handleTriggerReminders = async () => {
    try {
      setTriggeringReminders(true);
      const res = await api.triggerReminders();
      setReminderStatus(res);
      const eData = await api.getEmailLogs();
      setEmailLogs(Array.isArray(eData) ? eData : []);
    } catch (err) {
      alert(err.message);
    } finally {
      setTriggeringReminders(false);
    }
  };

  const kpis = analytics?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Management Portal</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Admin Dashboard & Master Data
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Read directly from relational database &bull; Configure college profile, departments, users & venues
            </p>
          </div>

          {/* Sub-tab navigation */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'overview', label: 'Analytics & KPIs' },
              { id: 'profile', label: 'College Profile' },
              { id: 'departments', label: 'Departments' },
              { id: 'users', label: 'Users & Passwords' },
              { id: 'venues', label: 'Venues (Halls)' },
              { id: 'holidays', label: 'Government Holidays' },
              { id: 'email_logs', label: 'Email & Reminders' },
              { id: 'audit', label: 'Audit Trail' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  subTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================
          TAB 1: OVERVIEW & ANALYTICS (Pure Confirmed / Cancelled)
      ========================================================= */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 6 KPI Cards - Absolutely NO Pending or Approval references */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Total Departments</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{departments.length || kpis.totalDepartments || 24}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Official Venues</div>
              <div className="text-2xl font-black text-blue-600 mt-1">{venues.length || 4}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Today's Bookings</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{kpis.todayProgrammes || 0}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Upcoming Events</div>
              <div className="text-2xl font-black text-indigo-600 mt-1">{kpis.upcomingProgrammes || 0}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Confirmed Bookings</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{kpis.confirmedBookings || 0}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Cancelled Bookings</div>
              <div className="text-2xl font-black text-rose-500 mt-1">{kpis.cancelledBookings || 0}</div>
            </div>
          </div>

          {/* Visual Analytics Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Department-wise Programmes (Bar Chart) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-800">
                Department-wise Programmes
              </h3>
              <p className="text-[11px] text-slate-400">Total bookings per academic department</p>
              
              <div className="space-y-2 pt-2">
                {(analytics?.departmentStats || []).map((dept, i) => {
                  const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-600', 'bg-emerald-500', 'bg-cyan-500'];
                  const barColor = colors[i % colors.length];
                  return (
                    <div key={dept.department_code} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{dept.department_code}</span>
                        <span className="text-slate-500">{dept.count} events</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${barColor}`}
                          style={{ width: `${Math.min(100, Math.max(15, dept.count * 25))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Venue-wise Bookings (Donut distribution) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-800">
                Venue-wise Bookings
              </h3>
              <p className="text-[11px] text-slate-400">Hall utilization across campus</p>

              <div className="space-y-3 pt-2">
                {(analytics?.venueStats || []).map((v, i) => {
                  const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
                  return (
                    <div key={v.venue_name} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="text-xs font-extrabold text-slate-800">{v.venue_name}</span>
                      </div>
                      <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {v.count} Bookings
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 3: Monthly Programme Count Trend */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-800">
                Monthly Programme Count
              </h3>
              <p className="text-[11px] text-slate-400">2026 Academic year volume trend</p>

              <div className="grid grid-cols-6 gap-2 pt-4">
                {(analytics?.monthlyStats || []).slice(0, 6).map((m) => (
                  <div key={m.month} className="flex flex-col items-center gap-2">
                    <div className="w-full bg-slate-100 rounded-lg h-28 relative flex items-end justify-center p-1">
                      <div
                        className="w-full bg-blue-600 rounded-md transition-all duration-500"
                        style={{ height: `${Math.max(10, m.count * 20)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600">{m.month}</span>
                    <span className="text-[10px] font-black text-slate-400">{m.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: COLLEGE PROFILE
      ========================================================= */}
      {subTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Institutional Profile Management
              </h3>
              <p className="text-xs text-slate-500">
                Update configurable college details. Verified official website is permanently recorded.
              </p>
            </div>
            {profileSaveSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                <Check className="w-4 h-4" />
                Database Updated!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">College Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.college_name || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, college_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Short Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.short_name || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, short_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Principal Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.principal_name || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, principal_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Website URL (Database Stored)</label>
                <input
                  type="url"
                  required
                  value={profileForm.official_website || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, official_website: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Numbers</label>
                <input
                  type="text"
                  value={profileForm.official_phone_numbers || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, official_phone_numbers: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Addresses</label>
                <input
                  type="text"
                  value={profileForm.official_email_addresses || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, official_email_addresses: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campus Address</label>
                <input
                  type="text"
                  value={profileForm.address || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={profileForm.city || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={profileForm.state || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={profileForm.pincode || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Weekend and Holiday Booking Policy Toggles */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase">Non-Working Day Policies</h4>
              <div className="flex flex-col sm:flex-row gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!profileForm.allow_weekend_booking}
                    onChange={(e) => setProfileForm({ ...profileForm, allow_weekend_booking: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-700">Allow Weekend (Saturday & Sunday) Bookings</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!profileForm.allow_holiday_booking}
                    onChange={(e) => setProfileForm({ ...profileForm, allow_holiday_booking: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-700">Allow Official Holiday Bookings</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">About College</label>
              <textarea
                rows={3}
                value={profileForm.about_college || ''}
                onChange={(e) => setProfileForm({ ...profileForm, about_college: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vision</label>
                <textarea
                  rows={3}
                  value={profileForm.vision || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, vision: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mission</label>
                <textarea
                  rows={3}
                  value={profileForm.mission || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, mission: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save College Profile to Database</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          TAB 3: DEPARTMENTS
      ========================================================= */}
      {subTab === 'departments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Department Master Data
              </h3>
              <p className="text-xs text-slate-500">
                Stored in database &bull; Configure Shift I & Shift II departments
              </p>
            </div>

            <button
              onClick={() => {
                setEditingDept(null);
                setDeptForm({ department_code: '', department_name: '', shift: 'Shift II', programme_name: '' });
                setShowDeptModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Department Name</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{d.department_code}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900">{d.department_name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{d.shift}</td>
                    <td className="px-4 py-3 text-slate-500">{d.programme_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        d.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {d.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingDept(d);
                          setDeptForm({
                            department_code: d.department_code,
                            department_name: d.department_name,
                            shift: d.shift,
                            programme_name: d.programme_name || ''
                          });
                          setShowDeptModal(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit Department"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleDept(d.id)}
                        className={`p-1.5 rounded-lg transition ${
                          d.active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={d.active ? 'Deactivate Department' : 'Activate Department'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(d)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: DEPARTMENT USERS
      ========================================================= */}
      {subTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Department User Credentials
              </h3>
              <p className="text-xs text-slate-500">
                Bcrypt hashed passwords &bull; Manage department login IDs and credentials
              </p>
            </div>

            <button
              onClick={() => setShowUserModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Department User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{u.user_id}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900">{u.user_name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.department_name || 'All (Admin)'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.contact_number || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        u.account_status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {u.account_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setResetModalUser(u)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Reset Password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleUser(u.id)}
                        className={`p-1.5 rounded-lg transition ${
                          u.account_status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title="Toggle Status"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 5: VENUES (The 4 Bookable Halls)
      ========================================================= */}
      {subTab === 'venues' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                College Venues (The 4 Bookable Halls)
              </h3>
              <p className="text-xs text-slate-500">
                Safe deactivation enabled &bull; Historical booking associations are permanently preserved
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venues.map((v) => {
              const imgSlug = v.venue_name.toLowerCase().replace(/\s+/g, '-');
              const imgSrc = v.image_url || `/images/${imgSlug}.svg`;
              return (
              <div key={v.id} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={imgSrc}
                      alt={v.venue_name}
                      className="w-16 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0 bg-slate-900"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `/images/${imgSlug}.svg`;
                      }}
                    />
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{v.venue_code}</span>
                      <h4 className="text-base font-black text-slate-900">{v.venue_name}</h4>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    v.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {v.active ? 'Active' : 'Archived'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-3">
                  <span><strong>Capacity:</strong> {v.capacity} Seats</span>
                  <span>&bull;</span>
                  <span><strong>Code:</strong> {v.venue_code}</span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {v.description}
                </p>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setEditingVenue(v);
                      setVenueForm({
                        venue_name: v.venue_name,
                        venue_code: v.venue_code,
                        capacity: v.capacity,
                        description: v.description || '',
                        image_url: v.image_url || ''
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Capacity/Details</span>
                  </button>
                  <button
                    onClick={() => handleToggleVenue(v.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      v.active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {v.active ? 'Archive Venue' : 'Restore Venue'}
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 6: GOVERNMENT HOLIDAYS MANAGEMENT
      ========================================================= */}
      {subTab === 'holidays' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-600" />
                Government Holidays & Non-Working Days
              </h3>
              <p className="text-xs text-slate-500">
                Official calendar restrictions for DRBCCC Hindu College &bull; Configured in SQLite database
              </p>
            </div>

            <button
              onClick={() => {
                setHolidayError('');
                setHolidayForm({ holiday_date: '', holiday_name: '', holiday_type: 'Government Holiday' });
                setShowHolidayModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Holiday Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{h.holiday_date}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{h.holiday_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {h.holiday_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 7: EMAIL LOGS & 3-DAY REMINDER TRIGGER
      ========================================================= */}
      {subTab === 'email_logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Logs & 3-Day Automated Reminders
              </h3>
              <p className="text-xs text-slate-500">
                Monitors transactional notifications, cancellations, and pre-event reminders
              </p>
            </div>

            <button
              onClick={handleTriggerReminders}
              disabled={triggeringReminders}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              <span>{triggeringReminders ? 'Checking Schedule...' : 'Run 3-Day Reminders Scan'}</span>
            </button>
          </div>

          {reminderStatus && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold flex items-center justify-between">
              <span>{reminderStatus.message}</span>
              <span className="font-mono bg-blue-100 px-2 py-0.5 rounded text-[11px] font-bold">
                {reminderStatus.remindersSent} Reminders Sent
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Subject / Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Delivery Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">No emails dispatched yet.</td>
                  </tr>
                ) : (
                  emailLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">{log.sent_at}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800">{log.recipient_email}</td>
                      <td className="px-4 py-2.5 text-slate-700 font-semibold">{log.subject}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                        {log.mode || 'Simulated & Audited'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 8: AUDIT TRAIL
      ========================================================= */}
      {subTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-900">
              System Audit Logs
            </h3>
            <p className="text-xs text-slate-500">
              Immutable historical activity trail for security, venue bookings, and master data changes
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-800">{log.user_id} ({log.user_name})</td>
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{log.entity_type}:{log.entity_id}</td>
                    <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Holiday */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="text-base font-black text-slate-900">
              Add Non-Working Government Holiday
            </h4>

            {holidayError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
                {holidayError}
              </div>
            )}

            <form onSubmit={handleAddHoliday} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={holidayForm.holiday_date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Name</label>
                <input
                  type="text"
                  required
                  value={holidayForm.holiday_name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holiday_name: e.target.value })}
                  placeholder="e.g. Gandhi Jayanti"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category / Type</label>
                <select
                  value={holidayForm.holiday_type}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holiday_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="Government Holiday">Government Holiday</option>
                  <option value="College Holiday">College Holiday</option>
                  <option value="Festival">Festival</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Add Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Department */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="text-base font-black text-slate-900">
              {editingDept ? 'Edit Department' : 'Add New Department'}
            </h4>
            <form onSubmit={handleSaveDepartment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  value={deptForm.department_code}
                  onChange={(e) => setDeptForm({ ...deptForm, department_code: e.target.value })}
                  placeholder="e.g. CSA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptForm.department_name}
                  onChange={(e) => setDeptForm({ ...deptForm, department_name: e.target.value })}
                  placeholder="e.g. Computer Science with Artificial Intelligence"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shift</label>
                <select
                  value={deptForm.shift}
                  onChange={(e) => setDeptForm({ ...deptForm, shift: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="Shift I">Shift I (Aided)</option>
                  <option value="Shift II">Shift II (Un-Aided / Self Financing)</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Programme / Degree</label>
                <input
                  type="text"
                  value={deptForm.programme_name}
                  onChange={(e) => setDeptForm({ ...deptForm, programme_name: e.target.value })}
                  placeholder="e.g. B.Sc. CS with AI"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="text-base font-black text-slate-900">
              Create Department User
            </h4>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">User ID / Login ID</label>
                <input
                  type="text"
                  required
                  value={userForm.user_id}
                  onChange={(e) => setUserForm({ ...userForm, user_id: e.target.value })}
                  placeholder="e.g. CSA001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Set initial password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full User / Faculty Name</label>
                <input
                  type="text"
                  required
                  value={userForm.user_name}
                  onChange={(e) => setUserForm({ ...userForm, user_name: e.target.value })}
                  placeholder="e.g. Dr. D. Lakshminarayanan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign Department</label>
                <select
                  value={userForm.department_id}
                  onChange={(e) => setUserForm({ ...userForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="">None (Admin)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.department_name} ({d.department_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="department">Department</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={userForm.contact_number}
                    onChange={(e) => setUserForm({ ...userForm, contact_number: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="text-base font-black text-slate-900">
              Reset Password for {resetModalUser.user_id}
            </h4>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Secure Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Venue */}
      {editingVenue && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="text-base font-black text-slate-900">
              Edit Venue: {editingVenue.venue_name}
            </h4>
            <form onSubmit={handleSaveVenue} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Seating Capacity</label>
                <input
                  type="number"
                  required
                  value={venueForm.capacity}
                  onChange={(e) => setVenueForm({ ...venueForm, capacity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Venue Image URL / Path</label>
                <input
                  type="text"
                  value={venueForm.image_url || ''}
                  onChange={(e) => setVenueForm({ ...venueForm, image_url: e.target.value })}
                  placeholder="e.g. /images/cunnan-auditorium.jpg"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Specify a custom image URL or use placeholder paths (e.g. /images/cunnan-auditorium.jpg, /images/ramanujan-hall.jpg).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Venue Description</label>
                <textarea
                  rows={3}
                  value={venueForm.description}
                  onChange={(e) => setVenueForm({ ...venueForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingVenue(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Update Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
