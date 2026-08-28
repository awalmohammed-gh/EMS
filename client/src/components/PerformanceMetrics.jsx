import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  CheckCircle2,
  Award,
  Zap,
  Briefcase,
  Layers,
  ArrowUpRight,
  Calendar,
  CheckSquare,
} from "lucide-react";

// Custom Tooltip for Line Chart (Module-level declaration for ESLint react-hooks rules)
const CustomLineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0F1B33] text-white p-3.5 rounded-lg shadow-xl border border-[#2A3B54] text-xs min-w-[210px]">
        <div className="flex items-center justify-between border-b border-[#2A3B54] pb-2 mb-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#8B98A6]" />
            {label}
          </span>
          <span className="bg-[#ECFDF5] text-[#0F7A47] px-2 py-0.5 rounded text-[10px] font-medium border border-[#A7E8C7]">
            {data.productivity >= 90 ? "High Performance" : "On Target"}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#B7C0CA]">
              <span className="w-2 h-2 rounded-full bg-[#002185] ring-2 ring-white/20 inline-block" />
              Productivity Score:
            </span>
            <span className="font-semibold text-white">{data.productivity}%</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#B7C0CA]">
              <span className="w-2 h-2 rounded-full bg-[#0F7A47] inline-block" />
              Project Completion Rate:
            </span>
            <span className="font-semibold text-[#0F7A47]">{data.completionRate}%</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#B7C0CA]">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block" />
              Quality & Review Score:
            </span>
            <span className="font-medium text-white">{data.qualityScore}%</span>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3B54] text-[#8B98A6]">
            <span>Tasks Delivered:</span>
            <span className="font-semibold text-white">{data.tasksCompleted} tasks</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * PerformanceMetrics Component
 *
 * Interactive employee productivity scores and project completion rate visualizer.
 * Built with interactive Recharts line charts, timeframe toggles, metric selectors,
 * KPI milestone scorecards, and live project completion breakdown.
 */
const PerformanceMetrics = ({ employee = {}, overview = {} }) => {
  // Timeframe state: "6m" (Last 6 Months), "12w" (Last 12 Weeks), "ytd" (Year to Date)
  const [timeframe, setTimeframe] = useState("6m");
  // Active metric toggle: "all", "productivity", "completion", "quality"
  const [activeMetric, setActiveMetric] = useState("all");
  // View mode: "split" (Two specialized charts) or "combined" (Multi-axis unified trajectory)
  const [viewMode, setViewMode] = useState("split");

  // Performance datasets based on timeframe
  const datasets = {
    "6m": [
      {
        period: "Mar 2026",
        productivity: 89.2,
        completionRate: 88.0,
        benchmark: 85.0,
        tasksCompleted: 34,
        qualityScore: 92.5,
        projectsDelivered: 4,
        milestonesTotal: 5,
      },
      {
        period: "Apr 2026",
        productivity: 91.5,
        completionRate: 90.5,
        benchmark: 85.0,
        tasksCompleted: 39,
        qualityScore: 94.0,
        projectsDelivered: 5,
        milestonesTotal: 5,
      },
      {
        period: "May 2026",
        productivity: 93.0,
        completionRate: 89.0,
        benchmark: 85.0,
        tasksCompleted: 42,
        qualityScore: 95.2,
        projectsDelivered: 4,
        milestonesTotal: 4,
      },
      {
        period: "Jun 2026",
        productivity: 90.8,
        completionRate: 94.0,
        benchmark: 85.0,
        tasksCompleted: 45,
        qualityScore: 93.8,
        projectsDelivered: 6,
        milestonesTotal: 6,
      },
      {
        period: "Jul 2026",
        productivity: 95.4,
        completionRate: 92.5,
        benchmark: 85.0,
        tasksCompleted: 48,
        qualityScore: 97.0,
        projectsDelivered: 5,
        milestonesTotal: 5,
      },
      {
        period: "Aug 2026",
        productivity: 96.8,
        completionRate: 96.0,
        benchmark: 85.0,
        tasksCompleted: 52,
        qualityScore: 98.4,
        projectsDelivered: 7,
        milestonesTotal: 7,
      },
    ],
    "12w": [
      { period: "Wk 23", productivity: 90.0, completionRate: 88.0, benchmark: 85.0, tasksCompleted: 10, qualityScore: 93.0 },
      { period: "Wk 24", productivity: 92.5, completionRate: 90.0, benchmark: 85.0, tasksCompleted: 12, qualityScore: 94.5 },
      { period: "Wk 25", productivity: 91.0, completionRate: 89.0, benchmark: 85.0, tasksCompleted: 11, qualityScore: 94.0 },
      { period: "Wk 26", productivity: 94.0, completionRate: 93.0, benchmark: 85.0, tasksCompleted: 13, qualityScore: 95.0 },
      { period: "Wk 27", productivity: 93.5, completionRate: 91.5, benchmark: 85.0, tasksCompleted: 12, qualityScore: 96.0 },
      { period: "Wk 28", productivity: 95.0, completionRate: 94.0, benchmark: 85.0, tasksCompleted: 14, qualityScore: 96.5 },
      { period: "Wk 29", productivity: 94.8, completionRate: 92.0, benchmark: 85.0, tasksCompleted: 13, qualityScore: 97.0 },
      { period: "Wk 30", productivity: 96.0, completionRate: 95.0, benchmark: 85.0, tasksCompleted: 15, qualityScore: 97.5 },
      { period: "Wk 31", productivity: 95.5, completionRate: 93.5, benchmark: 85.0, tasksCompleted: 14, qualityScore: 98.0 },
      { period: "Wk 32", productivity: 97.2, completionRate: 96.0, benchmark: 85.0, tasksCompleted: 16, qualityScore: 98.2 },
      { period: "Wk 33", productivity: 96.5, completionRate: 95.5, benchmark: 85.0, tasksCompleted: 15, qualityScore: 98.5 },
      { period: "Wk 34", productivity: 97.8, completionRate: 97.0, benchmark: 85.0, tasksCompleted: 17, qualityScore: 99.0 },
    ],
    ytd: [
      { period: "Jan 2026", productivity: 87.5, completionRate: 85.0, benchmark: 85.0, tasksCompleted: 28, qualityScore: 90.0 },
      { period: "Feb 2026", productivity: 88.0, completionRate: 86.5, benchmark: 85.0, tasksCompleted: 30, qualityScore: 91.5 },
      { period: "Mar 2026", productivity: 89.2, completionRate: 88.0, benchmark: 85.0, tasksCompleted: 34, qualityScore: 92.5 },
      { period: "Apr 2026", productivity: 91.5, completionRate: 90.5, benchmark: 85.0, tasksCompleted: 39, qualityScore: 94.0 },
      { period: "May 2026", productivity: 93.0, completionRate: 89.0, benchmark: 85.0, tasksCompleted: 42, qualityScore: 95.2 },
      { period: "Jun 2026", productivity: 90.8, completionRate: 94.0, benchmark: 85.0, tasksCompleted: 45, qualityScore: 93.8 },
      { period: "Jul 2026", productivity: 95.4, completionRate: 92.5, benchmark: 85.0, tasksCompleted: 48, qualityScore: 97.0 },
      { period: "Aug 2026", productivity: 96.8, completionRate: 96.0, benchmark: 85.0, tasksCompleted: 52, qualityScore: 98.4 },
    ],
  };

  const chartData = datasets[timeframe] || datasets["6m"];

  // Calculate live summary averages
  const metricsSummary = useMemo(() => {
    const totalCount = chartData.length;
    const avgProd = (
      chartData.reduce((acc, curr) => acc + curr.productivity, 0) / totalCount
    ).toFixed(1);
    const avgComp = (
      chartData.reduce((acc, curr) => acc + curr.completionRate, 0) / totalCount
    ).toFixed(1);
    const avgQuality = (
      chartData.reduce((acc, curr) => acc + curr.qualityScore, 0) / totalCount
    ).toFixed(1);
    const totalTasks = chartData.reduce((acc, curr) => acc + curr.tasksCompleted, 0);

    const latestPoint = chartData[chartData.length - 1];
    const prevPoint = chartData[chartData.length - 2] || chartData[0];
    const prodDiff = (latestPoint.productivity - prevPoint.productivity).toFixed(1);
    const compDiff = (latestPoint.completionRate - prevPoint.completionRate).toFixed(1);

    return {
      avgProd,
      avgComp,
      avgQuality,
      totalTasks,
      latestProd: latestPoint.productivity,
      latestComp: latestPoint.completionRate,
      prodDiff: Number(prodDiff),
      compDiff: Number(compDiff),
    };
  }, [chartData]);

  // Project completion records
  const projectList = [
    {
      id: "PRJ-104",
      name: "Attendance Biometrics & Live Sync",
      category: "Core Engine",
      completion: 100,
      productivityScore: 98,
      status: "Completed",
      deadline: "15 Aug 2026",
      qualityRating: "4.95 / 5.0",
      badgeClass: "bg-[#ECFDF5] text-[#0F7A47] border-[#A7E8C7]",
    },
    {
      id: "PRJ-108",
      name: "Payroll Automated Deductions Engine",
      category: "Financial Systems",
      completion: 100,
      productivityScore: 96,
      status: "Completed",
      deadline: "20 Aug 2026",
      qualityRating: "4.90 / 5.0",
      badgeClass: "bg-[#ECFDF5] text-[#0F7A47] border-[#A7E8C7]",
    },
    {
      id: "PRJ-112",
      name: "Leave Approval Multi-tier Workflow",
      category: "HR Operations",
      completion: 94,
      productivityScore: 95,
      status: "In Review",
      deadline: "30 Aug 2026",
      qualityRating: "4.85 / 5.0",
      badgeClass: "bg-[#FFF7E6] text-[#A5620A] border-[#F5D398]",
    },
    {
      id: "PRJ-115",
      name: "Dynamic Recharts Analytics Suite",
      category: "Frontend UI",
      completion: 88,
      productivityScore: 97,
      status: "In Progress",
      deadline: "05 Sep 2026",
      qualityRating: "4.92 / 5.0",
      badgeClass: "bg-[#F0F5FF] text-[#002185] border-[#B6D0FE]",
    },
  ];

  return (
    <div id="performance-metrics-tab-content" className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-white border border-[#E5E9EE] rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#002185] flex items-center justify-center text-white shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-semibold text-[#0F1B33] tracking-tight">
                Employee Performance Metrics
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#0F7A47] border border-[#A7E8C7]">
                Top Quartile
              </span>
            </div>
            <p className="text-xs text-[#5B6B7C] mt-1">
              Interactive analysis of individual productivity scores, milestone delivery rates, and output quality
            </p>
          </div>

          {/* Timeframe & View Mode Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Switcher */}
            <div className="inline-flex items-center bg-[#F7F8FA] border border-[#E5E9EE] p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setTimeframe("6m")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  timeframe === "6m"
                    ? "bg-[#002185] text-white shadow-xs font-medium"
                    : "text-[#5B6B7C] hover:text-[#0F1B33]"
                }`}
              >
                Last 6 Months
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("12w")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  timeframe === "12w"
                    ? "bg-[#002185] text-white shadow-xs font-medium"
                    : "text-[#5B6B7C] hover:text-[#0F1B33]"
                }`}
              >
                12 Weeks
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("ytd")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  timeframe === "ytd"
                    ? "bg-[#002185] text-white shadow-xs font-medium"
                    : "text-[#5B6B7C] hover:text-[#0F1B33]"
                }`}
              >
                Year to Date
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex items-center bg-[#F7F8FA] border border-[#E5E9EE] p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "split"
                    ? "bg-white text-[#0F1B33] border border-[#E5E9EE] shadow-xs font-medium"
                    : "text-[#5B6B7C] hover:text-[#0F1B33]"
                }`}
              >
                Split Charts
              </button>
              <button
                type="button"
                onClick={() => setViewMode("combined")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "combined"
                    ? "bg-white text-[#0F1B33] border border-[#E5E9EE] shadow-xs font-medium"
                    : "text-[#5B6B7C] hover:text-[#0F1B33]"
                }`}
              >
                Combined View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Productivity Score KPI */}
        <div className="bg-white border border-[#E5E9EE] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#8B98A6]">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#002185]" />
              <p className="text-xs font-medium">Productivity Score</p>
            </div>
            <span className="flex items-center text-[11px] font-semibold text-[#0F7A47]">
              +{metricsSummary.prodDiff >= 0 ? metricsSummary.prodDiff : 0}%
              <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-2xl font-semibold text-[#0F1B33] mt-2 tracking-tight">
            {metricsSummary.latestProd}%
          </p>
          <p className="text-xs text-[#8B98A6] mt-1">
            Avg {metricsSummary.avgProd}% · +9.6% above baseline (85%)
          </p>
        </div>

        {/* Project Completion Rate KPI */}
        <div className="bg-white border border-[#E5E9EE] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#8B98A6]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0F7A47]" />
              <p className="text-xs font-medium">Project Completion Rate</p>
            </div>
            <span className="flex items-center text-[11px] font-semibold text-[#0F7A47]">
              +{metricsSummary.compDiff >= 0 ? metricsSummary.compDiff : 0}%
              <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-2xl font-semibold text-[#0F1B33] mt-2 tracking-tight">
            {metricsSummary.latestComp}%
          </p>
          <p className="text-xs text-[#8B98A6] mt-1">
            23/25 sprint deliverables shipped on schedule
          </p>
        </div>

        {/* Quality Rating KPI */}
        <div className="bg-white border border-[#E5E9EE] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#8B98A6]">
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#2563EB]" />
              <p className="text-xs font-medium">Quality & Code Index</p>
            </div>
            <span className="text-[11px] font-semibold text-[#2563EB]">
              4.92 / 5.0
            </span>
          </div>
          <p className="text-2xl font-semibold text-[#0F1B33] mt-2 tracking-tight">
            {metricsSummary.avgQuality}%
          </p>
          <p className="text-xs text-[#8B98A6] mt-1">
            98.5% first-pass PR & task review acceptance
          </p>
        </div>

        {/* Total Deliverables KPI */}
        <div className="bg-white border border-[#E5E9EE] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#8B98A6]">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-[#C24A0A]" />
              <p className="text-xs font-medium">Delivered Tasks</p>
            </div>
            <span className="text-[11px] font-semibold text-[#5B6B7C]">
              1.4d turnaround
            </span>
          </div>
          <p className="text-2xl font-semibold text-[#0F1B33] mt-2 tracking-tight">
            {metricsSummary.totalTasks} tasks
          </p>
          <p className="text-xs text-[#8B98A6] mt-1">
            Across active sprints in chosen timeframe
          </p>
        </div>
      </div>

      {/* Interactive Recharts Line Charts */}
      {viewMode === "split" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Productivity Scores Trajectory */}
          <div className="bg-white border border-[#E5E9EE] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEF1F4] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0F1B33] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#002185]" />
                  Productivity Score Trajectory
                </h3>
                <p className="text-xs text-[#5B6B7C] mt-0.5">
                  Interactive score tracking vs benchmark target (85%)
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-[#002185]">
                  Current: {metricsSummary.latestProd}%
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={{ stroke: "#E5E9EE" }}
                    tick={{ fill: "#5B6B7C", fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    domain={[75, 100]}
                    tickLine={false}
                    axisLine={{ stroke: "#E5E9EE" }}
                    tick={{ fill: "#5B6B7C", fontSize: 11 }}
                    unit="%"
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <ReferenceLine
                    y={85}
                    stroke="#8B98A6"
                    strokeDasharray="4 4"
                    label={{
                      value: "Benchmark (85%)",
                      fill: "#8B98A6",
                      fontSize: 10,
                      position: "insideBottomRight",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="productivity"
                    name="Productivity Score"
                    stroke="#002185"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#002185", stroke: "#FFFFFF", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#002185", stroke: "#FFFFFF", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="qualityScore"
                    name="Quality Rating"
                    stroke="#2563EB"
                    strokeWidth={1.75}
                    strokeDasharray="3 3"
                    dot={{ r: 3, fill: "#2563EB" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between pt-2 text-[11px] text-[#5B6B7C] border-t border-[#EEF1F4]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-[#002185] rounded-full inline-block" />
                Productivity Score
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-[#2563EB] rounded-full inline-block" />
                Quality & Review Rating
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#8B98A6] border-b border-dashed inline-block" />
                Target (85%)
              </span>
            </div>
          </div>

          {/* Chart 2: Project Completion Rates */}
          <div className="bg-white border border-[#E5E9EE] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEF1F4] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0F1B33] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0F7A47]" />
                  Project & Milestone Completion Rates
                </h3>
                <p className="text-xs text-[#5B6B7C] mt-0.5">
                  Percentage of scheduled project deliverables delivered on time
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-[#0F7A47]">
                  Current: {metricsSummary.latestComp}%
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={{ stroke: "#E5E9EE" }}
                    tick={{ fill: "#5B6B7C", fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    domain={[75, 100]}
                    tickLine={false}
                    axisLine={{ stroke: "#E5E9EE" }}
                    tick={{ fill: "#5B6B7C", fontSize: 11 }}
                    unit="%"
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <ReferenceLine
                    y={90}
                    stroke="#0F7A47"
                    strokeDasharray="4 4"
                    label={{
                      value: "Goal (90%)",
                      fill: "#0F7A47",
                      fontSize: 10,
                      position: "insideBottomRight",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    name="Project Completion Rate"
                    stroke="#0F7A47"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#0F7A47", stroke: "#FFFFFF", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#0F7A47", stroke: "#FFFFFF", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between pt-2 text-[11px] text-[#5B6B7C] border-t border-[#EEF1F4]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-[#0F7A47] rounded-full inline-block" />
                Project Completion Rate (%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#0F7A47] border-b border-dashed inline-block" />
                Company Goal (90%)
              </span>
              <span className="text-[#0F7A47] font-medium">
                {metricsSummary.avgComp}% Average
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Unified Combined Multi-Metric Line Chart */
        <div className="bg-white border border-[#E5E9EE] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF1F4] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#0F1B33] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#002185]" />
                Unified Productivity & Project Completion Overview
              </h3>
              <p className="text-xs text-[#5B6B7C] mt-0.5">
                Side-by-side comparison of score velocity, project completion %, and task output
              </p>
            </div>

            {/* Metric Filter Tabs */}
            <div className="inline-flex items-center bg-[#F7F8FA] border border-[#E5E9EE] p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveMetric("all")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activeMetric === "all" ? "bg-[#002185] text-white" : "text-[#5B6B7C]"
                }`}
              >
                All Metrics
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("productivity")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activeMetric === "productivity" ? "bg-[#002185] text-white" : "text-[#5B6B7C]"
                }`}
              >
                Productivity Only
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("completion")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activeMetric === "completion" ? "bg-[#002185] text-white" : "text-[#5B6B7C]"
                }`}
              >
                Completion Only
              </button>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 15, right: 20, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" vertical={false} />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={{ stroke: "#E5E9EE" }}
                  tick={{ fill: "#5B6B7C", fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                  domain={[70, 100]}
                  tickLine={false}
                  axisLine={{ stroke: "#E5E9EE" }}
                  tick={{ fill: "#5B6B7C", fontSize: 11 }}
                  unit="%"
                />
                <Tooltip content={<CustomLineTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 10, fontSize: "12px" }}
                />
                <ReferenceLine
                  y={85}
                  stroke="#8B98A6"
                  strokeDasharray="3 3"
                  label={{ value: "Benchmark", fill: "#8B98A6", fontSize: 10 }}
                />

                {(activeMetric === "all" || activeMetric === "productivity") && (
                  <Line
                    type="monotone"
                    dataKey="productivity"
                    name="Productivity Score (%)"
                    stroke="#002185"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#002185", stroke: "#FFFFFF", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#002185" }}
                  />
                )}

                {(activeMetric === "all" || activeMetric === "completion") && (
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    name="Project Completion Rate (%)"
                    stroke="#0F7A47"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#0F7A47", stroke: "#FFFFFF", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#0F7A47" }}
                  />
                )}

                {activeMetric === "all" && (
                  <Line
                    type="monotone"
                    dataKey="qualityScore"
                    name="Quality Score (%)"
                    stroke="#2563EB"
                    strokeWidth={1.75}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: "#2563EB" }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Projects & Deliverables Breakdown Table */}
      <div className="bg-white border border-[#E5E9EE] rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#0F1B33] flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#8B98A6]" />
            Active & Completed Project Performance
          </h3>
          <span className="text-xs text-[#5B6B7C] font-medium">
            4 Recorded Projects
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E9EE] bg-[#F7F8FA] text-[#8B98A6] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Progress</th>
                <th className="py-2.5 px-3">Productivity</th>
                <th className="py-2.5 px-3">Quality Score</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F4]">
              {projectList.map((prj) => (
                <tr key={prj.id} className="hover:bg-[#F7F8FA] transition-colors">
                  <td className="py-3 px-3">
                    <p className="font-semibold text-[#0F1B33]">{prj.name}</p>
                    <span className="text-[11px] text-[#8B98A6] font-mono">{prj.id}</span>
                  </td>
                  <td className="py-3 px-3 text-[#5B6B7C]">{prj.category}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-[#EEF1F4] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#0F7A47] h-full rounded-full"
                          style={{ width: `${prj.completion}%` }}
                        />
                      </div>
                      <span className="font-medium text-[#0F1B33]">{prj.completion}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-[#002185] bg-[#F0F5FF] px-2 py-0.5 rounded-md border border-[#B6D0FE]">
                      {prj.productivityScore}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium text-[#0F1B33]">{prj.qualityRating}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${prj.badgeClass}`}
                    >
                      {prj.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
