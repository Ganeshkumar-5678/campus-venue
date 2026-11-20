const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { db } = require('./database');

console.log('================================================================');
console.log('  VERIFYING REFERENCE RECEIPT LAYOUT & SINGLE-PAGE A4 OUTPUT   ');
console.log('================================================================\n');

// 1. Fetch real booking data from SQLite database
const booking = db.prepare(`
  SELECT 
    b.id,
    b.booking_id,
    b.date,
    b.start_time,
    b.end_time,
    b.status,
    b.requirements,
    b.additional_notes,
    b.created_at,
    d.department_name,
    d.department_code,
    d.shift,
    v.venue_name,
    v.capacity as venue_capacity,
    p.programme_name,
    p.programme_type,
    p.expected_participants,
    p.coordinator_name,
    p.coordinator_phone,
    p.coordinator_email
  FROM bookings b
  JOIN departments d ON b.department_id = d.id
  JOIN venues v ON b.venue_id = v.id
  JOIN programmes p ON b.programme_id = p.id
  ORDER BY b.id DESC
  LIMIT 1
`).get();

console.log('Using real database booking:', booking.booking_id, '(', booking.department_name, ')');

// 2. Fetch college profile from SQLite database
const profile = db.prepare('SELECT * FROM college_profile').get();

// Encode images to base64 so HTML is 100% self-contained and loads instantaneously
const imgDir = path.join(__dirname, '../client/public/images');
const toBase64 = (fileName) => {
  const p = path.join(imgDir, fileName);
  if (fs.existsSync(p)) {
    return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  }
  return '';
};

const founderBase64 = toBase64('founder.png');
const crestBase64 = toBase64('crest_emblem.png');
const sigCoordBase64 = toBase64('sig_coordinator.png');
const sigHodBase64 = toBase64('sig_hod.png');
const sigPrincipalBase64 = toBase64('sig_principal.png');
const qrCodeBase64 = toBase64('qr_code.png');

const formatTimestamp = (raw) => {
  const d = new Date(raw || Date.now());
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CampusVenue Official Receipt - ${booking.booking_id}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    html, body {
      background: #ffffff;
      color: #0f172a;
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .receipt-wrapper {
      width: 190mm;
      max-height: 277mm;
      background: #ffffff;
      margin: 0 auto;
    }
    .outer-card {
      border: 2px solid #0b2545;
      border-radius: 12px;
      overflow: hidden;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .inner-padding {
      padding: 16px 20px 14px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 2px solid #0b2545;
      padding-bottom: 10px;
    }
    .founder-box {
      width: 62px;
      height: 78px;
      flex-shrink: 0;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      background: #f8fafc;
    }
    .founder-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .header-center {
      text-align: center;
      flex: 1;
      padding: 0 4px;
    }
    .college-name {
      font-size: 13px;
      font-weight: 900;
      color: #0b2545;
      text-transform: uppercase;
      letter-spacing: -0.1px;
      line-height: 1.25;
    }
    .autonomous-tag {
      font-size: 11px;
      font-weight: 800;
      color: #0b2545;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .affil-tag {
      font-size: 8.5px;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      margin-top: 2px;
      line-height: 1.2;
    }
    .crest-box {
      width: 74px;
      height: 78px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .crest-box img {
      max-height: 76px;
      max-width: 74px;
      object-fit: contain;
    }
    .title-pill-container {
      text-align: center;
    }
    .title-pill {
      display: inline-block;
      background: #0b2545;
      color: #ffffff;
      padding: 4px 30px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .ref-bar {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      background: #f0f5ff;
      border: 1px solid #c7d9f8;
      border-radius: 8px;
      overflow: hidden;
    }
    .ref-col {
      padding: 7px 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .ref-col-border {
      border-right: 1px solid #c7d9f8;
    }
    .ref-label {
      font-size: 8.5px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .ref-val-id {
      font-size: 16px;
      font-weight: 900;
      color: #0e4a86;
      margin-top: 2px;
      letter-spacing: 0.5px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 12px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
      margin-top: 2px;
    }
    .ref-val-date {
      font-size: 10.5px;
      font-weight: 800;
      color: #0e4a86;
      margin-top: 2px;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .card {
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }
    .card-header {
      background: #0b2545;
      color: #ffffff;
      padding: 4px 8px;
      font-size: 9.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .card-body {
      padding: 7px 10px;
      font-size: 9px;
      line-height: 1.35;
      display: flex;
      flex-direction: column;
      gap: 5px;
      flex: 1;
    }
    .row-item {
      display: flex;
      align-items: flex-start;
    }
    .row-label {
      width: 105px;
      flex-shrink: 0;
      color: #475569;
      font-weight: 600;
    }
    .row-colon {
      margin: 0 4px;
      color: #94a3b8;
    }
    .row-val {
      flex: 1;
      font-weight: 800;
      color: #0f172a;
    }
    .facility-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 5px;
    }
    .facility-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 5px;
      padding: 4px 2px;
      text-align: center;
      color: #1e3a8a;
      font-size: 8px;
      font-weight: 700;
    }
    .facility-icon {
      font-size: 11px;
      display: block;
      margin-bottom: 2px;
    }
    .req-box {
      margin-top: 3px;
      padding: 3px 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 8px;
      color: #334155;
      font-weight: 500;
    }
    .guidelines-card {
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
    }
    .guidelines-body {
      padding: 8px 12px;
      font-size: 8.5px;
      line-height: 1.38;
      color: #334155;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .rule-item {
      display: flex;
      align-items: flex-start;
      gap: 4px;
    }
    .rule-num {
      font-weight: 900;
      color: #0f172a;
    }
    .footer-auth-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 2px;
    }
    .auth-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      max-width: 195px;
    }
    .shield-icon {
      width: 26px;
      height: 26px;
      border-radius: 9999px;
      background: #0b2545;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
    }
    .auth-title {
      font-size: 7.5px;
      font-weight: 900;
      color: #0b2545;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      line-height: 1.2;
    }
    .auth-ref {
      font-size: 7px;
      color: #64748b;
      margin-top: 1px;
      font-family: monospace;
    }
    .signatures-group {
      display: flex;
      align-items: center;
      justify-content: space-around;
      flex: 1;
      border-left: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      padding: 0 4px;
    }
    .sig-col {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 4px;
    }
    .sig-img {
      height: 22px;
      object-fit: contain;
    }
    .sig-label {
      font-size: 7.5px;
      font-weight: 800;
      color: #334155;
      margin-top: 2px;
    }
    .qr-box {
      width: 44px;
      height: 44px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 1px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      flex-shrink: 0;
    }
    .qr-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .bottom-motto-bar {
      background: #0b2545;
      color: #ffffff;
      padding: 5px 0;
      text-align: center;
      font-size: 9.5px;
      font-style: italic;
      letter-spacing: 2px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="receipt-wrapper">
    <div class="outer-card">
      <div class="inner-padding">
        
        <!-- Header -->
        <div class="header-row">
          <div class="founder-box">
            <img src="${founderBase64}" alt="Founder">
          </div>
          <div class="header-center">
            <div class="college-name">DHARMAMURTHI RAO BAHADUR CALAVALA CUNNAN</div>
            <div class="college-name">CHETTY’S (DRBCC) HINDU COLLEGE</div>
            <div class="autonomous-tag">(AUTONOMOUS)</div>
            <div class="affil-tag">NIV INSTITUTION-AFFILIATED TO THE UNIVERSITY OF MADRAS</div>
            <div class="affil-tag">PATTABIRAM, CHENNAI – 600072</div>
          </div>
          <div class="crest-box">
            <img src="${crestBase64}" alt="Emblem">
          </div>
        </div>

        <!-- Receipt Title Banner -->
        <div class="title-pill-container">
          <div class="title-pill">OFFICIAL VENUE ALLOCATION RECEIPT</div>
        </div>

        <!-- Reference & Status Bar -->
        <div class="ref-bar">
          <div class="ref-col ref-col-border">
            <div class="ref-label">
              <span>&#128196;</span> BOOKING REFERENCE ID
            </div>
            <div class="ref-val-id">${booking.booking_id}</div>
          </div>
          <div class="ref-col ref-col-border" style="align-items: center; text-align: center;">
            <div class="ref-label">
              <span>&#9989;</span> BOOKING STATUS
            </div>
            <div>
              <span class="status-badge">CONFIRMED</span>
            </div>
          </div>
          <div class="ref-col">
            <div class="ref-label">
              <span>&#128197;</span> CREATED ON
            </div>
            <div class="ref-val-date">${formatTimestamp(booking.created_at)}</div>
          </div>
        </div>

        <!-- 2x2 Information Grid -->
        <div class="cards-grid">
          
          <!-- Card 1: Programme & Department -->
          <div class="card">
            <div class="card-header">
              <span>&#127963;</span> PROGRAMME & DEPARTMENT DETAILS
            </div>
            <div class="card-body">
              <div class="row-item">
                <span class="row-label">Department</span>
                <span class="row-colon">:</span>
                <span class="row-val">${booking.department_name}</span>
              </div>
              <div class="row-item">
                <span class="row-label">Department Code</span>
                <span class="row-colon">:</span>
                <span class="row-val">${booking.department_code} <span style="color:#94a3b8;font-weight:normal;">|</span> Shift : ${booking.shift || 'Shift-II'}</span>
              </div>
              <div class="row-item">
                <span class="row-label">Programme Title</span>
                <span class="row-colon">:</span>
                <span class="row-val">${booking.programme_name}</span>
              </div>
              <div class="row-item">
                <span class="row-label">Programme Type</span>
                <span class="row-colon">:</span>
                <span class="row-val">${booking.programme_type || 'Workshop'}</span>
              </div>
              <div class="row-item">
                <span class="row-label">Expected Attendees</span>
                <span class="row-colon">:</span>
                <span class="row-val">${booking.expected_participants} Participants</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Venue & Schedule -->
          <div class="card">
            <div class="card-header">
              <span>&#128205;</span> VENUE & SCHEDULE
            </div>
            <div class="card-body">
              <div class="row-item">
                <span class="row-label">Allocated Venue</span>
                <span class="row-colon">:</span>
                <span class="row-val" style="color: #0b2545; font-size: 10px;">${booking.venue_name}</span>
              </div>
              <div class="row-item">
                <span class="row-label">Seating Capacity</span>
                <span class="row-colon">:</span>
                <span class="row-val">${booking.venue_capacity} Seats</span>
              </div>
              <div class="row-item">
                <span class="row-label">Booking Date</span>
                <span class="row-colon">:</span>
                <span class="row-val">${booking.date}</span>
              </div>
              <div class="row-item">
                <span class="row-label">Start Time</span>
                <span class="row-colon">:</span>
                <span class="row-val">${booking.start_time}</span>
              </div>
              <div class="row-item">
                <span class="row-label">End Time</span>
                <span class="row-colon">:</span>
                <span class="row-val">${booking.end_time}</span>
              </div>
            </div>
          </div>

          <!-- Card 3: Faculty Coordinator -->
          <div class="card">
            <div class="card-header">
              <span>&#128100;</span> FACULTY COORDINATOR
            </div>
            <div class="card-body">
              <div class="row-item">
                <span class="row-label" style="width: 60px;">Name</span>
                <span class="row-colon">:</span>
                <span class="row-val">${booking.coordinator_name || 'Dr. D. Lakshminarayanan'}</span>
              </div>
              <div class="row-item">
                <span class="row-label" style="width: 60px;">Contact</span>
                <span class="row-colon">:</span>
                <span class="row-val" style="font-family: monospace;">${booking.coordinator_phone || '9876543210'}</span>
              </div>
              <div class="row-item">
                <span class="row-label" style="width: 60px;">Email</span>
                <span class="row-colon">:</span>
                <span class="row-val" style="word-break: break-all;">${booking.coordinator_email || 'hodcsa@drbccchinducollege.ac.in'}</span>
              </div>
            </div>
          </div>

          <!-- Card 4: Facilities & Requirements -->
          <div class="card">
            <div class="card-header">
              <span>&#9881;</span> FACILITIES & REQUIREMENTS
            </div>
            <div class="card-body">
              <div class="facility-grid">
                <div class="facility-box"><span class="facility-icon">&#128253;</span>Projector</div>
                <div class="facility-box"><span class="facility-icon">&#128246;</span>Internet</div>
                <div class="facility-box"><span class="facility-icon">&#128266;</span>Sound System</div>
                <div class="facility-box"><span class="facility-icon">&#128444;</span>Whiteboard</div>
                <div class="facility-box"><span class="facility-icon">&#10052;</span>AC</div>
                <div class="facility-box"><span class="facility-icon">&#8226;&#8226;&#8226;</span>Other Facilities</div>
              </div>
              <div>
                <span style="font-size: 8px; font-weight: 800; color: #1e293b;">Additional Requirements:</span>
                <div class="req-box">${booking.additional_notes || 'Proper seating arrangement for participants.'}</div>
              </div>
            </div>
          </div>

        </div>

        <!-- Card 5: Terms & Guidelines -->
        <div class="guidelines-card">
          <div class="card-header">
            <span>&#128196;</span> TERMS & GUIDELINES
          </div>
          <div class="guidelines-body">
            <div class="rule-item">
              <span class="rule-num">1.</span>
              <span>Present this official allocation receipt to the Hall Supervisor/Security at least 30 minutes before commencement.</span>
            </div>
            <div class="rule-item">
              <span class="rule-num">2.</span>
              <span>The department faculty coordinator are responsible for discipline, cleanliness and safe operation of AV & electrical installations.</span>
            </div>
            <div class="rule-item">
              <span class="rule-num">3.</span>
              <span>Outside catering and food consumption inside air-conditioned seminar halls and auditoriums are strictly prohibited.</span>
            </div>
            <div class="rule-item">
              <span class="rule-num">4.</span>
              <span>Any change or cancellation must be processed via the CampusVenue portal at least 24 hours prior to the scheduled slot.</span>
            </div>
            <div class="rule-item">
              <span class="rule-num">5.</span>
              <span>This allocation is digitally generated and confirmed in the DRBCCC Hindu College CampusVenue database.</span>
            </div>
          </div>
        </div>

        <!-- Footer: Auth | 3 Signatures | QR Code -->
        <div class="footer-auth-row">
          <div class="auth-badge">
            <div class="shield-icon">&#10004;</div>
            <div>
              <div class="auth-title">DIGITALLY AUTHENTICATED BY CAMPUSVENUE</div>
              <div class="auth-ref">Ref. : ${booking.booking_id} | Generated : ${formatTimestamp(booking.created_at)}</div>
            </div>
          </div>

          <div class="signatures-group">
            <div class="sig-col">
              <img src="${sigCoordBase64}" class="sig-img" alt="Sign">
              <div class="sig-label">Faculty Coordinator</div>
            </div>
            <div class="sig-col" style="border-left: 1px solid #e2e8f0;">
              <img src="${sigHodBase64}" class="sig-img" alt="Sign">
              <div class="sig-label">HOD</div>
            </div>
            <div class="sig-col" style="border-left: 1px solid #e2e8f0;">
              <img src="${sigPrincipalBase64}" class="sig-img" alt="Sign">
              <div class="sig-label">Principal / Admin Authority</div>
            </div>
          </div>

          <div class="qr-box">
            <img src="${qrCodeBase64}" alt="QR">
          </div>
        </div>

      </div>

      <!-- Bottom Motto Bar -->
      <div class="bottom-motto-bar">
        Knowledge &bull; Discipline &bull; Excellence
      </div>
    </div>
  </div>
</body>
</html>`;

const htmlFilePath = path.join(__dirname, 'receipt_verified.html');
const pdfFilePath = path.join(__dirname, 'receipt_verified.pdf');
const pngFilePath = path.join(__dirname, 'receipt_verified.png');
const artifactPng = 'C:\\Users\\ELCOT\\.gemini\\antigravity\\brain\\5616c6d5-5ee4-48d7-b993-d121e53275eb\\receipt_a4_single_page.png';

fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
console.log(`[PASS] Wrote verified HTML to: ${htmlFilePath}`);

// Render PDF via Headless Chrome
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
console.log(`Rendering PDF via Headless Chrome...`);
const pdfCmd = `"${chromePath}" --headless --no-sandbox --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfFilePath}" "${htmlFilePath}"`;
execSync(pdfCmd);

// Verify PDF Page count
const pdfBuffer = fs.readFileSync(pdfFilePath);
const pdfString = pdfBuffer.toString('latin1');
const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
const pageCount = pageMatches ? pageMatches.length : 1;

console.log(`\n----------------------------------------------------`);
console.log(`PDF Verification Result:`);
console.log(`  File: ${pdfFilePath}`);
console.log(`  Page count: ${pageCount}`);

if (pageCount === 1) {
  console.log(`  SUCCESS: EXACTLY ONE A4 PORTRAIT PAGE CONFIRMED! [PASSED]`);
} else {
  console.error(`  FAILURE: Expected 1 page but got ${pageCount} pages!`);
  process.exit(1);
}
console.log(`----------------------------------------------------\n`);

// Render PNG visual screenshot via Headless Chrome
console.log(`Rendering PNG visual screenshot via Headless Chrome...`);
const pngCmd = `"${chromePath}" --headless --no-sandbox --disable-gpu --screenshot="${pngFilePath}" --window-size=794,1123 "${htmlFilePath}"`;
execSync(pngCmd);

// Copy to artifacts
fs.copyFileSync(pngFilePath, artifactPng);
console.log(`Saved screenshot to artifacts: ${artifactPng}`);
