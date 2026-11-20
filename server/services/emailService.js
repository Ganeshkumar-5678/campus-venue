const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { db, logEmail, logAudit } = require('../database');

// Lightweight native .env loader (zero external dependencies)
function loadEnv() {
  const possiblePaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        raw.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const k = trimmed.substring(0, eqIdx).trim();
              const v = trimmed.substring(eqIdx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
              if (k && process.env[k] === undefined) {
                process.env[k] = v;
              }
            }
          }
        });
      } catch (err) {
        console.warn('Could not read .env file:', err.message);
      }
    }
  }
}

loadEnv();

// Configure Nodemailer transporter dynamically
function getTransporter() {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT, 10) || 587;

  if (host && user && pass) {
    try {
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
    } catch (err) {
      console.warn('[EMAIL] Transporter creation warning:', err.message);
      return null;
    }
  }
  return null;
}

const DEFAULT_FROM = process.env.EMAIL_FROM || process.env.SMTP_FROM || '"CampusVenue DRBCCC Hindu College" <campusvenue@drbccchinducollege.edu.in>';

// Helper to validate email format
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function sendEmail({ to, subject, htmlText, plainText, bookingId = null, emailType = 'GENERAL' }) {
  if (!isValidEmail(to)) {
    console.warn(`[EMAIL SKIPPED] Invalid recipient email address: "${to}" for ${emailType}`);
    logEmail(bookingId, emailType, to || 'INVALID', subject, plainText, 'FAILED', 'Invalid recipient email format');
    return { success: false, reason: 'Invalid recipient email format' };
  }

  // Duplicate prevention check: If an identical confirmation email was already DELIVERED for this booking, prevent duplicate
  if (bookingId && emailType === 'BOOKING_CONFIRMATION') {
    try {
      const existing = db.prepare(`
        SELECT id FROM email_logs 
        WHERE booking_id = ? AND email_type = ? AND status = 'DELIVERED'
        LIMIT 1
      `).get(bookingId, emailType);

      if (existing) {
        console.log(`[EMAIL DUPLICATE PREVENTED] Confirmation email already sent for booking ${bookingId}`);
        return { success: true, mode: 'already_sent' };
      }
    } catch (err) {
      console.warn('Error checking duplicate email log:', err.message);
    }
  }

  const transporter = getTransporter();

  // Retry mechanism: up to 2 attempts
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (transporter) {
        await transporter.sendMail({
          from: DEFAULT_FROM,
          to,
          subject,
          text: plainText,
          html: htmlText
        });

        logEmail(bookingId, emailType, to, subject, plainText, 'DELIVERED');
        logAudit('SYSTEM', 'EmailService', 'CONFIRMATION_EMAIL_SENT', 'EMAIL', bookingId, `Confirmation email delivered to ${to} (Attempt ${attempt})`);
        console.log(`[EMAIL DELIVERED via SMTP] ${emailType} to ${to}: "${subject}"`);
        return { success: true, mode: 'smtp' };
      } else {
        // Fallback simulated delivery if SMTP credentials are not yet configured
        logEmail(bookingId, emailType, to, subject, plainText, 'SIMULATED');
        logAudit('SYSTEM', 'EmailService', 'CONFIRMATION_EMAIL_SENT', 'EMAIL', bookingId, `Simulated confirmation email to ${to}`);
        console.log(`[EMAIL SIMULATED - Configure SMTP in .env] ${emailType} to ${to}: "${subject}"`);
        return { success: true, mode: 'simulated' };
      }
    } catch (error) {
      lastError = error;
      console.error(`[EMAIL ERROR Attempt ${attempt}/2] Failed to send ${emailType} to ${to}:`, error.message);
      if (attempt < 2) {
        // Wait 1 second before retry
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }

  // If all attempts failed: record in SQLite logs and return gracefully (never crash booking)
  logEmail(bookingId, emailType, to, subject, plainText, 'FAILED', lastError ? lastError.message : 'Unknown error');
  logAudit('SYSTEM', 'EmailService', 'CONFIRMATION_EMAIL_FAILED', 'EMAIL', bookingId, `Failed to send confirmation email to ${to}: ${lastError?.message}`);
  return { success: false, error: lastError?.message };
}

function parseReqString(raw) {
  if (!raw) return 'Standard Hall Facilities';
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed.join(', ') || 'Standard Hall Facilities';
    return String(parsed);
  } catch {
    return String(raw);
  }
}

/**
 * FEATURE: Automatic Booking Confirmation Email
 * Triggered immediately upon confirmed booking creation (Normal Booking & AI Voice Booking)
 */
async function sendBookingConfirmationEmail(booking, department = {}) {
  // Exact recipient email entered in the booking details (with safety fallbacks)
  const recipient = (booking.coordinator_email || department.email || booking.department_email || '').trim();
  const coordinatorName = booking.coordinator_name || 'Faculty Coordinator';
  const bookingId = booking.booking_id;
  const programmeName = booking.programme_name || 'Department Academic Programme';
  const deptName = booking.department_name || department.department_name || 'Academic Department';
  const venueName = booking.venue_name || 'College Hall';
  const bookingDate = booking.date;
  const startTime = booking.start_time;
  const endTime = booking.end_time;
  const participants = booking.expected_participants || 60;
  const coordinatorPhone = booking.coordinator_phone || 'N/A';
  const facilities = parseReqString(booking.requirements);
  const additionalNotes = booking.additional_notes || 'None specified';

  const subject = `CampusVenue – Booking Confirmed | ${bookingId}`;

  const plainText = [
    'CAMPUSVENUE – BOOKING CONFIRMATION',
    '',
    `Dear ${coordinatorName},`,
    '',
    'Your venue booking has been successfully confirmed!',
    '',
    'BOOKING DETAILS',
    `- Booking Reference: ${bookingId}`,
    `- Booking Status: CONFIRMED`,
    `- Programme Name: ${programmeName}`,
    `- Department: ${deptName}`,
    `- Venue: ${venueName}`,
    `- Booking Date: ${bookingDate}`,
    `- Start Time: ${startTime}`,
    `- End Time: ${endTime}`,
    `- Expected Attendees: ${participants}`,
    `- Coordinator Name: ${coordinatorName}`,
    `- Contact Number: ${coordinatorPhone}`,
    `- Email Address: ${recipient}`,
    `- Selected Facilities: ${facilities}`,
    `- Additional Requirements: ${additionalNotes}`,
    '',
    'Your venue booking is confirmed. Please keep this email for future reference.',
    '',
    'Thank you for using CampusVenue.',
    '',
    "DHARMAMURTHI RAO BAHADUR CALAVALA CUNNAN CHETTY'S HINDU COLLEGE",
    'Knowledge • Discipline • Excellence'
  ].join('\n');

  const htmlText = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #0f172a; }
    .container { max-width: 620px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background-color: #0b2545; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #93c5fd; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 28px; }
    .greeting { font-size: 15px; margin-bottom: 12px; }
    .banner { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; display: flex; align-items: center; justify-content: space-between; }
    .banner-title { color: #065f46; font-size: 14px; font-weight: 700; margin: 0; }
    .status-badge { background-color: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .details-card { background-color: #f0f5ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .details-title { margin-top: 0; margin-bottom: 14px; color: #0b2545; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; border-bottom: 1px solid #bfdbfe; padding-bottom: 6px; }
    .details-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .details-table td { padding: 5px 0; vertical-align: top; }
    .label { width: 42%; color: #475569; font-weight: 600; }
    .value { width: 58%; color: #0f172a; font-weight: 700; }
    .value-highlight { color: #0e4a86; font-weight: 800; }
    .footer { background-color: #0b2545; color: #ffffff; padding: 18px; text-align: center; }
    .college-name { font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
    .motto { font-size: 11px; color: #cbd5e1; font-style: italic; margin-top: 6px; letter-spacing: 1.5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CAMPUSVENUE – BOOKING CONFIRMATION</h1>
      <p>Official Hall Allocation Authority</p>
    </div>

    <div class="content">
      <p class="greeting">Dear <strong>${coordinatorName}</strong>,</p>
      <p>Your venue booking has been successfully confirmed!</p>

      <div class="banner">
        <span class="banner-title">Allocation Status:</span>
        <span class="status-badge">CONFIRMED</span>
      </div>

      <div class="details-card">
        <h3 class="details-title">BOOKING DETAILS</h3>
        <table class="details-table">
          <tr>
            <td class="label">Booking Reference:</td>
            <td class="value value-highlight" style="font-family: monospace; font-size: 14px;">${bookingId}</td>
          </tr>
          <tr>
            <td class="label">Booking Status:</td>
            <td class="value" style="color: #059669;">CONFIRMED</td>
          </tr>
          <tr>
            <td class="label">Programme Name:</td>
            <td class="value">${programmeName}</td>
          </tr>
          <tr>
            <td class="label">Department:</td>
            <td class="value">${deptName}</td>
          </tr>
          <tr>
            <td class="label">Venue:</td>
            <td class="value" style="color: #0b2545;">${venueName}</td>
          </tr>
          <tr>
            <td class="label">Booking Date:</td>
            <td class="value">${bookingDate}</td>
          </tr>
          <tr>
            <td class="label">Time Slot:</td>
            <td class="value">${startTime} - ${endTime}</td>
          </tr>
          <tr>
            <td class="label">Expected Attendees:</td>
            <td class="value">${participants} Attendees</td>
          </tr>
          <tr>
            <td class="label">Coordinator Name:</td>
            <td class="value">${coordinatorName}</td>
          </tr>
          <tr>
            <td class="label">Contact Number:</td>
            <td class="value">${coordinatorPhone}</td>
          </tr>
          <tr>
            <td class="label">Email Address:</td>
            <td class="value" style="color: #0e4a86;">${recipient}</td>
          </tr>
          <tr>
            <td class="label">Selected Facilities:</td>
            <td class="value">${facilities}</td>
          </tr>
          <tr>
            <td class="label">Additional Requirements:</td>
            <td class="value" style="font-weight: normal; color: #334155;">${additionalNotes}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        Your venue booking is confirmed. Please keep this email for future reference.<br>
        Thank you for using CampusVenue.
      </p>
    </div>

    <div class="footer">
      <p class="college-name">DHARMAMURTHI RAO BAHADUR CALAVALA CUNNAN CHETTY'S HINDU COLLEGE</p>
      <p class="motto">Knowledge &bull; Discipline &bull; Excellence</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: recipient,
    subject,
    plainText,
    htmlText,
    bookingId,
    emailType: 'BOOKING_CONFIRMATION'
  });
}

/**
 * Cancellation Email (Department Self-Cancellation or Admin Emergency)
 */
async function sendBookingCancellationEmail(booking, department = {}, reason = '', cancelledByAdmin = false, alternatives = []) {
  const deptName = department.department_name || booking.department_name || 'Department Coordinator';
  const recipient = (booking.coordinator_email || department.email || booking.department_email || '').trim();
  const bookingId = booking.booking_id;
  const programmeName = booking.programme_name || 'Department Programme';
  const venueName = booking.venue_name || 'College Hall';
  const bookingDate = booking.date;
  const startTime = booking.start_time;
  const endTime = booking.end_time;

  const subject = cancelledByAdmin
    ? `CampusVenue Booking Cancelled by Admin - ${bookingId}`
    : `CampusVenue Booking Cancelled - ${bookingId}`;

  let alternativeText = '';
  if (alternatives && alternatives.length > 0) {
    const alt = alternatives[0];
    alternativeText = `\nRecommended Alternative Slot:\n- Venue: ${alt.venue_name}\n- Date: ${alt.date}\n- Time: ${alt.start_time} - ${alt.end_time}\n(Please log in to CampusVenue to reserve this alternative slot.)\n`;
  }

  const plainText = [
    `Dear ${deptName},`,
    '',
    `Your CampusVenue booking has been ${cancelledByAdmin ? 'cancelled by Administrator due to official administrative requirements' : 'cancelled'}.`,
    '',
    'Booking ID:',
    `${bookingId}`,
    '',
    'Programme:',
    `${programmeName}`,
    '',
    'Venue:',
    `${venueName}`,
    '',
    'Date:',
    `${bookingDate}`,
    '',
    'Time:',
    `${startTime} - ${endTime}`,
    '',
    'Cancellation Reason:',
    `${reason || 'Department request'}`,
    '',
    'Status:',
    'CANCELLED',
    alternativeText,
    'Regards,',
    'CampusVenue',
    "Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College"
  ].join('\n');

  const htmlText = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: #991b1b; color: #ffffff; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College</h2>
        <p style="margin: 6px 0 0; font-size: 13px; color: #fca5a5; font-weight: bold;">CampusVenue &bull; Booking Cancellation Notice</p>
      </div>

      <div style="padding: 24px 28px;">
        <p style="font-size: 15px;">Dear <strong>${deptName}</strong>,</p>
        <p style="color: #991b1b;">Your booking <strong>${bookingId}</strong> has been <span style="background: #fee2e2; color: #b91c1c; font-weight: bold; padding: 2px 6px; border-radius: 4px;">CANCELLED</span>.</p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="padding: 6px 0; color: #991b1b; width: 40%; font-weight: bold;">Booking ID:</td><td style="padding: 6px 0; font-weight: bold; color: #991b1b; font-family: monospace;">${bookingId}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Programme:</td><td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${programmeName}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Venue:</td><td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${venueName}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Date & Time:</td><td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${bookingDate} (${startTime} - ${endTime})</td></tr>
            <tr><td style="padding: 6px 0; color: #b91c1c; font-weight: bold;">Reason:</td><td style="padding: 6px 0; color: #b91c1c;">${reason || 'Emergency administrative requirement'}</td></tr>
          </table>
        </div>

        <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
          Regards,<br>
          <strong style="color: #0f172a;">CampusVenue</strong><br>
          Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipient,
    subject,
    plainText,
    htmlText,
    bookingId,
    emailType: cancelledByAdmin ? 'ADMIN_CANCELLATION' : 'DEPARTMENT_CANCELLATION'
  });
}

// Backward compatibility aliases
const sendCancellationEmail = sendBookingCancellationEmail;
const sendReminderEmail = () => Promise.resolve();

module.exports = {
  sendEmail,
  sendBookingConfirmationEmail,
  sendBookingReminderEmail: sendReminderEmail,
  sendBookingCancellationEmail,
  sendCancellationEmail,
  sendReminderEmail
};
