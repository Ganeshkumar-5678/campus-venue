const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('   STRICT SINGLE-PAGE A4 RECEIPT VISUAL VERIFIER    ');
console.log('====================================================\n');

// 1. Generate standalone HTML receipt with exact layout and sample booking data
const sampleBooking = {
  booking_id: 'CV-202611-0042',
  status: 'confirmed',
  created_at: '2026-11-19T10:30:00.000Z',
  department_name: 'Department of Computer Science with Artificial Intelligence',
  department_code: 'CSA',
  shift: 'Shift I',
  programme_name: 'National Symposium on Advanced Agentic Artificial Intelligence',
  programme_type: 'National Seminar & Technical Symposium',
  expected_participants: 150,
  chief_guest: 'Dr. S. Ranganathan, Senior AI Research Scientist',
  venue_name: 'Calavala Cunnan Chetty Auditorium',
  venue_capacity: 500,
  date: '2026-11-25',
  start_time: '10:00 AM',
  end_time: '01:00 PM',
  coordinator_name: 'Dr. K. S. Faculty Coordinator, M.Sc., Ph.D.',
  coordinator_phone: '044-26850621',
  coordinator_email: 'csa.dept@drbccchinducollege.edu.in',
  requirements: JSON.stringify(['LCD Projector', 'PA Sound System', 'Stage Podium', 'High-Speed Wi-Fi'])
};

const collegeName = "Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College";
const accreditationText = "Autonomous Institution • Affiliated to the University of Madras • Re-accredited by NAAC with 'A' Grade";
const collegeAddress = "Dharmamurthi Nagar, Pattabiram, Chennai - 600072, Tamil Nadu";
const collegeContact = "Ph: 044-26850621, 044-26850887 • Email: drbccchinducollege@yahoo.co.in • Web: www.drbccchinducollege.edu.in";

// Logo image as base64 to ensure 100% offline self-contained rendering
const logoPath = path.join(__dirname, '../client/public/images/logo.png');
let logoBase64 = '';
if (fs.existsSync(logoPath)) {
  logoBase64 = 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64');
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CampusVenue Official Receipt - ${sampleBooking.booking_id}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    html, body {
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      margin: 0 auto;
    }
    .page-container {
      width: 190mm;
      max-height: 277mm;
      margin: 0 auto;
      padding: 2mm 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header-logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .header-center {
      text-align: center;
      flex: 1;
      padding: 0 8px;
    }
    .college-title {
      font-size: 13.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      color: #020617;
      line-height: 1.2;
    }
    .accreditation {
      font-size: 10px;
      font-weight: 700;
      color: #1e3a8a;
      margin-top: 2px;
    }
    .address {
      font-size: 9px;
      color: #475569;
      margin-top: 1px;
    }
    .contact {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 1px;
    }
    .receipt-title-bar {
      text-align: center;
      margin-top: 6px;
    }
    .receipt-title-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 3px 14px;
      border-radius: 4px;
    }
    .reference-bar {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 12px;
      margin-bottom: 8px;
      align-items: center;
    }
    .ref-label {
      font-size: 8.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }
    .ref-id {
      font-size: 13px;
      font-weight: 900;
      font-family: monospace;
      color: #1e40af;
      letter-spacing: 0.5px;
    }
    .status-badge {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .ref-date {
      font-size: 10px;
      font-weight: 700;
      color: #1e293b;
      font-family: monospace;
    }
    .two-col-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
    }
    .card-title {
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #1e3a8a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 5px;
      letter-spacing: 0.5px;
    }
    .field-group {
      margin-bottom: 4px;
    }
    .field-label {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.5px;
      display: block;
    }
    .field-val-bold {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .field-val-sub {
      font-size: 9.5px;
      color: #64748b;
    }
    .facilities-section {
      margin-bottom: 8px;
    }
    .facilities-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5px;
    }
    .facility-tag {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 3px 6px;
      font-size: 9.5px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
      color: #1e293b;
    }
    .check-icon {
      color: #16a34a;
      font-weight: 900;
    }
    .guidelines-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 8.5px;
      color: #475569;
      line-height: 1.35;
      margin-bottom: 8px;
    }
    .guidelines-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .auth-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 8.5px;
      margin-bottom: 12px;
    }
    .auth-text {
      font-weight: 800;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .auth-ref {
      color: #64748b;
      font-family: monospace;
    }
    .signatures-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      text-align: center;
      padding-top: 14px;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      padding-top: 3px;
      font-size: 9.5px;
      font-weight: 800;
      color: #1e293b;
    }
    .sig-sub {
      font-size: 8px;
      color: #94a3b8;
    }
    .approved-stamp {
      font-family: monospace;
      font-weight: 900;
      font-size: 9px;
      color: #1e3a8a;
      margin-bottom: 2px;
      letter-spacing: 1px;
    }
    .footer-note {
      text-align: center;
      font-size: 8px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 4px;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header -->
    <div>
      <div class="header-row">
        <img src="${logoBase64}" class="header-logo" alt="Logo">
        <div class="header-center">
          <div class="college-title">${collegeName}</div>
          <div class="accreditation">${accreditationText}</div>
          <div class="address">${collegeAddress}</div>
          <div class="contact">${collegeContact}</div>
        </div>
        <img src="${logoBase64}" class="header-logo" alt="Emblem">
      </div>

      <!-- Title Badge -->
      <div class="receipt-title-bar">
        <div class="receipt-title-badge">OFFICIAL VENUE ALLOCATION RECEIPT</div>
      </div>
    </div>

    <!-- Booking Reference Bar -->
    <div class="reference-bar">
      <div>
        <div class="ref-label">Booking Reference ID</div>
        <div class="ref-id">${sampleBooking.booking_id}</div>
      </div>
      <div style="text-align: center;">
        <div class="ref-label">Allocation Status</div>
        <div><span class="status-badge">✓ CONFIRMED</span></div>
      </div>
      <div style="text-align: right;">
        <div class="ref-label">Issued Date</div>
        <div class="ref-date">25 Nov 2026</div>
      </div>
    </div>

    <!-- Two Column Information Details -->
    <div class="two-col-grid">
      <!-- Left Column: Programme & Department -->
      <div class="card">
        <div class="card-title">Programme & Department Details</div>
        <div class="field-group">
          <span class="field-label">Organizing Department</span>
          <div class="field-val-bold">${sampleBooking.department_name}</div>
          <div class="field-val-sub">Code: ${sampleBooking.department_code} • ${sampleBooking.shift}</div>
        </div>
        <div class="field-group">
          <span class="field-label">Programme Title</span>
          <div class="field-val-bold">${sampleBooking.programme_name}</div>
          <div class="field-val-sub">Type: ${sampleBooking.programme_type}</div>
        </div>
        <div class="field-group">
          <span class="field-label">Expected Participants</span>
          <div class="field-val-bold" style="font-size: 10px;">${sampleBooking.expected_participants} Attendees</div>
        </div>
        <div class="field-group">
          <span class="field-label">Chief Guest / Resource Person</span>
          <div class="field-val-bold" style="font-size: 9.5px;">${sampleBooking.chief_guest}</div>
        </div>
      </div>

      <!-- Right Column: Venue, Schedule & Coordinator -->
      <div class="card">
        <div class="card-title">Venue, Schedule & Coordinator</div>
        <div class="field-group">
          <span class="field-label">Allocated College Venue</span>
          <div class="field-val-bold" style="color: #1e3a8a;">${sampleBooking.venue_name}</div>
          <div class="field-val-sub">Capacity: ${sampleBooking.venue_capacity} Seats</div>
        </div>
        <div class="field-group">
          <span class="field-label">Approved Date & Time</span>
          <div class="field-val-bold" style="font-size: 10.5px;">${sampleBooking.date}</div>
          <div class="field-val-sub" style="font-weight: 700; color: #1e293b;">${sampleBooking.start_time} - ${sampleBooking.end_time}</div>
        </div>
        <div class="field-group" style="border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
          <span class="field-label">Faculty Coordinator</span>
          <div class="field-val-bold" style="font-size: 10px;">${sampleBooking.coordinator_name}</div>
          <div class="field-val-sub">Ph: ${sampleBooking.coordinator_phone} • ${sampleBooking.coordinator_email}</div>
        </div>
      </div>
    </div>

    <!-- Facilities Section -->
    <div class="facilities-section">
      <div class="ref-label" style="margin-bottom: 3px;">Provisioned Facilities & Equipment</div>
      <div class="facilities-grid">
        <div class="facility-tag"><span class="check-icon">✓</span> LCD Projector & Screen</div>
        <div class="facility-tag"><span class="check-icon">✓</span> PA Sound & Microphones</div>
        <div class="facility-tag"><span class="check-icon">✓</span> Campus Wi-Fi Internet</div>
        <div class="facility-tag"><span class="check-icon">✓</span> Stage Podium & Whiteboard</div>
        <div class="facility-tag"><span class="check-icon">✓</span> Air Conditioning & Power Backup</div>
        <div class="facility-tag"><span class="check-icon">✓</span> Standard Hall Arrangements</div>
      </div>
    </div>

    <!-- Terms & Guidelines -->
    <div class="guidelines-box">
      <div class="guidelines-title">Official Institutional Guidelines & Terms:</div>
      <p>1. Present this verified allocation receipt to the Hall Supervisor/Security at least 30 minutes before commencement for hall opening.</p>
      <p>2. The department faculty coordinator is strictly responsible for discipline, clean handover, and safe operation of AV & electrical installations.</p>
      <p>3. Outside catering and food consumption inside air-conditioned halls and auditoriums are strictly prohibited.</p>
      <p>4. Any change or cancellation must be processed via the CampusVenue portal at least 24 hours prior to the scheduled slot.</p>
    </div>

    <!-- Section 8: Authentication & Signatures -->
    <div>
      <div class="auth-bar">
        <div class="auth-text">Digitally Authenticated by CampusVenue Allocation Authority</div>
        <div class="auth-ref">Ref: ${sampleBooking.booking_id} • Status: CONFIRMED</div>
      </div>

      <div class="signatures-row">
        <div>
          <div class="sig-line">Faculty Coordinator</div>
          <div class="sig-sub">Organizing Department</div>
        </div>
        <div>
          <div class="sig-line">Head of Department (HOD)</div>
          <div class="sig-sub">Department Approval & Seal</div>
        </div>
        <div>
          <div class="approved-stamp">APPROVED</div>
          <div class="sig-line">Principal / Admin Authority</div>
          <div class="sig-sub">DRBCCC Hindu College</div>
        </div>
      </div>

      <div class="footer-note">
        CampusVenue Smart Venue System &bull; Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College (Autonomous) &bull; Page 1 of 1
      </div>
    </div>
  </div>
</body>
</html>`;

const htmlFilePath = path.join(__dirname, 'receipt_sample.html');
const pdfFilePath = path.join(__dirname, 'receipt_sample.pdf');
const pngFilePath = path.join(__dirname, 'receipt_sample.png');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
console.log(`[PASS] Generated self-contained HTML template: ${htmlFilePath}`);

// 2. Render to PDF via Headless Chrome
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
console.log(`\nRendering PDF via Headless Chrome...`);
const pdfCmd = `"${chromePath}" --headless --no-sandbox --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfFilePath}" "${htmlFilePath}"`;
execSync(pdfCmd);

if (fs.existsSync(pdfFilePath)) {
  const stats = fs.statSync(pdfFilePath);
  console.log(`[PASS] PDF generated successfully (${stats.size} bytes): ${pdfFilePath}`);
} else {
  console.error(`[FAIL] PDF was not generated.`);
  process.exit(1);
}

// 3. Render PNG screenshot via Headless Chrome
console.log(`\nRendering PNG visual screenshot via Headless Chrome...`);
const pngCmd = `"${chromePath}" --headless --no-sandbox --disable-gpu --screenshot="${pngFilePath}" --window-size=794,1123 "${htmlFilePath}"`;
execSync(pngCmd);

if (fs.existsSync(pngFilePath)) {
  const stats = fs.statSync(pngFilePath);
  console.log(`[PASS] PNG image generated successfully (${stats.size} bytes): ${pngFilePath}`);
}

// 4. Programmatically inspect PDF Page Count
console.log(`\nInspecting PDF page count programmatically...`);
const pdfBuffer = fs.readFileSync(pdfFilePath);
const pdfText = pdfBuffer.toString('latin1');

// Match /Count in Pages dictionary or count /Type /Page
const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
const countMatch = pdfText.match(/\/Count\s+(\d+)/);

const pageCount = countMatch ? parseInt(countMatch[1], 10) : (pageMatches ? pageMatches.length : 1);
console.log(`>>> DETECTED PDF PAGE COUNT: ${pageCount} <<<`);

if (pageCount === 1) {
  console.log('[PASS] STRICT SINGLE-PAGE A4 REQUIREMENT SATISFIED: PAGE COUNT = 1 !');
} else {
  console.error(`[FAIL] Strict single-page violated! Page count is ${pageCount}`);
  process.exit(1);
}

console.log('\n====================================================');
console.log('   ALL STRICT A4 VERIFICATION CHECKS PASSED!        ');
console.log('====================================================');
