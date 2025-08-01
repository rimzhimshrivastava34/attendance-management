import React, { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { FaEnvelope } from "react-icons/fa";
import EmailSender from "./EmailSender";

const EmployeeCalendar = ({ attendanceData }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [months, setMonths] = useState([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const dropdownRef = useRef(null);
  const calendarRef = useRef(null);

  // Dynamically generate employee list from attendanceData
  useEffect(() => {
    if (attendanceData.length > 0) {
      const uniqueEmployees = [];
      const seenCodes = new Set();

      attendanceData.forEach((entry) => {
        if (!seenCodes.has(entry.employeeCode)) {
          seenCodes.add(entry.employeeCode);
          uniqueEmployees.push({
            employeeCode: entry.employeeCode,
            employeeName: entry.employeeName || `Employee ${entry.employeeCode}`,
            email: entry.email || "no-email@example.com", // Fallback email if not provided
          });
        }
      });

      setEmployees(uniqueEmployees);

      // Set default employee if none selected
      if (uniqueEmployees.length > 0 && !selectedEmployee) {
        const defaultEmployee = uniqueEmployees[0];
        setSelectedEmployee(defaultEmployee.employeeCode);
        setEmployeeSearch(`${defaultEmployee.employeeName} (Code: ${defaultEmployee.employeeCode})`);
      }
    } else {
      setEmployees([]);
      setSelectedEmployee(null);
      setEmployeeSearch("");
    }
  }, [attendanceData, selectedEmployee]);

  useEffect(() => {
    if (attendanceData.length > 0) {
      const dates = attendanceData.map((entry) => new Date(entry.date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      const monthList = [];
      let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      while (current <= maxDate) {
        monthList.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      setMonths(monthList);
      setCurrentMonthIndex(0);
      setCurrentMonth(monthList[0]);

      const weekList = [];
      let weekStart = new Date(minDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      while (weekStart <= maxDate) {
        weekList.push(new Date(weekStart));
        weekStart = new Date(weekStart);
        weekStart.setDate(weekStart.getDate() + 7);
      }
      setWeeks(weekList);

      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay());
      const closestWeek = weekList.reduce((closest, week) =>
        Math.abs(week - currentWeekStart) < Math.abs(closest - currentWeekStart) ? week : closest
      );
      setSelectedWeek(closestWeek);
    }
  }, [attendanceData]);

  useEffect(() => {
    if (calendarRef.current && currentMonth) {
      calendarRef.current.getApi().gotoDate(currentMonth);
      console.log("Calendar navigated to:", currentMonth.toISOString());
    }
  }, [currentMonth]);

  const filteredEmployees = employees.filter((emp) =>
    `${emp.employeeName} (Code: ${emp.employeeCode})`
      .toLowerCase()
      .includes(employeeSearch.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmployeeSelect = (emp) => {
    setSelectedEmployee(emp.employeeCode);
    setEmployeeSearch(`${emp.employeeName} (Code: ${emp.employeeCode})`);
    setIsDropdownOpen(false);
  };

  const handleWeekSelect = (week) => {
    setSelectedWeek(week);
    setIsDropdownOpen(false);
  };

  const events = attendanceData
    .filter((entry) => {
      if (!currentMonth || !selectedEmployee) return false;
      const entryDate = new Date(entry.date);
      return (
        entry.employeeCode === selectedEmployee &&
        entry.status !== "Working Day" &&
        entryDate.getFullYear() === currentMonth.getFullYear() &&
        entryDate.getMonth() === currentMonth.getMonth()
      );
    })
    .map((entry) => ({
      id: `${entry.employeeCode}-${entry.date}`,
      title: entry.status,
      date: entry.date,
      extendedProps: { status: entry.status, reason: entry.reason },
    }));

  const calculateStats = () => {
    if (!selectedEmployee || !currentMonth) return { absent: 0, missedPunches: 0, fullDays: 0 };

    const filteredData = attendanceData.filter((entry) => {
      const entryDate = new Date(entry.date);
      return (
        entry.employeeCode === selectedEmployee &&
        entryDate.getFullYear() === currentMonth.getFullYear() &&
        entryDate.getMonth() === currentMonth.getMonth()
      );
    });

    return {
      absent: filteredData.filter((entry) => entry.status === "Absent").length,
      missedPunches: filteredData.filter(
        (entry) => entry.reason?.toLowerCase() === "missed punch" || entry.isMissedPunch
      ).length,
      fullDays: filteredData.filter((entry) => entry.status === "Working Day").length,
    };
  };

  const stats = calculateStats();

  const triggerSendEmail = () => {
    setIsModalOpen(true);
    alert("Individual email modal triggered");
  };

  const renderEventContent = (eventInfo) => {
    const statusColors = {
      Partial: "bg-yellow-200",
      Absent: "bg-red-200",
      Missing: "bg-gray-300",
      Weekend: "bg-[#F2F7FE]",
    };

    return (
      <div
        className={`relative group p-1 rounded w-full h-full ${
          statusColors[eventInfo.event.extendedProps.status] || "bg-gray-300"
        }`}
      >
        <span className="text-xs text-[#000000] font-medium">{eventInfo.event.title}</span>
        <div className="absolute z-20 invisible group-hover:visible bg-[#F9FAFB] text-[#000000] text-xs rounded p-2 shadow-lg top-full left-1/2 transform -translate-x-1/2 mt-1 min-w-max">
          {eventInfo.event.extendedProps.reason}
        </div>
      </div>
    );
  };

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      const newIndex = currentMonthIndex - 1;
      setCurrentMonthIndex(newIndex);
      setCurrentMonth(months[newIndex]);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < months.length - 1) {
      const newIndex = currentMonthIndex + 1;
      setCurrentMonthIndex(newIndex);
      setCurrentMonth(months[newIndex]);
    }
  };

  const formatWeek = (weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const startStr = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${startStr} - ${endStr}`;
  };

  console.log("EmployeeCalendar rendering, isModalOpen:", isModalOpen);

  return (
    <div className="bg-[#FFFFFF] p-6 rounded-lg border-0 shadow-md">
      <h3 className="text-[#000000] font-semibold mb-4 text-lg">Employee Calendar View</h3>

      {employees.length === 0 || months.length === 0 || weeks.length === 0 ? (
        <div className="text-[#4B5563]">No attendance data available to display.</div>
      ) : (
        <>
          <EmailSender
            attendanceData={attendanceData}
            currentMonth={currentMonth}
            selectedWeek={selectedWeek}
            selectedEmployee={selectedEmployee}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
          />

          <div className="mb-4 flex justify-between items-center" ref={dropdownRef}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center">
                <label className="mr-2 text-[#000000]">Select Employee:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Type to search employee..."
                    className="w-64 rounded border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 focus:border-[#2563EB] focus:outline-none"
                  />
                  {isDropdownOpen && filteredEmployees.length > 0 && (
                    <ul className="absolute z-10 mt-1 max-h-48 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                      {filteredEmployees.map((emp) => (
                        <li
                          key={emp.employeeCode}
                          onClick={() => handleEmployeeSelect(emp)}
                          className="cursor-pointer px-3 py-2 text-gray-700 hover:bg-gray-100"
                        >
                          {emp.employeeName} (Code: {emp.employeeCode})
                        </li>
                      ))}
                    </ul>
                  )}
                  {isDropdownOpen && employeeSearch && filteredEmployees.length === 0 && (
                    <div className="absolute z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white p-2 text-gray-600 shadow-lg">
                      No employees found.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <label className="mr-2 text-[#000000]">Select Week:</label>
                <div className="relative">
                  <select
                    value={selectedWeek ? selectedWeek.toISOString() : ""}
                    onChange={(e) => handleWeekSelect(new Date(e.target.value))}
                    className="w-64 rounded border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 focus:border-[#2563EB] focus:outline-none"
                  >
                    {weeks.map((week) => (
                      <option key={week.toISOString()} value={week.toISOString()}>
                        {formatWeek(week)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center">
                  <span className="text-sm text-gray-700">Total Absent: {stats.absent}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-700">Total Missed Punches: {stats.missedPunches}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-700">Total Full Days: {stats.fullDays}</span>
                </div>
              </div>
              <button
                onClick={triggerSendEmail}
                className="flex items-center rounded px-4 py-2 text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
              >
                <FaEnvelope className="mr-2" />
                Send Email
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex items-center">
              <span className="mr-2 h-4 w-4 rounded-full bg-yellow-200"></span>
              <span className="text-sm text-yellow-700">Partial</span>
            </ div>
            <div className="flex items-center">
              <span className="mr-2 h-4 w-4 rounded-full bg-red-200"></span>
              <span className="text-sm text-red-800">Absent</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2 h-4 w-4 rounded-full bg-gray-300"></span>
              <span className="text-sm text-gray-700">Missing</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2 h-4 w-4 rounded-full bg-[#F2F7FE]"></span>
              <span className="text-sm text-gray-700">Weekend</span>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={handlePrevMonth}
              disabled={currentMonthIndex === 0}
              className={`rounded px-4 py-2 text-gray-700 ${
                currentMonthIndex === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "border border-gray-300 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              Previous
            </button>
            <span className="font-medium text-gray-700">
              {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
            </span>
            <button
              onClick={handleNextMonth}
              disabled={currentMonthIndex === months.length - 1}
              className={`rounded px-4 py-2 text-gray-700 ${
                currentMonthIndex === months.length - 1
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "border border-gray-300 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              Next
            </button>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-inner">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              initialDate={currentMonth}
              events={events}
              headerToolbar={false}
              height={500}
              eventContent={renderEventContent}
              dayHeaderClassNames="text-xs font-medium text-gray-600"
              dayCellClassNames="text-xs text-gray-900"
              eventClick={(info) => {
                console.log("Event clicked:", info.event);
              }}
              datesSet={(dateInfo) => {
                console.log("Attempted navigation blocked, using custom buttons.");
              }}
            />
          </div>

          <style jsx>{`
            .fc {
              background-color: #FFFFFF;
            }
            .fc-daygrid-day {
              background-color: #FFFFFF;
            }
            .fc-daygrid-day-frame {
              min-height: 80px !important;
            }
            .fc-daygrid-day-top {
              display: flex;
              justify-content: center;
            }
            .fc-daygrid-day-number {
              color: #374151;
            }
            .fc-daygrid-day.fc-day-today {
              background-color: #E5E7EB !important;
            }
            .fc-col-header-cell {
              background-color: #F9FAFB;
              color: #4B5563;
              padding: 8px !important;
            }
            .fc-daygrid-day:hover {
              background-color: #F3F4F6;
            }
            .fc-daygrid-day.fc-day-other {
              background-color: #F9FAFB;
              opacity: 0.5;
            }
          `}</style>
        </>
      )}
    </div>
  );
};

export default EmployeeCalendar;  