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
  ReferenceLine,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Target,
  Award,
} from "lucide-react";

// Standard days of the week template with shift requirements (8 hrs standard per weekday)
const generateEmptyWeeklyMap = () => ({
  Mon: { day: "Mon", fullDay: "Monday", present: 0, late: 0, absent: 0, totalHours: 0, targetHours: 8, rate: 0 },
  Tue: { day: "Tue", fullDay: "Tuesday", present: 0, late: 0, absent: 0, totalHours: 0, targetHours: 8, rate: 0 },
  Wed: { day: "Wed", fullDay: "Wednesday", present: 0, late: 0, absent: 0, totalHours: 0, targetHours: 8, rate: 0 },
  Thu: { day: "Thu", fullDay: "Thursday", present: 0, late: 0, absent: 0, totalHours: 0, targetHours: 8, rate: 0 },
  Fri: { day: "Fri", fullDay: "Friday", present: 0, late: 0, absent: 0, totalHours: 0, targetHours: 8, rate: 0 },
  Sat: { day: "Sat", fullDay: "Saturday", present: 0, late: 0, absent: 0, totalHours: 0, targetHours: 0, rate: 0 },
});

// Custom Tooltip for Attendance Patterns
const AttendanceTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload || {};
    const totalHeadcount = (data.present || 0) + (data.late || 0) + (data.absent || 0);
    const attendanceRate = totalHeadcount > 0 ? Math.round(((data.present || 0) / totalHeadcount) * 100) : 0;

    return (
      <div className="bg-[#0F1B33] text-white p-3 rounded-lg shadow-lg border border-[#2A3B54] text-xs min-w-[190px]">
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

          {data.totalHours !== undefined && (
            <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3B54] text-[#8B98A6]">
              <span>Worked Hours:</span>
              <span className="font-medium text-white">{data.totalHours} hrs</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Hours Worked vs Shift Requirements
const HoursTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload || {};
    const target = data.targetHours || 8;
    const actual = data.totalHours || 0;
    const diff = Math.round((actual - target) * 10) / 10;
    const compliance = target > 0 ? Math.min(150, Math.round((actual / target) * 100)) : (actual > 0 ? 100 : 0);

    return (
      <div className="bg-[#0F1B33] text-white p-3 rounded-lg shadow-lg border border-[#2A3B54] text-xs min-w-[200px]">
        <div className="flex items-center justify-between border-b border-[#2A3B54] pb-2 mb-2">
          <span className="font-semibold text-xs text-white">
            {data.fullDay || data.fullWeek || label}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
              actual >= target
                ? "bg-[#ECFDF5] text-[#0F7A47] border-[#A7E8C7]"
                : "bg-[#FFF7ED] text-[#C24A0A] border-[#FFD8A8]"
            }`}
          >
            {compliance}% of Shift
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#B7C0CA]">
              <Clock className="w-3 h-3 text-[#002185]" />
              Hours Worked:
            </span>
            <span className="font-semibold text-white">{actual} hrs</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#B7C0CA]">
              <Target className="w-3 h-3 text-[#8B98A6]" />
              Shift Requirement:
            </span>
            <span className="font-medium text-white">{target} hrs</span>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3B54]">
            <span className="text-[#8B98A6]">Variance:</span>
            <span
              className={`font-semibold ${
                diff >= 0 ? "text-[#0F7A47]" : "text-[#C24A0A]"
              }`}
            >
              {diff >= 0 ? `+${diff} hrs (Met)` : `${diff} hrs (Deficit)`}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const WeeklyAttendanceChart = ({
  attendanceLogs = [],
  title = "Weekly Attendance & Shift Performance",
  subtitle = "Visualize attendance patterns and total hours worked against shift requirements",
}) => {
  const [metricMode, setMetricMode] = useState("hours"); // 'hours' | 'attendance'
  const [timeframe, setTimeframe] = useState("week"); // 'week' | 'month'

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

        const hrs = parseFloat(log.workHours) || (log.checkOut && log.checkIn ? 8 : (log.status === "Present" ? 8 : 0));
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
      { week: "Week 1", fullWeek: "Days 1 - 7", present: 0, late: 0, absent: 0, totalHours: 0, targetHours: 40, avgRate: 0 },
      { week: "Week 2", fullWeek: "Days 8 - 14", present: 0, late: 0, absent: 0, totalHours: 0, targetHours: 40, avgRate: 0 },
      { week: "Week 3", fullWeek: "Days 15 - 21", present: 0, late: 0, absent: 0, totalHours: 0, targetHours: 40, avgRate: 0 },
      { week: "Week 4", fullWeek: "Days 22 - 31", present: 0, late: 0, absent: 0, totalHours: 0, targetHours: 40, avgRate: 0 },
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

      const hrs = parseFloat(log.workHours) || (log.checkOut && log.checkIn ? 8 : (log.status === "Present" ? 8 : 0));
      targetWeek.totalHours += hrs;
    });

    return weeks.map((w) => {
      const total = w.present + w.late + w.absent;
      return {
        ...w,
        totalHours: Math.round(w.totalHours * 10) / 10,
        avgRate: total > 0 ? Math.round((w.present / total) * 100) : 0,
      };
    });
  }, [attendanceLogs]);

  const activeData = timeframe === "week" ? computedWeeklyData : computedMonthlyData;
  const xDataKey = timeframe === "week" ? "day" : "week";

  // Summary Metrics & Shift Requirement Analysis
  const summaryMetrics = useMemo(() => {
    const totalPresent = activeData.reduce((acc, curr) => acc + (curr.present || 0), 0);
    const totalLate = activeData.reduce((acc, curr) => acc + (curr.late || 0), 0);
    const totalAbsent = activeData.reduce((acc, curr) => acc + (curr.absent || 0), 0);
    const totalHoursWorked = activeData.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
    const totalTargetHours = activeData.reduce((acc, curr) => acc + (curr.targetHours || 0), 0);

    const punctuality = totalPresent + totalLate > 0 ? Math.round((totalPresent / (totalPresent + totalLate)) * 100) : 100;
    const shiftCompliance = totalTargetHours > 0 ? Math.min(100, Math.round((totalHoursWorked / totalTargetHours) * 100)) : 100;

    return {
      totalPresent,
      totalLate,
      totalAbsent,
      totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
      totalTargetHours,
      shiftCompliance,
      punctuality,
    };
  }, [activeData]);

  return (
    <div
      id="weekly-attendance-trends-chart-container"
      className="bg-white border border-[#E5E9EE] rounded-xl p-5 sm:p-6 space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E9EE] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#0F1B33] tracking-tight">{title}</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0F4FE] text-[#002185] border border-[#C7D7FE]">
              Shift Target: 8h/day (40h/wk)
            </span>
          </div>
          <p className="text-xs text-[#5B6B7C] mt-1">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Primary View Switcher: Hours Worked vs Attendance Status */}
          <div className="inline-flex items-center bg-[#F7F8FA] border border-[#E5E9EE] p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setMetricMode("hours")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                metricMode === "hours"
                  ? "bg-[#002185] text-white shadow-xs"
                  : "text-[#5B6B7C] hover:text-[#0F1B33]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Hours vs Shift</span>
            </button>
            <button
              onClick={() => setMetricMode("attendance")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                metricMode === "attendance"
                  ? "bg-[#002185] text-white shadow-xs"
                  : "text-[#5B6B7C] hover:text-[#0F1B33]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Attendance Pattern</span>
            </button>
          </div>

          {/* Timeframe Filter Switcher */}
          <div className="inline-flex items-center bg-[#F7F8FA] border border-[#E5E9EE] p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTimeframe("week")}
              className={`px-3 py-1 rounded-md transition-all ${
                timeframe === "week"
                  ? "bg-white text-[#0F1B33] shadow-xs font-semibold border border-[#E5E9EE]"
                  : "text-[#5B6B7C] hover:text-[#0F1B33]"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeframe("month")}
              className={`px-3 py-1 rounded-md transition-all ${
                timeframe === "month"
                  ? "bg-white text-[#0F1B33] shadow-xs font-semibold border border-[#E5E9EE]"
                  : "text-[#5B6B7C] hover:text-[#0F1B33]"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* KPI Performance Highlights Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Hours Worked */}
        <div className="rounded-xl border border-[#E5E9EE] bg-[#F7F8FA] p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#002185]">
              <Clock className="w-3.5 h-3.5" />
              Hours Worked
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white text-[#5B6B7C] border border-[#E5E9EE]">
              Req: {summaryMetrics.totalTargetHours}h
            </span>
          </div>
          <p className="text-2xl font-bold text-[#0F1B33] mt-2 tracking-tight">
            {summaryMetrics.totalHoursWorked} <span className="text-sm font-normal text-[#5B6B7C]">hrs</span>
          </p>
          <div className="w-full bg-[#E5E9EE] rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-[#002185] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (summaryMetrics.totalHoursWorked / (summaryMetrics.totalTargetHours || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Shift Requirement Compliance */}
        <div className="rounded-xl border border-[#E5E9EE] bg-[#F7F8FA] p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#0F7A47]">
              <Target className="w-3.5 h-3.5" />
              Shift Compliance
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#0F7A47] border border-[#A7E8C7]">
              {summaryMetrics.shiftCompliance >= 90 ? "Target Met" : "In Progress"}
            </span>
          </div>
          <p className="text-2xl font-bold text-[#0F1B33] mt-2 tracking-tight">
            {summaryMetrics.shiftCompliance}%
          </p>
          <span className="text-[11px] text-[#8B98A6] mt-1 block">
            Against required shift schedule
          </span>
        </div>

        {/* Punctuality / On-Time Rate */}
        <div className="rounded-xl border border-[#E5E9EE] bg-[#F7F8FA] p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#0F7A47]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Punctuality Rate
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white text-[#5B6B7C] border border-[#E5E9EE]">
              {summaryMetrics.totalLate} Late
            </span>
          </div>
          <p className="text-2xl font-bold text-[#0F1B33] mt-2 tracking-tight">
            {summaryMetrics.punctuality}%
          </p>
          <span className="text-[11px] text-[#8B98A6] mt-1 block">
            On-time arrival benchmark
          </span>
        </div>

        {/* Attendance Days Logged */}
        <div className="rounded-xl border border-[#E5E9EE] bg-[#F7F8FA] p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#5B6B7C]">
              <Award className="w-3.5 h-3.5 text-[#002185]" />
              Active Days
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white text-[#5B6B7C] border border-[#E5E9EE]">
              {summaryMetrics.totalAbsent} Absent
            </span>
          </div>
          <p className="text-2xl font-bold text-[#0F1B33] mt-2 tracking-tight">
            {summaryMetrics.totalPresent + summaryMetrics.totalLate}{" "}
            <span className="text-sm font-normal text-[#5B6B7C]">days</span>
          </p>
          <span className="text-[11px] text-[#8B98A6] mt-1 block">
            Recorded check-ins this period
          </span>
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {metricMode === "hours" ? (
            <BarChart
              data={activeData}
              margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
              barCategoryGap="28%"
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
                unit="h"
                domain={[0, timeframe === "week" ? 12 : 50]}
              />
              <Tooltip content={<HoursTooltip />} cursor={{ fill: "#F7F8FA", opacity: 0.8 }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: "12px", color: "#5B6B7C" }}
              />
              {/* Reference Line for Expected Shift Requirements */}
              <ReferenceLine
                y={timeframe === "week" ? 8 : 40}
                stroke="#002185"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: timeframe === "week" ? "Shift Target (8.0h)" : "Shift Target (40.0h)",
                  position: "insideTopRight",
                  fill: "#002185",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <Bar
                dataKey="totalHours"
                name="Total Hours Worked"
                radius={[6, 6, 0, 0]}
              >
                {activeData.map((entry, index) => {
                  const target = entry.targetHours || (timeframe === "week" ? 8 : 40);
                  const isMet = (entry.totalHours || 0) >= target;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isMet ? "#0F7A47" : "#002185"}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={activeData}
              margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
              barCategoryGap="30%"
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
              <Tooltip content={<AttendanceTooltip />} cursor={{ fill: "#F7F8FA", opacity: 0.8 }} />
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
                stackId="attendance"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="late"
                name="Late Check-In"
                fill="#C24A0A"
                stackId="attendance"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="absent"
                name="Absent / On Leave"
                fill="#B32020"
                stackId="attendance"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Info / Performance Benchmarks */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-[#E5E9EE] text-xs text-[#5B6B7C]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#0F7A47]" />
          <span>
            {metricMode === "hours"
              ? "Dashed line shows official 8-hour shift target. Green bars indicate shift requirement fulfilled."
              : "Punctuality and attendance metrics computed dynamically from your real check-in history."}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {metricMode === "hours" ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0F7A47]" /> Target Met (≥8h)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#002185]" /> In Progress (&lt;8h)
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0F7A47]" /> On Time
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C24A0A]" /> Late
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B32020]" /> Absent
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyAttendanceChart;
