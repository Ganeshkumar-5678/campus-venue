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
  X,
  Phone
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

  // Metrics: Confirmed, Completed, Cancelled, Total
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const completedCount = bookings.filter(b => b.status === 'completed' || (b.status === 'confirmed' && new Date(b.date) < new Date())).length;
  const upcomingCount = bookings.filter(b => b.status === 'confirmed' && new Date(b.date) >= new Date()).length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  const upcomingList = bookings
    .filter(b => b.status === 'confirmed')
    .slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Greeting Banner - Mobile Responsive */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full text-[11px] sm:text-xs font-semibold text-blue-200 mb-2 backdrop-blur-xs flex-wrap">
              <span>DRBCCC Hindu College CampusVenue</span>
              <span>&bull;</span>
              <span>{user?.shift || 'Autonomous'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-snug break-words">
              Good Morning, {user?.department_name || user?.user_name}
            </h2>
            <p className="text-xs sm:text-sm text-blue-200 mt-1 max-w-xl leading-relaxed">
              Department Dashboard &bull; Manage hall reservations with instant server confirmation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onNavigateToVoice}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl backdrop-blur-xs transition min-h-[44px]"
            >
              <Mic className="w-4 h-4 text-blue-300 flex-shrink-0" />
              <span>Voice Booking</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToBooking}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/30 transition transform hover:-translate-y-0.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span>New Programme</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards: Responsive 2-column on mobile, 4-column on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Upcoming Programmes */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                Upcoming
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                {upcomingCount}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Confirmed Bookings */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                Confirmed
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                {confirmedCount}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Completed Programmes */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                Completed
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                {completedCount}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Cancelled Bookings */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                Cancelled
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                {cancelledCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Confirmed Programmes Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
              Upcoming Confirmed Programmes
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Active hall reservations for your department
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToHistory}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition self-start sm:self-auto min-h-[36px]"
          >
            <span>View All Bookings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs sm:text-sm text-slate-400 font-medium">
            Loading programmes from database...
          </div>
        ) : upcomingList.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              No upcoming confirmed programmes found.
            </p>
            <button
              type="button"
              onClick={onNavigateToBooking}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Book a Venue Now</span>
            </button>
          </div>
        ) : (
          <>
            {/* 1. MOBILE RESPONSIVE CARDS (Visible only on < md screens) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {upcomingList.map((prog) => (
                <div key={prog.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition">
                  {/* Card Header: Title & Confirmed Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug break-words">
                        {prog.programme_name}
                      </h4>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ID: {prog.booking_id} &bull; {prog.programme_type || 'Event'}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Confirmed
                    </span>
                  </div>

                  {/* Card Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Venue</div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{prog.venue_name}</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Date & Time</div>
                      <div className="font-semibold text-slate-700 truncate">{prog.date}</div>
                      <div className="text-[10px] text-slate-500 truncate">{prog.start_time} - {prog.end_time}</div>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="truncate">Coordinator: <strong>{prog.coordinator_name}</strong></span>
                      {prog.coordinator_phone && (
                        <span className="font-mono text-slate-500 text-[10px]">{prog.coordinator_phone}</span>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons (min 44px touch targets) */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(prog)}
                      className="flex-1 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>View Receipt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCancelModalBooking(prog)}
                      className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <Ban className="w-4 h-4 text-rose-600" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. DESKTOP TABLE VIEW (Visible on >= md screens) */}
            <div className="hidden md:block overflow-x-auto">
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
                          type="button"
                          onClick={() => setSelectedReceipt(prog)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-lg transition"
                          title="View Official Receipt"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>

                        <button
                          type="button"
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
            </div>
          </>
        )}
      </div>

      {/* Department Cancellation Confirmation Dialog */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h4 className="text-base font-black text-slate-900">Cancel Booking</h4>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this booking? The venue will be released immediately for other departments. The historical record will be preserved.
            </p>

            {/* Booking Details to Cancel */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="font-bold text-slate-500">Booking ID:</span>
                <span className="font-mono font-bold text-blue-700">{cancelModalBooking.booking_id}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="font-bold text-slate-500">Venue:</span>
                <span className="font-semibold text-slate-800 text-right">{cancelModalBooking.venue_name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="font-bold text-slate-500">Date & Time:</span>
                <span className="font-semibold text-slate-800 text-right">{cancelModalBooking.date} ({cancelModalBooking.start_time} - {cancelModalBooking.end_time})</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="font-bold text-slate-500">Programme:</span>
                <span className="font-semibold text-slate-800 text-right truncate">{cancelModalBooking.programme_name}</span>
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
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition min-h-[44px]"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 min-h-[44px]"
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
