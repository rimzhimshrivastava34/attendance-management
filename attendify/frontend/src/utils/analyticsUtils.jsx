export function generateAnalyticsChart(filters, data) {
  const { employee_name, status, date } = filters || {};

  const summary = {};
  let title = "Analytics Summary";

  if (employee_name && !date) {
    title = `Attendance Summary for ${employee_name}`;
    data.forEach(d => {
      if (d.employeeName.toLowerCase() === employee_name.toLowerCase()) {
        summary[d.status] = (summary[d.status] || 0) + 1;
        console.log(summary);
      }
    });
    return formatChartData(summary, title, 'bar');
  }

  if (status && !employee_name) {
    title = `Dates when status was ${status}`;
    const dateCounts = {};
    data.forEach(d => {
      if (d.status.toLowerCase() === status.toLowerCase()) {
        dateCounts[d.date] = (dateCounts[d.date] || 0) + 1;
      }
    });
    return formatChartData(dateCounts, title, 'bar');
  }

  if (date && !employee_name) {
    title = `Status distribution on ${date}`;
    data.forEach(d => {
      if (d.date === date) {
        summary[d.status] = (summary[d.status] || 0) + 1;
      }
    });
    return formatChartData(summary, title, 'pie');
  }


  title = `Overall Status Distribution`;
  data.forEach(d => {
    summary[d.status] = (summary[d.status] || 0) + 1;
  });
  return formatChartData(summary, title, 'pie');
}

function formatChartData(summary, title, chartType) {
  const formatted = Object.entries(summary).map(([label, value]) => ({ label, value }));
  return { chartType, title, data: formatted };
}



