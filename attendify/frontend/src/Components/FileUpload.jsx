import React, { useState, useEffect } from "react";
import Papa from "papaparse";

const BIOMETRIC_HEADERS = [
  "S#",
  "Emp Code",
  "Emp Name",
  "Terminal Name",
  "Terminal Type",
  "Location",
  "Punch Date",
  "Punch Time",
  "Duration From Previous Punch",
  "Remarks",
  "Location Link",
  "Generation Time / Upload Time",
];

const FileUpload = ({ biometricFile, timesheetFile, thresholds, onUpload }) => {
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    if (biometricFile && timesheetFile) {
      handleParseFiles();
    }
  }, [biometricFile, timesheetFile]);

  const parseCSV = (file, options = {}) =>
    new Promise((resolve, reject) => {
      Papa.parse(file, {
        ...options,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (err) => {
          reject(err);
        },
      });
    });

  const parseBiometric = (data) => {
    const empMap = {};
    data.forEach((row) => {
      const empCode = row["Emp Code"];
      const empName = row["Emp Name"];
      const punchDate = row["Punch Date"];
      const punchTime = row["Punch Time"];
      if (!empCode || !punchDate || !punchTime) {
        return;
      }

      if (!empMap[empCode]) {
        empMap[empCode] = {
          empName,
          empCode,
          punches: [],
        };
      }

      empMap[empCode].punches.push({
        date: punchDate,
        time: punchTime,
      });
    });
    return Object.values(empMap);
  };

  const parseTimesheet = (data) => {
    return data.map((row) => {
      const empCode = row["employee_code"];
      const empName = row["employee_name"];
      const attendance = Object.entries(row)
        .filter(([key]) => !["employee_code", "employee_name"].includes(key))
        .map(([date, status]) => ({
          date,
          status: status?.trim() || "",
        }));
      return {
        empCode,
        empName,
        attendance,
      };
    });
  };

  const handleParseFiles = async () => {
    setParsing(true);
    try {
      const [biometricData, timesheetData] = await Promise.all([
        parseCSV(biometricFile, {
          header: true,
          beforeFirstChunk: (chunk) => {
            const lines = chunk.split(/\r\n|\n/).slice(4);
            lines.unshift(BIOMETRIC_HEADERS.join(","));
            return lines.join("\n");
          },
        }),
        parseCSV(timesheetFile, { header: true }),
      ]);

      const biometricParsed = parseBiometric(biometricData);
      const timesheetParsed = parseTimesheet(timesheetData);

      onUpload({ biometricData: biometricParsed, timesheetData: timesheetParsed });
    } catch (err) {
      onUpload({ biometricData: [], timesheetData: [] });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="mb-6 bg-[#F9FAFB] p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-[#000000] mb-4">Files Uploaded</h2>
      <div className="text-sm">
        {parsing ? (
          <div className="text-yellow-400">
            Processing files, please wait...
          </div>
        ) : (
          <div>
            <div className="mb-2">
              <span className="font-medium text-[#4B5563]">Biometric File: </span>
              {biometricFile ? (
                <span className="text-blue-400">{biometricFile.name} (Uploaded)</span>
              ) : (
                <span className="text-[#4B5563]">Not uploaded</span>
              )}
            </div>
            <div className="mb-2">
              <span className="font-medium text-[#4B5563]">Timesheet File: </span>
              {timesheetFile ? (
                <span className="text-blue-400">{timesheetFile.name} (Uploaded)</span>
              ) : (
                <span className="text-[#4B5563]">Not uploaded</span>
              )}
            </div>
            {biometricFile && timesheetFile && !parsing ? (
              <div className="text-green-400 mt-2">
                Both files parsed successfully. Data sent for processing.
              </div>
            ) : (
              !biometricFile || !timesheetFile ? (
                <div className="text-[#4B5563] mt-2">
                  Please upload both biometric and timesheet files to proceed.
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
