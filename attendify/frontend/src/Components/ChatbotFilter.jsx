import React, { useState, useEffect } from 'react';
import { isValid, parseISO } from 'date-fns';

import { generateAnalyticsChart } from "../utils/analyticsUtils";
import { AnalyticsChart } from './AnalyticsChart';

const ChatbotFilter = ({ attendanceData, actions }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState([]);

  // Helper: Validate attendance data
  const validateAttendanceData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        "date" in entry &&
        typeof entry.date === "string" &&
        isValid(parseISO(entry.date)) &&
        "employeeCode" in entry &&
        "employeeName" in entry &&
        "status" in entry
    )
      ? data
      : [];
  };

  // Helper: Find attendance for a name and date
  const findAttendance = (data, employeeName, date) => {
    const validData = validateAttendanceData(data);
    if (!isValid(parseISO(date))) return null;

    return validData.find(
      (entry) =>
        entry.employeeName.toLowerCase() === employeeName.trim().toLowerCase() &&
        entry.date === date
    )?.status || null;
  };

  // Core processor per intent
  const processAction = (action) => {
    const { intent, filters = {} } = action;
    const validData = validateAttendanceData(attendanceData);

    switch (intent) {
      case "attendance_status":
        if (filters.employee_name && filters.date) {
          const status = findAttendance(attendanceData, filters.employee_name, filters.date);
          return status
            ? `${filters.employee_name}'s attendance status on ${filters.date} was ${status}.`
            : `No attendance status found for ${filters.employee_name} on ${filters.date}.`;
        }
        return "Please provide both employee name and date to check attendance status.";

      case "list_employees":
        if (filters.status && filters.date && isValid(parseISO(filters.date))) {
          let filterStatus = filters.status.toLowerCase();
          if (filterStatus === "present") filterStatus = "working day";
          const matched = validData.filter(
            (entry) => entry.date === filters.date && entry.status.toLowerCase() === filterStatus
          );
          if (matched.length) {
            const uniqueEmployees = [...new Set(matched.map(e => e.employeeName))];
            return (
              <div>
                <p>Employees who were '{filterStatus}' on {filters.date}:</p>
                <ol className="list-decimal pl-5">
                  {uniqueEmployees.map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                </ol>
              </div>
            );
          }
          return `No employees found with status '${filterStatus}' on ${filters.date}.`;
        }
        return "Please specify a valid status and date to list employees.";

      case "employee_code":
        if (filters.employee_name) {
          const emp = validData.find(
            (e) => e.employeeName.toLowerCase() === filters.employee_name.toLowerCase()
          );
          return emp
            ? `The employee code for ${filters.employee_name} is: ${emp.employeeCode}`
            : `No employee found with the name ${filters.employee_name}.`;
        }
        return "Please provide an employee name to get their code.";

      case "why_status":
        if (filters.employee_name && filters.date) {
          const status = findAttendance(attendanceData, filters.employee_name, filters.date);
          if (!status) return `No attendance status found for ${filters.employee_name} on ${filters.date}.`;
          if (status.toLowerCase() === "absent")
            return `No specific reason for ${filters.employee_name}'s absence on ${filters.date} is available.`;
          return `${filters.employee_name} was not absent on ${filters.date}; their status was ${status}.`;
        }
        return "Please provide both employee name and date to check the reason.";

      case "list_partial_day":
        if (filters.date && isValid(parseISO(filters.date))) {
          const matched = validData.filter(
            (entry) => entry.date === filters.date && entry.status.toLowerCase() === "partial"
          );
          if (matched.length) {
            const employeeNames = [...new Set(matched.map(e => e.employeeName))];
            return (
              <div>
                <p>Employees with a partial day on {filters.date}:</p>
                <ul className="list-disc pl-5">
                  {employeeNames.map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                </ul>
              </div>
            );
          } else {
            return `No employees had a partial day on ${filters.date}.`;
          }
        }
        return "Please specify a valid date to list partial day employees.";

      case "working_hour":
        if (filters.employee_name && filters.date) {
          const employeeEntry = validData.find(
            (entry) =>
              entry.employeeName.toLowerCase() === filters.employee_name.toLowerCase() &&
              entry.date === filters.date
          );
          if (employeeEntry && typeof employeeEntry.hours !== 'undefined') {
            return `Working hours for ${filters.employee_name} on ${filters.date}: ${employeeEntry.hours} hours.`;
          } else {
            return `Working hours data not found for ${filters.employee_name} on ${filters.date}.`;
          }
        } else if (filters.employee_name) {
          const employeeEntries = validData.filter(
            (entry) => entry.employeeName.toLowerCase() === filters.employee_name.toLowerCase() && typeof entry.hours !== 'undefined'
          );
          if (employeeEntries.length > 0) {
            const hoursList = employeeEntries.map(entry => `${entry.date}: ${entry.hours} hours`).join("\n");
            return `Working hours for ${filters.employee_name}:\n${hoursList}`;
          } else {
            return `No working hours data found for ${filters.employee_name}.`;
          }
        } else if (filters.comparison && typeof filters.hours !== 'undefined' && filters.date) {
          let filteredEmployees = validData.filter(entry => entry.date === filters.date && typeof entry.hours === 'number');
          let comparisonText = '';

          switch (filters.comparison) {
            case "greater_than":
              filteredEmployees = filteredEmployees.filter(e => e.hours > filters.hours);
              comparisonText = `greater than ${filters.hours}`;
              break;
            case "less_than":
              filteredEmployees = filteredEmployees.filter(e => e.hours < filters.hours);
              comparisonText = `less than ${filters.hours}`;
              break;
            case "greater_than_or_equal_to":
              filteredEmployees = filteredEmployees.filter(e => e.hours >= filters.hours);
              comparisonText = `greater than or equal to ${filters.hours}`;
              break;
            case "less_than_or_equal_to":
              filteredEmployees = filteredEmployees.filter(e => e.hours <= filters.hours);
              comparisonText = `less than or equal to ${filters.hours}`;
              break;
            default:
              return "Invalid comparison operator for working hours.";
          }

          if (filteredEmployees.length > 0) {
            const employeeNames = [...new Set(filteredEmployees.map(e => e.employeeName))];
            return (
              <div>
                <p>Employees with working hours {comparisonText} on {filters.date}:</p>
                <ul className="list-disc pl-5">
                  {employeeNames.map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                </ul>
              </div>
            );
          } else {
            return `No employees found with working hours ${comparisonText} on ${filters.date}.`;
          }
        } else if (filters.comparison && typeof filters.hours !== 'undefined') {
          let filteredEmployees = [];
          let comparisonText = '';

          switch (filters.comparison) {
            case "greater_than":
              filteredEmployees = validData.filter(entry => typeof entry.hours === 'number' && entry.hours > filters.hours);
              comparisonText = `greater than ${filters.hours}`;
              break;
            case "less_than":
              filteredEmployees = validData.filter(entry => typeof entry.hours === 'number' && entry.hours < filters.hours);
              comparisonText = `less than ${filters.hours}`;
              break;
            case "greater_than_or_equal_to":
              filteredEmployees = validData.filter(entry => typeof entry.hours === 'number' && entry.hours >= filters.hours);
              comparisonText = `greater than or equal to ${filters.hours}`;
              break;
            case "less_than_or_equal_to":
              filteredEmployees = validData.filter(entry => typeof entry.hours === 'number' && entry.hours <= filters.hours);
              comparisonText = `less than or equal to ${filters.hours}`;
              break;
            default:
              return "Invalid comparison operator for working hours.";
          }

          if (filteredEmployees.length > 0) {
            const employeeNames = [...new Set(filteredEmployees.map(e => e.employeeName))];
            return (
              <div>
                <p>Employees with working hours {comparisonText}:</p>
                <ul className="list-disc pl-5">
                  {employeeNames.map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                </ul>
              </div>
            );
          } else {
            return `No employees found with working hours ${comparisonText}.`;
          }
        } else {
          return "Please specify an employee name or a date to check working hours, or a comparison and hours (optionally with a date) to filter employees.";
        }

      case "analytics":
        const chartResponse = generateAnalyticsChart(filters, validData);
        return (
          <div>
            <p className="font-medium">{chartResponse.title}</p>
            <AnalyticsChart chartType={chartResponse.chartType} data={chartResponse.data} />
          </div>
        );

      default:
        return "Unknown intent provided.";
    }
  };

  // Use useEffect to process actions when the 'actions' prop changes
  useEffect(() => {
    if (!Array.isArray(actions)) {
      setResponses([<div key="error" className="text-red-500">Error: Invalid actions format.</div>]);
      return;
    }

    if (actions.length > 0) {
      setIsLoading(true); // Set loading to true when actions start processing
      const processedResults = actions.map((action, index) => {
        if (!action.intent || !action.filters) {
          return <div key={index}>⚠️ Invalid action format.</div>;
        }
        return (
          <div key={index} className="p-2 rounded bg-gray-50 border-l border-[#0c3692]">
            <div>{processAction(action)}</div>
          </div>
        );
      });
      setResponses(processedResults);
      setIsLoading(false); // Set loading to false once all actions are processed
    } else {
      setResponses([]); // Clear responses if no actions
    }
  }, [actions, attendanceData]); // Depend on actions and attendanceData

  return (
    <div>
      {responses.length > 0 ? responses : <div>No actions to process.</div>}
      {isLoading && (
        <div className="p-3 rounded bg-blue-100 border-l border-blue-500 mt-2">
          Processing...
        </div>
      )}
    </div>
  );
};

export default ChatbotFilter;