import React, { useEffect, useState } from 'react';
import html2pdf from 'html2pdf.js'; // High-fidelity html2pdf.js capture engine
import {
  Printer,
  Download,
  X,
  ArrowLeft,
  CheckCircle2,
  Building2,
  MapPin,
  User,
  Settings,
  FileText,
  Calendar,
  Clock,
  ShieldCheck,
  Projector,
  Wifi,
  Volume2,
  Tv,
  Snowflake,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function BookingReceiptModal({ booking, profile, onClose }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!booking) return null;

  // Support closing with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('booking-receipt-printable');
    if (!element) return;

    try {
      setIsGeneratingPdf(true);

      // Ensure all web fonts and images are ready
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(element, {
        scale: 2, // High resolution capture
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Strict A4 portrait dimensions in millimeters (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10; // 10mm margins
      const maxW = pageWidth - margin * 2; // 190mm
      const maxH = pageHeight - margin * 2; // 277mm

      // Strictly fit on exactly 1 single page without automatic page splitting
      let renderW = maxW;
      let renderH = (canvas.height * maxW) / canvas.width;
      let posX = margin;
      let posY = margin;

      if (renderH > maxH) {
        renderH = maxH;
        renderW = (canvas.width * maxH) / canvas.height;
        posX = (pageWidth - renderW) / 2;
      } else {
        posY = margin + (maxH - renderH) / 6;
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');
      pdf.save(`CampusVenue_Receipt_${booking.booking_id || 'CV'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
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

  const reqList = parseReqs(booking.requirements);

  const formatTimestamp = (rawDate) => {
    try {
      if (!rawDate) return new Date().toLocaleString('en-US');
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return rawDate;
      return d.toLocaleString('en-US', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return rawDate || '';
    }
  };

  return (
    <div
      id="booking-receipt-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-start p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-3 sm:my-6 print:my-0 print:shadow-none print:border-none print:max-w-none animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Controls (Hidden in Print) */}
        <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>&larr; Return to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md transition"
              title="Print 1-Page Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-md transition disabled:opacity-60"
              title="Download Strict Single-Page PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF (1 Page)</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Close (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Official Receipt Body - Exactly matches reference image layout */}
        <div
          id="booking-receipt-printable"
          className="receipt-print-area bg-white max-w-[724px] mx-auto box-border p-2 sm:p-3 print:p-0 print:m-0"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Outer Border Box with Navy Border matching reference */}
          <div className="border-2 border-[#0b2545] rounded-xl overflow-hidden bg-white shadow-xs">
            {/* Inner Content Padding */}
            <div className="p-3 sm:p-4 print:p-3 space-y-2.5 print:space-y-2">
              
              {/* Header: Founder Portrait Left | College Name Center | Crest Right */}
              <div className="flex items-center justify-between gap-3 pb-2 border-b-2 border-[#0b2545]">
                {/* Founder's Portrait Left */}
                <div className="w-[62px] h-[78px] flex-shrink-0 rounded border border-slate-300 overflow-hidden shadow-xs bg-slate-50 flex items-center justify-center">
                  <img
                    src="/images/founder.png"
                    alt="Founder"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                {/* College Official Details Center */}
                <div className="text-center flex-1 px-1">
                  <h1 className="text-[13px] sm:text-[14px] font-black text-[#0b2545] tracking-tight uppercase leading-snug">
                    DHARMAMURTHI RAO BAHADUR CALAVALA CUNNAN
                  </h1>
                  <h2 className="text-[13px] sm:text-[14px] font-black text-[#0b2545] tracking-tight uppercase leading-snug">
                    CHETTY’S (DRBCC) HINDU COLLEGE
                  </h2>
                  <h3 className="text-[11px] sm:text-[12px] font-extrabold text-[#0b2545] uppercase tracking-wide mt-0.5">
                    (AUTONOMOUS)
                  </h3>
                  <p className="text-[8.5px] sm:text-[9.5px] font-bold text-[#1e3a8a] uppercase tracking-wider mt-0.5">
                    NIV INSTITUTION-AFFILIATED TO THE UNIVERSITY OF MADRAS
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] font-bold text-[#1e3a8a] uppercase tracking-wider">
                    PATTABIRAM, CHENNAI – 600072
                  </p>
                </div>

                {/* College Crest Right */}
                <div className="w-[74px] h-[78px] flex-shrink-0 flex items-center justify-center">
                  <img
                    src="/images/crest_emblem.png"
                    alt="DRBCCC Crest Emblem"
                    className="max-h-[76px] w-auto object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/logo.png";
                    }}
                  />
                </div>
              </div>

              {/* Receipt Title Banner - Centered Dark Navy Pill */}
              <div className="text-center pt-0.5">
                <div className="inline-block px-7 py-1 bg-[#0b2545] text-white rounded-full shadow-xs">
                  <span className="text-[11px] sm:text-[12px] font-black tracking-wider uppercase">
                    OFFICIAL VENUE ALLOCATION RECEIPT
                  </span>
                </div>
              </div>

              {/* Reference & Status Bar: 3 Columns with Vertical Dividers */}
              <div className="grid grid-cols-3 bg-[#f0f5ff] rounded-lg border border-[#c7d9f8] text-xs overflow-hidden">
                {/* Column 1: Booking Reference ID */}
                <div className="p-2 sm:px-3 border-r border-[#c7d9f8] flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[9px] uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
                    <span>BOOKING REFERENCE ID</span>
                  </div>
                  <div className="text-[15px] sm:text-[16px] font-black text-[#0e4a86] tracking-wide mt-0.5">
                    {booking.booking_id}
                  </div>
                </div>

                {/* Column 2: Booking Status */}
                <div className="p-2 sm:px-3 border-r border-[#c7d9f8] flex flex-col justify-center items-center text-center">
                  <div className="flex items-center gap-1 text-slate-700 font-bold text-[9px] uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>BOOKING STATUS</span>
                  </div>
                  <div className="mt-0.5">
                    <span className={`inline-block px-3 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider ${
                      booking.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {booking.status === 'confirmed' ? 'CONFIRMED' : 'CANCELLED'}
                    </span>
                  </div>
                </div>

                {/* Column 3: Created On */}
                <div className="p-2 sm:px-3 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[9px] uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
                    <span>CREATED ON</span>
                  </div>
                  <div className="text-[11px] font-bold text-[#0e4a86] mt-0.5 leading-tight">
                    {formatTimestamp(booking.created_at)}
                  </div>
                </div>
              </div>

              {/* 2x2 Information Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                
                {/* Card 1 (Top Left): PROGRAMME & DEPARTMENT DETAILS */}
                <div className="border border-[#bfdbfe] rounded-lg overflow-hidden bg-white flex flex-col">
                  <div className="bg-[#0b2545] text-white px-2.5 py-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wide">
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>PROGRAMME & DEPARTMENT DETAILS</span>
                  </div>
                  <div className="p-2 space-y-1.5 text-[9.5px] leading-tight flex-1">
                    <div className="flex items-start">
                      <span className="w-28 text-slate-600 font-medium flex-shrink-0">Department</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-extrabold text-slate-900 flex-1">{booking.department_name}</span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-28 text-slate-600 font-medium flex-shrink-0">Department Code</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-bold text-slate-800 flex-1">
                        {booking.department_code} <span className="text-slate-400 font-normal mx-1">|</span> Shift : {booking.shift || 'Shift-II'}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-28 text-slate-600 font-medium flex-shrink-0">Programme Title</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-extrabold text-slate-900 flex-1">{booking.programme_name}</span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-28 text-slate-600 font-medium flex-shrink-0">Programme Type</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-bold text-slate-800 flex-1">{booking.programme_type || 'Workshop'}</span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-28 text-slate-600 font-medium flex-shrink-0">Expected Attendees</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-extrabold text-slate-900 flex-1">
                        {booking.expected_participants || 60} Participants
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 2 (Top Right): VENUE & SCHEDULE */}
                <div className="border border-[#bfdbfe] rounded-lg overflow-hidden bg-white flex flex-col">
                  <div className="bg-[#0b2545] text-white px-2.5 py-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wide">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>VENUE & SCHEDULE</span>
                  </div>
                  <div className="p-2 space-y-1.5 text-[9.5px] leading-tight flex-1">
                    <div className="flex items-start">
                      <span className="w-24 text-slate-600 font-medium flex-shrink-0">Allocated Venue</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-extrabold text-[#0b2545] text-[10.5px] flex-1">{booking.venue_name}</span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-24 text-slate-600 font-medium flex-shrink-0">Seating Capacity</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-bold text-slate-800 flex-1">
                        {booking.venue_capacity || 500} Seats
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-24 text-slate-600 font-medium flex-shrink-0">Booking Date</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-extrabold text-slate-900 flex-1">{booking.date}</span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-24 text-slate-600 font-medium flex-shrink-0">Start Time</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-extrabold text-slate-900 flex-1">{booking.start_time}</span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-24 text-slate-600 font-medium flex-shrink-0">End Time</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-extrabold text-slate-900 flex-1">{booking.end_time}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3 (Bottom Left): FACULTY COORDINATOR */}
                <div className="border border-[#bfdbfe] rounded-lg overflow-hidden bg-white flex flex-col">
                  <div className="bg-[#0b2545] text-white px-2.5 py-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wide">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>FACULTY COORDINATOR</span>
                  </div>
                  <div className="p-2 space-y-1.5 text-[9.5px] leading-tight flex-1">
                    <div className="flex items-start">
                      <span className="w-16 text-slate-600 font-medium flex-shrink-0">Name</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-extrabold text-slate-900 flex-1">
                        {booking.coordinator_name || 'Dr. D. Lakshminarayanan'}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-16 text-slate-600 font-medium flex-shrink-0">Contact</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-bold text-slate-800 flex-1 font-mono">
                        {booking.coordinator_phone || '9876543210'}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-16 text-slate-600 font-medium flex-shrink-0">Email</span>
                      <span className="text-slate-400 mx-1">:</span>
                      <span className="font-bold text-slate-700 flex-1 break-all">
                        {booking.coordinator_email || 'hodcsa@drbccchinducollege.ac.in'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 4 (Bottom Right): FACILITIES & REQUIREMENTS */}
                <div className="border border-[#bfdbfe] rounded-lg overflow-hidden bg-white flex flex-col">
                  <div className="bg-[#0b2545] text-white px-2.5 py-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wide">
                    <Settings className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>FACILITIES & REQUIREMENTS</span>
                  </div>
                  <div className="p-2 space-y-1.5 text-[9.5px] leading-tight flex-1">
                    {/* 3x2 Grid of Facility Tiles */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-md py-1 px-1 flex flex-col items-center justify-center text-[#1e3a8a]">
                        <Projector className="w-3.5 h-3.5 mb-0.5" />
                        <span className="text-[8px] font-bold">Projector</span>
                      </div>
                      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-md py-1 px-1 flex flex-col items-center justify-center text-[#1e3a8a]">
                        <Wifi className="w-3.5 h-3.5 mb-0.5" />
                        <span className="text-[8px] font-bold">Internet</span>
                      </div>
                      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-md py-1 px-1 flex flex-col items-center justify-center text-[#1e3a8a]">
                        <Volume2 className="w-3.5 h-3.5 mb-0.5" />
                        <span className="text-[8px] font-bold">Sound System</span>
                      </div>
                      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-md py-1 px-1 flex flex-col items-center justify-center text-[#1e3a8a]">
                        <Tv className="w-3.5 h-3.5 mb-0.5" />
                        <span className="text-[8px] font-bold">Whiteboard</span>
                      </div>
                      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-md py-1 px-1 flex flex-col items-center justify-center text-[#1e3a8a]">
                        <Snowflake className="w-3.5 h-3.5 mb-0.5" />
                        <span className="text-[8px] font-bold">AC</span>
                      </div>
                      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-md py-1 px-1 flex flex-col items-center justify-center text-[#1e3a8a]">
                        <MoreHorizontal className="w-3.5 h-3.5 mb-0.5" />
                        <span className="text-[8px] font-bold">Other Facilities</span>
                      </div>
                    </div>

                    {/* Additional Requirements Box */}
                    <div className="pt-0.5">
                      <span className="text-[8.5px] font-extrabold text-slate-800 block">Additional Requirements:</span>
                      <div className="mt-0.5 p-1 px-2 bg-slate-50 border border-slate-200 rounded text-[8px] text-slate-700 font-medium">
                        {booking.additional_notes || (reqList.length > 0 ? reqList.join(', ') : 'Proper seating arrangement for 60 participants.')}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Card 5 (Full Width): TERMS & GUIDELINES */}
              <div className="border border-[#bfdbfe] rounded-lg overflow-hidden bg-white">
                <div className="bg-[#0b2545] text-white px-2.5 py-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wide">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>TERMS & GUIDELINES</span>
                </div>
                <div className="p-2.5 text-[8.5px] leading-tight text-slate-700 space-y-1">
                  <p className="flex items-start gap-1">
                    <strong className="text-slate-900 font-black">1.</strong>
                    <span>Present this official allocation receipt to the Hall Supervisor/Security at least 30 minutes before commencement.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <strong className="text-slate-900 font-black">2.</strong>
                    <span>The department faculty coordinator are responsible for discipline, cleanliness and safe operation of AV & electrical installations.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <strong className="text-slate-900 font-black">3.</strong>
                    <span>Outside catering and food consumption inside air-conditioned seminar halls and auditoriums are strictly prohibited.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <strong className="text-slate-900 font-black">4.</strong>
                    <span>Any change or cancellation must be processed via the CampusVenue portal at least 24 hours prior to the scheduled slot.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <strong className="text-slate-900 font-black">5.</strong>
                    <span>This allocation is digitally generated and confirmed in the DRBCCC Hindu College CampusVenue database.</span>
                  </p>
                </div>
              </div>

              {/* Footer: Digital Authentication | 3 Signatures | QR Code */}
              <div className="pt-2 flex items-center justify-between gap-2">
                
                {/* Left: Digital Authentication Stamp */}
                <div className="flex items-center gap-2 max-w-[210px]">
                  <div className="w-7 h-7 rounded-full bg-blue-950 text-white flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-[7.5px] font-black text-[#0b2545] tracking-tight uppercase leading-tight">
                      DIGITALLY AUTHENTICATED BY CAMPUSVENUE
                      <span className="sr-only">Digitally Authenticated by CampusVenue</span>
                    </div>
                    <div className="text-[7px] text-slate-500 font-mono mt-0.5 leading-tight">
                      Ref. : {booking.booking_id} | Generated : {formatTimestamp(booking.created_at)}
                    </div>
                  </div>
                </div>

                {/* Middle: 3 Signatures with Vertical Dividers */}
                <div className="flex-1 flex items-center justify-around border-l border-r border-slate-200 px-2">
                  {/* Coordinator Signature */}
                  <div className="text-center flex flex-col items-center px-1">
                    <div className="h-6 flex items-center justify-center">
                      <img src="/images/sig_coordinator.png" alt="Signature" className="h-5 w-auto object-contain" />
                    </div>
                    <div className="text-[7.5px] font-bold text-slate-700 mt-1">
                      Faculty Coordinator
                    </div>
                  </div>

                  {/* HOD Signature */}
                  <div className="text-center flex flex-col items-center px-1 border-l border-slate-200">
                    <div className="h-6 flex items-center justify-center">
                      <img src="/images/sig_hod.png" alt="Signature" className="h-5 w-auto object-contain" />
                    </div>
                    <div className="text-[7.5px] font-bold text-slate-700 mt-1">
                      Head of the Department (HOD)
                    </div>
                  </div>

                  {/* Principal Signature */}
                  <div className="text-center flex flex-col items-center px-1 border-l border-slate-200">
                    <div className="h-6 flex items-center justify-center">
                      <img src="/images/sig_principal.png" alt="Signature" className="h-5 w-auto object-contain" />
                    </div>
                    <div className="text-[7.5px] font-bold text-slate-700 mt-1">
                      Principal / Admin Authority
                    </div>
                  </div>
                </div>

                {/* Right: Verification QR Code */}
                <div className="w-[44px] h-[44px] flex-shrink-0 flex items-center justify-center bg-white p-0.5 border border-slate-200 rounded">
                  <img
                    src="/images/qr_code.png"
                    alt="QR Verification"
                    className="w-full h-full object-contain"
                  />
                </div>

              </div>

            </div>

            {/* Bottom Dark Navy Full-Width Bar */}
            <div className="bg-[#0b2545] text-white py-1.5 px-4 text-center text-[9.5px] tracking-[0.2em] font-medium italic">
              Knowledge &bull; Discipline &bull; Excellence
            </div>
          </div>
        </div>

        {/* Bottom Actions (Hidden in Print) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 print:hidden text-xs">
          <p className="text-[11px] text-slate-500">
            Official Single-Page A4 Portrait document. Formatted for institutional records.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 sm:flex-none px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF (1 Page)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
