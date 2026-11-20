const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const { db, initSchema, logAudit, logEmail } = require('./database');
const {
  sendBookingConfirmationEmail,
  sendCancellationEmail,
  sendReminderEmail
} = require('./emailService');
const {
  findAlternativeBookingOptions,
  isNonWorkingDay,
  isVenueFree,
  timesOverlap,
  parseTimeToMinutes
} = require('./recommendationService');
const { checkAndSendReminders, startReminderScheduler } = require('./reminderService');
const { parseVoiceBookingRequest } = require('./voiceNlpService');
const supabaseService = require('./services/supabaseService');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'drbccc_campus_venue_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());

// Normalize request URLs so that both /api/xxx and /xxx match Express handlers
app.use((req, res, next) => {
  const originalUrl = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  if (originalUrl && originalUrl.startsWith('/api')) {
    req.url = originalUrl;
  } else if (!req.url.startsWith('/api') && !req.url.startsWith('/images') && !req.url.startsWith('/assets')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Initialize schema and auto-seed if empty
initSchema();
try {
  const profileCount = db.prepare('SELECT COUNT(*) as count FROM college_profile').get()?.count || 0;
  if (profileCount === 0) {
    const { seed } = require('./seed');
    seed();
  }
} catch (e) {
  console.warn('Auto-seed check error:', e);
}

// Start scheduler only when running standalone daemon
if (require.main === module) {
  startReminderScheduler();
}

app.get('/api', (req, res) => {
  res.json({ status: 'ok', service: 'DRBCCC CampusVenue Backend API', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'DRBCCC CampusVenue Backend API', timestamp: new Date().toISOString() });
});

// Helper to extract authenticated user from header
function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/* =========================================================
   1. AUTHENTICATION
========================================================= */

app.post('/api/auth/login', (req, res) => {
  const { user_id, password } = req.body;
  if (!user_id || !password) {
    return res.status(400).json({ error: 'User ID and Password are required' });
  }

  const user = db.prepare(`
    SELECT u.*, d.department_name, d.department_code, d.shift, COALESCE(d.email, u.email) as department_email
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.user_id = ?
  `).get(user_id.trim());

  if (!user) {
    return res.status(401).json({ error: 'Invalid User ID or password' });
  }

  if (user.account_status !== 'active') {
    return res.status(403).json({ error: 'Account is inactive. Please contact administrator.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid User ID or password' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      user_id: user.user_id,
      user_name: user.user_name,
      role: user.role,
      department_id: user.department_id,
      department_name: user.department_name,
      department_code: user.department_code,
      email: user.email || user.department_email
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  logAudit(user.user_id, user.user_name, 'LOGIN', 'USERS', user.id, 'User successfully logged in');

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      user_id: user.user_id,
      user_name: user.user_name,
      role: user.role,
      email: user.email || user.department_email,
      contact_number: user.contact_number,
      department_id: user.department_id,
      department_name: user.department_name,
      department_code: user.department_code,
      shift: user.shift
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const user = db.prepare(`
    SELECT u.id, u.user_id, u.user_name, u.role, u.email, u.contact_number, u.account_status,
           u.department_id, d.department_name, d.department_code, d.shift
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(auth.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

/* =========================================================
   2. COLLEGE PROFILE
========================================================= */

app.get('/api/college-profile', (req, res) => {
  const profile = db.prepare('SELECT * FROM college_profile ORDER BY id ASC LIMIT 1').get();
  res.json(profile || {});
});

app.put('/api/college-profile', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can update institutional information' });
  }

  const {
    college_name, short_name, address, city, district, state, pincode,
    official_website, official_phone_numbers, official_email_addresses,
    principal_name, director_info, about_college, vision, mission, logo_url,
    allow_weekend_booking, allow_holiday_booking
  } = req.body;

  const current = db.prepare('SELECT * FROM college_profile WHERE id = 1').get() || {};
  const cName = college_name !== undefined ? college_name : current.college_name;
  const sName = short_name !== undefined ? short_name : current.short_name;
  const addr = address !== undefined ? address : current.address;
  const cCity = city !== undefined ? city : current.city;
  const cDist = district !== undefined ? district : current.district;
  const cState = state !== undefined ? state : current.state;
  const cPin = pincode !== undefined ? pincode : current.pincode;
  const cWeb = official_website !== undefined ? official_website : current.official_website;
  const cPhone = official_phone_numbers !== undefined ? official_phone_numbers : current.official_phone_numbers;
  const cEmail = official_email_addresses !== undefined ? official_email_addresses : current.official_email_addresses;
  const cPrinc = principal_name !== undefined ? principal_name : current.principal_name;
  const cDir = director_info !== undefined ? director_info : current.director_info;
  const cAbout = about_college !== undefined ? about_college : current.about_college;
  const cVis = vision !== undefined ? vision : current.vision;
  const cMis = mission !== undefined ? mission : current.mission;
  const cLogo = logo_url !== undefined ? logo_url : current.logo_url;
  const cWeekend = allow_weekend_booking !== undefined ? (allow_weekend_booking ? 1 : 0) : (current.allow_weekend_booking || 0);
  const cHoliday = allow_holiday_booking !== undefined ? (allow_holiday_booking ? 1 : 0) : (current.allow_holiday_booking || 0);

  db.prepare(`
    UPDATE college_profile SET
      college_name = ?, short_name = ?, address = ?, city = ?, district = ?, state = ?, pincode = ?,
      official_website = ?, official_phone_numbers = ?, official_email_addresses = ?,
      principal_name = ?, director_info = ?, about_college = ?, vision = ?, mission = ?, logo_url = ?,
      allow_weekend_booking = ?, allow_holiday_booking = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(
    cName, sName, addr, cCity, cDist, cState, cPin,
    cWeb, cPhone, cEmail,
    cPrinc, cDir, cAbout, cVis, cMis, cLogo,
    cWeekend, cHoliday
  );

  logAudit(auth.user_id, auth.user_name, 'UPDATE', 'COLLEGE_PROFILE', '1', 'Updated college institutional profile');
  const updated = db.prepare('SELECT * FROM college_profile WHERE id = 1').get();
  res.json(updated);
});

/* =========================================================
   3. DEPARTMENTS
========================================================= */

app.get('/api/departments', (req, res) => {
  const { all } = req.query;
  const query = all === 'true'
    ? 'SELECT * FROM departments ORDER BY shift ASC, department_name ASC'
    : 'SELECT * FROM departments WHERE active = 1 ORDER BY shift ASC, department_name ASC';
  const depts = db.prepare(query).all();
  res.json(depts);
});

app.post('/api/departments', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const { department_code, department_name, shift, programme_name } = req.body;
  if (!department_code || !department_name || !shift) {
    return res.status(400).json({ error: 'Code, Name, and Shift are required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO departments (department_code, department_name, shift, programme_name, active)
      VALUES (?, ?, ?, ?, 1)
    `).run(department_code.toUpperCase().trim(), department_name.trim(), shift, programme_name || department_name);

    logAudit(auth.user_id, auth.user_name, 'CREATE', 'DEPARTMENTS', result.lastInsertRowid, `Created department ${department_name} (${department_code})`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Department created successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('UNIQUE') ? 'Department code already exists' : err.message });
  }
});

app.put('/api/departments/:id', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const { department_code, department_name, shift, programme_name, active } = req.body;
  const deptId = req.params.id;

  try {
    db.prepare(`
      UPDATE departments SET
        department_code = ?, department_name = ?, shift = ?, programme_name = ?, active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(department_code.toUpperCase().trim(), department_name.trim(), shift, programme_name, active ? 1 : 0, deptId);

    logAudit(auth.user_id, auth.user_name, 'UPDATE', 'DEPARTMENTS', deptId, `Updated department ${department_name}`);
    res.json({ message: 'Department updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/departments/:id/toggle', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const newStatus = dept.active === 1 ? 0 : 1;
  db.prepare('UPDATE departments SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, req.params.id);

  logAudit(auth.user_id, auth.user_name, 'TOGGLE_STATUS', 'DEPARTMENTS', req.params.id, `Set active status to ${newStatus}`);
  res.json({ id: dept.id, active: newStatus });
});

app.delete('/api/departments/:id', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  if (!dept) return res.status(404).json({ error: 'Department not found' });

  // Check if department has bookings
  const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE department_id = ?').get(dept.id).count;
  if (bookingCount > 0) {
    // If it has bookings, archive it rather than hard deleting to maintain referential integrity
    db.prepare('UPDATE departments SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(dept.id);
    logAudit(auth.user_id, auth.user_name, 'DELETE', 'DEPARTMENTS', dept.id, `Deactivated department ${dept.department_name} (has ${bookingCount} bookings)`);
    return res.json({ message: `Department has ${bookingCount} historical bookings. Department deactivated/archived.` });
  }

  // Also remove associated user logins for this department
  db.prepare('DELETE FROM users WHERE department_id = ?').run(dept.id);
  db.prepare('DELETE FROM departments WHERE id = ?').run(dept.id);
  logAudit(auth.user_id, auth.user_name, 'DELETE', 'DEPARTMENTS', dept.id, `Deleted department ${dept.department_name}`);
  res.json({ message: 'Department and associated logins deleted successfully' });
});

/* =========================================================
   4. USERS MANAGEMENT
========================================================= */

app.get('/api/users', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const users = db.prepare(`
    SELECT u.id, u.user_id, u.user_name, u.role, u.email, u.contact_number, u.account_status,
           u.department_id, u.created_at, d.department_name, d.department_code, d.shift
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.id ASC
  `).all();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const { user_id, password, department_id, user_name, role, email, contact_number } = req.body;
  if (!user_id || !password || !user_name || !role) {
    return res.status(400).json({ error: 'User ID, Password, Name, and Role are required' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = db.prepare(`
      INSERT INTO users (user_id, password_hash, department_id, user_name, role, email, contact_number, account_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(user_id.toUpperCase().trim(), password_hash, department_id || null, user_name.trim(), role, email || null, contact_number || null);

    logAudit(auth.user_id, auth.user_name, 'CREATE', 'USERS', result.lastInsertRowid, `Created user ${user_name} (${user_id})`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'User created successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('UNIQUE') ? 'User ID already exists' : err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const { user_name, department_id, role, email, contact_number, account_status } = req.body;
  const userId = req.params.id;

  try {
    db.prepare(`
      UPDATE users SET
        user_name = ?, department_id = ?, role = ?, email = ?, contact_number = ?, account_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user_name, department_id || null, role, email || null, contact_number || null, account_status || 'active', userId);

    logAudit(auth.user_id, auth.user_name, 'UPDATE', 'USERS', userId, `Updated user ${user_name}`);
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/users/:id/reset-password', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const { new_password } = req.body;
  if (!new_password) return res.status(400).json({ error: 'New password is required' });

  const hash = await bcrypt.hash(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.params.id);

  logAudit(auth.user_id, auth.user_name, 'RESET_PASSWORD', 'USERS', req.params.id, 'Password reset by admin');
  res.json({ message: 'Password reset successfully' });
});

app.patch('/api/users/:id/toggle', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const newStatus = user.account_status === 'active' ? 'inactive' : 'active';
  db.prepare('UPDATE users SET account_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, req.params.id);

  logAudit(auth.user_id, auth.user_name, 'TOGGLE_STATUS', 'USERS', req.params.id, `User status set to ${newStatus}`);
  res.json({ id: user.id, account_status: newStatus });
});

app.delete('/api/users/:id', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Prevent admin from deleting themselves
  if (user.id === auth.id || user.user_id === auth.user_id) {
    return res.status(400).json({ error: 'Cannot delete the currently active administrator account' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logAudit(auth.user_id, auth.user_name, 'DELETE', 'USERS', req.params.id, `Deleted user ${user.user_name} (${user.user_id})`);
  res.json({ message: 'User deleted successfully' });
});

/* =========================================================
   5. EXACT 4 BOOKABLE VENUES & MOVIE-TICKET AVAILABILITY
========================================================= */

app.get('/api/venues', (req, res) => {
  const venues = db.prepare('SELECT * FROM venues WHERE active = 1 ORDER BY id ASC').all();
  res.json(venues);
});

app.put('/api/venues/:id', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const { venue_name, venue_code, capacity, description, image_url, active } = req.body;
  const venueId = req.params.id;

  try {
    db.prepare(`
      UPDATE venues SET
        venue_name = COALESCE(?, venue_name),
        venue_code = COALESCE(?, venue_code),
        capacity = COALESCE(?, capacity),
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        active = COALESCE(?, active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      venue_name ? venue_name.trim() : null,
      venue_code ? venue_code.trim() : null,
      capacity ? parseInt(capacity, 10) : null,
      description !== undefined ? description : null,
      image_url !== undefined ? image_url : null,
      active !== undefined ? (active ? 1 : 0) : null,
      venueId
    );

    logAudit(auth.user_id, auth.user_name, 'UPDATE', 'VENUES', venueId, `Updated venue ${venue_name || venueId}`);
    res.json({ message: 'Venue updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dynamic venue availability check (Movie Ticket Style with Partially Booked ranges)
app.get('/api/venues/availability', (req, res) => {
  const { date, startTime, endTime } = req.query;
  if (!date || !startTime || !endTime) {
    return res.status(400).json({ error: 'Date, startTime, and endTime are required' });
  }

  // Check Weekend / Holiday status
  const nonWorkingCheck = isNonWorkingDay(date);
  const profile = db.prepare('SELECT allow_weekend_booking, allow_holiday_booking FROM college_profile LIMIT 1').get() || {};
  let isDateRestricted = false;
  let restrictionReason = null;

  if (nonWorkingCheck.isNonWorking) {
    const isWeekend = nonWorkingCheck.reason === 'Saturday' || nonWorkingCheck.reason === 'Sunday';
    if (isWeekend && !profile.allow_weekend_booking) {
      isDateRestricted = true;
      restrictionReason = `Booking is unavailable on this non-working day (${nonWorkingCheck.reason}).`;
    } else if (!isWeekend && !profile.allow_holiday_booking) {
      isDateRestricted = true;
      restrictionReason = `Booking is unavailable on this non-working day (${nonWorkingCheck.reason}).`;
    }
  }

  const venues = db.prepare('SELECT * FROM venues WHERE active = 1 ORDER BY id ASC').all();

  // Find all CONFIRMED bookings for this date (Only confirmed bookings block!)
  const confirmedBookingsOnDate = db.prepare(`
    SELECT b.*, p.programme_name, d.department_name, d.department_code
    FROM bookings b
    JOIN programmes p ON b.programme_id = p.id
    JOIN departments d ON b.department_id = d.id
    WHERE b.date = ? AND b.status = 'confirmed'
    ORDER BY b.start_time ASC
  `).all(date);

  const availability = venues.map(venue => {
    // All confirmed bookings for this specific venue on this date
    const venueBookings = confirmedBookingsOnDate.filter(b => b.venue_id === venue.id);

    // Direct collision check for the selected start and end time
    const conflict = venueBookings.find(b => timesOverlap(startTime, endTime, b.start_time, b.end_time));

    let status = 'available';
    if (isDateRestricted) {
      status = 'restricted';
    } else if (conflict) {
      status = 'booked';
    } else if (venueBookings.length > 0) {
      status = 'partially_booked';
    }

    return {
      ...venue,
      isAvailable: !conflict && !isDateRestricted,
      status,
      conflictingBooking: conflict ? {
        booking_id: conflict.booking_id,
        programme_name: conflict.programme_name,
        department_name: conflict.department_name,
        start_time: conflict.start_time,
        end_time: conflict.end_time
      } : null,
      occupiedSlots: venueBookings.map(b => ({
        booking_id: b.booking_id,
        programme_name: b.programme_name,
        department_name: b.department_name,
        start_time: b.start_time,
        end_time: b.end_time
      }))
    };
  });

  res.json({
    date,
    startTime,
    endTime,
    isNonWorkingDay: nonWorkingCheck.isNonWorking,
    nonWorkingReason: nonWorkingCheck.reason,
    isDateRestricted,
    restrictionReason,
    venues: availability
  });
});

/* =========================================================
   6. BOOKINGS (STRICT LIFECYCLE: CONFIRMED -> CANCELLED)
========================================================= */

app.get('/api/bookings', (req, res) => {
  const auth = getAuthUser(req);
  const {
    year, date, department_id, venue_id, status, search, coordinator, booking_id
  } = req.query;

  let query = `
    SELECT b.*,
           p.programme_name, p.programme_type, p.description, p.expected_participants,
           p.chief_guest, p.coordinator_name, p.coordinator_phone, p.coordinator_email,
           d.department_name, d.department_code, d.shift,
           v.venue_name, v.venue_code, v.capacity as venue_capacity,
           u.user_name as booked_by_user
    FROM bookings b
    JOIN programmes p ON b.programme_id = p.id
    JOIN departments d ON b.department_id = d.id
    JOIN venues v ON b.venue_id = v.id
    LEFT JOIN users u ON b.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  // Enforce department isolation: Non-admin departments can ONLY view their own bookings
  if (auth && auth.role !== 'admin') {
    query += " AND b.department_id = ?";
    params.push(auth.department_id);
  } else if (department_id) {
    query += " AND b.department_id = ?";
    params.push(department_id);
  }

  if (year) {
    query += " AND b.date LIKE ?";
    params.push(`${year}%`);
  }
  if (date) {
    query += " AND b.date = ?";
    params.push(date);
  }
  if (venue_id) {
    query += " AND b.venue_id = ?";
    params.push(venue_id);
  }
  if (status) {
    query += " AND b.status = ?";
    params.push(status);
  }
  if (coordinator) {
    query += " AND p.coordinator_name LIKE ?";
    params.push(`%${coordinator}%`);
  }
  if (booking_id) {
    query += " AND b.booking_id LIKE ?";
    params.push(`%${booking_id}%`);
  }
  if (search) {
    query += ` AND (
      p.programme_name LIKE ? OR
      p.coordinator_name LIKE ? OR
      d.department_name LIKE ? OR
      v.venue_name LIKE ? OR
      b.booking_id LIKE ?
    )`;
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }

  query += " ORDER BY b.date DESC, b.start_time DESC";

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// Create Instant Confirmed Booking (Transaction Concurrency-Safe)
app.post('/api/bookings', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ error: 'Please login to make a booking' });

  const {
    department_id, venue_id, date, start_time, end_time,
    programme_name, programme_type, description, expected_participants,
    chief_guest, requirements, additional_notes,
    coordinator_name, coordinator_phone, coordinator_email
  } = req.body;

  // Department authorization: Departments can only book for their own department ID
  const targetDeptId = auth.role === 'admin' ? (department_id || auth.department_id) : auth.department_id;

  if (!targetDeptId || !venue_id || !date || !start_time || !end_time || !programme_name || !coordinator_name || !coordinator_phone) {
    return res.status(400).json({ error: 'All mandatory booking fields must be provided' });
  }

  // Verify non-working day policy
  const nonWorkingCheck = isNonWorkingDay(date);
  const profile = db.prepare('SELECT allow_weekend_booking, allow_holiday_booking FROM college_profile LIMIT 1').get() || {};
  if (nonWorkingCheck.isNonWorking) {
    const isWeekend = nonWorkingCheck.reason === 'Saturday' || nonWorkingCheck.reason === 'Sunday';
    if ((isWeekend && !profile.allow_weekend_booking) || (!isWeekend && !profile.allow_holiday_booking)) {
      if (auth.role !== 'admin') {
        return res.status(400).json({ error: `Booking is unavailable on this non-working day (${nonWorkingCheck.reason}).` });
      }
    }
  }

  // Verify venue is active and among the 4 verified halls
  const venue = db.prepare('SELECT * FROM venues WHERE id = ? AND active = 1').get(venue_id);
  if (!venue) return res.status(400).json({ error: 'Selected venue is not active or does not exist' });

  // CONCURRENCY-SAFE TRANSACTION & OVERLAP VALIDATION:
  // Two bookings conflict only when: existing_start < requested_end AND existing_end > requested_start
  // Only CONFIRMED bookings block availability!
  db.exec('BEGIN IMMEDIATE;');

  try {
    const existingConfirmed = db.prepare(`
      SELECT b.*, p.programme_name
      FROM bookings b
      JOIN programmes p ON b.programme_id = p.id
      WHERE b.venue_id = ? AND b.date = ? AND b.status = 'confirmed'
    `).all(venue_id, date);

    for (const eb of existingConfirmed) {
      if (timesOverlap(start_time, end_time, eb.start_time, eb.end_time)) {
        db.exec('ROLLBACK;');
        return res.status(409).json({
          error: `Sorry, this venue was just booked by another department. ${venue.venue_name} is already booked for "${eb.programme_name}" from ${eb.start_time} to ${eb.end_time}. Please select another available time or venue.`
        });
      }
    }

    // Generate strictly unique sequential Booking ID (e.g. CV2026001)
    const currentYear = new Date().getFullYear();
    const maxRow = db.prepare('SELECT MAX(id) as maxId FROM bookings').get();
    let counter = (maxRow?.maxId || 0) + 1;
    let bookingCode = `CV${currentYear}${counter.toString().padStart(3, '0')}`;
    while (db.prepare('SELECT id FROM bookings WHERE booking_id = ?').get(bookingCode)) {
      counter++;
      bookingCode = `CV${currentYear}${counter.toString().padStart(3, '0')}`;
    }

    const reqStr = Array.isArray(requirements) ? JSON.stringify(requirements) : (requirements || '[]');

    // Insert Programme
    const insertProg = db.prepare(`
      INSERT INTO programmes (
        programme_name, programme_type, description, expected_participants,
        chief_guest, requirements, additional_notes,
        coordinator_name, coordinator_phone, coordinator_email,
        department_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const progResult = insertProg.run(
      programme_name.trim(),
      programme_type || 'Workshop',
      description || '',
      parseInt(expected_participants, 10) || 0,
      chief_guest || '',
      reqStr,
      additional_notes || '',
      coordinator_name.trim(),
      coordinator_phone.trim(),
      coordinator_email || '',
      targetDeptId,
      auth.id
    );

    // Insert Booking directly as CONFIRMED (No pending/approval!)
    const insertBk = db.prepare(`
      INSERT INTO bookings (
        booking_id, department_id, venue_id, programme_id,
        date, start_time, end_time, status, requirements, additional_notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)
    `);

    const bkResult = insertBk.run(
      bookingCode,
      targetDeptId,
      venue_id,
      progResult.lastInsertRowid,
      date,
      start_time,
      end_time,
      reqStr,
      additional_notes || '',
      auth.id
    );

    db.exec('COMMIT;');

    logAudit(auth.user_id, auth.user_name, 'BOOKING_CREATED', 'BOOKINGS', bookingCode, `Confirmed booking for ${venue.venue_name} on ${date} (${start_time} - ${end_time})`);

    // Fetch full confirmed booking record
    const fullBooking = db.prepare(`
      SELECT b.*,
             p.programme_name, p.programme_type, p.description, p.expected_participants,
             p.chief_guest, p.coordinator_name, p.coordinator_phone, p.coordinator_email,
             d.department_name, d.department_code, d.email as department_email,
             v.venue_name, v.capacity as venue_capacity
      FROM bookings b
      JOIN programmes p ON b.programme_id = p.id
      JOIN departments d ON b.department_id = d.id
      JOIN venues v ON b.venue_id = v.id
      WHERE b.id = ?
    `).get(bkResult.lastInsertRowid);

    // Trigger confirmation email asynchronously (does not block client response)
    sendBookingConfirmationEmail(fullBooking, {
      department_name: fullBooking.department_name,
      email: fullBooking.department_email || fullBooking.coordinator_email
    }).catch(err => console.error('Confirmation email error:', err));

    res.status(201).json({
      message: 'Booking confirmed immediately!',
      booking: fullBooking
    });
  } catch (err) {
    try { db.exec('ROLLBACK;'); } catch {}
    console.error('Booking creation error:', err);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  }
});

app.get('/api/bookings/:id', (req, res) => {
  const booking = db.prepare(`
    SELECT b.*,
           p.programme_name, p.programme_type, p.description, p.expected_participants,
           p.chief_guest, p.coordinator_name, p.coordinator_phone, p.coordinator_email,
           d.department_name, d.department_code, d.shift, d.email as department_email,
           v.venue_name, v.venue_code, v.capacity as venue_capacity,
           u.user_name as booked_by_user
    FROM bookings b
    JOIN programmes p ON b.programme_id = p.id
    JOIN departments d ON b.department_id = d.id
    JOIN venues v ON b.venue_id = v.id
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ? OR b.booking_id = ?
  `).get(req.params.id, req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

// Department Self-Cancellation (Can only cancel own booking)
const handleDepartmentCancel = async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { cancellation_reason, reason: reasonBody } = req.body;
  const booking = db.prepare(`
    SELECT b.*, d.department_name, d.email as department_email, p.programme_name, p.coordinator_email, v.venue_name
    FROM bookings b
    JOIN departments d ON b.department_id = d.id
    JOIN programmes p ON b.programme_id = p.id
    JOIN venues v ON b.venue_id = v.id
    WHERE b.id = ? OR b.booking_id = ?
  `).get(req.params.id, req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (booking.status === 'cancelled') {
    return res.status(400).json({ error: 'Booking is already cancelled' });
  }

  // Security check: Department can only cancel its own booking
  if (auth.role !== 'admin' && booking.department_id !== auth.department_id) {
    return res.status(403).json({ error: 'Permission denied: You can only cancel bookings made by your department' });
  }

  const reason = cancellation_reason || reasonBody || 'Department cancellation';

  db.prepare(`
    UPDATE bookings SET
      status = 'cancelled',
      cancelled_at = CURRENT_TIMESTAMP,
      cancelled_by = ?,
      cancellation_reason = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(auth.user_id, reason, booking.id);

  logAudit(auth.user_id, auth.user_name, 'BOOKING_CANCELLED_BY_DEPARTMENT', 'BOOKINGS', booking.booking_id, `Department cancelled booking: ${reason}`);

  // Send cancellation notice email
  sendCancellationEmail(booking, {
    department_name: booking.department_name,
    email: booking.department_email || booking.coordinator_email
  }, reason, false).catch(err => console.error(err));

  res.json({
    message: 'Booking cancelled successfully. The venue has been released.',
    booking_id: booking.booking_id,
    status: 'cancelled'
  });
};

app.patch('/api/bookings/:id/cancel', handleDepartmentCancel);
app.post('/api/bookings/:id/cancel', handleDepartmentCancel);

// Admin Emergency Cancellation (Immediate with mandatory reason & alternative recommendation)
app.post('/api/admin/bookings/:id/cancel', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Only administrators can execute emergency cancellation' });
  }

  const { cancellation_reason, admin_message } = req.body;
  if (!cancellation_reason) {
    return res.status(400).json({ error: 'Cancellation reason is mandatory for emergency administrative cancellation' });
  }

  const booking = db.prepare(`
    SELECT b.*, d.department_name, d.email as department_email, p.programme_name, p.coordinator_email, v.venue_name
    FROM bookings b
    JOIN departments d ON b.department_id = d.id
    JOIN programmes p ON b.programme_id = p.id
    JOIN venues v ON b.venue_id = v.id
    WHERE b.id = ? OR b.booking_id = ?
  `).get(req.params.id, req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Update status to cancelled with admin fields
  db.prepare(`
    UPDATE bookings SET
      status = 'cancelled',
      cancelled_at = CURRENT_TIMESTAMP,
      cancelled_by = ?,
      cancelled_by_admin = 1,
      admin_user_id = ?,
      cancellation_reason = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(auth.user_id, auth.user_id, cancellation_reason, booking.id);

  logAudit(auth.user_id, auth.user_name, 'BOOKING_CANCELLED_BY_ADMIN', 'BOOKINGS', booking.booking_id, `Admin emergency cancellation: ${cancellation_reason}`);

  // Automatically find alternative venue / date recommendations
  const alternatives = findAlternativeBookingOptions({
    originalBooking: booking,
    venueId: booking.venue_id,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time
  });

  // Send immediate cancellation email to department with recommendations
  sendCancellationEmail(booking, {
    department_name: booking.department_name,
    email: booking.department_email || booking.coordinator_email
  }, cancellation_reason, true, alternatives).catch(err => console.error(err));

  res.json({
    message: 'Booking cancelled by Administrator. Department has been notified with alternative recommendations.',
    booking_id: booking.booking_id,
    status: 'cancelled',
    cancellation_reason,
    alternatives
  });
});

// Alternative recommendation endpoint (for UI preview)
app.get('/api/bookings/:id/alternatives', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? OR booking_id = ?').get(req.params.id, req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const alternatives = findAlternativeBookingOptions({
    originalBooking: booking,
    venueId: booking.venue_id,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time
  });

  res.json({ booking_id: booking.booking_id, alternatives });
});

/* =========================================================
   7. HOLIDAYS & NON-WORKING DAYS API
========================================================= */

app.get('/api/holidays', (req, res) => {
  const holidays = db.prepare('SELECT * FROM holidays ORDER BY holiday_date ASC').all();
  res.json(holidays);
});

app.post('/api/holidays', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const { holiday_date, holiday_name, holiday_type } = req.body;
  if (!holiday_date || !holiday_name) {
    return res.status(400).json({ error: 'Holiday date and name are required' });
  }

  try {
    const resStmt = db.prepare(`
      INSERT INTO holidays (holiday_date, holiday_name, holiday_type)
      VALUES (?, ?, ?)
    `).run(holiday_date, holiday_name.trim(), holiday_type || 'Government Holiday');

    logAudit(auth.user_id, auth.user_name, 'HOLIDAY_UPDATED', 'HOLIDAYS', resStmt.lastInsertRowid, `Added holiday: ${holiday_name} on ${holiday_date}`);
    res.status(201).json({ id: resStmt.lastInsertRowid, message: 'Holiday added successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('UNIQUE') ? 'A holiday on this date already exists' : err.message });
  }
});

app.delete('/api/holidays/:id', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  db.prepare('DELETE FROM holidays WHERE id = ?').run(req.params.id);
  logAudit(auth.user_id, auth.user_name, 'HOLIDAY_UPDATED', 'HOLIDAYS', req.params.id, 'Deleted holiday');
  res.json({ message: 'Holiday removed successfully' });
});

app.get('/api/holidays/check', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });
  const check = isNonWorkingDay(date);
  res.json(check);
});

/* =========================================================
   8. CALENDAR API (Includes Holidays & Non-Working Days)
========================================================= */

app.get('/api/calendar', (req, res) => {
  const { month, year, department_id, venue_id, status } = req.query;

  let query = `
    SELECT b.id, b.booking_id, b.date, b.start_time, b.end_time, b.status,
           p.programme_name, p.programme_type, p.coordinator_name,
           d.department_name, d.department_code,
           v.venue_name, v.venue_code
    FROM bookings b
    JOIN programmes p ON b.programme_id = p.id
    JOIN departments d ON b.department_id = d.id
    JOIN venues v ON b.venue_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (year && month) {
    const formattedMonth = month.toString().padStart(2, '0');
    query += " AND b.date LIKE ?";
    params.push(`${year}-${formattedMonth}-%`);
  } else if (year) {
    query += " AND b.date LIKE ?";
    params.push(`${year}-%`);
  }

  if (department_id) {
    query += " AND b.department_id = ?";
    params.push(department_id);
  }
  if (venue_id) {
    query += " AND b.venue_id = ?";
    params.push(venue_id);
  }
  if (status) {
    query += " AND b.status = ?";
    params.push(status);
  }

  query += " ORDER BY b.date ASC, b.start_time ASC";
  const events = db.prepare(query).all(...params);

  // Also fetch holidays in that timeframe
  let holidayQuery = 'SELECT * FROM holidays WHERE 1=1';
  const hParams = [];
  if (year && month) {
    const formattedMonth = month.toString().padStart(2, '0');
    holidayQuery += ' AND holiday_date LIKE ?';
    hParams.push(`${year}-${formattedMonth}-%`);
  }
  const holidays = db.prepare(holidayQuery).all(...hParams);

  res.json({
    events,
    holidays
  });
});

/* =========================================================
   9. ADMIN DASHBOARD & ANALYTICS (No Pending/Approval!)
========================================================= */

app.get('/api/analytics/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const totalDepts = db.prepare('SELECT COUNT(*) as cnt FROM departments WHERE active = 1').get().cnt;
  const totalVenues = db.prepare('SELECT COUNT(*) as cnt FROM venues WHERE active = 1').get().cnt;
  const totalBookings = db.prepare('SELECT COUNT(*) as cnt FROM bookings').get().cnt;
  const confirmedBookings = db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'confirmed'").get().cnt;
  const cancelledBookings = db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'cancelled'").get().cnt;
  const todayBookings = db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE date = ? AND status = 'confirmed'").get(today).cnt;
  const upcomingBookings = db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE date >= ? AND status = 'confirmed'").get(today).cnt;

  // Department-wise programme counts
  const deptStats = db.prepare(`
    SELECT d.department_code, d.department_name, COUNT(b.id) as count
    FROM departments d
    LEFT JOIN bookings b ON d.id = b.department_id AND b.status = 'confirmed'
    GROUP BY d.id
    ORDER BY count DESC, d.department_code ASC
    LIMIT 8
  `).all();

  // Venue-wise bookings distribution
  const venueStats = db.prepare(`
    SELECT v.venue_name, v.venue_code, COUNT(b.id) as count
    FROM venues v
    LEFT JOIN bookings b ON v.id = b.venue_id AND b.status = 'confirmed'
    WHERE v.active = 1
    GROUP BY v.id
    ORDER BY count DESC
  `).all();

  // Monthly trend for current year
  const currentYear = new Date().getFullYear();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyStats = months.map((m, idx) => {
    const monthNum = (idx + 1).toString().padStart(2, '0');
    const cnt = db.prepare(`
      SELECT COUNT(*) as cnt FROM bookings
      WHERE date LIKE ? AND status = 'confirmed'
    `).get(`${currentYear}-${monthNum}-%`).cnt;
    return { month: m, count: cnt };
  });

  res.json({
    kpis: {
      totalDepartments: totalDepts,
      totalVenues: totalVenues,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      todayBookings,
      upcomingBookings
    },
    departmentStats: deptStats,
    venueStats: venueStats,
    monthlyStats: monthlyStats
  });
});

/* =========================================================
   10. AUDIT & EMAIL LOGS
========================================================= */

app.get('/api/admin/audit-logs', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 250').all();
  res.json(logs);
});

app.get('/api/audit-logs', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 250').all();
  res.json(logs);
});

app.get('/api/email-logs', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

  const logs = db.prepare('SELECT * FROM email_logs ORDER BY id DESC LIMIT 100').all();
  res.json(logs);
});

/* =========================================================
   11. 3-DAY REMINDER MANUAL / CRON TRIGGER
========================================================= */

app.post('/api/reminders/check', async (req, res) => {
  const result = await checkAndSendReminders();
  res.json(result);
});

/* =========================================================
   12. NATURAL LANGUAGE VOICE BOOKING & NLP ASSISTANT
========================================================= */

app.post('/api/voice/parse', (req, res) => {
  const { speechText, currentDepartmentId, existingEntities } = req.body;
  if (!speechText) return res.status(400).json({ error: 'Speech text is required' });

  const auth = getAuthUser(req);
  const deptId = currentDepartmentId || auth?.department_id;
  const analysis = parseVoiceBookingRequest(speechText, deptId, existingEntities || {});
  res.json(analysis);
});

// Backward compatibility alias
app.post('/api/ai/voice-process', (req, res) => {
  const { speechText, currentDepartmentId, existingEntities } = req.body;
  if (!speechText) return res.status(400).json({ error: 'Speech text is required' });

  const auth = getAuthUser(req);
  const deptId = currentDepartmentId || auth?.department_id;
  const analysis = parseVoiceBookingRequest(speechText, deptId, existingEntities || {});
  res.json(analysis);
});

/* =========================================================
   13. SUPABASE CLOUD INTEGRATION & DATA FETCHING
========================================================= */

app.get('/api/supabase/status', async (req, res) => {
  try {
    const venues = await supabaseService.fetchTable('venues');
    const bookings = await supabaseService.fetchTable('bookings');
    res.json({
      connected: true,
      projectUrl: supabaseService.SUPABASE_URL,
      projectRef: supabaseService.PROJECT_REF,
      status: 'ACTIVE_HEALTHY',
      venuesCount: Array.isArray(venues.data) ? venues.data.length : 0,
      bookingsCount: Array.isArray(bookings.data) ? bookings.data.length : 0
    });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.get('/api/supabase/tables/:table', async (req, res) => {
  try {
    const allowed = ['venues', 'bookings', 'programmes', 'departments', 'college_profile', 'holidays', 'audit_logs', 'email_logs'];
    const table = req.params.table;
    if (!allowed.includes(table)) {
      return res.status(400).json({ error: 'Invalid or restricted table name' });
    }
    const result = await supabaseService.fetchTable(table, req.query);
    res.status(result.status || 200).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   STATIC CLIENT ASSETS
========================================================= */

const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DRBCCC CampusVenue Backend Service running on http://localhost:${PORT}`);
  });
}

module.exports = app;
