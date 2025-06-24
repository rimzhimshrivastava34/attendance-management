import React from "react";

const MissedPunches = ({ attendanceData }) => {
  // Aggregate missed punches by employee
  const employeeMissedPunches = attendanceData.reduce((acc, entry) => {
    const { employeeCode, employeeName, isMissedPunch } = entry;
    if (!acc[employeeCode]) {
      acc[employeeCode] = {
        employeeCode,
        employeeName: employeeName || "Unknown",
        missedPunches: 0,
      };
    }
    if (isMissedPunch) {
      acc[employeeCode].missedPunches += 1;
    }
    return acc;
  }, {});

  const missedPunchesList = Object.values(employeeMissedPunches);

  return (
    <div className="bg-[#FFFFFF] p-6 rounded-lg border border-gray-300 shadow-md">
      <h3 className="text-[#000000] font-semibold text-lg mb-4">Missed Punches Report</h3>
      {missedPunchesList.length === 0 ? (
        <div className="text-[#4B5563]">
          No missed punches data available. Please upload valid biometric and timesheet files.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-[#4B5563]">
            <thead className="text-xs uppercase bg-[#F9FAFB] text-[#4B5563]">
              <tr>
                <th className="px-4 py-2">Employee Code</th>
                <th className="px-4 py-2">Employee Name</th>
                <th className="px-4 py-2">Total Missed Punches</th>
              </tr>
            </thead>
            <tbody>
              {missedPunchesList.map((employee) => (
                <tr
                  key={employee.employeeCode}
                  className="border-b border-gray-300 hover:bg-[#F2F7FE]"
                >
                  <td className="px-4 py-2">{employee.employeeCode}</td>
                  <td className="px-4 py-2">{employee.employeeName}</td>
                  <td className="px-4 py-2">{employee.missedPunches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MissedPunches;