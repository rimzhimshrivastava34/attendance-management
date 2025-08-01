import React, { useState } from "react";

const FullDays = ({ attendanceData }) => {
  // State for search query
  const [searchQuery, setSearchQuery] = useState("");

  // Aggregate working days by employee
  const employeeFullDays = attendanceData.reduce((acc, entry) => {
    const { employeeCode, employeeName, status } = entry;
    if (!acc[employeeCode]) {
      acc[employeeCode] = {
        employeeCode,
        employeeName: employeeName || "Unknown",
        fullDays: 0,
      };
    }
    if (status === "Working Day") {
      acc[employeeCode].fullDays += 1;
    }
    return acc;
  }, {});

  // Convert to array for rendering
  const fullDaysList = Object.values(employeeFullDays);

  // Filter the list based on search query (case-insensitive)
  const filteredList = fullDaysList.filter((employee) =>
    employee.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handler to clear the search query
  const handleClearFilter = () => {
    setSearchQuery("");
  };

  return (
    <div className="bg-[#FFFFFF] p-6 rounded-lg border border-gray-300 shadow-md">
      <h3 className="text-[#000000] font-semibold text-lg mb-4">Full Days Report</h3>

      {/* Filter Input and Clear Button */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Filter by employee name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm text-[#4B5563]"
        />
        {searchQuery && (
          <button
            onClick={handleClearFilter}
            className="w-full sm:w-auto bg-[#E5E7EB] text-[#4B5563] px-4 py-2 rounded-md hover:bg-[#D1D5DB] text-sm font-semibold"
          >
            Clear Filter
          </button>
        )}
      </div>

      {fullDaysList.length === 0 ? (
        <div className="text-[#4B5563]">
          No full days data available. Please upload valid biometric and timesheet files.
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-[#4B5563]">
          No employees found matching your search.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-[#4B5563]">
            <thead className="text-xs uppercase bg-[#F9FAFB] text-[#4B5563]">
              <tr>
                <th className="px-4 py-2">Employee Code</th>
                <th className="px-4 py-2">Employee Name</th>
                <th className="px-4 py-2">Total Full Days</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((employee) => (
                <tr
                  key={employee.employeeCode}
                  className="border-b border-gray-300 hover:bg-[#F2F7FE]"
                >
                  <td className="px-4 py-2">{employee.employeeCode}</td>
                  <td className="px-4 py-2">{employee.employeeName}</td>
                  <td className="px-4 py-2">{employee.fullDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FullDays;