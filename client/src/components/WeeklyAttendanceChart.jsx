import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Standard days of the week template
const generateEmptyWeeklyMap = () => ({
  Mon: { day: "Mon", fullDay: "Monday", present: 0, late: 0, absent: 0, totalHours: 0, rate: 0 },
  Tue: { day: "Tue", fullDay: "Tuesday", present: 0, late: 0, absent: 0, totalHours: 0, rate: 0 },
  Wed: { day: "Wed", fullDay: "Wednesday", present: 0, late: 0, absent: 0, totalHours: 0, rate: 0 },
  Thu: { day: "Thu", fullDay: "Thursday", present: 0, late: 0, absent: 0, totalHours: 0, rate: 0 },
  Fri: { day: "Fri", fullDay: "Friday", present: 0, late: 0, absent: 0, totalHours: 0, rate: 0 },
  Sat: { day: "Sat", fullDay: "Saturday", present: 0, late: 0, absent: 0, totalHours: 0, rate: 0 },
});

// Custom Tooltip component for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload || {};
    const totalHeadcount = (data.present || 0) + (data.late || 0) + (data.absent || 0);
    const attendanceRate = totalHeadcount > 0 ? Math.round(((data.present || 0) / totalHeadcount) * 100) : 0;

    return (
      <div className="bg-[#0F1B33] text-white p-3 rounded-lg shadow-lg border border-[#2A3B54] text-xs min-w-[180px]">
        <div className="flex items-center justify-between border-b border-[#2A3B54] pb-2 mb-2">
          <span className="font-semibold text-xs text-white">
            {data.fullDay || data.fullWeek || label}
          </span>
          <span className="bg-[#ECFDF5] text-[#0F7A47] px-2 py-0.5 rounded text-[10px] font-medium border border-[#A7E8C7]">
            {data.rate || attendanceRate}% Rate
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#B7C0CA]">
              <span className="w-2 h-2 rounded-full bg-[#0F7A47] inline-block" />
              On Time / Present:
            </span>
            <span className="font-medium text-white">{data.present || 0}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#B7C0CA]">
              <span className="w-2 h-2 rounded-full bg-[#C24A0A] inline-block" />
              Late Arrival:
            </span>
            <span className="font-medium text-white">{data.late || 0}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#B7C0CA]">
              <span className="w-2 h-2 rounded-full bg-[#B32020] inline-block" />
              Absent / Leave:
            </span>
            <span className="font-medium text-white">{data.absent || 0}</span>
          </div>

          {data.totalHours && (
            <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3B54] text-[#8B98A6]">
              <span>Total Hours:</span>
              <span className="font-medium text-white">{data.totalHours} hrs</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const WeeklyAttendanceChart = ({
  attendanceLogs = [],
  title = "Weekly Employee Attendance Trends",
  subtitle = "Interactive breakdown of on-time attendance, punctuality, and absences across days",
}) => {
  const [timeframe, setTimeframe] = useState("week"); // 'week' | 'month'
  const [chartType, setChartType] = useState("stacked"); // 'stacked' | 'grouped'

  // Compute live weekly trends from actual attendance records
  const computedWeeklyData = useMemo(() => {
    const daysMap = generateEmptyWeeklyMap();

    if (!attendanceLogs || !Array.isArray(attendanceLogs) || attendanceLogs.length === 0) {
      return Object.values(daysMap);
    }

    attendanceLogs.forEach((log) => {
      const dateStr = log.date;
      if (!dateStr) return;
      const logDate = new Date(dateStr);
      if (isNaN(logDate.getTime())) return;

      const dayShort = logDate.toLocaleDateString("en-US", { weekday: "short" });
      if (daysMap[dayShort]) {
        const status = (log.status || "").toLowerCase();
        if (status.includes("late")) {
          daysMap[dayShort].late += 1;
        } else if (status.includes("absent") || status.includes("leave")) {
          daysMap[dayShort].absent += 1;
        } else {
          daysMap[dayShort].present += 1;
        }

        const hrs = parseFloat(log.workHours) || (log.checkOut && log.checkIn ? 8 : 0);
        daysMap[dayShort].totalHours += hrs;
      }
    });

    return Object.values(daysMap).map((d) => {
      const total = d.present + d.late + d.absent;
      const rate = total > 0 ? Math.round((d.present / total) * 100) : 0;
      return {
        ...d,
        rate,
        totalHours: Math.round(d.totalHours * 10) / 10,
      };
    });
  }, [attendanceLogs]);

  // Compute live monthly week buckets from actual attendance records
  const computedMonthlyData = useMemo(() => {
    const weeks = [
      { week: "Week 1", fullWeek: "Days 1 - 7", present: 0, late: 0, absent: 0, avgRate: 0 },
      { week: "Week 2", fullWeek: "Days 8 - 14", present: 0, late: 0, absent: 0, avgRate: 0 },
      { week: "Week 3", fullWeek: "Days 15 - 21", present: 0, late: 0, absent: 0, avgRate: 0 },
      { week: "Week 4", fullWeek: "Days 22 - 31", present: 0, late: 0, absent: 0, avgRate: 0 },
    ];

    if (!attendanceLogs || !Array.isArray(attendanceLogs) || attendanceLogs.length === 0) {
      return weeks;
    }

    attendanceLogs.forEach((log) => {
      if (!log.date) return;
      const d = new Date(log.date);
      if (isNaN(d.getTime())) return;
      const dayOfMonth = d.getDate();

      let targetWeek = weeks[3];
      if (dayOfMonth <= 7) targetWeek = weeks[0];
      else if (dayOfMonth <= 14) targetWeek = weeks[1];
      else if (dayOfMonth <= 21) targetWeek = weeks[2];

      const status = (log.status || "").toLowerCase();
      if (status.includes("late")) {
        targetWeek.late += 1;
      } else if (status.includes("absent") || status.includes("leave")) {
        targetWeek.absent += 1;
      } else {
        targetWeek.present += 1;
      }
    });

    return weeks.map((w) => {
      const total = w.present + w.late + w.absent;
      return {
        ...w,
        avgRate: total > 0 ? Math.round((w.present / total) * 100) : 0,
      };
    });
  }, [attendanceLogs]);

  const activeData = timeframe === "week" ? computedWeeklyData : computedMonthlyData;
  const xDataKey = timeframe === "week" ? "day" : "week";

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalPresent = activeData.reduce((acc, curr) => acc + (curr.present || 0), 0);
    const totalLate = activeData.reduce((acc, curr) => acc + (curr.late || 0), 0);
    const totalAbsent = activeData.reduce((acc, curr) => acc + (curr.absent || 0), 0);
    const totalLogged = totalPresent + totalLate + totalAbsent;
    const overallRate = totalLogged > 0 ? Math.round(((totalPresent + totalLate * 0.5) / totalLogged) * 100) : 0;
    const punctuality = totalPresent + totalLate > 0 ? Math.round((totalPresent / (totalPresent + totalLate)) * 100) : 0;

    return {
      totalPresent,
      totalLate,
      totalAbsent,
      overallRate,
      punctuality,
    };
  }, [activeData]);

  return (
    <div
      id="weekly-attendance-trends-chart-container"
      className="bg-white border border-[#E5E9EE] rounded-xl p-6 space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9EE] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#0F1B33] tracking-tight">{title}</h3>
          </div>
          <p className="text-xs text-[#5B6B7C] mt-0.5">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Display Style Toggle */}
          <div className="inline-flex items-center bg-[#F7F8FA] border border-[#E5E9EE] p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setChartType("stacked")}
              className={`px-3 py-1 rounded-md transition-all ${
                chartType === "stacked"
                  ? "bg-[#002185] text-white shadow-xs"
                  : "text-[#5B6B7C] hover:text-[#0F1B33]"
              }`}
            >
              Stacked
            </button>
            <button
              onClick={() => setChartType("grouped")}
              className={`px-3 py-1 rounded-md transition-all ${
                chartType === "grouped"
                  ? "bg-[#002185] text-white shadow-xs"
                  : "text-[#5B6B7C] hover:text-[#0F1B33]"
              }`}
            >
              Grouped
            </button>
          </div>

          {/* Timeframe Filter Switcher */}
          <div className="inline-flex items-center bg-[#F7F8FA] border border-[#E5E9EE] p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTimeframe("week")}
              className={`px-3 py-1 rounded-md transition-all ${
                timeframe === "week"
                  ? "bg-[#002185] text-white shadow-xs font-medium"
                  : "text-[#5B6B7C] hover:text-[#0F1B33]"
              }`}
            >
              Current Week
            </button>
            <button
              onClick={() => setTimeframe("month")}
              className={`px-3 py-1 rounded-md transition-all ${
                timeframe === "month"
                  ? "bg-[#002185] text-white shadow-xs font-medium"
                  : "text-[#5B6B7C] hover:text-[#0F1B33]"
              }`}
            >
              Monthly Weeks
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-[#E5E9EE] bg-[#F7F8FA] p-3.5">
          <div className="flex items-center gap-1.5 text-[#0F7A47] text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>On-Time Rate</span>
          </div>
          <p className="text-xl font-semibold text-[#0F1B33] mt-1">{summaryMetrics.punctuality}%</p>
          <span className="text-[11px] text-[#8B98A6]">Punctuality target met</span>
        </div>

        <div className="rounded-lg border border-[#E5E9EE] bg-[#F7F8FA] p-3.5">
          <div className="flex items-center gap-1.5 text-[#002185] text-xs font-medium">
            <Users className="w-3.5 h-3.5" />
            <span>Total Logged</span>
          </div>
          <p className="text-xl font-semibold text-[#0F1B33] mt-1">{summaryMetrics.totalPresent}</p>
          <span className="text-[11px] text-[#8B98A6]">Active shifts recorded</span>
        </div>

        <div className="rounded-lg border border-[#E5E9EE] bg-[#F7F8FA] p-3.5">
          <div className="flex items-center gap-1.5 text-[#C24A0A] text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Late Arrivals</span>
          </div>
          <p className="text-xl font-semibold text-[#C24A0A] mt-1">{summaryMetrics.totalLate}</p>
          <span className="text-[11px] text-[#8B98A6]">Past scheduled time</span>
        </div>

        <div className="rounded-lg border border-[#E5E9EE] bg-[#F7F8FA] p-3.5">
          <div className="flex items-center gap-1.5 text-[#B32020] text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Absences / Leaves</span>
          </div>
          <p className="text-xl font-semibold text-[#B32020] mt-1">{summaryMetrics.totalAbsent}</p>
          <span className="text-[11px] text-[#8B98A6]">Approved leaves / unexcused</span>
        </div>
      </div>

      {/* Recharts Bar Chart Visualization */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={activeData}
            margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
            barCategoryGap={chartType === "stacked" ? "35%" : "20%"}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" vertical={false} />
            <XAxis
              dataKey={xDataKey}
              tickLine={false}
              axisLine={{ stroke: "#E5E9EE" }}
              tick={{ fill: "#5B6B7C", fontSize: 12, fontWeight: 500 }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: "#E5E9EE" }}
              tick={{ fill: "#5B6B7C", fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F7F8FA", opacity: 0.8 }} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 12, fontSize: "12px", color: "#5B6B7C" }}
            />
            <Bar
              dataKey="present"
              name="On Time / Present"
              fill="#0F7A47"
              stackId={chartType === "stacked" ? "attendance" : undefined}
              radius={chartType === "stacked" ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            />
            <Bar
              dataKey="late"
              name="Late Check-In"
              fill="#C24A0A"
              stackId={chartType === "stacked" ? "attendance" : undefined}
              radius={chartType === "stacked" ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            />
            <Bar
              dataKey="absent"
              name="Absent / On Leave"
              fill="#B32020"
              stackId={chartType === "stacked" ? "attendance" : undefined}
              radius={chartType === "stacked" ? [4, 4, 0, 0] : [4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info / Insight */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-[#E5E9EE] text-xs text-[#5B6B7C]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#0F7A47]" />
          <span>
            Punctuality and attendance metrics computed dynamically from your real check-in history.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0F7A47]" /> On Time
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C24A0A]" /> Late
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#B32020]" /> Absent
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyAttendanceChart;
