import React, { useState, useEffect } from "react";
import { FaUserCircle, FaBell } from "react-icons/fa";
import { BiUpload } from "react-icons/bi";
import { BsCalendarDate } from "react-icons/bs";
import FileUpload from "./FileUpload";
import ThresholdSliderPanel from "./ThresholdSliderPanel";
import Chatbot from "./Chatbot";
import { calculateAttendance } from "../utils/calculateattendance";
import { generateAnalyticsChart } from "../utils/analyticsUtils";

const UploadCard = ({ title, description, Icon, onFileUpload }) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-gray-300 bg-[#FFFFFF] w-full shadow-md">
      <div className="bg-[#2563EB] rounded-full p-3 mb-4">
        <Icon className="text-white text-2xl" />
      </div>
      <h3 className="text-[#000000] font-semibold text-lg mb-2 text-center">{title}</h3>
      <p className="text-[#4B5563] text-sm text-center mb-4">{description}</p>
      <label className="bg-[#2563EB] text-white font-semibold px-4 py-2 rounded cursor-pointer">
        Upload File
        <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      </label>
    </div>
  );
};

const MainDashboard = ({ onFileUpload }) => {
  const [biometricFile, setBiometricFile] = useState(null);
  const [timesheetFile, setTimesheetFile] = useState(null);
  const [biometricData, setBiometricData] = useState([]);
  const [timesheetData, setTimesheetData] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatbotAttendanceData, setChatbotAttendanceData] = useState([]);
  const [error, setError] = useState(null);

  const [workingThreshold, setWorkingThreshold] = useState(8);
  const [partialThreshold, setPartialThreshold] = useState(4);
  const [absentThreshold, setAbsentThreshold] = useState(2);

  const handleParsedData = ({ biometricData: newBiometricData, timesheetData: newTimesheetData }) => {
    setBiometricData(newBiometricData);
    setTimesheetData(newTimesheetData);

    try {
      const { attendanceData, errors } = calculateAttendance({
        biometricParsed: newBiometricData,
        timesheetParsed: newTimesheetData,
        thresholds: {
          workingThreshold,
          partialThreshold,
          absentThreshold,
        },
      });

      if (errors.length > 0) {
        setError("Errors occurred while calculating attendance. Check the console for details.");
      }

      setChatbotAttendanceData(attendanceData);

      onFileUpload({
        biometricData: newBiometricData,
        timesheetData: newTimesheetData,
        thresholds: {
          workingThreshold,
          partialThreshold,
          absentThreshold,
        },
      });
    } catch (err) {
      setError("Failed to calculate attendance data.");
    }
  };

  useEffect(() => {
    if (biometricData.length && timesheetData.length) {
      try {
        const { attendanceData, errors } = calculateAttendance({
          biometricParsed: biometricData,
          timesheetParsed: timesheetData,
          thresholds: {
            workingThreshold,
            partialThreshold,
            absentThreshold,
          },
        });

        if (errors.length > 0) {
          setError("Errors occurred while recalculating attendance. Check the console for details.");
        }

        setChatbotAttendanceData(attendanceData);

        onFileUpload({
          biometricData,
          timesheetData,
          thresholds: {
            workingThreshold,
            partialThreshold,
            absentThreshold,
          },
        });
      } catch (err) {
        setError("Failed to recalculate attendance data.");
      }
    }
  }, []);

  return (
    <div className="flex-1 bg-[#FFFFFF] min-h-screen text-[#000000] px-8 py-6 relative">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Upload Sheets</h2>
        <div className="flex items-center gap-6">
          <FaBell className="text-[#000000] text-lg cursor-pointer" />
          <div className="flex items-center gap-2">
            <FaUserCircle className="text-[#000000] text-xl" />
            <span className="text-sm">Admin</span>
          </div>
        </div>
      </div>

      <ThresholdSliderPanel
        workingThreshold={workingThreshold}
        setWorkingThreshold={setWorkingThreshold}
        partialThreshold={partialThreshold}
        setPartialThreshold={setPartialThreshold}
        absentThreshold={absentThreshold}
        setAbsentThreshold={setAbsentThreshold}
      />

      <div className="flex items-center justify-between gap-6 my-8">
        <UploadCard
          title="Biometric Data"
          description="Upload employee biometric data in CSV format"
          Icon={BiUpload}
          onFileUpload={setBiometricFile}
        />
        <UploadCard
          title="Timesheet Data"
          description="Upload employee timesheet data in CSV format"
          Icon={BsCalendarDate}
          onFileUpload={setTimesheetFile}
        />
      </div>

      {biometricFile && timesheetFile && (
        <FileUpload
          biometricFile={biometricFile}
          timesheetFile={timesheetFile}
          thresholds={{
            workingThreshold,
            partialThreshold,
            absentThreshold,
          }}
          onUpload={handleParsedData}
        />
      )}

      {error && (
        <div className="text-red-500 text-sm mb-4">{error}</div>
      )}

      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-10 right-6 bg-[#082669] text-white rounded-full p-4 shadow-lg hover:bg-[#1D4ED8] z-40"
      >
        <svg className="w-6 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>

      {isChatOpen && (
        <Chatbot
          onClose={() => setIsChatOpen(false)}
          attendanceData={chatbotAttendanceData}
        />
      )}
    </div>
  );
};

export default MainDashboard;