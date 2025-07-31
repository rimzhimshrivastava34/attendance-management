import React, { useState } from "react";
import { FaFilter } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const AttendanceSummary = ({ attendanceData }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [showFilter, setShowFilter] = useState(false);
  const [employeeNameFilter, setEmployeeNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredData = attendanceData.filter((entry) => {
    const matchesName = employeeNameFilter
      ? entry.employeeName.toLowerCase().includes(employeeNameFilter.toLowerCase())
      : true;
    const matchesDate = dateFilter ? entry.date === dateFilter : true;
    const matchesStatus = statusFilter
      ? entry.status.toLowerCase() === statusFilter.toLowerCase()
      : true;

    return matchesName && matchesDate && matchesStatus;
  });

  const totalEntries = filteredData.length;
  const totalPages = Math.ceil(totalEntries / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalEntries);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const applyFilters = () => {
    setCurrentPage(1);
    setShowFilter(false);
  };

  const clearFilters = () => {
    setEmployeeNameFilter("");
    setDateFilter("");
    setStatusFilter("");
    setCurrentPage(1);
    setShowFilter(false);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const halfRange = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(1, currentPage - halfRange);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  const exportToExcel = () => {
    const exportData = filteredData.map((entry) => ({
      "Employee Code": entry.employeeCode,
      "Employee Name": entry.employeeName,
      "Date": entry.date,
      "Working Hours": entry.hours,
      "Status": entry.status,
      "Reason": entry.reason,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `attendance_summary.xlsx`);
  };

  return (
    <div className="bg-[#FFFFFF] p-6 rounded-lg border border-gray-300 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[#000000] font-semibold text-lg">Attendance Summary</h3>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            Export to Excel
          </button>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 bg-[#2563EB] text-white px-3 py-1 rounded hover:bg-[#1DB954]"
          >
            <FaFilter />
            Filter
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="mb-4 p-4 bg-[#F9FAFB] rounded-lg border border-gray-300">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[#000000] text-sm block mb-1">Employee Name</label>
              <input
                type="text"
                value={employeeNameFilter}
                onChange={(e) => setEmployeeNameFilter(e.target.value)}
                placeholder="Enter employee name"
                className="w-full bg-[#FFFFFF] text-[#000000] px-3 py-1 rounded border border-gray-300 focus:outline-none focus:border-[#1DB954]"
              />
            </div>

            <div>
              <label className="text-[#000000] text-sm block mb-1">Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-[#FFFFFF] text-[#000000] px-3 py-1 rounded border border-gray-300 focus:outline-none focus:border-[#1DB954]"
              />
            </div>

            <div>
              <label className="text-[#000000] text-sm block mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#FFFFFF] text-[#000000] px-3 py-1 rounded border border-gray-300 focus:outline-none focus:border-[#1DB954]"
              >
                <option value="">All Statuses</option>
                <option value="Working Day">Working Day</option>
                <option value="Partial">Partial</option>
                <option value="Absent">Absent</option>
                <option value="Weekend">Weekend</option>
                <option value="Remote Entry">Remote Entry</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="bg-[#2563EB] text-white px-4 py-1 rounded hover:bg-[#1DB954]"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="bg-gray-300 text-[#000000] px-4 py-1 rounded hover:bg-gray-400"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-[#4B5563]">
          <thead className="text-xs uppercase bg-[#F9FAFB] text-[#4B5563]">
            <tr>
              <th className="px-4 py-2">Employee Code</th>
              <th className="px-4 py-2">Employee Name</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Working Hours</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-2 text-center text-[#4B5563]">
                  No data matches the applied filters.
                </td>
              </tr>
            ) : (
              paginatedData.map((entry, index) => (
                <tr key={index} className="border-b border-gray-300 hover:bg-[#F2F7FE]">
                  <td className="px-4 py-2">{entry.employeeCode}</td>
                  <td className="px-4 py-2">{entry.employeeName}</td>
                  <td className="px-4 py-2">{entry.date}</td>
                  <td className="px-4 py-2">{entry.hours}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium
                        ${entry.status.toLowerCase() === "working day" ? "bg-[#DCFCE7] text-[#166534]" : ""}
                        ${entry.status.toLowerCase() === "partial" ? "bg-[#FEF9C3] text-[#854D0E]" : ""}
                        ${entry.status.toLowerCase() === "absent" ? "bg-red-100 text-[#991B1B]" : ""}
                        ${entry.status.toLowerCase() === "weekend" ? "bg-blue-200 text-[#000000]" : ""}
                        ${entry.status.toLowerCase() === "remote entry" ? "bg-purple-200 text-[#4B0082]" : ""}
                      `}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{entry.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalEntries > 0 && (
        <div className="flex justify-between items-center mt-4 text-[#4B5563] text-sm">
          <div>
            Showing {startIndex + 1} to {endIndex} of {totalEntries} entries
            {filteredData.length < attendanceData.length && (
              <span> (filtered from {attendanceData.length} total entries)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? "bg-gray-300 text-[#4B5563] cursor-not-allowed"
                  : "bg-[#F9FAFB] text-[#000000] hover:bg-gray-200"
              }`}
            >
              Previous
            </button>
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded ${
                  currentPage === page
                    ? "bg-[#2563EB] text-white font-semibold"
                    : "bg-[#F9FAFB] text-[#000000] hover:bg-gray-200"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages
                  ? "bg-gray-300 text-[#4B5563] cursor-not-allowed"
                  : "bg-[#F9FAFB] text-[#000000] hover:bg-gray-200"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSummary;
