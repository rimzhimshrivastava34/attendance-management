export function calculateAttendance({ biometricParsed, timesheetParsed, thresholds }) {
  const { workingThreshold, partialThreshold, absentThreshold } = thresholds;
  const attendanceData = [];
  const missedPunchData = {};
  const errors = [];

  // Normalize date formats to YYYY-MM-DD
  const normalizeDate = (dateStr, empCode) => {
    let parsedDate;
    if (dateStr.match(/^\w+\s+\d{1,2}-\w{3}-\d{2}$/) || dateStr.match(/^\d{1,2}-\w{3}-\d{2}$/)) {
      const [_, day, month, year] = dateStr.match(/(\d{1,2})-(\w{3})-(\d{2})/);
      const monthMap = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      parsedDate = new Date(`20${year}-${monthMap[month]}-${day.padStart(2, '0')}`);
    } else if (dateStr.match(/^\d{1,2}-\w{3}$/)) {
      const [day, month] = dateStr.split('-');
      const monthMap = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      parsedDate = new Date(`2025-${monthMap[month]}-${day.padStart(2, '0')}`);
    } else if (dateStr.match(/^\d{2}[\/-]\d{2}[\/-]\d{4}$/)) {
      const [day, month, year] = dateStr.split(/[\/-]/).map(Number);
      parsedDate = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      parsedDate = new Date(dateStr);
    } else {
      parsedDate = new Date(dateStr);
    }
    if (isNaN(parsedDate)) {
      return null;
    }
    return parsedDate.toISOString().split('T')[0];
  };

  // Validate and group biometric data by employee code
  const biometricByEmployee = {};
  biometricParsed.forEach((entry) => {
    const empCode = entry.empCode;
    const empName = entry.empName;
    if (!empCode) {
      errors.push("Missing employee code in biometric data entry");
      return;
    }
    if (!empName) {
      errors.push(`Missing employee name for empCode ${empCode} in biometric data`);
    }
    if (!biometricByEmployee[empCode]) {
      biometricByEmployee[empCode] = [];
    }
    entry.punches.forEach((punch) => {
      const normalizedDate = normalizeDate(punch.date, empCode);
      if (normalizedDate) {
        biometricByEmployee[empCode].push({ ...punch, date: normalizedDate });
      }
    });
  });

  // Validate and create timesheet lookup by empCode and date
  const timesheetLookup = {};
  timesheetParsed.forEach((entry) => {
    const empCode = entry.empCode;
    const empName = entry.empName;
    if (!empCode) {
      errors.push("Missing employee code in timesheet data entry");
      return;
    }
    if (!empName) {
      errors.push(`Missing employee name for empCode ${empCode} in timesheet data`);
    }
    entry.attendance.forEach((att) => {
      const normalizedDate = normalizeDate(att.date, empCode);
      if (normalizedDate) {
        const key = `${empCode}-${normalizedDate}`;
        timesheetLookup[key] = { ...att, date: normalizedDate };
      }
    });
  });

  // Collect all unique dates
  const allDatesSet = new Set();
  biometricParsed.forEach((entry) => {
    if (!entry.empCode) return;
    entry.punches.forEach((p) => {
      const normalizedDate = normalizeDate(p.date, entry.empCode);
      if (normalizedDate) allDatesSet.add(normalizedDate);
    });
  });
  timesheetParsed.forEach((entry) => {
    if (!entry.empCode) return;
    entry.attendance.forEach((a) => {
      const normalizedDate = normalizeDate(a.date, entry.empCode);
      if (normalizedDate) allDatesSet.add(normalizedDate);
    });
  });
  const allDates = Array.from(allDatesSet).sort();
  if (allDates.length === 0) {
    errors.push("No valid dates found in biometric or timesheet data. Using current date as fallback.");
    allDates.push(new Date().toISOString().split('T')[0]);
  }

  // Collect all unique employee codes
  const empCodes = new Set();
  biometricParsed.forEach((b) => {
    if (b.empCode) empCodes.add(b.empCode);
  });
  timesheetParsed.forEach((t) => {
    if (t.empCode) empCodes.add(t.empCode);
  });

  const isWeekend = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    return day === 6 || day === 0;
  };

  const parseTimesheetHours = (status) => {
    if (!status || status.trim() === "") {
      return 0;
    }
    const [hours, minutes] = status.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      errors.push(`Invalid timesheet status format: ${status}`);
      return 0;
    }
    return hours + minutes / 60;
  };

  empCodes.forEach((empCode) => {
    const biometricEntry = biometricParsed.find((entry) => entry.empCode === empCode);
    const timesheetEntry = timesheetParsed.find((entry) => entry.empCode === empCode);
    const employeeName = biometricEntry?.empName || timesheetEntry?.empName || "Unknown";
    if (!biometricEntry?.empName && !timesheetEntry?.empName) {
      errors.push(`No employee name found for empCode ${empCode} in either biometric or timesheet data`);
    }
    missedPunchData[empCode] = {
      missedPunches: 0,
      absentDays: 0,
      WorkingDays: 0,
      partialDays: 0,
      remoteDays: 0, // ADDED for summary
    };
    allDates.forEach((date) => {
      const employee = {
        employeeCode: empCode,
        employeeName,
        date,
        status: '',
        reason: '',
        hours: 0,
        isMissedPunch: false,
      };
      if (isWeekend(date)) {
        employee.status = 'Weekend';
        employee.reason = `Weekend: Date (${date}) is a Saturday or Sunday.`;
      } else {
        const punches = (biometricByEmployee[empCode] || [])
          .filter((entry) => entry.date === date)
          .sort((a, b) => new Date(`${date} ${a.time}`) - new Date(`${date} ${b.time}`));
        const punchCount = punches.length;
        const timesheetKey = `${empCode}-${date}`;
        const tsEntry = timesheetLookup[timesheetKey];
        if (punchCount >= 2) {
          const punchIn = punches[0].time;
          const punchOut = punches[punchCount - 1].time;
          const punchInTime = new Date(`${date} ${punchIn}`);
          const punchOutTime = new Date(`${date} ${punchOut}`);
          if (!isNaN(punchInTime) && !isNaN(punchOutTime) && punchOutTime > punchInTime) {
            const duration = (punchOutTime - punchInTime) / (1000 * 60 * 60);
            employee.hours = parseFloat(duration.toFixed(1));
            if (duration >= workingThreshold) {
              employee.status = 'Working Day';
              employee.reason = `Biometric duration (${duration.toFixed(1)} hrs) ≥ ${workingThreshold} hrs.`;
              missedPunchData[empCode].WorkingDays++;
            } else {
              // fallback to timesheet if duration < working threshold
              fallbackToTimesheet(
                tsEntry,
                employee,
                empCode,
                workingThreshold,
                partialThreshold,
                absentThreshold,
                missedPunchData,
                parseTimesheetHours,
                `Biometric duration (${duration.toFixed(1)} hrs) less than working threshold (${workingThreshold} hrs).`
              );
            }
          } else {
            fallbackToTimesheet(
              tsEntry,
              employee,
              empCode,
              workingThreshold,
              partialThreshold,
              absentThreshold,
              missedPunchData,
              parseTimesheetHours,
              `Invalid biometric punch times.`
            );
          }
        } else if (punchCount === 1) {
          employee.isMissedPunch = true;
          missedPunchData[empCode].missedPunches++;
          fallbackToTimesheet(
            tsEntry,
            employee,
            empCode,
            workingThreshold,
            partialThreshold,
            absentThreshold,
            missedPunchData,
            parseTimesheetHours,
            `Single biometric punch detected.`
          );
        } else {
          // KEY POINT: Here, fallback will set Remote Entry if timesheet hours are sufficient
          fallbackToTimesheet(
            tsEntry,
            employee,
            empCode,
            workingThreshold,
            partialThreshold,
            absentThreshold,
            missedPunchData,
            parseTimesheetHours,
            `No biometric data available.`
          );
        }
      }
      attendanceData.push(employee);
    });
  });

  return { attendanceData, summaryData: missedPunchData, errors };
}

// Updated fallbackToTimesheet with improved Remote Entry logic and count
function fallbackToTimesheet(
  entry,
  employee,
  empCode,
  workingThreshold,
  partialThreshold,
  absentThreshold,
  missedPunchData,
  parseTimesheetHours,
  punchMsg = ''
) {
  // Only consider Remote Entry when there's absolutely no biometric data for the day
  const hasNoBiometricData = punchMsg.includes('No biometric data available');
  
  if (entry && entry.status) {
    const hours = parseTimesheetHours(entry.status);
    employee.hours = parseFloat(hours.toFixed(1));
    
    // Handle Remote Entry case - only when no biometric data at all
    if (hasNoBiometricData) {
      if (hours >= workingThreshold) {
        employee.status = 'Remote Entry';
        employee.reason = `No biometric data - marked as full remote work day. Timesheet hours: ${employee.hours} hrs.`;
        missedPunchData[empCode].remoteDays = (missedPunchData[empCode].remoteDays || 0) + 1;
      } else if (hours >= partialThreshold) {
        employee.status = 'Remote Entry';
        employee.reason = `No biometric data - marked as partial remote work. Timesheet hours: ${employee.hours} hrs.`;
        missedPunchData[empCode].remoteDays = (missedPunchData[empCode].remoteDays || 0) + 1;
      } else {
        employee.status = 'Absent';
        employee.reason = `No biometric data and insufficient timesheet hours (${hours} hrs < ${partialThreshold} hrs).`;
        missedPunchData[empCode].absentDays++;
      }
    } else if (hours >= workingThreshold) {
      employee.status = 'Working Day';
      employee.reason = `Timesheet hours (${employee.hours}) ≥ ${workingThreshold} hrs. ${punchMsg}`;
      missedPunchData[empCode].WorkingDays++;
    } else if (hours >= partialThreshold && hours < workingThreshold) {
      employee.status = 'Partial';
      employee.reason = `Timesheet hours (${employee.hours}) between ${partialThreshold} and ${workingThreshold} hrs. ${punchMsg}`;
      missedPunchData[empCode].partialDays++;
    } else {
      employee.status = 'Absent';
      employee.reason = `Insufficient hours: ${employee.hours} hrs (< ${partialThreshold} hrs). ${punchMsg}`;
      missedPunchData[empCode].absentDays++;
    }
  } else {
    employee.status = 'Absent';
    employee.reason = `No timesheet data available. ${punchMsg}`;
    missedPunchData[empCode].absentDays++;
  }
}
