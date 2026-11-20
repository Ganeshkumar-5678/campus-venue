const bcrypt = require('bcryptjs');
const { db, initSchema, logAudit } = require('./database');

async function seed() {
  console.log('--- Initializing Database Schema ---');
  initSchema();

  console.log('--- Checking existing data ---');
  const profileCount = db.prepare('SELECT COUNT(*) as count FROM college_profile').get().count;

  if (profileCount > 0) {
    console.log('Database already has data. Skipping re-seed.');
    return;
  }

  console.log('--- Seeding Verified College Profile ---');
  // Verified from https://www.drbccchinducollege.edu.in/
  const insertProfile = db.prepare(`
    INSERT INTO college_profile (
      college_name, short_name, address, city, district, state, pincode,
      official_website, official_phone_numbers, official_email_addresses,
      principal_name, director_info, about_college, vision, mission, logo_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProfile.run(
    "Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College (Autonomous)",
    "DRBCCC Hindu College",
    "Dharmamurthi Nagar, Pattabiram",
    "Pattabiram, Chennai",
    "Tiruvallur",
    "Tamil Nadu",
    "600072",
    "https://www.drbccchinducollege.edu.in/",
    "044-26850621, 044-26850887",
    "drbccchinducollege@yahoo.co.in, drbccchinducollge@gmail.com",
    "Dr. G. Kalvikkarasi, M.A., M.Phil., Ph.D.",
    "Autonomous Institution Affiliated with University of Madras. Re-accredited by NAAC.",
    "The Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College was started in the year 1969 at Pattabiram, Chennai, to commemorate the birth centenary of our illustrious founder, Dharmamurthi Rao Bahadur Calavala Cunnan Chetty Garu whose services were praised by Dr. Annie Besant and Mahakavi Bharathiar.",
    "To improve the Quality of Education on par with the International Standards so as to enable our students to occupy high positions in the National and International Arena.",
    "To impart quality higher education to students belonging to underprivileged and marginalized sections of society, instilling moral and ethical values with academic excellence.",
    "https://www.drbccchinducollege.edu.in/images/logo-hindu-college2.png"
  );

  console.log('--- Seeding Verified Departments (Shift I & Shift II) ---');
  const insertDept = db.prepare(`
    INSERT INTO departments (department_code, department_name, shift, programme_name, active)
    VALUES (?, ?, ?, ?, 1)
  `);

  const departmentsData = [
    // Shift II Departments
    { code: 'CSA', name: 'Computer Science with Artificial Intelligence', shift: 'Shift II', prog: 'B.Sc. CS with AI' },
    { code: 'CS', name: 'Computer Science', shift: 'Shift II', prog: 'B.Sc. Computer Science' },
    { code: 'CSD', name: 'Computer Science with Data Science', shift: 'Shift II', prog: 'B.Sc. CS with Data Science' },
    { code: 'EAI', name: 'Electronics with Artificial Intelligence', shift: 'Shift II', prog: 'B.Sc. Electronics & AI' },
    { code: 'BCA', name: 'Computer Applications', shift: 'Shift II', prog: 'Bachelor of Computer Applications' },
    { code: 'BBA', name: 'Business Administration', shift: 'Shift II', prog: 'Bachelor of Business Administration' },
    { code: 'BCOM-GEN2', name: 'Commerce (General - Shift II)', shift: 'Shift II', prog: 'B.Com. General' },
    { code: 'BCOM-AF', name: 'Commerce (Accounting & Finance)', shift: 'Shift II', prog: 'B.Com. Accounting & Finance' },
    { code: 'BCOM-BM', name: 'Commerce (Bank Management)', shift: 'Shift II', prog: 'B.Com. Bank Management' },
    { code: 'BCOM-CS2', name: 'Corporate Secretaryship (Shift II)', shift: 'Shift II', prog: 'B.Com. Corporate Secretaryship' },
    { code: 'BCOM-ISM', name: 'Information System Management', shift: 'Shift II', prog: 'B.Com. Info. Systems & Mgmt' },
    { code: 'PHY', name: 'Physics', shift: 'Shift II', prog: 'B.Sc. Physics' },
    { code: 'CHE', name: 'Chemistry', shift: 'Shift II', prog: 'B.Sc. Chemistry' },
    { code: 'STAT', name: 'Statistics', shift: 'Shift II', prog: 'B.Sc. Statistics' },
    { code: 'VISCOM', name: 'Visual Communication', shift: 'Shift II', prog: 'B.Sc. Visual Communication' },
    { code: 'CRIM', name: 'Criminology & Criminal Justice Science', shift: 'Shift II', prog: 'B.Sc. Criminology' },
    
    // Shift I Departments (Aided)
    { code: 'BCOM-GEN1', name: 'Commerce (General - Shift I)', shift: 'Shift I', prog: 'B.Com. General' },
    { code: 'BCOM-CS1', name: 'Corporate Secretaryship (Shift I)', shift: 'Shift I', prog: 'B.Com. Corporate Secretaryship' },
    { code: 'ECO', name: 'Economics', shift: 'Shift I', prog: 'B.A. Economics' },
    { code: 'HIST', name: 'Historical Studies', shift: 'Shift I', prog: 'B.A. Historical Studies' },
    { code: 'ENG', name: 'English Literature', shift: 'Shift I', prog: 'B.A. English' },
    { code: 'MATH', name: 'Mathematics', shift: 'Shift I', prog: 'B.Sc. Mathematics' },
    { code: 'TEL', name: 'Telugu', shift: 'Shift I', prog: 'B.A. Telugu' },
    { code: 'TAM', name: 'Tamil', shift: 'Shift I', prog: 'B.A. Tamil' }
  ];

  const deptMap = {};
  for (const dept of departmentsData) {
    const result = insertDept.run(dept.code, dept.name, dept.shift, dept.prog);
    deptMap[dept.code] = result.lastInsertRowid;
  }

  console.log('--- Seeding Exact 4 Initial Venues ---');
  // Exactly the 4 venues requested:
  // Cunnan Auditorium, Ramanujan Conference Hall, RJB Hall, Cunnan Conference Hall
  const insertVenue = db.prepare(`
    INSERT INTO venues (venue_name, venue_code, capacity, description, image_url, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  const venuesData = [
    {
      name: 'Cunnan Auditorium',
      code: 'AUD-01',
      capacity: 500,
      desc: 'Central air-conditioned auditorium with acoustic surround audio, theatrical stage lighting, and digital laser projection. Ideal for large-scale inaugurations, convocations, and cultural fests.',
      image: '/images/cunnan-auditorium.jpg'
    },
    {
      name: 'Ramanujan Conference Hall',
      code: 'RAM-01',
      capacity: 150,
      desc: 'Executive air-conditioned conference hall equipped with high-definition digital smart podium, dual projection, wireless delegate microphones, and video conferencing setup.',
      image: '/images/ramanujan-hall.jpg'
    },
    {
      name: 'RJB Hall',
      code: 'RJB-01',
      capacity: 200,
      desc: 'Multipurpose academic seminar hall with flexible seating, integrated sound reinforcement, and multimedia projection for guest lectures and symposiums.',
      image: '/images/rjb-hall.jpg'
    },
    {
      name: 'Cunnan Conference Hall',
      code: 'CN-CONF',
      capacity: 150,
      desc: 'Premier conference venue suited for Ph.D. public viva-voce examinations, department symposiums, and academic council panel discussions.',
      image: '/images/cunnan-conference-hall.jpg'
    }
  ];

  const venueMap = {};
  for (const v of venuesData) {
    const res = insertVenue.run(v.name, v.code, v.capacity, v.desc, v.image);
    venueMap[v.name] = res.lastInsertRowid;
  }

  console.log('--- Seeding Users with Secure Password Hashes ---');
  const insertUser = db.prepare(`
    INSERT INTO users (user_id, password_hash, department_id, user_name, role, email, contact_number, account_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `);

  const saltRounds = 10;
  const adminHash = await bcrypt.hash('admin123', saltRounds);
  const csaHash = await bcrypt.hash('csa123', saltRounds);
  const phyHash = await bcrypt.hash('phy123', saltRounds);
  const bcomHash = await bcrypt.hash('bcom123', saltRounds);
  const mathHash = await bcrypt.hash('math123', saltRounds);

  // 1. Admin user
  const adminUser = insertUser.run(
    'ADMIN01',
    adminHash,
    null,
    'System Administrator',
    'admin',
    'admin@drbccchinducollege.edu.in',
    '044-26850621'
  );

  // 2. Department Users
  const csaUser = insertUser.run(
    'CSA001',
    csaHash,
    deptMap['CSA'],
    'Dr. D. Lakshminarayanan (HOD CS & AI)',
    'department',
    'csai@drbccchinducollege.edu.in',
    '9876543210'
  );

  const phyUser = insertUser.run(
    'PHY001',
    phyHash,
    deptMap['PHY'],
    'Head of Department (Physics)',
    'department',
    'physics@drbccchinducollege.edu.in',
    '9876543211'
  );

  const bcomUser = insertUser.run(
    'BCOM001',
    bcomHash,
    deptMap['BCOM-GEN2'],
    'Head of Department (Commerce)',
    'department',
    'commerce@drbccchinducollege.edu.in',
    '9876543212'
  );

  const mathUser = insertUser.run(
    'MATH001',
    mathHash,
    deptMap['MATH'],
    'Head of Department (Mathematics)',
    'department',
    'maths@drbccchinducollege.edu.in',
    '9876543213'
  );

  console.log('--- Seeding Realistic Initial Programmes & Bookings ---');
  // Seed sample programmes & bookings directly reflecting the user mockup:
  // - AI Workshop on 18 Sep 2026 (Conference Hall)
  // - Tech Fest on 22 Sep 2026 (Auditorium)
  // - Guest Lecture on 25 Sep 2026 (Ramanujan / RJB Hall)
  // - Cultural Event on 30 Sep 2026 (Auditorium)
  // - Dept Meeting on 16 Sep 2026 (RJB Hall)

  const insertProg = db.prepare(`
    INSERT INTO programmes (
      programme_name, programme_type, description, expected_participants,
      chief_guest, requirements, additional_notes, coordinator_name,
      coordinator_phone, coordinator_email, department_id, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      booking_id, department_id, venue_id, programme_id, date,
      start_time, end_time, status, requirements, additional_notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleBookings = [
    {
      code: 'CV2026001',
      progName: 'AI Workshop',
      type: 'Workshop',
      desc: 'Hands-on session on Artificial Intelligence, Deep Learning, and Machine Learning applications in industry.',
      participants: 60,
      chiefGuest: 'Mr. P. Murugesan, CEO Tulsi Analytics',
      req: JSON.stringify(['Projector', 'Internet', 'Sound System', 'Whiteboard']),
      notes: 'Arrangement of 40 power sockets for student laptops.',
      coordName: 'Dr. S. Priya',
      coordPhone: '9876543210',
      coordEmail: 'priya.cs@drbccchinducollege.edu.in',
      deptCode: 'CSA',
      venueName: 'Cunnan Conference Hall',
      date: '2026-09-18',
      startTime: '10:00 AM',
      endTime: '01:00 PM',
      status: 'confirmed',
      userId: csaUser.lastInsertRowid
    },
    {
      code: 'CV2026002',
      progName: 'Tech Fest 2K26',
      type: 'Fest',
      desc: 'Annual National Level Technical Symposium with coding, web design, and robotic challenges.',
      participants: 450,
      chiefGuest: 'Dr. Sathyanarayana N Gummadi, Professor, IIT Madras',
      req: JSON.stringify(['Projector', 'Internet', 'Sound System', 'Stage Lighting', 'Audio Recording']),
      notes: 'Auditorium main stage banner setup required.',
      coordName: 'Dr. D. Lakshminarayanan',
      coordPhone: '9876543210',
      coordEmail: 'hod.csai@drbccchinducollege.edu.in',
      deptCode: 'CSA',
      venueName: 'Cunnan Auditorium',
      date: '2026-09-22',
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      status: 'confirmed',
      userId: csaUser.lastInsertRowid
    },
    {
      code: 'CV2026003',
      progName: 'Guest Lecture on Solar Energy Fabrication',
      type: 'Guest Lecture',
      desc: 'Special lecture in collaboration with Gemini Scientific Company on photovoltaic thin-film manufacturing.',
      participants: 120,
      chiefGuest: 'Dr. R. Sundaram, Senior Scientist, CECRI',
      req: JSON.stringify(['Projector', 'Sound System']),
      notes: 'Lab kit demonstration table needed near podium.',
      coordName: 'Dr. V. Natarajan',
      coordPhone: '9876543211',
      coordEmail: 'physics@drbccchinducollege.edu.in',
      deptCode: 'PHY',
      venueName: 'Ramanujan Conference Hall',
      date: '2026-09-25',
      startTime: '11:00 AM',
      endTime: '01:00 PM',
      status: 'confirmed',
      userId: phyUser.lastInsertRowid
    },
    {
      code: 'CV2026004',
      progName: 'Annual Cultural Fest & Talentia',
      type: 'Cultural',
      desc: 'Inter-collegiate cultural festival celebrating music, arts, theatre, and traditional folk dances.',
      participants: 500,
      chiefGuest: 'Mahakavi Memorial Cultural Envoy',
      req: JSON.stringify(['Sound System', 'Lighting', 'Green Room access']),
      notes: 'Security and crowd management volunteers deployed.',
      coordName: 'Dr. K. Subramanian',
      coordPhone: '9876543214',
      coordEmail: 'culturals@drbccchinducollege.edu.in',
      deptCode: 'TAM',
      venueName: 'Cunnan Auditorium',
      date: '2026-09-30',
      startTime: '04:00 PM',
      endTime: '07:00 PM',
      status: 'confirmed',
      userId: adminUser.lastInsertRowid
    },
    {
      code: 'CV2026005',
      progName: 'Department Academic Council Meeting',
      type: 'Meeting',
      desc: 'Curriculum revision review and syllabus approval under autonomous status regulations.',
      participants: 35,
      chiefGuest: 'University Representative nominee',
      req: JSON.stringify(['Projector', 'Internet', 'Wireless Mics']),
      notes: 'Circular seating arrangement.',
      coordName: 'Dr. S. Prabakaran',
      coordPhone: '9876543212',
      coordEmail: 'commerce.hod@drbccchinducollege.edu.in',
      deptCode: 'BCOM-GEN2',
      venueName: 'RJB Hall',
      date: '2026-09-16',
      startTime: '02:00 PM',
      endTime: '04:30 PM',
      status: 'completed',
      userId: bcomUser.lastInsertRowid
    }
  ];

  for (const b of sampleBookings) {
    const deptId = deptMap[b.deptCode];
    const venueId = venueMap[b.venueName];

    const progRes = insertProg.run(
      b.progName,
      b.type,
      b.desc,
      b.participants,
      b.chiefGuest,
      b.req,
      b.notes,
      b.coordName,
      b.coordPhone,
      b.coordEmail,
      deptId,
      b.userId
    );

    insertBooking.run(
      b.code,
      deptId,
      venueId,
      progRes.lastInsertRowid,
      b.date,
      b.startTime,
      b.endTime,
      b.status,
      b.req,
      b.notes,
      b.userId
    );
  }

  logAudit('SYSTEM', 'System Seeder', 'INITIALIZE', 'DATABASE', 'ALL', 'Seeded DRBCCC Hindu College verified institutional master data, 4 venues, departments, users, and bookings.');
  console.log('--- Successfully seeded DRBCCC Hindu College database! ---');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = { seed };
