import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Info,
  Check,
  Building,
  Sparkles,
  Phone,
  Mail,
  Printer,
  X,
  FileText,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import BookingReceiptModal from '../components/BookingReceiptModal';

export default function NewBookingFlow({ user, profile, onBookingComplete, onCancel }) {
  // Step state: 1: Date/Time, 2: Venue Selection, 3: Form, 4: Confirmation
  const [step, setStep] = useState(1);

  // Step 1: Date & Time
  const [selectedDate, setSelectedDate] = useState('2026-09-18');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('01:00 PM');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [dateRestrictionNotice, setDateRestrictionNotice] = useState(null);

  // Step 2: Available Venues from Database API
  const [venuesWithStatus, setVenuesWithStatus] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [conflictPopupVenue, setConflictPopupVenue] = useState(null);

  // Step 3: Programme & Coordinator Details
  const [programmeName, setProgrammeName] = useState('AI Workshop');
  const [programmeType, setProgrammeType] = useState('Workshop');
  const [description, setDescription] = useState('Hands-on session on Artificial Intelligence and Machine Learning.');
  const [expectedParticipants, setExpectedParticipants] = useState('60');
  const [chiefGuest, setChiefGuest] = useState('');
  
  const [coordinatorName, setCoordinatorName] = useState(user?.user_name || 'Dr. S. Priya');
  const [coordinatorPhone, setCoordinatorPhone] = useState(user?.contact_number || '9876543210');
  const [coordinatorEmail, setCoordinatorEmail] = useState(user?.email || '');

  const [reqProjector, setReqProjector] = useState(true);
  const [reqInternet, setReqInternet] = useState(true);
  const [reqSound, setReqSound] = useState(true);
  const [reqOther, setReqOther] = useState(true);
  const [otherReqText, setOtherReqText] = useState('Whiteboard');

  // Step 4: Confirmed Booking Result & Receipt
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const timeOptions = [
    '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM',
    '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM',
    '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
  ];

  // Check Availability
  const handleCheckAvailability = async (e) => {
    if (e) e.preventDefault();
    setCheckingAvailability(true);
    setBookingError('');
    setDateRestrictionNotice(null);

    try {
      const data = await api.checkAvailability(selectedDate, startTime, endTime);
      setVenuesWithStatus(data.venues || []);

      if (data.isDateRestricted) {
        setDateRestrictionNotice(data.restrictionReason);
      } else if (data.isNonWorkingDay) {
        setDateRestrictionNotice(`Note: ${selectedDate} is a ${data.nonWorkingReason}.`);
      }

      // Pre-select first available venue if current selected is null or not available
      const firstAvail = (data.venues || []).find(v => v.isAvailable);
      setSelectedVenue(firstAvail || null);
      setStep(2);
    } catch (err) {
      setBookingError(err.message || 'Failed to query venue availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Submit Booking (Direct Instant Confirmation)
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedVenue) {
      setBookingError('Please select an available venue');
      return;
    }

    setSubmitting(true);
    setBookingError('');

    const requirements = [];
    if (reqProjector) requirements.push('Projector');
    if (reqInternet) requirements.push('Internet');
    if (reqSound) requirements.push('Sound System');
    if (reqOther && otherReqText.trim()) requirements.push(otherReqText.trim());

    try {
      const payload = {
        department_id: user?.department_id,
        venue_id: selectedVenue.id,
        date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        programme_name: programmeName,
        programme_type: programmeType,
        description,
        expected_participants: parseInt(expectedParticipants, 10) || 0,
        chief_guest: chiefGuest,
        requirements,
        additional_notes: reqOther ? otherReqText : '',
        coordinator_name: coordinatorName,
        coordinator_phone: coordinatorPhone,
        coordinator_email: coordinatorEmail
      };

      const result = await api.createBooking(payload);
      setConfirmedBooking(result.booking);
      setStep(4); // Step 4: Confirmation screen

      try {
        confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
      } catch (err) {}
    } catch (err) {
      setBookingError(err.message || 'Booking submission failed. Venue might have been booked concurrently.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-12">
      {/* Top Breadcrumb & Progress Step Indicator */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex items-center justify-between print:hidden gap-2">
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => setStep(prev => prev - 1)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition min-h-[40px] flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden xs:inline">{step === 1 ? 'Back to Dashboard' : 'Back'}</span>
        </button>

        <div className="flex items-center space-x-1.5 sm:space-x-4">
          <div className="flex items-center space-x-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}>1</div>
            <span className={`text-xs font-bold hidden sm:inline ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>Date & Time</span>
          </div>

          <div className={`w-4 sm:w-10 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />

          <div className="flex items-center space-x-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}>2</div>
            <span className={`text-xs font-bold hidden sm:inline ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>Venue</span>
          </div>

          <div className={`w-4 sm:w-10 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />

          <div className="flex items-center space-x-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}>3</div>
            <span className={`text-xs font-bold hidden sm:inline ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>Details</span>
          </div>

          <div className={`w-4 sm:w-10 h-0.5 ${step >= 4 ? 'bg-blue-600' : 'bg-slate-200'}`} />

          <div className="flex items-center space-x-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              step >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}>✓</div>
            <span className={`text-xs font-bold hidden sm:inline ${step >= 4 ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}`}>Confirmed</span>
          </div>
        </div>
      </div>

      {bookingError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{bookingError}</span>
        </div>
      )}

      {/* =========================================================
          STEP 1: DATE & TIME SELECTION
      ========================================================= */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-8 max-w-xl mx-auto">
          <div className="text-left mb-6">
            <h3 className="text-xl font-black text-slate-900">
              Select Date & Time
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Choose the date and time for your programme
            </p>
          </div>

          <form onSubmit={handleCheckAvailability} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Event Date
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Start Time
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  End Time
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>
                The availability will be checked for all halls based on your selected date and time.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={checkingAvailability}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>{checkingAvailability ? 'Checking Availability...' : 'Check Venue Availability'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          STEP 2: VENUE SELECTION - MOVIE TICKET STYLE (Step 4)
      ========================================================= */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Header & Legend */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Step 2 &bull; Venue Availability
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">
                Venue Availability
              </h3>
              <p className="text-xs text-blue-600 font-bold mt-1">
                {selectedDate} &bull; {startTime} &mdash; {endTime}
              </p>
            </div>

            {/* Legend matching specification */}
            <div className="flex items-center space-x-4 text-xs font-bold">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-700">Available</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                <span className="text-slate-700">Booked / Conflict</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span className="text-slate-700">Selected</span>
              </div>
            </div>
          </div>

          {dateRestrictionNotice && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{dateRestrictionNotice}</span>
            </div>
          )}

          {/* Movie-Ticket Style Hall Cards Grid (The 4 verified venues) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {venuesWithStatus.map((venue) => {
              const isSelected = selectedVenue?.id === venue.id;
              const isAvail = venue.isAvailable;
              const hasConflict = !!venue.conflictingBooking;
              const isPartiallyBooked = venue.status === 'partially_booked';

              const imgSlug = venue.venue_name.toLowerCase().replace(/\s+/g, '-');
              const imgSrc = venue.image_url || `/images/${imgSlug}.svg`;

              return (
                <div
                  key={venue.id}
                  onClick={() => {
                    if (isAvail) {
                      setSelectedVenue(venue);
                    } else if (hasConflict) {
                      // Trigger conflict popup
                      setConflictPopupVenue(venue);
                    }
                  }}
                  className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200 shadow-sm ${
                    !isAvail
                      ? 'border-slate-800/80 bg-slate-900/5 cursor-pointer'
                      : isSelected
                      ? 'border-blue-600 shadow-xl shadow-blue-500/10 ring-2 ring-blue-600/30 cursor-pointer scale-[1.01]'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md cursor-pointer'
                  }`}
                >
                  {/* Hall Visual Preview */}
                  <div className="h-44 relative bg-slate-900 overflow-hidden">
                    <img
                      src={imgSrc}
                      alt={venue.venue_name}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `/images/${imgSlug}.svg`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <div>
                        <div className="text-base font-black uppercase tracking-wide drop-shadow">
                          {venue.venue_name}
                        </div>
                        <div className="text-xs text-blue-200 font-semibold flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>Capacity: {venue.capacity}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                      {venue.description || 'Equipped with digital podium, acoustic audio, and laser projection.'}
                    </p>

                    {/* Partially booked exact occupied times (Requirement 5) */}
                    {venue.occupiedSlots && venue.occupiedSlots.length > 0 && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                        <span className="font-bold text-slate-700 block">Occupied on this date:</span>
                        {venue.occupiedSlots.map((slot, sIdx) => (
                          <div key={sIdx} className="text-slate-500 font-mono">
                            &bull; {slot.start_time} - {slot.end_time} ({slot.department_name})
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Movie Ticket Style Button */}
                    {!isAvail ? (
                      <div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConflictPopupVenue(venue);
                          }}
                          className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>Time Conflict / Booked &bull; Click to View</span>
                        </button>
                      </div>
                    ) : isSelected ? (
                      <div className="w-full py-2.5 px-3 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/30">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        <span>Selected Hall</span>
                      </div>
                    ) : (
                      <div className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        <span>Available &bull; Click to Select</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Date & Time</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedVenue) setStep(3);
                else setBookingError('Please choose an available hall to proceed');
              }}
              disabled={!selectedVenue}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition min-h-[44px]"
            >
              <span>Proceed to Programme Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          STEP 3: PROGRAMME DETAILS FORM (Step 5)
      ========================================================= */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Step 3 &bull; Details & Coordinator
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">
                Programme Details
              </h3>
            </div>

            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Venue Selection</span>
            </button>
          </div>

          {/* Selected Venue Preview Box */}
          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 shadow-md">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Selected Venue
                </div>
                <div className="text-base font-black text-slate-900">
                  {selectedVenue.venue_name}
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  {selectedDate} &bull; {startTime} to {endTime} &bull; Capacity: {selectedVenue.capacity}
                </div>
              </div>
            </div>

            <span className="self-start sm:self-center px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
              ● Slot Available for Direct Booking
            </span>
          </div>

          <form onSubmit={handleConfirmBooking} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Programme Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-2">
                  Programme Information
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Programme Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={programmeName}
                    onChange={(e) => setProgrammeName(e.target.value)}
                    placeholder="e.g. AI Workshop"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Programme Type *
                  </label>
                  <select
                    value={programmeType}
                    onChange={(e) => setProgrammeType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Workshop">Workshop</option>
                    <option value="National Conference">National Conference</option>
                    <option value="International Conference">International Conference</option>
                    <option value="Guest Lecture">Guest Lecture</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Fest">Technical Fest / Cultural</option>
                    <option value="Ph.D Viva-Voce">Ph.D Viva-Voce</option>
                    <option value="Department Meeting">Department Meeting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the programme..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Expected Participants *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedVenue.capacity}
                      value={expectedParticipants}
                      onChange={(e) => setExpectedParticipants(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Chief Guest / Guest Details
                    </label>
                    <input
                      type="text"
                      value={chiefGuest}
                      onChange={(e) => setChiefGuest(e.target.value)}
                      placeholder="e.g. Dr. P. Murugesan"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Coordinator & Requirements */}
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-2">
                  Coordinator & Additional Requirements
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Faculty Coordinator Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={coordinatorName}
                    onChange={(e) => setCoordinatorName(e.target.value)}
                    placeholder="e.g. Dr. S. Priya"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={coordinatorPhone}
                    onChange={(e) => setCoordinatorPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Coordinator Email
                  </label>
                  <input
                    type="email"
                    value={coordinatorEmail}
                    onChange={(e) => setCoordinatorEmail(e.target.value)}
                    placeholder="priya@drbccchinducollege.edu.in"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Additional Requirements checkboxes */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Additional Requirements
                  </label>
                  <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={reqProjector}
                        onChange={(e) => setReqProjector(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span>Projector</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={reqInternet}
                        onChange={(e) => setReqInternet(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span>Internet</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={reqSound}
                        onChange={(e) => setReqSound(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span>Sound System</span>
                    </label>

                    <div className="pt-1">
                      <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700 mb-1.5">
                        <input
                          type="checkbox"
                          checked={reqOther}
                          onChange={(e) => setReqOther(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span>Other</span>
                      </label>
                      {reqOther && (
                        <input
                          type="text"
                          value={otherReqText}
                          onChange={(e) => setOtherReqText(e.target.value)}
                          placeholder="Whiteboard"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Venue Selection</span>
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-3 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 min-h-[44px]"
                >
                  {submitting ? 'Confirming in Database...' : 'Book Venue'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          STEP 4: BOOKING CONFIRMATION & RECEIPT (Step 6)
      ========================================================= */}
      {step === 4 && confirmedBooking && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 max-w-xl mx-auto text-center space-y-6 print:hidden">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-bounce">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Booking Confirmed!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your programme has been successfully booked.
            </p>
          </div>

          {/* Booking Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500">Booking ID</span>
              <span className="text-sm font-black text-blue-600 font-mono tracking-wide">
                {confirmedBooking.booking_id}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Programme Name</span>
              <span className="font-extrabold text-slate-900">{confirmedBooking.programme_name}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Department</span>
              <span className="font-bold text-slate-800">{confirmedBooking.department_name}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Venue</span>
              <span className="font-bold text-slate-800">{confirmedBooking.venue_name}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Date</span>
              <span className="font-bold text-slate-800">{confirmedBooking.date}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Time</span>
              <span className="font-bold text-slate-800">{confirmedBooking.start_time} - {confirmedBooking.end_time}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Participants</span>
              <span className="font-bold text-slate-800">{confirmedBooking.expected_participants}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setShowReceiptModal(true)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>View & Print Official Booking Receipt</span>
            </button>

            <button
              onClick={onBookingComplete}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
            >
              View My Bookings
            </button>

            <button
              onClick={onCancel}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Conflict Popup Modal (Requirement 7) */}
      {conflictPopupVenue && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-6 h-6" />
                <h4 className="text-base font-black text-slate-900">Venue Unavailable</h4>
              </div>
              <button
                onClick={() => setConflictPopupVenue(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-3">
              <p className="font-semibold text-slate-800 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-200">
                <strong>{conflictPopupVenue.venue_name}</strong> is already booked on <strong>{selectedDate}</strong> from <strong>{conflictPopupVenue.conflictingBooking?.start_time || startTime}</strong> to <strong>{conflictPopupVenue.conflictingBooking?.end_time || endTime}</strong> by {conflictPopupVenue.conflictingBooking?.department_name || 'another department'}.
              </p>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800">Recommendation:</span>
                <p className="text-slate-600">
                  Please select a time <strong>before {conflictPopupVenue.conflictingBooking?.start_time || startTime}</strong> or <strong>after {conflictPopupVenue.conflictingBooking?.end_time || endTime}</strong>, or choose an alternative available hall.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConflictPopupVenue(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
              >
                Close & Select Another Hall
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && confirmedBooking && (
        <BookingReceiptModal
          booking={confirmedBooking}
          profile={profile}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}
