const https = require('https');
const { db } = require('./database');

const projectRef = process.env.SUPABASE_PROJECT_REF || 'ywndgjozzazviekcvwse';
const token = process.env.SUPABASE_ACCESS_TOKEN || '';

function runSql(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const postgresSchema = `
-- 1. COLLEGE_PROFILE
CREATE TABLE IF NOT EXISTS college_profile (
  id SERIAL PRIMARY KEY,
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
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  department_code TEXT UNIQUE NOT NULL,
  department_name TEXT NOT NULL,
  shift TEXT NOT NULL,
  programme_name TEXT,
  email TEXT,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  contact_number TEXT,
  account_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. VENUES
CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  venue_name TEXT UNIQUE NOT NULL,
  venue_code TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  description TEXT,
  image_url TEXT,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. PROGRAMMES
CREATE TABLE IF NOT EXISTS programmes (
  id SERIAL PRIMARY KEY,
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
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  programme_id INTEGER NOT NULL REFERENCES programmes(id) ON DELETE RESTRICT,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed',
  requirements TEXT,
  additional_notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  cancelled_by_admin INTEGER DEFAULT 0,
  admin_user_id TEXT,
  cancellation_reason TEXT,
  reminder_sent INTEGER DEFAULT 0,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. HOLIDAYS
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  holiday_date TEXT UNIQUE NOT NULL,
  holiday_name TEXT NOT NULL,
  holiday_type TEXT DEFAULT 'Government Holiday',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. EMAIL_LOGS
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  booking_id TEXT,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
`;

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function migrateData() {
  console.log('1. Creating tables in Supabase...');
  const createRes = await runSql(postgresSchema);
  console.log('Create Tables Status:', createRes.status);
  if (createRes.status !== 201) {
    console.error('Error creating tables:', createRes);
    return;
  }
  console.log('[PASS] Tables created successfully.');

  // Tables to sync
  const tables = [
    'college_profile',
    'departments',
    'users',
    'venues',
    'programmes',
    'bookings',
    'holidays',
    'audit_logs',
    'email_logs'
  ];

  for (const table of tables) {
    console.log(`\nSyncing table: ${table}...`);
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    console.log(`Found ${rows.length} rows in local SQLite.`);
    if (rows.length === 0) continue;

    // Truncate or clean existing in Supabase to avoid conflict
    await runSql(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);

    // Insert rows in batches of 50
    const cols = Object.keys(rows[0]);
    const colList = cols.join(', ');

    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const valStrings = batch.map(row => {
        return '(' + cols.map(c => escapeSql(row[c])).join(', ') + ')';
      }).join(',\n');

      const insertSql = `INSERT INTO ${table} (${colList}) VALUES \n${valStrings};`;
      const res = await runSql(insertSql);
      if (res.status === 201) {
        console.log(`  Inserted batch ${i + 1} to ${Math.min(i + 50, rows.length)}`);
      } else {
        console.error(`  Error inserting into ${table}:`, res);
      }
    }
  }

  console.log('\n=================================================');
  console.log('  SUPABASE MIGRATION & DATA SYNC COMPLETE!       ');
  console.log('=================================================');
}

migrateData().catch(console.error);
