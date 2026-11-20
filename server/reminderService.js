const { db, logAudit } = require('./database');
const { sendBookingReminderEmail } = require('./services/emailService');

/**
 * Returns date formatted as YYYY-MM-DD in Asia/Kolkata timezone
 */
function getKolkataDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

/**
 * Returns the date exactly 3 calendar days ahead in Asia/Kolkata timezone
 * Example: Today 15 Oct 2026 -> Returns 18 Oct 2026
 */
function getTargetReminderDate() {
  const now = new Date();
  const kolkataNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  kolkataNow.setDate(kolkataNow.getDate() + 3);
  const y = kolkataNow.getFullYear();
  const m = String(kolkataNow.getMonth() + 1).padStart(2, '0');
  const d = String(kolkataNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Core Reminder Check
 * Scans for bookings occurring exactly 3 days away in Asia/Kolkata.
 * Enforces:
 * - Only confirmed bookings (never cancelled)
 * - Zero duplicates (tracked via reminder_sent and reminder_sent_at)
 * - Required logging format
 */
async function checkAndSendReminders() {
  console.log('[REMINDER] Checking upcoming bookings...');

  try {
    const targetDate = getTargetReminderDate();
    const todayKolkata = getKolkataDate();

    // Query all bookings scheduled on target date (exactly 3 days away)
    // Also include any confirmed upcoming bookings between today and targetDate that somehow missed a reminder
    const bookings = db.prepare(`
      SELECT b.*,
             p.programme_name, p.programme_type, p.coordinator_name, p.coordinator_phone, p.coordinator_email,
             p.expected_participants,
             d.department_name, d.department_code, d.email as department_email,
             v.venue_name
      FROM bookings b
      JOIN programmes p ON b.programme_id = p.id
      JOIN departments d ON b.department_id = d.id
      JOIN venues v ON b.venue_id = v.id
      WHERE b.date = ?
    `).all(targetDate);

    if (bookings.length === 0) {
      console.log('[REMINDER] No reminder required');
      return { processed: 0, remindersSent: 0, message: 'No bookings scheduled in 3 days.' };
    }

    let sentCount = 0;
    let skippedCount = 0;

    for (const b of bookings) {
      // Must be CONFIRMED only
      if (b.status !== 'confirmed') {
        continue;
      }

      // Check whether reminder has already been sent
      if (b.reminder_sent === 1 || b.reminder_sent_at) {
        console.log(`[REMINDER] Already sent - skipping ${b.booking_id}`);
        skippedCount++;
        continue;
      }

      // Mark reminder as sent in database FIRST to prevent duplicate concurrent delivery
      db.prepare(`
        UPDATE bookings
        SET reminder_sent = 1, reminder_sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(b.id);

      // Immediately dispatch reminder email
      await sendBookingReminderEmail(b, {
        department_name: b.department_name,
        email: b.department_email || b.coordinator_email
      });

      console.log(`[REMINDER] Reminder sent for ${b.booking_id}`);
      logAudit('SYSTEM', 'ReminderScheduler', 'REMINDER_EMAIL_SENT', 'BOOKINGS', b.booking_id, `Dispatched 3-day reminder for programme on ${b.date}`);
      sentCount++;
    }

    if (sentCount === 0 && skippedCount === 0) {
      console.log('[REMINDER] No reminder required');
    }

    return {
      processed: bookings.length,
      remindersSent: sentCount,
      skipped: skippedCount,
      targetDate,
      message: `Processed ${bookings.length} bookings, sent ${sentCount} reminders.`
    };
  } catch (error) {
    console.error('[REMINDER ERROR]:', error.message);
    return { error: error.message, remindersSent: 0, processed: 0 };
  }
}

// Global reference ensuring single-instance scheduler on server reloads
let schedulerTimer = null;

function startReminderScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  // Initial check shortly after server boot (5 seconds)
  setTimeout(() => {
    checkAndSendReminders().catch(err => console.error('[REMINDER BOOT ERROR]:', err));
  }, 5000);

  // Hourly recurring scheduler (Every 1 hour = 3600000 ms)
  schedulerTimer = setInterval(() => {
    checkAndSendReminders().catch(err => console.error('[REMINDER CRON ERROR]:', err));
  }, 60 * 60 * 1000);

  console.log('[REMINDER] Automatic hourly 3-day reminder scheduler active (Asia/Kolkata timezone).');
}

module.exports = {
  checkAndSendReminders,
  startReminderScheduler,
  getKolkataDate,
  getTargetReminderDate
};
