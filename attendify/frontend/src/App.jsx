import React, { useState, useEffect } from "react";
import Sidebar from "./Components/Dashboard";
import MainDashboard from "./Components/MainDashboard";
import AttendanceSummary from "./Components/AttendanceSummary";
import EmployeeCalendar from "./Components/EmployeeCalendar";
import FullDays from "./Components/FullDays";
import MissedPunches from "./Components/MissedPunches";
import AbsenteeReport from "./Components/AbsenteeReport";
import TriggerMailDetailed from "./Components/TriggerMailDetailed";
import { calculateAttendance } from "./utils/calculateattendance";

function App() {
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [timesheetData, setTimesheetData] = useState([]);
  const [biometricData, setBiometricData] = useState([]);
  const [thresholds, setThresholds] = useState(null);
  const [errors, setErrors] = useState([]);
  const [view, setView] = useState("dashboard");

  const computeAttendance = (biometric, timesheet, thresholdsToUse) => {
    if (biometric.length && timesheet.length && thresholdsToUse) {
      try {
        const result = calculateAttendance({
          biometricParsed: biometric,
          timesheetParsed: timesheet,
          thresholds: thresholdsToUse,
        });
        setAttendanceResult(result);
        if (result.errors && result.errors.length) {
          setErrors(result.errors);
        } else {
          setErrors([]);
        }
      } catch (err) {
        setErrors(["Failed to calculate attendance. Please check the console for details."]);
      }
    }
  };

  const handleFileUpload = ({ biometricData, timesheetData, thresholds }) => {
    setErrors([]);
    setAttendanceResult(null);
    setTimesheetData(timesheetData);
    setBiometricData(biometricData);
    setThresholds(thresholds);

    computeAttendance(biometricData, timesheetData, thresholds);
  };

  useEffect(() => {
    if (biometricData.length && timesheetData.length && thresholds) {
      computeAttendance(biometricData, timesheetData, thresholds);
    }
  }, [thresholds, biometricData, timesheetData]);

  const handleViewChange = (newView) => {
    setView(newView);
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9]">
      <Sidebar onViewChange={handleViewChange} currentView={view} />
      <div className="flex-1 p-6">
        {view === "dashboard" ? (
          <>
            <MainDashboard onFileUpload={handleFileUpload} />
            {errors.length > 0 && (
              <div className="fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
                {errors.map((error, index) => (
                  <p key={index} className="mb-2">{error}</p>
                ))}
                <button
                  onClick={() => setErrors([])}
                  className="mt-2 text-sm underline"
                >
                  Close
                </button>
              </div>
            )}
            {attendanceResult && attendanceResult.attendanceData.length > 0 ? (
              <AttendanceSummary attendanceData={attendanceResult.attendanceData} />
            ) : (
              <div className="text-gray-400 mt-4">
                No attendance data to display. Please upload valid biometric and timesheet files.
              </div>
            )}
          </>
        ) : view === "calendar" ? (
          attendanceResult && attendanceResult.attendanceData.length > 0 ? (
            <EmployeeCalendar attendanceData={attendanceResult.attendanceData} />
          ) : (
            <div className="text-gray-400 mt-4">
              No attendance data available for the calendar report. Please upload valid biometric and timesheet files.
            </div>
          )
        ) : view === "fullDays" ? (
          attendanceResult && attendanceResult.attendanceData.length > 0 ? (
            <FullDays attendanceData={attendanceResult.attendanceData} />
          ) : (
            <div className="text-gray-400 mt-4">
              No full days data available. Please upload valid biometric and timesheet files.
            </div>
          )
        ) : view === "missedPunches" ? (
          attendanceResult && attendanceResult.attendanceData.length > 0 ? (
            <MissedPunches attendanceData={attendanceResult.attendanceData} />
          ) : (
            <div className="text-gray-400 mt-4">
              No missed punches data available. Please upload valid biometric and timesheet files.
            </div>
          )
        ) : view === "absenteeReport" ? (
          attendanceResult && attendanceResult.attendanceData.length > 0 ? (
            <AbsenteeReport attendanceData={attendanceResult.attendanceData} />
          ) : (
            <div className="text-gray-400 mt-4">
              No absentee data available. Please upload valid biometric and timesheet files.
            </div>
          )
        ) : view === "missingData" ? (
          biometricData.length > 0 || timesheetData.length > 0 ? (
            <MissingDataReport biometricData={biometricData} timesheetData={timesheetData} />
          ) : (
            <div className="text-gray-400 mt-4">
              No data available for the missing data report. Please upload valid biometric and timesheet files.
            </div>
          )
        ) : view === "excludeEmployees" ? (
          <div className="text-gray-400 mt-4">
            Exclude Employees feature is not yet implemented.
          </div>
        ) : view === "triggerMail" ? (
          attendanceResult && attendanceResult.attendanceData.length > 0 ? (
            <TriggerMailDetailed attendanceData={attendanceResult.attendanceData} />
          ) : (
            <div className="text-gray-400 mt-4">
              No attendance data available for sending emails. Please upload valid biometric and timesheet files.
            </div>
          )
        ) : (
          <div className="text-gray-400 mt-4">
            Invalid view selected.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
