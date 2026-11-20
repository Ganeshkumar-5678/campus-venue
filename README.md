# Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College (Autonomous)
## CampusVenue - Smart Venue & Programme Management System

An enterprise-grade, relational-database-driven venue and programme booking portal built according to the official specifications and workflow of **DRBCCC Hindu College (Autonomous), Pattabiram, Chennai - 72**.

---

## 🏛️ 1. Official College Master Data Integration

All initial master data is verified and populated directly from the official college website ([https://www.drbccchinducollege.edu.in/](https://www.drbccchinducollege.edu.in/)):

- **College Name**: Dharmamurthi Rao Bahadur Calavala Cunnan Chetty's Hindu College (Autonomous)
- **Short Name**: DRBCCC Hindu College
- **Campus Address**: Dharmamurthi Nagar, Pattabiram, Chennai - 600 072
- **District / State**: Tiruvallur / Tamil Nadu
- **Official Phones**: `044-26850621`, `044-26850887`
- **Official Emails**: `drbccchinducollege@yahoo.co.in`, `drbccchinducollge@gmail.com`
- **Principal**: Dr. G. Kalvikkarasi, M.A., M.Phil., Ph.D.
- **Official Website URL**: `https://www.drbccchinducollege.edu.in/` (Stored permanently in database)
- **Institutional Accreditation**: Autonomous Institution Affiliated with University of Madras, Re-accredited by NAAC.

---

## 🏢 2. The Exactly 4 Verified Initial Venues

Retrieved dynamically from the database (`VENUES` table):
1. **Cunnan Auditorium** &mdash; 500 Seats (Acoustic audio, stage lighting, laser projection)
2. **Ramanujan Conference Hall** &mdash; 150 Seats (Digital smart podium, dual projection, delegate microphones)
3. **RJB Hall** &mdash; 200 Seats (Multipurpose seminar hall with flexible seating)
4. **Cunnan Conference Hall** &mdash; 150 Seats (Ph.D. viva-voce examinations, symposiums & council panels)

*Safe Deactivation Principle*: Venues cannot be accidentally deleted if they hold historical bookings. The system supports archiving/deactivation while preserving historical records intact.

---

## 📚 3. Departments Master Data (`DEPARTMENTS` table)

24 Verified Academic Departments (Shift I Aided & Shift II Un-Aided):
- **B.Sc. Computer Science with Artificial Intelligence** (Code: `CSA`) &mdash; Login: `CSA001`
- **B.Sc. Computer Science** (Code: `CS`)
- **B.Sc. Computer Science with Data Science** (Code: `CSD`)
- **B.Sc. Electronics with AI** (Code: `EAI`)
- **Bachelor of Computer Applications** (Code: `BCA`)
- **Bachelor of Business Administration** (Code: `BBA`)
- **B.Com. General (Shift I & Shift II)**
- **B.Com. Corporate Secretaryship (Shift I & Shift II)**
- **B.Com. Accounting & Finance**, **Bank Management**, **Info. Systems & Mgmt**
- **B.Sc. Physics**, **Chemistry**, **Mathematics**, **Statistics**, **Visual Communication**, **Criminology**
- **B.A. English**, **Economics**, **Historical Studies**, **Tamil**, **Telugu**
- **P.G. Programmes**: M.Com., M.A. Tamil, M.Sc. Mathematics

---

## 🔐 4. Default Login Credentials (Bcrypt Hashed)

| Role | User ID | Password | Department / Description |
| :--- | :--- | :--- | :--- |
| **Department User** | `CSA001` | `csa123` | Computer Science with Artificial Intelligence |
| **System Administrator** | `ADMIN01` | `admin123` | Institutional Master Data Controller |
| **Department User** | `PHY001` | `phy123` | Physics Department |
| **Department User** | `BCOM001` | `bcom123` | Commerce Department |
| **Department User** | `MATH001` | `math123` | Mathematics Department |

*Passwords are securely hashed using bcrypt. Plaintext passwords are never stored.*

---

## 🚀 5. 10-Step Workflow Architecture (Matching UI Specification)

1. **Department Login**: Secure login with Department ID, masked password toggle, and official college crest.
2. **Department Dashboard**: Metrics for Upcoming, Pending, Approved, and Completed programmes, with quick CTA to book.
3. **Date & Time Selection**: Interactive picker with real-time hall availability check.
4. **Venue Selection (Movie Ticket Style)**: Live visual hall cards showing Available (Green), Booked (Black), and Selected (Blue) states.
5. **Booking Details Form**: Programme name, type, coordinator contact info, and resource checklist (Projector, Internet, Sound System, Whiteboard).
6. **Booking Confirmation**: Animated celebration with sequential Booking ID generator (e.g. `CV2026006`).
7. **Calendar View**: Month/Week/Day calendar with multi-attribute filtering by Department, Venue, and Status.
8. **Programme History**: Search past, active, and upcoming events by Year, Date, Department, Venue, and Coordinator.
9. **Admin Dashboard & Master Data Management**:
   - Institutional Profile Editor
   - Department Manager (Add, Edit, Shift, Active toggle)
   - User Manager (Create credentials, Reset password, Role assignment)
   - Venue Manager (Capacity & safe archive)
   - Department-wise, Venue-wise, and Monthly analytics charts
   - Immutable audit trail
10. **AI Voice Booking**:
   - Web Speech recognition for natural English and Tamil-English input
   - Natural entity parser extracting venue, department, date, and times
   - Real-time conflict collision detection with alternative venue recommendations
   - Speech synthesis audio output and 1-click confirmation

---

## 🛠️ 6. How to Run the Application

### Start the Server (Serves API + Built Frontend):
```powershell
cd C:\Users\ELCOT\.gemini\antigravity\scratch\drbccc-campus-venue\server
node server.js
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

### Run Automated Integration Tests:
```powershell
cd C:\Users\ELCOT\.gemini\antigravity\scratch\drbccc-campus-venue\server
node test_system.js
```

### (Optional) Run Vite Dev Server for Live HMR:
```powershell
cd C:\Users\ELCOT\.gemini\antigravity\scratch\drbccc-campus-venue\client
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.
