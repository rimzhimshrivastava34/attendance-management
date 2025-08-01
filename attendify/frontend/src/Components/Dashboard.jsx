import React from "react";
import {
  FaUpload,
  FaCalendarCheck,
  FaUserClock,
  FaUserSlash,
  FaUserTimes,
  FaEnvelopeOpenText,

} from "react-icons/fa";

const navItems = [
  { name: "Upload Sheets", icon: FaUpload, view: "dashboard" },
  { name: "Full Days", icon: FaCalendarCheck, view: "fullDays" },
  { name: "Missed Punches", icon: FaUserClock, view: "missedPunches" },
  { name: "Absentee Report", icon: FaUserSlash, view: "absenteeReport" },
 { name: "Trigger Mail", view: "triggerMail", icon: FaEnvelopeOpenText },
  { name: "Calendar Report", icon: FaCalendarCheck, view: "calendar" },
];

const Sidebar = ({ onViewChange, currentView }) => {
  return (
    <div className="w-64 min-h-screen bg-[#FFFFFF] text-[#000000] px-4 py-6">
      <h1 className="text-[#000000] text-lg font-semibold mb-6 px-2">HR Attendance</h1>

      <nav className="flex flex-col space-y-1 mt-12">
        {navItems.map(({ name, icon: Icon, view }) => (
          <div
            key={name}
            onClick={() => onViewChange(view)}
            className={`flex items-center gap-3 px-4 py-2 rounded-md cursor-pointer
              text-sm font-medium transition-colors duration-200
              ${
                currentView === view
                  ? "bg-[#2563EB] text-white"
                  : "text-[#000000] hover:bg-[#F2F7FE] hover:text-[#000000]"
              }`}
          >
            <Icon className="text-base" />
            <span>{name}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;