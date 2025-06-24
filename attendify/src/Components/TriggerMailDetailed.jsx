import React, { useState, useEffect } from "react";

const TriggerMailDetailed = ({ attendanceData }) => {
  const [employeeMap, setEmployeeMap] = useState({});
  const [selectedEmployees, setSelectedEmployees] = useState({});
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const currentMonth = new Date();

  // Map employees and emails once
  useEffect(() => {
    if (!attendanceData || attendanceData.length === 0) {
      console.log("No attendance data provided");
      return;
    }

    console.log("attendanceData prop:", JSON.stringify(attendanceData, null, 2));
    const sampleEntry = attendanceData[0] || {};
    console.log("Keys in sample attendanceData entry:", Object.keys(sampleEntry));

    const uniqueEmployees = [...new Set(attendanceData.map(entry => String(entry.employeeCode)))];

    const newEmployeeMap = {};
    const newSelectedEmployees = {};
    uniqueEmployees.forEach((code) => {
      const entry = attendanceData.find(entry => String(entry.employeeCode) === code);
      const fullName = entry?.employeeName || `Employee ${code}`;
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "employee";
      const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      const email = surname
        ? `${firstName.toLowerCase()}.${surname.toLowerCase()}@47billion.com`
        : `${firstName.toLowerCase()}@47billion.com`;
      newEmployeeMap[code] = { name: fullName, email };
      newSelectedEmployees[code] = true;
    });

    console.log("Generated employeeMap:", JSON.stringify(newEmployeeMap, null, 2));
    setEmployeeMap(newEmployeeMap);
    setSelectedEmployees(newSelectedEmployees);

    const weeks = new Set();
    attendanceData.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const dayOfWeek = entryDate.getDay();
      const monday = new Date(entryDate);
      monday.setDate(entryDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      weeks.add(monday.toISOString());
    });

    const sortedWeeks = Array.from(weeks).sort((a, b) => new Date(a) - new Date(b));
    setAvailableWeeks(sortedWeeks.map((weekStart) => {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    }));

    if (sortedWeeks.length > 0) {
      const mostRecentWeek = sortedWeeks[sortedWeeks.length - 1];
      const start = new Date(mostRecentWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setSelectedWeek({ start, end });
    }

    console.log("Available weeks:", sortedWeeks);
  }, [attendanceData]);

  const calculateWeeklyData = (employeeCode, weekStart, weekEnd) => {
    console.log("Full attendanceData:", JSON.stringify(attendanceData, null, 2));

    const filteredData = attendanceData.filter((entry) => {
      const entryDate = new Date(entry.date);
      const isWithinRange = entryDate >= weekStart && entryDate <= weekEnd;
      const isEmployeeMatch = String(entry.employeeCode) === String(employeeCode);
      console.log(
        `Entry for ${entry.date}: employeeCode=${entry.employeeCode}, date=${entryDate}, reason=${entry.reason || entry.recordType || 'missing'}, status=${entry.status}, hours=${entry.hours}, withinRange=${isWithinRange}, employeeMatch=${isEmployeeMatch}`
      );
      return isEmployeeMatch && isWithinRange;
    });

    console.log(`Filtered data for employee ${employeeCode}:`, JSON.stringify(filteredData, null, 2));

    const workingStatuses = ["Working Day", "Present", "Half Day", "Work From Home", "Partial"];
    const totalHours = filteredData.reduce((sum, entry) => {
      if (workingStatuses.includes(entry.status)) {
        const hours = Number(entry.hours) || 0;
        return sum + hours;
      }
      return sum;
    }, 0);

    const missedPunches = filteredData.filter(
      (entry) => (entry.reason || entry.recordType)?.toLowerCase() === "missed punch" || entry.isMissedPunch
    ).map((entry) => ({
      date: new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reason: entry.reason || entry.recordType || "Not specified",
    }));

    const absences = filteredData.filter((entry) => entry.status === "Absent").map((entry) => ({
      date: new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reason: entry.reason || entry.recordType || "Not specified",
    }));

    const workingDays = filteredData.filter((entry) => workingStatuses.includes(entry.status)).length;
    const absentDays = absences.length;

    const dailyStatus = [];
    let currentDate = new Date(weekStart);
    while (currentDate <= weekEnd) {
      const entry = filteredData.find(
        (e) => new Date(e.date).toDateString() === currentDate.toDateString()
      );
      const dateStr = currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const status = entry
        ? entry.status === "Partial" ? "Partial" : entry.status
        : currentDate.getDay() === 0 || currentDate.getDay() === 6
        ? "Weekend"
        : "No Record";
      const reason = entry
        ? (entry.reason || entry.recordType || "Not specified")
        : "Not specified";
      const hours = entry && workingStatuses.includes(entry.status)
        ? parseFloat(Number(entry.hours || 0).toFixed(2))
        : 0;
      const isMissedPunch = entry ? (entry.reason || entry.recordType)?.toLowerCase() === "missed punch" || entry.isMissedPunch : false;
      console.log(`Daily status entry for ${dateStr}: status=${status}, reason=${reason}, hours=${hours}, isMissedPunch=${isMissedPunch}`);
      dailyStatus.push({ date: dateStr, status, reason, hours, isMissedPunch });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const appreciationMessage = totalHours > 40
      ? "Thank you for your exceptional dedication this week, exceeding 40 hours!"
      : totalHours >= 20 && totalHours <= 40
      ? "Keep up the good work and strive for good attendance!"
      : null;

    console.log(`Appreciation message for employee ${employeeCode}: ${appreciationMessage} (totalHours: ${totalHours})`);

    const result = {
      workingDays,
      absentDays,
      missedPunches: missedPunches.length,
      missedPunchDetails: missedPunches,
      absenceDetails: absences,
      totalHours: parseFloat(totalHours.toFixed(2)),
      dailyStatus,
      appreciationMessage,
    };

    console.log(`Calculated stats for ${employeeCode}:`, JSON.stringify(result, null, 2));
    return result;
  };

  const handleSendEmails = async () => {
    if (!selectedWeek) {
      alert("Please select a week.");
      return;
    }

    const { start: weekStart, end: weekEnd } = selectedWeek;

    const selectedCodes = Object.keys(selectedEmployees).filter((code) => selectedEmployees[code]);
    if (selectedCodes.length === 0) {
      alert("Please select at least one employee.");
      return;
    }

    if (!attendanceData || attendanceData.length === 0) {
      alert("No attendance data available.");
      return;
    }

    setIsSending(true);
    console.log("Sending detailed bulk emails");

    const bulkEmailData = {
      employees: selectedCodes.map((employeeCode) => {
        const { name, email } = employeeMap[employeeCode];
        console.log(`Preparing email for ${name} (${email})`);
        const weeklyData = calculateWeeklyData(employeeCode, weekStart, weekEnd);

        const employeeData = {
          email,
          employeeName: name,
          month: currentMonth.toLocaleString("default", { month: "long", year: "numeric" }),
          stats: {
            summary: {
              week: `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
              totalHours: weeklyData.totalHours,
              workingDays: weeklyData.workingDays,
              absentDays: weeklyData.absentDays,
              missedPunches: weeklyData.missedPunches,
            },
            details: {
              missedPunchDetails: weeklyData.missedPunchDetails,
              absenceDetails: weeklyData.absenceDetails,
              dailyStatus: weeklyData.dailyStatus,
            },
            appreciationMessage: weeklyData.appreciationMessage,
          },
        };

        console.log(`Employee data for ${name}:`, JSON.stringify(employeeData, null, 2));
        return employeeData;
      }),
    };

    try {
      console.log("Stats type check:", typeof bulkEmailData.employees[0].stats);
      console.log("Sending bulkEmailData:", JSON.stringify(bulkEmailData, null, 2));
      const response = await fetch("http://localhost:8000/api/send-detailed-stats-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bulkEmailData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Failed to send emails");

      console.log("Bulk email response:", result);
      alert(result.message);
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      alert(`Error sending emails: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckboxChange = (employeeCode) => {
    setSelectedEmployees((prev) => ({ ...prev, [employeeCode]: !prev[employeeCode] }));
  };

  const handleSelectAll = () => {
    const newSelectedEmployees = {};
    Object.keys(employeeMap).forEach((code) => {
      newSelectedEmployees[code] = true;
    });
    setSelectedEmployees(newSelectedEmployees);
  };

  const handleDeselectAll = () => {
    const newSelectedEmployees = {};
    Object.keys(employeeMap).forEach((code) => {
      newSelectedEmployees[code] = false;
    });
    setSelectedEmployees(newSelectedEmployees);
  };

  const handleWeekChange = (event) => {
    const weekIndex = event.target.value;
    setSelectedWeek(availableWeeks[weekIndex]);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Trigger Detailed Emails</h2>
      <p className="text-gray-600 mb-4">
        Send detailed weekly attendance reports to employees. Verify employee emails below.
      </p>
      <div className="mb-4">
        <label className="text-gray-600 text-sm mr-2">Select Week:</label>
        <select
          value={availableWeeks.findIndex(week => week.start === selectedWeek?.start)}
          onChange={handleWeekChange}
          className="border rounded p-1 text-sm"
        >
          {availableWeeks.map((week, index) => (
            <option key={index} value={index}>
              {week.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
              {week.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </option>
          ))}
        </select>
      </div>
      <p className="text-gray-600 mb-4 text-sm">
        Select employees for bulk email sending for{" "}
        {selectedWeek ? (
          <>
            {selectedWeek.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
            {selectedWeek.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </>
        ) : (
          "selected week"
        )}.
      </p>
      <div className="flex justify-between mb-4">
        <button onClick={handleSelectAll} className="text-blue-600 hover:underline text-sm">
          Select All
        </button>
        <button onClick={handleDeselectAll} className="text-blue-600 hover:underline text-sm">
          Deselect All
        </button>
      </div>
      <div className="mb-4">
        {Object.entries(employeeMap).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Select
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Name
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Employee Code
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(employeeMap).map(([code, { name, email }]) => (
                  <tr key={code} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedEmployees[code] || false}
                        onChange={() => handleCheckboxChange(code)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{name}</td>
                    <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{code}</td>
                    <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No employees found in attendance data.</p>
        )}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSendEmails}
          disabled={isSending || Object.keys(employeeMap).length === 0}
          className={`px-4 py-2 text-white rounded text-sm ${
            isSending || Object.keys(employeeMap).length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#2563EB] hover:bg-[#1D4ED8]"
          }`}
        >
          {isSending ? "Sending..." : "Send Bulk Emails"}
        </button>
      </div>
    </div>
  );
};

export default TriggerMailDetailed;