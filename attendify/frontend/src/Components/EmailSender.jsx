import React, { useState } from "react";

const EmailSender = ({ attendanceData, currentMonth, selectedWeek, selectedEmployee, isModalOpen, setIsModalOpen }) => {
  const employeeMap = {
    "14": { name: "Pavan Shinde", defaultEmail: "bhoomirai1511@gmail.com" },
    "478": { name: "Amitesh Sharma", defaultEmail: "meet16rathore@gmail.com" },
    "530": { name: "Vaishnav Pilliai", defaultEmail: "rimzhimshrivastava2@gmail.com" },
  };

  const [isSending, setIsSending] = useState(false);

  const calculateWeeklyData = (employeeCode, weekStart, weekEnd) => {
    console.log(`Calculating stats for employee ${employeeCode}, week ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
  //  console.log("Full attendanceData:", JSON.stringify(attendanceData, null, 2));

    const filteredData = attendanceData.filter((entry) => {
      const entryDate = new Date(entry.date);
      return String(entry.employeeCode) === String(employeeCode) && entryDate >= weekStart && entryDate <= weekEnd;
    });

    const missedPunches = filteredData.filter(
      (entry) => entry.reason?.toLowerCase() === "missed punch" || entry.isMissedPunch
    ).map((entry) => entry.date);

    const totalHours = filteredData.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
    const fullDays = filteredData.filter((entry) => entry.status === "Working Day").length;
    const absentDays = filteredData.filter((entry) => entry.status === "Absent").length;

    const result = {
      fullDays,
      absentDays,
      missedPunches: missedPunches.length,
      missedPunchDates: missedPunches,
      totalHours: totalHours.toFixed(2),
      appreciation: totalHours > 40 ? "Thank you for your dedication!" : "",
    };

    console.log(`Calculated stats for ${employeeCode}:`, result);
    return result;
  };

  const handleSendEmail = async () => {
    if (!selectedWeek) {
      alert("Please select a week.");
      return;
    }
    if (!selectedEmployee) {
      alert("Please select an employee.");
      return;
    }

    const weekStart = new Date(selectedWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const { name, defaultEmail } = employeeMap[selectedEmployee];
    const email = prompt(`Enter email for ${name} (Code: ${selectedEmployee})`, defaultEmail);
    if (!email) {
      console.log(`Email prompt cancelled for ${name}`);
      alert("Email sending cancelled.");
      return;
    }

    setIsSending(true);
    console.log(`Sending individual email to ${name} at ${email}`);

    const weeklyData = calculateWeeklyData(selectedEmployee, weekStart, weekEnd);

    const emailData = {
      email,
      employeeName: name,
      month: currentMonth.toLocaleString("default", { month: "long", year: "numeric" }),
      stats: {
        fullDays: weeklyData.fullDays,
        absentDays: weeklyData.absentDays,
        missedPunches: weeklyData.missedPunches,
        missedPunchDates: weeklyData.missedPunchDates,
        totalHours: weeklyData.totalHours,
        appreciation: weeklyData.appreciation,
      },
    };

    console.log("Email data:", emailData);

    try {
      const response = await fetch("http://localhost:8000/api/send-stats-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) throw new Error(`Failed to send email to ${email}`);
      console.log(`Email sent to ${name}`);
      alert("Email sent successfully.");
    } catch (error) {
      console.error(`Error sending email to ${email}:`, error);
      alert(`Failed to send email to ${name}.`);
    } finally {
      setIsSending(false);
      setIsModalOpen(false);
    }
  };

  const weekStart = selectedWeek ? new Date(selectedWeek) : null;
  const weekEnd = weekStart ? new Date(weekStart) : null;
  if (weekEnd) weekEnd.setDate(weekStart.getDate() + 6);

  return (
    <>
      {isModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Send Weekly Stats Email</h2>
            <p className="text-gray-600 mb-4">
              Send attendance stats for {employeeMap[selectedEmployee].name} (Code: {selectedEmployee}) for{" "}
              {weekStart && weekEnd ? (
                <>
                  {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                  {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </>
              ) : (
                "selected week"
              )}.
              <br />
              You will be prompted to confirm the email address.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSending}
                className={`px-4 py-2 text-white rounded ${
                  isSending ? "bg-gray-400 cursor-not-allowed" : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                }`}
              >
                {isSending ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmailSender;