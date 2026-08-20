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
  BarChart3,
} from "lucide-react";

// Default standard weekly trend dataset
const defaultWeeklyData = [
  { day: "Mon", fullDay: "Monday", present: 22, late: 2, absent: 1, totalHours: 182, rate: 92 },
  { day: "Tue", fullDay: "Tuesday", present: 24, late: 1, absent: 0, totalHours: 198, rate: 96 },
  { day: "Wed", fullDay: "Wednesday", present: 25, late: 0, absent: 0, totalHours: 205, rate: 100 },
  { day: "Thu", fullDay: "Thursday", present: 23, late: 2, absent: 0, totalHours: 191, rate: 92 },
  { day: "Fri", fullDay: "Friday", present: 21, late: 3, absent: 1, totalHours: 175, rate: 84 },
  { day: "Sat", fullDay: "Saturday", present: 8, late: 0, absent: 0, totalHours: 48, rate: 100 },
];

const defaultMonthlyWeeks = [
  { week: "Week 1", fullWeek: "Aug 1 - Aug 7", present: 114, late: 8, absent: 3, avgRate: 91 },
  { week: "Week 2", fullWeek: "Aug 8 - Aug 14", present: 119, late: 5, absent: 1, avgRate: 95 },
  { week: "Week 3", fullWeek: "Aug 15 - Aug 21", present: 122, late: 4, absent: 0, avgRate: 97 },
  { week: "Week 4", fullWeek: "Aug 22 - Aug 28", present: 116, late: 7, absent: 2, avgRate: 93 },
];

// Custom Tooltip component for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload || {};
    const totalHeadcount = (data.present || 0) + (data.late || 0) + (data.absent || 0);
    const attendanceRate = totalHeadcount > 0 ? Math.round(((data.present || 0) / totalHeadcount) * 100) : 0;

    return (
      <div className="bg-[#002185] text-white p-3.5 rounded-xl shadow-xl border border-white/10 text-xs min-w-[190px]">
        <div className="flex items-center justify-between border-b border-white/15 pb-2 mb-2">
          <span className="font-bold text-sm tracking-wide text-white">
            {data.fullDay || data.fullWeek || label}
          </span>
          <span className="bg-[#16A34A] text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
            {data.rate || attendanceRate}% Rate
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-white/80">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] inline-block" />
              On Time / Present:
            </span>
            <span className="font-bold text-white">{data.present || 0}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-white/80">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block" />
              Late Arrival:
            </span>
            <span className="font-bold text-white">{data.late || 0}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-white/80">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] inline-block" />
              Absent / Leave:
            </span>
            <span className="font-bold text-white">{data.absent || 0}</span>
          </div>

          {data.totalHours && (
            <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-white/70">
              <span>Total Hours:</span>
              <span className="font-semibold text-white">{data.totalHours} hrs</span>
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

  // Compute live trends from actual attendance records if available
  const computedWeeklyData = useMemo(() => {
    if (!attendanceLogs || !Array.isArray(attendanceLogs) || attendanceLogs.length === 0) {
      return defaultWeeklyData;
    }

    const daysMap = {
      Mon: { day: "Mon", fullDay: "Monday", present: 0, late: 0, absent: 0, totalHours: 0 },
      Tue: { day: "Tue", fullDay: "Tuesday", present: 0, late: 0, absent: 0, totalHours: 0 },
      Wed: { day: "Wed", fullDay: "Wednesday", present: 0, late: 0, absent: 0, totalHours: 0 },
      Thu: { day: "Thu", fullDay: "Thursday", present: 0, late: 0, absent: 0, totalHours: 0 },
      Fri: { day: "Fri", fullDay: "Friday", present: 0, late: 0, absent: 0, totalHours: 0 },
      Sat: { day: "Sat", fullDay: "Saturday", present: 0, late: 0, absent: 0, totalHours: 0 },
    };

    let hasMatchedData = false;

    attendanceLogs.forEach((log) => {
      const dateStr = log.date;
      if (!dateStr) return;
      const logDate = new Date(dateStr);
      if (isNaN(logDate.getTime())) return;

      const dayShort = logDate.toLocaleDateString("en-US", { weekday: "short" });
      if (daysMap[dayShort]) {
        hasMatchedData = true;
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

    if (!hasMatchedData) {
      return defaultWeeklyData;
    }

    return Object.values(daysMap).map((d) => {
      const total = d.present + d.late + d.absent;
      const rate = total > 0 ? Math.round((d.present / total) * 100) : 100;
      return {
        ...d,
        rate,
        totalHours: Math.round(d.totalHours * 10) / 10,
      };
    });
  }, [attendanceLogs]);

  const activeData = timeframe === "week" ? computedWeeklyData : defaultMonthlyWeeks;
  const xDataKey = timeframe === "week" ? "day" : "week";

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalPresent = activeData.reduce((acc, curr) => acc + (curr.present || 0), 0);
    const totalLate = activeData.reduce((acc, curr) => acc + (curr.late || 0), 0);
    const totalAbsent = activeData.reduce((acc, curr) => acc + (curr.absent || 0), 0);
    const totalLogged = totalPresent + totalLate + totalAbsent;
    const overallRate = totalLogged > 0 ? Math.round(((totalPresent + totalLate * 0.5) / totalLogged) * 100) : 95;
    const punctuality = totalPresent + totalLate > 0 ? Math.round((totalPresent / (totalPresent + totalLate)) * 100) : 92;

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
      className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:border-[#ff5500] transition-all duration-300 space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#002185]/5 text-[#002185]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#002185] tracking-tight">{title}</h3>
          </div>
          <p className="text-xs text-[#64748B] mt-1">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Display Style Toggle */}
          <div className="inline-flex items-center bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setChartType("stacked")}
              className={`px-3 py-1 rounded-lg transition-all ${
                chartType === "stacked"
                  ? "bg-[#002185] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#002185]"
              }`}
            >
              Stacked
            </button>
            <button
              onClick={() => setChartType("grouped")}
              className={`px-3 py-1 rounded-lg transition-all ${
                chartType === "grouped"
                  ? "bg-[#002185] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#002185]"
              }`}
            >
              Grouped
            </button>
          </div>

          {/* Timeframe Filter Switcher */}
          <div className="inline-flex items-center bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setTimeframe("week")}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === "week"
                  ? "bg-[#ff5500] text-white shadow-xs font-semibold"
                  : "text-[#64748B] hover:text-[#ff5500]"
              }`}
            >
              Current Week
            </button>
            <button
              onClick={() => setTimeframe("month")}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === "month"
                  ? "bg-[#ff5500] text-white shadow-xs font-semibold"
                  : "text-[#64748B] hover:text-[#ff5500]"
              }`}
            >
              Monthly Weeks
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-2 text-[#16A34A] text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>On-Time Rate</span>
          </div>
          <p className="text-xl font-bold text-[#002185] mt-1">{summaryMetrics.punctuality}%</p>
          <span className="text-[11px] text-[#64748B]">Punctuality target met</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-2 text-[#002185] text-xs font-medium">
            <Users className="w-3.5 h-3.5" />
            <span>Total Checked In</span>
          </div>
          <p className="text-xl font-bold text-[#002185] mt-1">{summaryMetrics.totalPresent}</p>
          <span className="text-[11px] text-[#64748B]">Active attendances</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-2 text-[#F59E0B] text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Late Arrivals</span>
          </div>
          <p className="text-xl font-bold text-[#F59E0B] mt-1">{summaryMetrics.totalLate}</p>
          <span className="text-[11px] text-[#64748B]">Past 8:30 AM mark</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-2 text-[#DC2626] text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Absences / Leaves</span>
          </div>
          <p className="text-xl font-bold text-[#DC2626] mt-1">{summaryMetrics.totalAbsent}</p>
          <span className="text-[11px] text-[#64748B]">Approved leaves / out</span>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey={xDataKey}
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
              tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
              tick={{ fill: "#64748B", fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F1F5F9", opacity: 0.6 }} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 12, fontSize: "12px", color: "#64748B" }}
            />
            <Bar
              dataKey="present"
              name="On Time / Present"
              fill="#16A34A"
              stackId={chartType === "stacked" ? "attendance" : undefined}
              radius={chartType === "stacked" ? [0, 0, 0, 0] : [6, 6, 0, 0]}
            />
            <Bar
              dataKey="late"
              name="Late Check-In"
              fill="#F59E0B"
              stackId={chartType === "stacked" ? "attendance" : undefined}
              radius={chartType === "stacked" ? [0, 0, 0, 0] : [6, 6, 0, 0]}
            />
            <Bar
              dataKey="absent"
              name="Absent / On Leave"
              fill="#DC2626"
              stackId={chartType === "stacked" ? "attendance" : undefined}
              radius={chartType === "stacked" ? [6, 6, 0, 0] : [6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info / Insight */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-[#E2E8F0] text-xs text-[#64748B]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#16A34A]" />
          <span>
            Highest attendance recorded on <strong className="text-[#002185]">Wednesday (100% Rate)</strong>.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> On Time
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Late (&gt;8:30 AM)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> Absent
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyAttendanceChart;
