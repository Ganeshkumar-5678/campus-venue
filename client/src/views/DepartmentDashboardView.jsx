import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  MapPin,
  Mic,
  Search,
  Users,
  FileText,
  Ban,
  X
} from 'lucide-react';
import { api } from '../api';
import BookingReceiptModal from '../components/BookingReceiptModal';

export default function DepartmentDashboardView({ user, profile, onNavigateToBooking, onNavigateToVoice, onNavigateToHistory }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Cancellation modal state
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('Department schedule change');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const filter = user?.role === 'admin' ? {} : { department_id: user?.department_id };
      const data = await api.getBookings(filter);
      setBookings(data);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    setIsCancelling(true);
    try {
      await api.cancelBooking(cancelModalBooking.id, cancelReason);
      setCancelModalBooking(null);
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  // Metrics: Confirmed, Completed, Cancelled, Total (No pending!)
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const completedCount = bookings.filter(b => b.status === 'completed' || (b.status === 'confirmed' && new Date(b.date) < new Date())).length;
  const upcomingCount = bookings.filter(b => b.status === 'confirmed' && new Date(b.date) >= new Date()).length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  const upcomingList = bookings
    .filter(b => b.status === 'confirmed')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Greeting Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-blue-200 mb-2 backdrop-blur-sm">
              <span>DRBCCC Hindu College CampusVenue</span>
              <span>&bull;</span>
              <span>{user?.shift || 'Autonomous'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Good Morning, {user?.department_name || user?.user_name}
            </h2>
            <p className="text-sm text-blue-200 mt-1 max-w-xl">
              Department Dashboard &bull; Manage hall reservations with instant server confirmation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToVoice}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl backdrop-blur-sm transition"
            >
              <Mic className="w-4 h-4 text-blue-300" />
              <span>Voice Booking</span>
            </button>
            <button
              onClick={onNavigateToBooking}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/30 transition transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Programme</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards: STRICT NO PENDING WORKFLOW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Upcoming Programmes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Upcoming Programmes
              </div>
              <div className="text-2xl font-black text-slate-800 mt-0.5">
                {upcomingCount}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Confirmed Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Confirmed Bookings
              </div>
              <div className="text-2xl font-black text-slate-800 mt-0.5">
                {confirmedCount}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Completed Programmes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Completed Programmes
              </div>
              <div className="text-2xl font-black text-slate-800 mt-0.5">
                {completedCount}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Cancelled Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Cancelled Bookings
              </div>
              <div className="text-2xl font-black text-slate-800 mt-0.5">
                {cancelledCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Programmes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              Upcoming Confirmed Programmes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active hall reservations for your department
            </p>
          </div>
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
          >
            <span>View All Bookings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400 font-medium">Loading programmes from database...</div>
          ) : upcomingList.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-500">No upcoming confirmed programmes found.</p>
              <button
                onClick={onNavigateToBooking}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>Book a Venue Now</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Programme Name</th>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Venue</th>
                  <th className="px-5 py-3">Coordinator</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingList.map((prog) => (
                  <tr key={prog.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-extrabold text-slate-900 text-sm">{prog.programme_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono font-medium">ID: {prog.booking_id} &bull; {prog.programme_type}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      <div className="font-semibold">{prog.date}</div>
                      <div className="text-slate-400 text-[11px]">{prog.start_time} - {prog.end_time}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        {prog.venue_name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div className="font-medium">{prog.coordinator_name}</div>
                      <div className="text-slate-400 text-[11px]">{prog.coordinator_phone}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Confirmed
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedReceipt(prog)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-lg transition"
                        title="View Official Receipt"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>

                      <button
                        onClick={() => setCancelModalBooking(prog)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg transition"
                        title="Cancel Booking"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Department Cancellation Confirmation Dialog (Requirement 14) */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-6 h-6" />
                <h4 className="text-base font-black text-slate-900">Cancel Booking</h4>
              </div>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to cancel this booking? The venue will be released immediately for other departments. The historical record will be preserved.
            </p>

            {/* Booking Details to Cancel */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Booking ID:</span>
                <span className="font-mono font-bold text-blue-700">{cancelModalBooking.booking_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Venue:</span>
                <span className="font-semibold text-slate-800">{cancelModalBooking.venue_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Date & Time:</span>
                <span className="font-semibold text-slate-800">{cancelModalBooking.date} ({cancelModalBooking.start_time} - {cancelModalBooking.end_time})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Programme:</span>
                <span className="font-semibold text-slate-800">{cancelModalBooking.programme_name}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Cancellation
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Guest speaker postponed, Department schedule conflict"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <BookingReceiptModal
          booking={selectedReceipt}
          profile={profile}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
