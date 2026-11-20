const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

let db;
try {
  if (isVercel) {
    const tmpDir = os.tmpdir();
    const tmpPath = path.join(tmpDir, 'campus_venue.db');
    const localDbPath = path.join(__dirname, 'data', 'campus_venue.db');

    if (!fs.existsSync(tmpPath) && fs.existsSync(localDbPath)) {
      try {
        fs.copyFileSync(localDbPath, tmpPath);
      } catch (e) {
        console.warn('Could not copy db to tmpdir:', e.message);
      }
    }

    if (fs.existsSync(tmpPath)) {
      db = new DatabaseSync(tmpPath);
    } else {
      db = new DatabaseSync(':memory:');
    }
  } else {
    const dbDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'campus_venue.db');
    db = new DatabaseSync(dbPath);
  }
} catch (e) {
  console.warn('Falling back to in-memory SQLite database:', e.message);
  db = new DatabaseSync(':memory:');
}

// Enable Foreign Keys & Performance PRAGMAs
try {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
} catch (e) {
  try { db.exec('PRAGMA journal_mode = DELETE;'); } catch (_) {}
}

function initSchema() {
  // 1. COLLEGE_PROFILE
  db.exec(`
    CREATE TABLE IF NOT EXISTS college_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      official_website TEXT NOT NULL,
      official_phone_numbers TEXT NOT NULL,
      official_email_addresses TEXT NOT NULL,
      principal_name TEXT NOT NULL,
      director_info TEXT,
      about_college TEXT NOT NULL,
      vision TEXT NOT NULL,
      mission TEXT NOT NULL,
      logo_url TEXT,
      allow_weekend_booking INTEGER DEFAULT 0,
      allow_holiday_booking INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. DEPARTMENTS
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_code TEXT UNIQUE NOT NULL,
      department_name TEXT NOT NULL,
      shift TEXT NOT NULL CHECK(shift IN ('Shift I', 'Shift II', 'General')),
      programme_name TEXT,
      email TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. USERS
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      department_id INTEGER,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'department')),
      email TEXT,
      contact_number TEXT,
      account_status TEXT DEFAULT 'active' CHECK(account_status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );
  `);

  // 4. VENUES (Exactly the 4 official bookable halls)
  db.exec(`
    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_name TEXT UNIQUE NOT NULL,
      venue_code TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL,
      description TEXT,
      image_url TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. PROGRAMMES
  db.exec(`
    CREATE TABLE IF NOT EXISTS programmes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      programme_name TEXT NOT NULL,
      programme_type TEXT NOT NULL,
      description TEXT,
      expected_participants INTEGER DEFAULT 0,
      chief_guest TEXT,
      requirements TEXT,
      additional_notes TEXT,
      coordinator_name TEXT NOT NULL,
      coordinator_phone TEXT NOT NULL,
      coordinator_email TEXT,
      department_id INTEGER NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 6. BOOKINGS - Lifecycle: CONFIRMED -> CANCELLED (No pending/approval!)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id TEXT UNIQUE NOT NULL,
      department_id INTEGER NOT NULL,
      venue_id INTEGER NOT NULL,
      programme_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'completed')),
      requirements TEXT,
      additional_notes TEXT,
      created_by INTEGER,
      cancelled_at DATETIME,
      cancelled_by TEXT,
      cancelled_by_admin INTEGER DEFAULT 0,
      admin_user_id TEXT,
      cancellation_reason TEXT,
      reminder_sent INTEGER DEFAULT 0,
      reminder_sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
      FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT,
      FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 7. HOLIDAYS (Configurable Government and College Holidays)
  db.exec(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date TEXT UNIQUE NOT NULL,
      holiday_name TEXT NOT NULL,
      holiday_type TEXT DEFAULT 'Government Holiday',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. AUDIT_LOGS
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 9. EMAIL_LOGS
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id TEXT,
      email_type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Run dynamic migrations safely
  runMigrations();
}

function runMigrations() {
  // Add columns to bookings if they don't exist
  const bookingCols = db.prepare('PRAGMA table_info(bookings)').all().map(c => c.name);
  const addCol = (table, col, def) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    } catch {
      // already exists
    }
  };

  if (!bookingCols.includes('cancelled_at')) addCol('bookings', 'cancelled_at', 'DATETIME');
  if (!bookingCols.includes('cancelled_by')) addCol('bookings', 'cancelled_by', 'TEXT');
  if (!bookingCols.includes('cancelled_by_admin')) addCol('bookings', 'cancelled_by_admin', 'INTEGER DEFAULT 0');
  if (!bookingCols.includes('admin_user_id')) addCol('bookings', 'admin_user_id', 'TEXT');
  if (!bookingCols.includes('cancellation_reason')) addCol('bookings', 'cancellation_reason', 'TEXT');
  if (!bookingCols.includes('reminder_sent')) addCol('bookings', 'reminder_sent', 'INTEGER DEFAULT 0');
  if (!bookingCols.includes('reminder_sent_at')) addCol('bookings', 'reminder_sent_at', 'DATETIME');

  // Add columns to college_profile
  const profileCols = db.prepare('PRAGMA table_info(college_profile)').all().map(c => c.name);
  if (!profileCols.includes('allow_weekend_booking')) addCol('college_profile', 'allow_weekend_booking', 'INTEGER DEFAULT 0');
  if (!profileCols.includes('allow_holiday_booking')) addCol('college_profile', 'allow_holiday_booking', 'INTEGER DEFAULT 0');

  // Add columns to departments
  const deptCols = db.prepare('PRAGMA table_info(departments)').all().map(c => c.name);
  if (!deptCols.includes('email')) addCol('departments', 'email', 'TEXT');

  // CRITICAL REQUIREMENT: Eliminate pending status completely!
  // Any legacy 'pending' bookings are migrated to 'confirmed'
  db.exec("UPDATE bookings SET status = 'confirmed' WHERE status = 'pending'");

  // Seed default 2026 government holidays if holidays table is empty
  const holidayCount = db.prepare('SELECT COUNT(*) as cnt FROM holidays').get().cnt;
  if (holidayCount === 0) {
    const defaultHolidays = [
      { date: '2026-01-26', name: 'Republic Day', type: 'National Holiday' },
      { date: '2026-04-14', name: 'Tamil New Year / Dr. Ambedkar Jayanti', type: 'Government Holiday' },
      { date: '2026-05-01', name: 'May Day', type: 'Government Holiday' },
      { date: '2026-08-15', name: 'Independence Day', type: 'National Holiday' },
      { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'National Holiday' },
      { date: '2026-10-20', name: 'Ayutha Pooja', type: 'Government Holiday' },
      { date: '2026-10-21', name: 'Vijaya Dasami', type: 'Government Holiday' },
      { date: '2026-11-08', name: 'Deepavali', type: 'Government Holiday' },
      { date: '2026-12-25', name: 'Christmas', type: 'Government Holiday' }
    ];

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO holidays (holiday_date, holiday_name, holiday_type)
      VALUES (?, ?, ?)
    `);

    for (const h of defaultHolidays) {
      stmt.run(h.date, h.name, h.type);
    }
  }

  // Ensure ONLY the four exact bookable venues exist
  const existingVenues = db.prepare('SELECT venue_name FROM venues').all().map(v => v.venue_name);
  const coreHalls = [
    'Cunnan Auditorium',
    'Ramanujan Conference Hall',
    'RJB Hall',
    'Cunnan Conference Hall'
  ];

  // Deactivate any venues that are not among the exact 4
  db.prepare(`UPDATE venues SET active = 0 WHERE venue_name NOT IN (${coreHalls.map(() => '?').join(',')})`).run(...coreHalls);
}

function logAudit(userId, userName, action, entityType, entityId, details, ipAddress = '127.0.0.1') {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      userId || 'SYSTEM',
      userName || 'System',
      action,
      entityType,
      String(entityId || ''),
      typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      ipAddress
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

function logEmail(bookingId, emailType, recipient, subject, body, status, errorMessage = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO email_logs (booking_id, email_type, recipient, subject, body, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      bookingId || null,
      emailType,
      recipient,
      subject,
      body ? (body.length > 1500 ? body.slice(0, 1500) + '...' : body) : '',
      status,
      errorMessage || null
    );
  } catch (err) {
    console.error('Email log error:', err);
  }
}

module.exports = {
  db,
  initSchema,
  logAudit,
  logEmail
};
