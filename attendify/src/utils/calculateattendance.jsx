export function calculateAttendance({ biometricParsed, timesheetParsed, thresholds }) {
  const { workingThreshold, partialThreshold, absentThreshold } = thresholds;
  const attendanceData = [];
  const missedPunchData = {};
  const errors = [];

  console.log("attendance data", attendanceData);

  // Normalize date formats to YYYY-MM-DD
  const normalizeDate = (dateStr, empCode) => {
    let parsedDate;
    // Format: "Mon 02-Jan-25" or "02-Jan-25"
    if (dateStr.match(/^\w+\s+\d{1,2}-\w{3}-\d{2}$/) || dateStr.match(/^\d{1,2}-\w{3}-\d{2}$/)) {
      const [_, day, month, year] = dateStr.match(/(\d{1,2})-(\w{3})-(\d{2})/);
      const monthMap = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      parsedDate = new Date(`20${year}-${monthMap[month]}-${day.padStart(2, '0')}`);
    }
    // Format: "02-Jan"
    else if (dateStr.match(/^\d{1,2}-\w{3}$/)) {
      const [day, month] = dateStr.split('-');
      const monthMap = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      parsedDate = new Date(`2025-${monthMap[month]}-${day.padStart(2, '0')}`);
    }
    // Format: "DD/MM/YYYY" or "DD-MM-YYYY"
    else if (dateStr.match(/^\d{2}[\/-]\d{2}[\/-]\d{4}$/)) {
      const [day, month, year] = dateStr.split(/[\/-]/).map(Number);
      parsedDate = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
    }
    // Format: "YYYY-MM-DD" (already in desired format)
    else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      parsedDate = new Date(dateStr);
    }
    // Fallback: Try parsing with Date directly
    else {
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
    allDates.push(new Date().toISOString().split('T')[0]); // Fallback to today: "2025-05-31"
  }

  // Collect all unique employee codes
  const empCodes = new Set();
  biometricParsed.forEach((b) => {
    if (b.empCode) empCodes.add(b.empCode);
  });
  timesheetParsed.forEach((t) => {
    if (t.empCode) empCodes.add(t.empCode);
  });

  // Check for employees with no data
  empCodes.forEach((empCode) => {
    const hasBiometric = biometricByEmployee[empCode]?.length > 0;
    const hasTimesheet = Object.keys(timesheetLookup).some((key) => key.startsWith(`${empCode}-`));
    if (!hasBiometric && !hasTimesheet) {
      // No action needed
    }
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
          // Calculate duration from biometric punches
          const punchIn = punches[0].time;
          const punchOut = punches[punchCount - 1].time;
          const punchInTime = new Date(`${date} ${punchIn}`);
          const punchOutTime = new Date(`${date} ${punchOut}`);

          if (!isNaN(punchInTime) && !isNaN(punchOutTime) && punchOutTime > punchInTime) {
            const duration = (punchOutTime - punchInTime) / (1000 * 60 * 60);
            employee.hours = parseFloat(duration.toFixed(1));

            if (duration >= workingThreshold) {
              // Biometric duration meets the threshold
              employee.status = 'Working Day';
              employee.reason = `Biometric duration (${duration.toFixed(1)} hrs) ≥ ${workingThreshold} hrs.`;
              missedPunchData[empCode].WorkingDays++;
            } else {
              // Biometric duration is less than workingThreshold, fall back to timesheet
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
          // Single punch: Fall back to timesheet
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
          // No biometric data: Fall back to timesheet
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
  if (entry && entry.status) {
    // Timesheet data is available, calculate hours
    const hours = parseTimesheetHours(entry.status);
    employee.hours = parseFloat(hours.toFixed(1));
    if (hours >= partialThreshold) {
      employee.status = 'Working Day';
      employee.reason = `Timesheet hours (${employee.hours}) ≥ ${partialThreshold}. ${punchMsg}`;
      missedPunchData[empCode].WorkingDays++;
    } else if (hours > absentThreshold && hours < partialThreshold) {
      employee.status = 'Partial';
      employee.reason = `Timesheet hours (${employee.hours}) between ${absentThreshold} and ${partialThreshold}. ${punchMsg}`;
      missedPunchData[empCode].partialDays++;
    } else {
      employee.status = 'Absent';
      employee.reason = `Timesheet hours (${employee.hours}) ≤ ${absentThreshold}. ${punchMsg}`;
      missedPunchData[empCode].absentDays++;
    }
  } else {
    // No timesheet data either
    employee.status = 'Absent';
    employee.reason = `No timesheet data available. ${punchMsg}`;
    missedPunchData[empCode].absentDays++;
  }
}