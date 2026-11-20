const { db } = require('./database');
const { timesOverlap, isVenueFree, findAlternativeBookingOptions, isNonWorkingDay } = require('./recommendationService');

// Language detection helper
function detectLanguage(text) {
  const t = text.trim();

  // Check for Tamil Unicode characters (\u0B80 - \u0BFF)
  if (/[\u0B80-\u0BFF]/.test(t)) {
    return 'ta'; // Pure Tamil
  }

  // Check for Tanglish keywords (Tamil spoken in English letters)
  const tanglishMarkers = [
    'pannunum', 'pannanum', 'venum', 'veanum', 'nalaiki', 'naalaiku', 'nalaike', 'inniku',
    'innikku', 'kaalaila', 'madhiyam', 'sayangalam', 'mani', 'lendhu', 'lerundhu', 'varaikkum',
    'varaikum', 'irukka', 'iruka', 'podhum', 'endha', 'edhula', 'engalukku', 'department-ku',
    'ku', 'oda', 'solunga', 'kudunga', 'auditorium-la', 'hall-la', 'amma', 'illa', 'aama'
  ];

  const words = t.toLowerCase().split(/\s+/);
  const tanglishHits = words.filter(w => tanglishMarkers.some(m => w.includes(m)));

  if (tanglishHits.length >= 1 || /department-ku|hall-ku|ku\b|la\b/i.test(t)) {
    return 'tanglish';
  }

  return 'en';
}

function parseVoiceBookingRequest(rawText, currentDepartmentId = null, existingEntities = {}) {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();
  const lang = detectLanguage(text);

  // Flexible multilingual affirmative matcher (handles English, Tanglish, and Tamil)
  const isAffirmative = (
    /\b(yes|confirm|proceed|sure|ok|okay|book|agree|correct|fine|go ahead|accept|approved|done|yep|yeah)\b/i.test(lower) ||
    /\b(aama|aamaa|ama|amaa|pannunga|pannidunga|pannalam|seri|sari|podhum|kandippa|kandippaga)\b/i.test(lower) ||
    /(ஆம்|உறுதி|செய்|சரி|சரிங்க|முன்பதிவு\s*செய்|உறுதிப்படுத்து|உறுதிப்படுத்துங்கள்|உறுதிப்படுத்துகிறேன்|பண்ணுங்க)/.test(text)
  ) && !/\b(auditorium|hall|ramanujan|cunnan|rjb)\b/i.test(lower);

  const missingFields = [];
  const coreVenues = db.prepare('SELECT * FROM venues WHERE active = 1 ORDER BY id ASC').all();
  const allDepts = db.prepare('SELECT * FROM departments WHERE active = 1 ORDER BY id ASC').all();

  // Helper for India timezone current date calculation
  const getKolkataDateString = (offsetDays = 0) => {
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now).split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10) + offsetDays;
      const target = new Date(y, m, d);
      const tYear = target.getFullYear();
      const tMonth = String(target.getMonth() + 1).padStart(2, '0');
      const tDay = String(target.getDate()).padStart(2, '0');
      return `${tYear}-${tMonth}-${tDay}`;
    } catch {
      const now = new Date();
      now.setDate(now.getDate() + offsetDays);
      const tYear = now.getFullYear();
      const tMonth = String(now.getMonth() + 1).padStart(2, '0');
      const tDay = String(now.getDate()).padStart(2, '0');
      return `${tYear}-${tMonth}-${tDay}`;
    }
  };

  // ---------------------------------------------------------
  // 1. EXTRACT DATE (Asia/Kolkata aware, supports Tamil & English)
  // ---------------------------------------------------------
  let date = existingEntities?.date || null;
  const currentYear = parseInt(getKolkataDateString(0).split('-')[0], 10);

  // Check explicit 4-digit year in query
  let explicitYear = null;
  const yearMatch = lower.match(/\b(202\d)\b/);
  if (yearMatch) {
    explicitYear = parseInt(yearMatch[1], 10);
  }

  const tamilMonthMap = {
    'ஜனவரி': '01', 'பிப்ரவரி': '02', 'மார்ச்': '03', 'ஏப்ரல்': '04',
    'மே': '05', 'ஜூன்': '06', 'ஜூலை': '07', 'ஆகஸ்ட்': '08',
    'செப்டம்பர்': '09', 'அக்டோபர்': '10', 'நவம்பர்': '11', 'டிசம்பர்': '12'
  };

  const tamilDateMatch = text.match(/(ஜனவரி|பிப்ரவரி|மார்ச்|ஏப்ரல்|மே|ஜூன்|ஜூலை|ஆகஸ்ட்|செப்டம்பர்|அக்டோபர்|நவம்பர்|டிசம்பர்)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i) ||
                         text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:அன்று\s+)?(ஜனவரி|பிப்ரவரி|மார்ச்|ஏப்ரல்|மே|ஜூன்|ஜூலை|ஆகஸ்ட்|செப்டம்பர்|அக்டோபர்|நவம்பர்|டிசம்பர்)(?:\s*,?\s*(\d{4}))?/i);

  const weekdaysMap = {
    'sunday': 0, 'sun': 0, 'ஞாயிறு': 0, 'ஞாயிற்றுக்கிழமை': 0,
    'monday': 1, 'mon': 1, 'திங்கள்': 1, 'thinkal': 1, 'திங்கட்கிழமை': 1,
    'tuesday': 2, 'tue': 2, 'செவ்வாய்': 2, 'sevvai': 2, 'செவ்வாய்க்கிழமை': 2,
    'wednesday': 3, 'wed': 3, 'புதன்': 3, 'budhan': 3, 'புதன்கிழமை': 3,
    'thursday': 4, 'thu': 4, 'வியாழன்': 4, 'vyazhan': 4, 'வியாழக்கிழமை': 4,
    'friday': 5, 'fri': 5, 'வெள்ளி': 5, 'velli': 5, 'வெள்ளிக்கிழமை': 5,
    'saturday': 6, 'sat': 6, 'சனி': 6, 'sani': 6, 'சனிக்கிழமை': 6
  };

  const weekdayMatch = lower.match(/(?:on\s+|this\s+|coming\s+|next\s+|அடுத்த\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|திங்கட்கிழமை|திங்கள்|செவ்வாய்க்கிழமை|செவ்வாய்|புதன்கிழமை|புதன்|வியாழக்கிழமை|வியாழன்|வெள்ளிக்கிழமை|வெள்ளி|சனிக்கிழமை|சனி|ஞாயிற்றுக்கிழமை|ஞாயிறு)(?:\s+அன்று|\s+கிழமை)?/i);

  if (lower.includes('day after tomorrow') || lower.includes('naalaiku kazhithu') || text.includes('நாளை மறுநாள்')) {
    date = getKolkataDateString(2);
  } else if (lower.includes('tomorrow') || lower.includes('naalaiku') || lower.includes('naalaiki') || lower.includes('nalaiki') || text.includes('நாளை')) {
    date = getKolkataDateString(1);
  } else if (lower.includes('today') || lower.includes('inniku') || lower.includes('innikku') || text.includes('இன்று')) {
    date = getKolkataDateString(0);
  } else if (weekdayMatch && !tamilDateMatch) {
    const rawWk = weekdayMatch[1].toLowerCase();
    const targetDay = weekdaysMap[rawWk];
    if (targetDay !== undefined) {
      try {
        const now = new Date();
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now).split('-');
        const todayKolkata = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const curDay = todayKolkata.getDay();
        let daysUntil = (targetDay - curDay + 7) % 7;
        if (daysUntil === 0) daysUntil = 7; // Next occurrence
        date = getKolkataDateString(daysUntil);
      } catch {
        date = getKolkataDateString(3);
      }
    }
  } else if (tamilDateMatch) {
    const mName = tamilDateMatch[1].match(/^\d+$/) ? tamilDateMatch[2] : tamilDateMatch[1];
    const dVal = (tamilDateMatch[1].match(/^\d+$/) ? tamilDateMatch[1] : tamilDateMatch[2]).padStart(2, '0');
    const mVal = tamilMonthMap[mName] || '09';
    const yearVal = tamilDateMatch[3] || explicitYear || currentYear;
    date = `${yearVal}-${mVal}-${dVal}`;
  } else {
    const monthMap = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    const dateMatch = lower.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:\s*,?\s*(\d{4}))?/i) ||
                      lower.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i);

    const isoMatch = lower.match(/(\d{4})-(\d{2})-(\d{2})/) || lower.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);

    if (dateMatch) {
      const day = (dateMatch[1].match(/^\d+$/) ? dateMatch[1] : dateMatch[2]).padStart(2, '0');
      const mStr = (dateMatch[1].match(/^\d+$/) ? dateMatch[2] : dateMatch[1]).toLowerCase();
      const month = monthMap[mStr];
      const year = dateMatch[3] || explicitYear || currentYear;
      date = `${year}-${month}-${day}`;
    } else if (isoMatch) {
      if (isoMatch[1].length === 4) {
        date = isoMatch[0];
      } else {
        date = `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
      }
    }
  }

  if (!date) {
    missingFields.push('date');
  }

  // ---------------------------------------------------------
  // 2. EXTRACT TIMES (Tamil, Tanglish & English)
  // ---------------------------------------------------------
  let startTime = existingEntities?.startTime || null;
  let endTime = existingEntities?.endTime || null;

  // Flexible multilingual time range matcher:
  // Matches:
  // "10 AM to 1 PM", "10:00 AM to 01:00 PM"
  // "10 to 1", "10 - 1", "10-1"
  // "Morning 10 to afternoon 1"
  // "kaalai 10 mani la irundhu madhiyam 1 mani varaikum"
  // "10 mani la irundhu 1 mani varaikum"
  // "10 mani lendhu 1 mani varaikkum"
  // "காலை 10 மணி முதல் மதியம் 1 மணி வரை"
  // "மதியம் 2 மணி முதல் மாலை 5 மணி வரை"
  const timeRangeRegex = /(?:(?:காலை|மதியம்|மாலை|kaalai|madhiyam|afternoon|morning|from)\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:மணி|mani)?\s*(am|pm)?\s*(?:to|till|-|lendhu|lerundhu|la\s*irundhu|la\s*irundu|lerundu|முதல்)\s*(?:(?:மதியம்|மாலை|இரவு|madhiyam|afternoon|sayangalam|evening|to|till)\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:மணி|mani)?\s*(am|pm)?/i;

  const timeRangeMatch = lower.match(timeRangeRegex);

  if (timeRangeMatch) {
    let sHour = parseInt(timeRangeMatch[1], 10);
    let sMin = timeRangeMatch[2] ? parseInt(timeRangeMatch[2], 10) : 0;
    let sMer = (timeRangeMatch[3] && ['AM', 'PM'].includes(timeRangeMatch[3].toUpperCase())) ? timeRangeMatch[3].toUpperCase() : null;

    let eHour = parseInt(timeRangeMatch[4], 10);
    let eMin = timeRangeMatch[5] ? parseInt(timeRangeMatch[5], 10) : 0;
    let eMer = (timeRangeMatch[6] && ['AM', 'PM'].includes(timeRangeMatch[6].toUpperCase())) ? timeRangeMatch[6].toUpperCase() : null;

    // Convert 24-hour time if provided (e.g. 14:00 to 17:00)
    if (sHour >= 13 && sHour <= 23) {
      sHour -= 12;
      sMer = 'PM';
    }
    if (eHour >= 13 && eHour <= 23) {
      eHour -= 12;
      eMer = 'PM';
    }

    const matchedSubstring = timeRangeMatch[0].toLowerCase();
    const isMorningStart = matchedSubstring.includes('morning') || matchedSubstring.includes('kaalai') || text.includes('காலை') || lower.includes('காலை') || lower.includes('morning');
    const isAfternoonStart = matchedSubstring.includes('afternoon') || matchedSubstring.includes('madhiyam') || text.includes('மதியம்') || lower.includes('மதியம்') || lower.includes('afternoon');
    const isAfternoonEnd = matchedSubstring.includes('afternoon') || matchedSubstring.includes('madhiyam') || matchedSubstring.includes('sayangalam') || matchedSubstring.includes('மாலை') || text.includes('மாலை') || text.includes('மதியம்') || lower.includes('மதியம்') || lower.includes('afternoon');

    // Smart meridiem resolution:
    if (!eMer) {
      if (eHour >= 1 && eHour <= 11 && (sHour >= 8 && sHour <= 12) && eHour < sHour) eMer = 'PM';
      else if (eHour >= 1 && eHour <= 6) eMer = 'PM';
      else if (eHour >= 8 && eHour <= 11) eMer = 'AM';
      else if (eHour === 12) eMer = 'PM';
      else if (isAfternoonEnd) eMer = 'PM';
      else eMer = 'PM';
    }

    if (!sMer) {
      if (sHour >= 8 && sHour <= 11 && !isAfternoonStart) sMer = 'AM';
      else if (sHour === 12) sMer = 'PM';
      else if (sHour >= 1 && sHour <= 6) sMer = 'PM';
      else if (isMorningStart) sMer = 'AM';
      else if (isAfternoonStart) sMer = 'PM';
      else sMer = (eHour < sHour) ? 'AM' : eMer;
    }

    startTime = `${sHour.toString().padStart(2, '0')}:${sMin.toString().padStart(2, '0')} ${sMer}`;
    endTime = `${eHour.toString().padStart(2, '0')}:${eMin.toString().padStart(2, '0')} ${eMer}`;
  } else {
    // Single time match (e.g. "at 10 AM", "10 AM", "காலை 10 மணிக்கு", "10 மணிக்கு", "at 2 PM")
    const explicitTimeCue = lower.match(/(?:at|from|around|on|காலை|மதியம்|மாலை|kaalai|madhiyam)\s+(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|மணி|மணிக்கு|o'clock)?/i) ||
                           lower.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|மணி|மணிக்கு)\b/i);

    if (explicitTimeCue) {
      let hour = parseInt(explicitTimeCue[1], 10);
      let min = explicitTimeCue[2] ? parseInt(explicitTimeCue[2], 10) : 0;
      let rawMer = explicitTimeCue[3] ? explicitTimeCue[3].toLowerCase() : '';

      if (hour >= 13 && hour <= 23) {
        hour -= 12;
        rawMer = 'pm';
      }

      let mer = 'AM';
      if (rawMer === 'pm' || lower.includes('pm') || lower.includes('மதியம்') || lower.includes('மாலை') || lower.includes('afternoon') || (hour >= 1 && hour <= 6 && !lower.includes('am') && !lower.includes('காலை'))) {
        mer = 'PM';
      } else if (rawMer === 'am' || lower.includes('am') || lower.includes('காலை') || lower.includes('morning')) {
        mer = 'AM';
      } else if (hour >= 8 && hour <= 11) {
        mer = 'AM';
      } else if (hour === 12) {
        mer = 'PM';
      } else if (hour >= 1 && hour <= 7) {
        mer = 'PM';
      }

      // Default duration is 3 hours (standard college slot)
      let endHour = hour + 3;
      let endMer = mer;
      if (mer === 'AM' && endHour >= 12) {
        endMer = 'PM';
        if (endHour > 12) endHour -= 12;
      } else if (mer === 'PM' && endHour > 12) {
        endHour -= 12;
      }

      startTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${mer}`;
      endTime = `${endHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${endMer}`;
    } else if (lower.includes('morning') || lower.includes('kaalai') || text.includes('காலை')) {
      startTime = '09:30 AM';
      endTime = '12:30 PM';
    } else if (lower.includes('afternoon') || lower.includes('madhiyam') || text.includes('மதியம்')) {
      startTime = '01:30 PM';
      endTime = '04:30 PM';
    }
  }

  if (!startTime || !endTime) {
    missingFields.push('time');
  }

  // ---------------------------------------------------------
  // 3. EXTRACT VENUE (From the exact 4 halls)
  // ---------------------------------------------------------
  let requestedVenue = null;
  if (existingEntities?.requestedVenue) {
    const vId = existingEntities.requestedVenue.id || existingEntities.requestedVenue;
    requestedVenue = coreVenues.find(v => v.id === vId || v.venue_name === existingEntities.requestedVenue.name);
  }

  if (lower.includes('ramanujan') || lower.includes('ராமானுஜன்')) {
    requestedVenue = coreVenues.find(v => v.venue_name.toLowerCase().includes('ramanujan'));
  } else if (lower.includes('rjb') || lower.includes('ஆர்ஜேபி') || lower.includes('r j b')) {
    requestedVenue = coreVenues.find(v => v.venue_name.toLowerCase().includes('rjb'));
  } else if (lower.includes('cunnan conference') || lower.includes('குன்னன் கான்பரன்ஸ்') || lower.includes('cunnan hall')) {
    requestedVenue = coreVenues.find(v => v.venue_name === 'Cunnan Conference Hall');
  } else if (lower.includes('auditorium') || lower.includes('ஆடிட்டோரியம்') || lower.includes('cunnan aud')) {
    requestedVenue = coreVenues.find(v => v.venue_name.toLowerCase().includes('auditorium'));
  } else if (lower.includes('conference hall') || lower.includes('conference room') || lower.includes('கான்பரன்ஸ் ஹால்')) {
    requestedVenue = coreVenues.find(v => v.venue_name.toLowerCase().includes('conference'));
  } else if (lower.includes('cunnan')) {
    requestedVenue = coreVenues.find(v => v.venue_name === 'Cunnan Conference Hall');
  }

  if (!requestedVenue) {
    missingFields.push('venue');
  }

  // ---------------------------------------------------------
  // 4. EXTRACT PROGRAMME NAME & TYPE
  // ---------------------------------------------------------
  let programmeName = existingEntities?.programmeName || null;
  let programmeType = existingEntities?.programmeType || 'Workshop';
  let programmeSpecified = existingEntities?.programmeSpecified || false;

  // Check for programme markers: e.g. "for AI workshop", "for an AI workshop", "AI workshop-ku", "for National Conference"
  const progPattern = lower.match(/(?:for|about|titled|topic|for an|for a)\s+([a-zA-Z0-9\s\u0B80-\u0BFF]{2,35}?)(?:\s+(?:on|from|at|in|tomorrow|today|between|\d)|$)/i);
  if (progPattern && progPattern[1] && !progPattern[1].includes('department')) {
    programmeName = progPattern[1].trim();
    programmeSpecified = true;
  }

  if (lower.includes('workshop') || lower.includes('பயிலரங்கம்')) {
    programmeType = 'Workshop';
    programmeName = lower.includes('ai') ? 'AI Workshop' : (programmeName || 'Interactive Workshop');
    programmeSpecified = true;
  } else if (lower.includes('seminar') || lower.includes('கருத்தரங்கம்')) {
    programmeType = 'Seminar';
    programmeName = programmeName || 'Department Seminar';
    programmeSpecified = true;
  } else if (lower.includes('guest lecture') || lower.includes('சிறப்புரை')) {
    programmeType = 'Guest Lecture';
    programmeName = programmeName || 'Guest Lecture Session';
    programmeSpecified = true;
  } else if (lower.includes('conference') || lower.includes('மாநாடு')) {
    programmeType = 'Conference';
    programmeName = programmeName || 'Academic Conference';
    programmeSpecified = true;
  } else if (lower.includes('meeting') || lower.includes('கூட்டம்')) {
    programmeType = 'Department Meeting';
    programmeName = programmeName || 'Department Meeting';
    programmeSpecified = true;
  } else if (lower.includes('fest') || lower.includes('விழா')) {
    programmeType = 'Fest';
    programmeName = programmeName || 'Technical Symposium';
    programmeSpecified = true;
  } else if (lower.includes('hackathon')) {
    programmeType = 'Workshop';
    programmeName = programmeName || 'Hackathon Challenge';
    programmeSpecified = true;
  } else if (lower.includes('symposium')) {
    programmeType = 'Symposium';
    programmeName = programmeName || 'National Symposium';
    programmeSpecified = true;
  } else if (existingEntities?.requestedVenue && existingEntities?.date && (existingEntities?.startTime || startTime) && !programmeSpecified) {
    // If answering the follow-up question for programme name
    if (text.length >= 2 && text.length <= 45 && !lower.includes('book') && !lower.includes('hall') && !lower.includes('auditorium')) {
      programmeName = text.trim();
      programmeSpecified = true;
    }
  }

  // If not specified, default to a clean institutional programme title
  if (!programmeName) {
    if (lang === 'ta') {
      programmeName = 'துறை கல்விசார் நிகழ்வு';
    } else {
      programmeName = 'Department Academic Event';
    }
  }

  // Extract expected participants (e.g., "120 students", "60 people", "for 150 members")
  let expectedParticipants = existingEntities?.expectedParticipants || 60;
  const partMatch = lower.match(/(\d{1,4})\s*(?:students|participants|people|members|attendees|பேர்|நபர்கள்)/i);
  if (partMatch) {
    expectedParticipants = parseInt(partMatch[1], 10);
  }

  // ---------------------------------------------------------
  // 5. EXTRACT DEPARTMENT (Prioritize Spoken Keywords)
  // ---------------------------------------------------------
  let department = null;

  // Check spoken text for department keywords
  let detectedDept = null;
  if (lower.includes('physics') || text.includes('இயற்பியல்') || lower.includes('phy')) {
    detectedDept = allDepts.find(d => d.department_code === 'PHY');
  } else if (lower.includes('chemistry') || text.includes('வேதியியல்') || lower.includes('che')) {
    detectedDept = allDepts.find(d => d.department_code === 'CHE');
  } else if (lower.includes('mathematics') || lower.includes('maths') || text.includes('கணிதம்') || lower.includes('math')) {
    detectedDept = allDepts.find(d => d.department_code === 'MATH');
  } else if (lower.includes('data science') || lower.includes('cds') || text.includes('டேட்டா சயின்ஸ்')) {
    detectedDept = allDepts.find(d => d.department_code === 'CDS');
  } else if (lower.includes('artificial intelligence') || lower.includes('csa') || text.includes('செயற்கை நுண்ணறிவு') || lower.includes('ai dept')) {
    detectedDept = allDepts.find(d => d.department_code === 'CSA');
  } else if (lower.includes('bca') || lower.includes('computer applications') || text.includes('கம்ப்யூட்டர் அப்ளிகேஷன்ஸ்')) {
    detectedDept = allDepts.find(d => d.department_code === 'BCA');
  } else if (lower.includes('english') || text.includes('ஆங்கிலம்') || lower.includes('eng')) {
    detectedDept = allDepts.find(d => d.department_code === 'ENG');
  } else if (lower.includes('tamil') || text.includes('தமிழ்')) {
    detectedDept = allDepts.find(d => d.department_code === 'TAM');
  } else if (lower.includes('economics') || text.includes('பொருளாதாரம்') || lower.includes('eco')) {
    detectedDept = allDepts.find(d => d.department_code === 'ECO');
  } else if (lower.includes('bba') || lower.includes('business administration') || text.includes('மேலாண்மை')) {
    detectedDept = allDepts.find(d => d.department_code === 'BBA');
  } else if (lower.includes('bcom') || lower.includes('commerce') || text.includes('வணிகவியல்')) {
    detectedDept = allDepts.find(d => d.department_code.startsWith('BCOM'));
  }

  if (detectedDept) {
    department = detectedDept;
  } else if (currentDepartmentId) {
    department = allDepts.find(d => d.id === currentDepartmentId);
  } else if (existingEntities?.department) {
    const dId = existingEntities.department.id || existingEntities.department;
    department = allDepts.find(d => d.id === dId || d.department_code === existingEntities.department.code);
  } else {
    department = allDepts.find(d => d.department_code === 'CSA') || allDepts[0];
  }

  // ---------------------------------------------------------
  // 6. FORMULATE MULTILINGUAL RESPONSE & FOLLOW-UP QUESTIONS
  // ---------------------------------------------------------
  let followUpQuestion = null;
  let voiceResponse = '';
  let hasConflict = false;
  let alternatives = [];
  let conflictingBooking = null;

  // Handle Missing Information first
  if (missingFields.length > 0) {
    if (missingFields.includes('venue') && missingFields.includes('time')) {
      if (lang === 'ta') {
        followUpQuestion = "எந்த அரங்கம் மற்றும் எந்த நேரத்தில் முன்பதிவு செய்ய விரும்புகிறீர்கள்?";
      } else if (lang === 'tanglish') {
        followUpQuestion = "Endha venue mattrum endha time-ku book panna poreenga? (Auditorium, Ramanujan, RJB, or Cunnan Conference Hall)";
      } else {
        followUpQuestion = "Which venue and what time would you like to book? (Cunnan Auditorium, Ramanujan Conference Hall, RJB Hall, or Cunnan Conference Hall)";
      }
    } else if (missingFields.includes('time')) {
      const vName = requestedVenue ? requestedVenue.venue_name : 'the hall';
      if (lang === 'ta') {
        followUpQuestion = `${vName} அரங்கத்தை எந்த நேரத்தில் முன்பதிவு செய்ய விரும்புகிறீர்கள்? (எ.கா: காலை 10 மணி முதல் மதியம் 1 மணி வரை)`;
      } else if (lang === 'tanglish') {
        followUpQuestion = `${vName}-ku endha time-la book panna virumbureenga? (Example: 10 AM to 1 PM)`;
      } else {
        followUpQuestion = `What time would you like to book ${vName}? (For example: 10:00 AM to 01:00 PM)`;
      }
    } else if (missingFields.includes('venue')) {
      if (lang === 'ta') {
        followUpQuestion = "எந்த அரங்கத்தை முன்பதிவு செய்ய விரும்புகிறீர்கள்? குன்னன் ஆடிட்டோரியம், ராமானுஜன் கான்பரன்ஸ் ஹால், RJB ஹால், அல்லது குன்னன் கான்பரன்ஸ் ஹால்?";
      } else if (lang === 'tanglish') {
        followUpQuestion = "Endha hall book panna virumbureenga? Cunnan Auditorium, Ramanujan Hall, RJB Hall, or Cunnan Conference Hall?";
      } else {
        followUpQuestion = "Which venue would you like to book? Cunnan Auditorium, Ramanujan Conference Hall, RJB Hall, or Cunnan Conference Hall?";
      }
    } else if (missingFields.includes('date')) {
      if (lang === 'ta') {
        followUpQuestion = "எந்த தேதியில் இந்த நிகழ்வை நடத்த விரும்புகிறீர்கள்?";
      } else if (lang === 'tanglish') {
        followUpQuestion = "Endha date-ku book panna poreenga?";
      } else {
        followUpQuestion = "On which date would you like to book the venue?";
      }
    } else if (missingFields.includes('programme')) {
      if (lang === 'ta') {
        followUpQuestion = "நிகழ்ச்சியின் பெயர் (Programme Name) என்ன?";
      } else if (lang === 'tanglish') {
        followUpQuestion = "Programme name enna?";
      } else {
        followUpQuestion = "What is the programme name?";
      }
    }
    voiceResponse = followUpQuestion;
  } else {
    // Check Weekend or Holiday restriction
    const dayCheck = isNonWorkingDay(date);
    if (dayCheck.isNonWorking) {
      if (lang === 'ta') {
        voiceResponse = `மன்னிக்கவும், ${date} ஒரு விடுமுறை நாள் (${dayCheck.reason}). இந்த நாளில் அரங்க முன்பதிவு செய்ய இயலாது.`;
      } else if (lang === 'tanglish') {
        voiceResponse = `Sorry, ${date} non-working day (${dayCheck.reason}). Indha date-la booking seiya mudiyadhu. Alternative working date select pannunga.`;
      } else {
        voiceResponse = `Booking is unavailable on ${date} as it is a non-working day (${dayCheck.reason}). Please select an alternative working day.`;
      }
      hasConflict = true;
    } else {
      // Check Availability in Database
      const free = isVenueFree(requestedVenue.id, date, startTime, endTime);

      if (!free) {
        hasConflict = true;
        // Fetch conflicting booking details
        const conflict = db.prepare(`
          SELECT b.*, p.programme_name, d.department_name
          FROM bookings b
          JOIN programmes p ON b.programme_id = p.id
          JOIN departments d ON b.department_id = d.id
          WHERE b.venue_id = ? AND b.date = ? AND b.status = 'confirmed'
        `).all(requestedVenue.id, date).find(b => timesOverlap(startTime, endTime, b.start_time, b.end_time));

        conflictingBooking = conflict || null;

        // Find alternatives
        alternatives = findAlternativeBookingOptions({
          venueId: requestedVenue.id,
          date,
          startTime,
          endTime
        });

        const topAlt = alternatives[0] || null;

        if (lang === 'ta') {
          if (topAlt) {
            voiceResponse = `${requestedVenue.venue_name} அரங்கம் ${date} அன்று ஏற்கனவே முன்பதிவு செய்யப்பட்டுள்ளது. ஆனால் ${topAlt.venue_name} (${topAlt.start_time} முதல் ${topAlt.end_time} வரை) காலியாக உள்ளது. நீங்கள் ${topAlt.venue_name} முன்பதிவு செய்ய விரும்புகிறீர்களா?`;
          } else {
            voiceResponse = `${requestedVenue.venue_name} அரங்கம் அந்த நேரத்தில் முன்பதிவு செய்யப்பட்டுள்ளது. தயவுசெய்து மாற்று தேதி அல்லது நேரத்தை தேர்வு செய்யவும்.`;
          }
        } else if (lang === 'tanglish') {
          if (topAlt) {
            voiceResponse = `${requestedVenue.venue_name} ${date} ${startTime} to ${endTime} slot-la already booked. Aana ${topAlt.venue_name} (${topAlt.start_time} to ${topAlt.end_time}) available-ah irukku. Ungalukku ${topAlt.venue_name} book panna viruppama?`;
          } else {
            voiceResponse = `${requestedVenue.venue_name} already booked. Vera time slot or date try pannunga.`;
          }
        } else {
          if (topAlt) {
            voiceResponse = `${requestedVenue.venue_name} is already booked on ${date} from ${startTime} to ${endTime}. However, ${topAlt.venue_name} is available from ${topAlt.start_time} to ${topAlt.end_time}. Would you like to book ${topAlt.venue_name}?`;
          } else {
            voiceResponse = `${requestedVenue.venue_name} is unavailable at your requested time. All four venues are occupied. Please select an alternative date or time.`;
          }
        }
      } else {
        // Slot is Available! Provide same-language confirmation prompt
        const progSuffixEn = programmeName && programmeName !== 'Academic Event' ? ` for ${programmeName}` : '';
        const progSuffixTa = programmeName && programmeName !== 'Academic Event' ? ` ${programmeName} நிகழ்விற்காக ` : ' ';
        const progSuffixTang = programmeName && programmeName !== 'Academic Event' ? ` ${programmeName}-ku ` : ' ';

        if (lang === 'ta') {
          voiceResponse = `சிறப்பு! ${requestedVenue.venue_name} அரங்கம் ${date} அன்று ${startTime} முதல் ${endTime} வரை${progSuffixTa}காலியாக உள்ளது. இந்த முன்பதிவை உறுதிப்படுத்த விரும்புகிறீர்களா?`;
        } else if (lang === 'tanglish') {
          voiceResponse = `Super! ${requestedVenue.venue_name} ${date} ${startTime} lendhu ${endTime} varaikum${progSuffixTang}available-ah irukku. Booking confirm pannattuma?`;
        } else {
          voiceResponse = `Great news! ${requestedVenue.venue_name} is fully available on ${date} from ${startTime} to ${endTime}${progSuffixEn}. Shall I confirm this booking?`;
        }
      }
    }
  }

  return {
    rawSpeech: text,
    detectedLanguage: lang,
    isAffirmative,
    isComplete: missingFields.length === 0 && !hasConflict,
    missingFields,
    followUpQuestion,
    extracted: {
      date,
      startTime,
      endTime,
      requestedVenue: requestedVenue ? { id: requestedVenue.id, name: requestedVenue.venue_name, capacity: requestedVenue.capacity } : null,
      department: department ? { id: department.id, name: department.department_name, code: department.department_code } : null,
      programmeName,
      programmeType,
      programmeSpecified,
      expectedParticipants,
      hasConflict,
      conflictingBooking: conflictingBooking ? {
        programme_name: conflictingBooking.programme_name,
        department_name: conflictingBooking.department_name,
        start_time: conflictingBooking.start_time,
        end_time: conflictingBooking.end_time
      } : null
    },
    alternatives,
    voiceResponse
  };
}

module.exports = {
  detectLanguage,
  parseVoiceBookingRequest
};
