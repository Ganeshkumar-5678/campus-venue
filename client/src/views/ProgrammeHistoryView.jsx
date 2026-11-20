import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Eye,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Phone,
  Mail,
  X,
  Printer,
  FileText,
  Ban,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api';
import BookingReceiptModal from '../components/BookingReceiptModal';

export default function ProgrammeHistoryView({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const [departments, setDepartments] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [receiptBooking, setReceiptBooking] = useState(null);

  // Cancellation State
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    loadFilterLists();
    handleSearch();
  }, []);

  const loadFilterLists = async () => {
    try {
      const [dList, vList, prof] = await Promise.all([
        api.getDepartments(),
        api.getVenues(),
        api.getCollegeProfile()
      ]);
      setDepartments(dList || []);
      setVenues(vList || []);
      setProfile(prof || null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      const query = {
        search: searchTerm,
        department_id: deptFilter,
        venue_id: venueFilter,
        status: statusFilter,
        year: yearFilter
      };
      const data = await api.getBookings(query);
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancelling this booking.');
      return;
    }
    try {
      setCancelling(true);
      setCancelError('');
      if (user?.role === 'admin') {
        await api.adminCancelBooking(cancelTarget.id, cancelReason.trim());
      } else {
        await api.cancelBooking(cancelTarget.id, cancelReason.trim());
      }
      setCancelTarget(null);
      setCancelReason('');
      setSelectedBooking(null);
      await handleSearch();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const parseReqs = (raw) => {
    try {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      return JSON.parse(raw);
    } catch {
      return [raw];
    }
  };

  return (
    <div id="programme-history-view" className="space-y-6">
      {/* Header Card */}
      <div className="programme-history-header-card bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Programme History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanent institutional database records &bull; Search past, active, and upcoming events
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 print:hidden"
            title="Print First A4 Page of Records"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print History (1 Page)</span>
          </button>
        </div>

        {/* Search & Filter Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by programme name, coordinator, booking ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              {user?.role === 'admin' && (
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.department_code} - {d.department_name}</option>
                  ))}
                </select>
              )}

              <select
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Venues</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.venue_name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* History Table */}
      <div className="programme-history-table-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-bold">Querying historical database records...</div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-bold">No programmes match the specified filters.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Programme Name</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Venue</th>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((item) => {
                  const isCancelled = item.status === 'cancelled';
                  const isConfirmed = item.status === 'confirmed';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-extrabold text-slate-900 text-sm">{item.programme_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {item.booking_id} &bull; {item.programme_type || 'Event'}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-700">{item.department_code}</span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.department_name}</div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {item.venue_name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        <div className="font-bold">{item.date}</div>
                        <div className="text-[11px] text-slate-400">{item.start_time} - {item.end_time}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Confirmed ✓
                          </span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Cancelled {item.cancelled_by_admin ? '(Admin)' : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Receipt Action */}
                          {isConfirmed && (
                            <button
                              onClick={() => setReceiptBooking(item)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Print Official Booking Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancellation Action */}
                          {isConfirmed && (
                            <button
                              onClick={() => {
                                setCancelTarget(item);
                                setCancelReason('');
                                setCancelError('');
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title={user?.role === 'admin' ? "Emergency Administrative Cancellation" : "Cancel This Booking"}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* View Dossier Action */}
                          <button
                            onClick={() => setSelectedBooking(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Full Booking Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Booking Dossier Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-mono">
                  {selectedBooking.booking_id}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedBooking.programme_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Department</div>
                <div className="font-bold text-slate-800">{selectedBooking.department_name}</div>
                <div className="text-slate-500">Code: {selectedBooking.department_code}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Venue Details</div>
                <div className="font-bold text-slate-800">{selectedBooking.venue_name}</div>
                <div className="text-slate-500">Capacity: {selectedBooking.venue_capacity || 'N/A'} seats</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Schedule</div>
                <div className="font-bold text-slate-800">{selectedBooking.date}</div>
                <div className="text-slate-500">{selectedBooking.start_time} - {selectedBooking.end_time}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Coordinator</div>
                <div className="font-bold text-slate-800">{selectedBooking.coordinator_name || 'N/A'}</div>
                <div className="text-slate-500">Phone: {selectedBooking.coordinator_phone || 'N/A'}</div>
              </div>
            </div>

            {selectedBooking.description && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Programme Description</div>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedBooking.description}
                </p>
              </div>
            )}

            {/* If Cancelled, Show Cancellation Alert */}
            {selectedBooking.status === 'cancelled' && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-rose-900">
                <div className="font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Cancelled Record Details</span>
                </div>
                <div><strong>Reason:</strong> {selectedBooking.cancellation_reason || 'No reason specified'}</div>
                <div><strong>Cancelled On:</strong> {selectedBooking.cancelled_at || 'Recorded in archive'}</div>
                {selectedBooking.cancelled_by_admin ? (
                  <div className="font-semibold text-rose-800">Cancelled by College Administration (Emergency Cancellation)</div>
                ) : (
                  <div className="font-semibold text-slate-700">Cancelled by Department Coordinator</div>
                )}
              </div>
            )}

            {/* Requirements Pills */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Requested Resources</div>
              <div className="flex flex-wrap gap-1.5">
                {parseReqs(selectedBooking.requirements).map((r, i) => (
                  <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold">
                    ✓ {r}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {selectedBooking.status === 'confirmed' && (
                <button
                  onClick={() => {
                    const b = selectedBooking;
                    setSelectedBooking(null);
                    setReceiptBooking(b);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official Receipt</span>
                </button>
              )}
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal Dialog */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-black">
                <Ban className="w-5 h-5" />
                <h3 className="text-base text-slate-900">
                  {user?.role === 'admin' ? 'Emergency Admin Cancellation' : 'Cancel Booking'}
                </h3>
              </div>
              <button
                onClick={() => setCancelTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to cancel booking <strong>{cancelTarget.booking_id}</strong> ({cancelTarget.programme_name}) at <strong>{cancelTarget.venue_name}</strong> on {cancelTarget.date}? The venue will be immediately released.
            </p>

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reason for Cancellation <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g., Postponed due to external schedule changes, academic emergency..."
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  disabled={cancelling}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow-md shadow-rose-600/20 disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Booking Receipt Modal */}
      {receiptBooking && (
        <BookingReceiptModal
          booking={receiptBooking}
          profile={profile}
          onClose={() => setReceiptBooking(null)}
        />
      )}
    </div>
  );
}
