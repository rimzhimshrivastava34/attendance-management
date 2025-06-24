import React, { useState, useEffect } from "react";

const BulkEmailSenderDetailed = ({ attendanceData, currentMonth, isPanelOpen, setIsPanelOpen }) => {
  const [employeeMap, setEmployeeMap] = useState({});
  const [selectedEmployees, setSelectedEmployees] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  // Extract unique weeks from attendanceData and generate employeeMap
  useEffect(() => {
    if (!attendanceData || attendanceData.length === 0) return;

    // Extract unique weeks (Monday to Sunday)
    const weeks = new Set();
    attendanceData.forEach((entry) => {
      const entryDate = new Date(entry.date);
      // Find the Monday of the week
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

    // Set the most recent week as default
    if (sortedWeeks.length > 0) {
      const mostRecentWeek = sortedWeeks[sortedWeeks.length - 1];
      const start = new Date(mostRecentWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setSelectedWeek({ start, end });
    }

    // Generate employeeMap from attendanceData
    const uniqueEmployees = [...new Set(attendanceData.map(entry => String(entry.employeeCode)))];
    const newEmployeeMap = {};
    const newSelectedEmployees = {};

    uniqueEmployees.forEach((code) => {
      newEmployeeMap[code] = {
        name: `Employee ${code}`,
        email: `employee${code}@example.com`,
      };
      newSelectedEmployees[code] = true; // Select all by default
    });

    console.log("Generated employeeMap:", newEmployeeMap);
    console.log("Available weeks:", sortedWeeks);
    setEmployeeMap(newEmployeeMap);
    setSelectedEmployees(newSelectedEmployees);
  }, [attendanceData]);

  const calculateWeeklyData = (employeeCode, weekStart, weekEnd) => {
    console.log(`Calculating stats for employee ${employeeCode}, week ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
    console.log("Full attendanceData in BulkEmailSenderDetailed:", JSON.stringify(attendanceData, null, 2));

    const filteredData = attendanceData.filter((entry) => {
      const entryDate = new Date(entry.date);
      const isWithinRange = entryDate >= weekStart && entryDate <= weekEnd;
      const isEmployeeMatch = String(entry.employeeCode) === String(employeeCode);
      console.log(
        `Entry for ${entry.date}: employeeCode=${entry.employeeCode}, date=${entryDate}, hours=${entry.hours}, withinRange=${isWithinRange}, employeeMatch=${isEmployeeMatch}`
      );
      return isEmployeeMatch && isWithinRange;
    });

    console.log(`Filtered data for employee ${employeeCode}:`, JSON.stringify(filteredData, null, 2));

    const missedPunches = filteredData.filter(
      (entry) => entry.reason?.toLowerCase() === "missed punch" || entry.isMissedPunch
    ).map((entry) => ({
      date: new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reason: entry.reason || "Not specified",
    }));

    const absences = filteredData.filter((entry) => entry.status === "Absent").map((entry) => ({
      date: new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reason: entry.reason || "Not specified",
    }));

    const totalHours = filteredData.reduce((sum, entry) => {
      const hours = Number(entry.hours) || 0;
      console.log(`Adding hours for entry on ${entry.date}: hours=${hours}, running sum=${sum}`);
      return sum + hours;
    }, 0);

    const workingDays = filteredData.filter((entry) => entry.status === "Working Day").length;
    const absentDays = absences.length;

    // Daily status breakdown
    const dailyStatus = [];
    let currentDate = new Date(weekStart);
    while (currentDate <= weekEnd) {
      const entry = filteredData.find(
        (e) => new Date(e.date).toDateString() === currentDate.toDateString()
      );
      const dateStr = currentDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const status = entry
        ? `${entry.status}${entry.reason ? ` (${entry.reason})` : ""}`
        : currentDate.getDay() === 0 || currentDate.getDay() === 6
        ? "Weekend"
        : "No Record";
      dailyStatus.push(`${dateStr}: ${status}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const result = {
      workingDays,
      absentDays,
      missedPunches: missedPunches.length,
      missedPunchDetails: missedPunches,
      absenceDetails: absences,
      totalHours: totalHours.toFixed(2),
      dailyStatus,
    };

    console.log(`Calculated stats for ${employeeCode}:`, result);
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

    // Prepare bulk email data
    const bulkEmailData = {
      employees: selectedCodes.map((employeeCode) => {
        const { name, email } = employeeMap[employeeCode];
        console.log(`Preparing email for ${name} (${email})`);
        const weeklyData = calculateWeeklyData(employeeCode, weekStart, weekEnd);

        return {
          email,
          employeeName: name,
          month: currentMonth.toLocaleString("default", { month: "long", year: "numeric" }),
          stats: {
            workingDays: weeklyData.workingDays,
            absentDays: weeklyData.absentDays,
            missedPunches: weeklyData.missedPunches,
            missedPunchDetails: weeklyData.missedPunchDetails,
            absenceDetails: weeklyData.absenceDetails,
            totalHours: weeklyData.totalHours,
            dailyStatus: weeklyData.dailyStatus,
          },
        };
      }),
    };

    try {
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
      setIsPanelOpen(false);
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
    <div className="flex flex-col h-full">
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
      <div className="flex-1 overflow-y-auto mb-4">
        {Object.entries(employeeMap).map(([code, { name, email }]) => (
          <div key={code} className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={selectedEmployees[code] || false}
              onChange={() => handleCheckboxChange(code)}
              className="mr-2"
            />
            <span className="text-gray-700 text-sm">{name} (Code: {code}, {email})</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setIsPanelOpen(false)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSendEmails}
          disabled={isSending}
          className={`px-4 py-2 text-white rounded text-sm ${
            isSending ? "bg-gray-400 cursor-not-allowed" : "bg-[#2563EB] hover:bg-[#1D4ED8]"
          }`}
        >
          {isSending ? "Sending..." : "Send Bulk Emails"}
        </button>
      </div>
    </div>
  );
};

export default BulkEmailSenderDetailed;