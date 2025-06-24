import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export const AnalyticsChart = ({ chartType, data }) => {
  if (!data || data.length === 0) return <p>No data available</p>;

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        {chartType === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : (
          <BarChart data={data}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
