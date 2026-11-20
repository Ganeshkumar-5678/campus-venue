import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  User,
  X,
  Building,
  Flag,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';

export default function CalendarView({ user }) {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState('Month'); // Month, Week, Day

  const [departments, setDepartments] = useState([]);
  const [venues, setVenues] = useState([]);
  
  const [deptFilter, setDeptFilter] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadCalendarEvents();
  }, [currentYear, currentMonth, deptFilter, venueFilter, statusFilter]);

  const loadFilters = async () => {
    try {
      const [dList, vList] = await Promise.all([
        api.getDepartments(),
        api.getVenues()
      ]);
      setDepartments(dList || []);
      setVenues(vList || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getCalendar({
        year: currentYear,
        month: currentMonth,
        department_id: deptFilter,
        venue_id: venueFilter,
        status: statusFilter
      });
      if (data && typeof data === 'object') {
        setEvents(Array.isArray(data.events) ? data.events : (Array.isArray(data) ? data : []));
        setHolidays(Array.isArray(data.holidays) ? data.holidays : []);
      } else {
        setEvents([]);
        setHolidays([]);
      }
    } catch (err) {
      console.error(err);
      setEvents([]);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Build grid days for selected month
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentMonth - 1, 1).getDay() + 6) % 7; // Monday index 0

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push({ dayNumber: null, isCurrentMonth: false, colIdx: i });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const colIdx = (firstDayIndex + d - 1) % 7;
    days.push({ dayNumber: d, isCurrentMonth: true, colIdx });
  }

  // Group events by day of month
  const eventsByDay = {};
  events.forEach(e => {
    if (!e.date) return;
    const parts = e.date.split('-');
    const day = parseInt(parts[2], 10);
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(e);
  });

  // Group holidays by day of month
  const holidaysByDay = {};
  holidays.forEach(h => {
    if (!h.holiday_date) return;
    const parts = h.holiday_date.split('-');
    const day = parseInt(parts[2], 10);
    if (!holidaysByDay[day]) holidaysByDay[day] = [];
    holidaysByDay[day].push(h);
  });

  return (
    <div className="space-y-6">
      {/* Calendar Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              Calendar View
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live venue reservations and official holidays across DRBCCC Hindu College
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Month / Week / Day Toggles */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              {['Month', 'Week', 'Day'].map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    viewMode === m
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Month Navigator */}
            <div className="flex items-center space-x-2 border border-slate-200 rounded-xl px-2 py-1 bg-slate-50">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-200 rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>
              <span className="text-xs font-black text-slate-800 min-w-[120px] text-center">
                {months[currentMonth - 1]} {currentYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-200 rounded-lg transition"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.department_name} ({d.department_code})</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Venues</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.venue_name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Booking Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span>
            <span>Auditorium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-600"></span>
            <span>Conference Hall</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
            <span>Government Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300"></span>
            <span>Weekend (Sat / Sun)</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div className="text-amber-700 bg-amber-50/50">Sat</div>
          <div className="text-rose-700 bg-rose-50/50">Sun</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100">
          {days.map((item, idx) => {
            const isWeekend = item.colIdx === 5 || item.colIdx === 6;
            const dayEvents = item.isCurrentMonth ? (eventsByDay[item.dayNumber] || []) : [];
            const dayHolidays = item.isCurrentMonth ? (holidaysByDay[item.dayNumber] || []) : [];

            return (
              <div
                key={idx}
                className={`min-h-[125px] p-2 transition ${
                  !item.isCurrentMonth
                    ? 'bg-slate-50/40 text-slate-300'
                    : isWeekend
                    ? 'bg-amber-50/20 hover:bg-amber-50/40'
                    : 'bg-white hover:bg-blue-50/20'
                }`}
              >
                {item.isCurrentMonth && (
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-black ${isWeekend ? 'text-amber-800' : 'text-slate-700'}`}>
                      {item.dayNumber}
                    </span>
                    <div className="flex items-center gap-1">
                      {isWeekend && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                          {item.colIdx === 5 ? 'Sat' : 'Sun'}
                        </span>
                      )}
                      {dayEvents.length > 0 && (
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                          {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Holiday Badges */}
                {dayHolidays.length > 0 && (
                  <div className="mb-1 space-y-0.5">
                    {dayHolidays.map(h => (
                      <button
                        key={h.id}
                        onClick={() => setSelectedHoliday(h)}
                        className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 hover:bg-amber-200 transition truncate block"
                        title={`${h.holiday_name} (${h.holiday_type})`}
                      >
                        <Flag className="w-2.5 h-2.5 text-amber-700 flex-shrink-0" />
                        <span className="truncate">{h.holiday_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Event badges */}
                <div className="space-y-1">
                  {dayEvents.map(evt => {
                    const isAuditorium = evt.venue_name.toLowerCase().includes('auditorium');
                    const isConf = evt.venue_name.toLowerCase().includes('conference');
                    const isCancelled = evt.status === 'cancelled';
                    
                    const badgeBg = isCancelled
                      ? 'bg-rose-100 text-rose-700 border border-rose-300 line-through opacity-70'
                      : isAuditorium
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isConf
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-indigo-600 text-white shadow-xs';

                    return (
                      <button
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={`w-full text-left px-2 py-1 rounded-md text-[10px] font-bold hover:opacity-90 transition truncate block ${badgeBg}`}
                        title={`${evt.programme_name} @ ${evt.venue_name} (${evt.start_time} - ${evt.end_time})`}
                      >
                        <div className="truncate font-extrabold">{evt.programme_name}</div>
                        <div className="text-[9px] opacity-90 truncate flex items-center justify-between">
                          <span>{evt.venue_name.split(' ')[0]}</span>
                          <span>{evt.start_time}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  selectedEvent.status === 'cancelled'
                    ? 'text-rose-700 bg-rose-50'
                    : 'text-blue-600 bg-blue-50'
                }`}>
                  {selectedEvent.status === 'cancelled' ? 'Cancelled Booking' : 'Confirmed Booking'}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {selectedEvent.programme_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span><strong>Venue:</strong> {selectedEvent.venue_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span><strong>Schedule:</strong> {selectedEvent.date} ({selectedEvent.start_time} - {selectedEvent.end_time})</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span><strong>Department:</strong> {selectedEvent.department_name} ({selectedEvent.department_code})</span>
              </div>
              {selectedEvent.coordinator_name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span><strong>Coordinator:</strong> {selectedEvent.coordinator_name}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Booking Code:</span>
                <span className="font-mono font-bold text-blue-700">{selectedEvent.booking_id}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Holiday Details Modal */}
      {selectedHoliday && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-amber-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-600" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {selectedHoliday.holiday_type || 'Official Holiday'}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {selectedHoliday.holiday_name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedHoliday(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div>
                <strong>Date:</strong> {selectedHoliday.holiday_date}
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-900 border border-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  College policy restricts regular venue reservations on official government holidays and non-working days unless administrative exemption is configured.
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedHoliday(null)}
              className="w-full py-2 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
