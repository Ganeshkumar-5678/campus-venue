const { db } = require('./database');

// Convert "10:00 AM" to minutes from midnight
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function timesOverlap(startA, endA, startB, endB) {
  const aStart = parseTimeToMinutes(startA);
  const aEnd = parseTimeToMinutes(endA);
  const bStart = parseTimeToMinutes(startB);
  const bEnd = parseTimeToMinutes(endB);
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

// Check if a date is a weekend or holiday
function isNonWorkingDay(dateStr) {
  let allowWeekend = 0;
  let allowHoliday = 0;
  try {
    const prof = db.prepare('SELECT allow_weekend_booking, allow_holiday_booking FROM college_profile LIMIT 1').get();
    if (prof) {
      allowWeekend = prof.allow_weekend_booking || 0;
      allowHoliday = prof.allow_holiday_booking || 0;
    }
  } catch {}

  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
  if ((dayOfWeek === 0 || dayOfWeek === 6) && !allowWeekend) {
    return { isNonWorking: true, reason: dayOfWeek === 0 ? 'Sunday' : 'Saturday' };
  }

  // Check holidays table
  const holiday = db.prepare('SELECT * FROM holidays WHERE holiday_date = ?').get(dateStr);
  if (holiday && !allowHoliday) {
    return { isNonWorking: true, reason: holiday.holiday_name };
  }

  return { isNonWorking: false, reason: null };
}

// Check if venue is free on date and time (ONLY confirmed bookings conflict)
function isVenueFree(venueId, date, startTime, endTime) {
  const confirmedBookings = db.prepare(`
    SELECT start_time, end_time FROM bookings
    WHERE venue_id = ? AND date = ? AND status = 'confirmed'
  `).all(venueId, date);

  for (const b of confirmedBookings) {
    if (timesOverlap(startTime, endTime, b.start_time, b.end_time)) {
      return false;
    }
  }
  return true;
}

// Core Recommendation Engine
function findAlternativeBookingOptions({ originalBooking = null, venueId, date, startTime, endTime }) {
  const targetVenueId = venueId || originalBooking?.venue_id;
  const targetDate = date || originalBooking?.date;
  const targetStartTime = startTime || originalBooking?.start_time;
  const targetEndTime = endTime || originalBooking?.end_time;

  const coreVenues = db.prepare('SELECT * FROM venues WHERE active = 1 ORDER BY id ASC').all();
  const recommendations = [];

  // -------------------------------------------------------------------------
  // PRIORITY 1: Same Date + Same Time + Different Available Venue
  // -------------------------------------------------------------------------
  for (const v of coreVenues) {
    if (v.id === targetVenueId) continue;
    if (isVenueFree(v.id, targetDate, targetStartTime, targetEndTime)) {
      recommendations.push({
        type: 'SAME_DATE_OTHER_VENUE',
        priority: 1,
        venue_id: v.id,
        venue_name: v.venue_name,
        date: targetDate,
        start_time: targetStartTime,
        end_time: targetEndTime,
        capacity: v.capacity,
        reason: `${v.venue_name} is fully available on the same date (${targetDate}) at your requested time (${targetStartTime} - ${targetEndTime}).`
      });
    }
  }

  // If found good priority 1 matches, return them immediately or continue
  if (recommendations.length >= 2) {
    return recommendations.slice(0, 3);
  }

  // -------------------------------------------------------------------------
  // PRIORITY 2: Same Date + Nearby Available Time Slot (Same or Suitable Venue)
  // -------------------------------------------------------------------------
  const candidateSlots = [
    { start: '09:00 AM', end: '11:00 AM' },
    { start: '11:30 AM', end: '01:30 PM' },
    { start: '02:00 PM', end: '04:30 PM' }
  ];

  for (const v of coreVenues) {
    for (const slot of candidateSlots) {
      if (slot.start === targetStartTime && slot.end === targetEndTime) continue;
      if (isVenueFree(v.id, targetDate, slot.start, slot.end)) {
        recommendations.push({
          type: 'SAME_DATE_NEARBY_TIME',
          priority: 2,
          venue_id: v.id,
          venue_name: v.venue_name,
          date: targetDate,
          start_time: slot.start,
          end_time: slot.end,
          capacity: v.capacity,
          reason: `${v.venue_name} has an open slot on ${targetDate} from ${slot.start} to ${slot.end}.`
        });
        if (recommendations.length >= 3) break;
      }
    }
    if (recommendations.length >= 3) break;
  }

  // -------------------------------------------------------------------------
  // PRIORITY 3: Next Available Working Date (Skip Saturdays, Sundays, Holidays)
  // -------------------------------------------------------------------------
  let curDate = new Date(targetDate + 'T00:00:00');
  let daysLooked = 0;

  while (daysLooked < 14 && recommendations.length < 3) {
    curDate.setDate(curDate.getDate() + 1);
    daysLooked++;

    const nextDateStr = curDate.toISOString().split('T')[0];
    const dayCheck = isNonWorkingDay(nextDateStr);
    if (dayCheck.isNonWorking) {
      continue; // Skip weekend and government holiday!
    }

    // Check target venue first, then others
    const searchOrder = [
      coreVenues.find(v => v.id === targetVenueId) || coreVenues[0],
      ...coreVenues.filter(v => v.id !== targetVenueId)
    ];

    for (const v of searchOrder) {
      if (isVenueFree(v.id, nextDateStr, targetStartTime, targetEndTime)) {
        recommendations.push({
          type: 'NEXT_WORKING_DATE',
          priority: 3,
          venue_id: v.id,
          venue_name: v.venue_name,
          date: nextDateStr,
          start_time: targetStartTime,
          end_time: targetEndTime,
          capacity: v.capacity,
          reason: `On next working day (${nextDateStr}), ${v.venue_name} is free at your preferred time (${targetStartTime} - ${targetEndTime}).`
        });
        break;
      }
    }
  }

  return recommendations;
}

module.exports = {
  findAlternativeBookingOptions,
  isNonWorkingDay,
  isVenueFree,
  timesOverlap,
  parseTimeToMinutes
};
