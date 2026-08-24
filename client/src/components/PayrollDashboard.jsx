import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Banknote,
  DollarSign,
  TrendingUp,
  Building2,
  Users,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  Receipt,
  FileSpreadsheet,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { getPayrollAnalytics } from "../apis/fontApis";
import { useManagement } from "../context/ManagementContextProvider";

// Custom Chart Tooltip defined outside component to satisfy React Hook rules
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const row = payload[0]?.payload;
  return (
    <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-4 rounded-xl shadow-xl text-xs space-y-2 min-w-[220px]">
      <div className="border-b border-[#E2E8F0] dark:border-slate-800 pb-2 flex items-center justify-between">
        <span className="font-bold text-sm text-[#002185] dark:text-blue-400">
          {row?.monthFull || label}
        </span>
        {row?.headcount && (
          <span className="text-[10px] bg-[#F1F5F9] dark:bg-slate-800 px-2 py-0.5 rounded-full text-[#64748B] dark:text-slate-300 font-semibold">
            {row.headcount} Staff
          </span>
        )}
      </div>

      <div className="space-y-1.5 pt-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[#64748B] dark:text-slate-300 font-medium">
                {entry.name}:
              </span>
            </div>
            <span className="font-bold text-[#0F172A] dark:text-slate-100">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>

      {row?.effectiveTaxRate && (
        <div className="border-t border-[#E2E8F0] dark:border-slate-800 pt-2 flex items-center justify-between text-[11px]">
          <span className="text-[#64748B] dark:text-slate-400">Effective Tax:</span>
          <span className="font-bold text-[#6366F1]">{row.effectiveTaxRate}%</span>
        </div>
      )}
    </div>
  );
};

export const PayrollDashboard = ({
  onOpenGenerateModal = null,
  onOpenCalculator = null,
}) => {
  const { setShowToast } = useManagement();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [chartMode, setChartMode] = useState("disbursement_vs_tax"); // 'disbursement_vs_tax' | 'tax_breakdown' | 'all_metrics'
  const [isStacked, setIsStacked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  const availableYears = [2026, 2025, 2024];
  const departments = [
    "All",
    "Engineering",
    "Sales & Marketing",
    "Human Resources",
    "Operations",
    "Finance & Accounting",
    "Customer Support",
    "Product & Design",
  ];

  // Fetch real / dynamic analytics from backend
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await getPayrollAnalytics({
        year: selectedYear,
        department: selectedDepartment,
      });

      if (res.data && res.data.success) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      console.error("Error fetching payroll analytics:", err);
      setShowToast({
        show: true,
        message: "Failed to load latest payroll analytics data.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedYear, selectedDepartment]);

  // Currency Formatter
  const formatCurrency = (val) => {
    return (val || 0).toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatCurrencyDetailed = (val) => {
    return (val || 0).toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // KPI Summary Metrics
  const summary = analyticsData?.summaryCards || {
    totalNetDisbursedYear: 0,
    totalNetDisbursedCurrentMonth: 0,
    totalTaxDeductedYear: 0,
    totalTaxCurrentMonth: 0,
    totalGrossYear: 0,
    totalGrossCurrentMonth: 0,
    totalAllowancesYear: 0,
    avgMonthlyNetDisbursement: 0,
    avgNetSalaryPerEmployee: 0,
    effectiveTaxRate: 11.5,
    totalHeadcount: 0,
  };

  const monthlyData = analyticsData?.monthlyDisbursements || [];
  const deptData = analyticsData?.departmentDisbursements || [];
  const taxCategories = analyticsData?.taxCategoryBreakdown || [];

  // Export CSV Report of Payroll Disbursements & Tax Deductions
  const handleExportCSV = () => {
    if (!monthlyData || monthlyData.length === 0) return;

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += `PAYROLL SALARY DISBURSEMENTS & TAX DEDUCTIONS REPORT (${selectedYear})\n`;
    csvContent += `Department Filter: ${selectedDepartment}\n`;
    csvContent += `Generated At: ${new Date().toLocaleString("en-GH")}\n\n`;

    // Monthly Data Table
    csvContent += "MONTHLY SUMMARY BREAKDOWN\n";
    csvContent += "Month,Base Salary (GHS),Allowances (GHS),Gross Payroll (GHS),PAYE Tax (GHS),SSNIT / Pension (GHS),Health NHIS (GHS),Absence Deductions (GHS),Total Deductions (GHS),Net Disbursed (GHS),Effective Tax Rate (%),Headcount\n";

    monthlyData.forEach((row) => {
      csvContent += `"${row.monthFull}",${row.baseSalary},${row.allowances},${row.grossSalary},${row.taxDeductions},${row.socialSecurity},${row.healthInsurance},${row.absenteeismDeductions},${row.totalDeductions},${row.netSalary},"${row.effectiveTaxRate}%",${row.headcount}\n`;
    });

    // Department Breakdown Table
    if (deptData && deptData.length > 0) {
      csvContent += "\n\nDEPARTMENTAL DISBURSEMENT & TAX ALLOCATION\n";
      csvContent += "Department,Staff Count,Base Salary (GHS),Allowances (GHS),Gross Salary (GHS),Tax Deductions (GHS),SSNIT Contribution (GHS),Total Deductions (GHS),Net Disbursed (GHS),Effective Tax Rate (%)\n";
      deptData.forEach((d) => {
        csvContent += `"${d.department}",${d.employeeCount},${d.baseSalary},${d.allowances},${d.grossSalary},${d.taxDeductions},${d.socialSecurity},${d.totalDeductions},${d.netSalary},"${d.effectiveTaxRate}%"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Payroll_Disbursements_and_Taxes_${selectedYear}_${selectedDepartment.replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowToast({
      show: true,
      message: "Payroll & Tax Analytics CSV report exported successfully!",
      type: "success",
    });
  };

  return (
    <div id="payroll-analytics-dashboard" className="space-y-6 animate-fade-in">
      {/* Top Banner & Header Toolbar */}
      <div className="bg-gradient-to-r from-[#002185] via-[#0A2E9E] to-[#002185] rounded-2xl p-6 text-white shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ff5500] text-white uppercase tracking-wider">
              Executive Analytics
            </span>
            <span className="text-xs text-white/80 font-medium">
              Fiscal Year {selectedYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Payroll Disbursements & Tax Deductions Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-white/75 mt-1 max-w-2xl leading-relaxed">
            Real-time visualization of monthly gross salary commitments, statutory tax withholdings (PAYE, SSNIT, NHIS), and net salary bank disbursements.
          </p>
        </div>

        {/* Global Action & Filter Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Selector */}
          <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 backdrop-blur-xs">
            <Calendar className="w-4 h-4 text-white/80 mr-2" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} className="text-[#0F172A] bg-white">
                  Year {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 backdrop-blur-xs">
            <Building2 className="w-4 h-4 text-white/80 mr-2" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[140px]"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept} className="text-[#0F172A] bg-white">
                  {dept === "All" ? "All Departments" : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV Action */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white text-[#002185] hover:bg-white/90 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Export CSV</span>
          </button>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={isLoading}
            title="Refresh analytics data"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net Disbursed YTD */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-[#16A34A]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
              Total Net Disbursed ({selectedYear})
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#0F172A] dark:text-slate-100 tracking-tight">
              {formatCurrency(summary.totalNetDisbursedYear)}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#16A34A] font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{formatCurrency(summary.totalNetDisbursedCurrentMonth)} / this month</span>
            </div>
          </div>
        </div>

        {/* Total Tax & Statutory Deductions */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-[#6366F1]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
              Total Tax & Deductions ({selectedYear})
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#0F172A] dark:text-slate-100 tracking-tight">
              {formatCurrency(summary.totalTaxDeductedYear)}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6366F1] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PAYE, SSNIT & NHIS Statutory</span>
            </div>
          </div>
        </div>

        {/* Total Gross Payroll Commitment */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-[#002185]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
              Total Gross Payroll ({selectedYear})
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#002185]/10 dark:bg-blue-500/20 text-[#002185] dark:text-blue-400 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#0F172A] dark:text-slate-100 tracking-tight">
              {formatCurrency(summary.totalGrossYear)}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748B] dark:text-slate-400 font-medium">
              <span>Allowances: {formatCurrency(summary.totalAllowancesYear)}</span>
            </div>
          </div>
        </div>

        {/* Effective Tax Rate & Headcount */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-[#ff5500]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
              Effective Withholding Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#ff5500]/10 text-[#ff5500] flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#0F172A] dark:text-slate-100 tracking-tight">
              {summary.effectiveTaxRate}%
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748B] dark:text-slate-400 font-medium">
              <Users className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400" />
              <span>{summary.totalHeadcount} Active Staff on Payroll</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar Chart Visualization Section */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        {/* Chart View Controls & Switchers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#002185] dark:text-blue-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#ff5500]" />
              <span>Monthly Salary Disbursements & Tax Deductions (Bar Chart)</span>
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Monthly side-by-side comparison of net salary paid out vs total tax & statutory withholdings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Tabs */}
            <div className="flex items-center p-1 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartMode("disbursement_vs_tax")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartMode === "disbursement_vs_tax"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] dark:text-slate-400 hover:text-[#002185] dark:hover:text-blue-400"
                }`}
              >
                Disbursements vs Taxes
              </button>
              <button
                type="button"
                onClick={() => setChartMode("tax_breakdown")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartMode === "tax_breakdown"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] dark:text-slate-400 hover:text-[#002185] dark:hover:text-blue-400"
                }`}
              >
                Tax Breakdown
              </button>
              <button
                type="button"
                onClick={() => setChartMode("all_metrics")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartMode === "all_metrics"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] dark:text-slate-400 hover:text-[#002185] dark:hover:text-blue-400"
                }`}
              >
                All Metrics
              </button>
            </div>

            {/* Stacked vs Grouped Toggle */}
            <button
              type="button"
              onClick={() => setIsStacked(!isStacked)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isStacked
                  ? "bg-[#002185]/10 text-[#002185] border-[#002185]/30 dark:bg-blue-500/20 dark:text-blue-400"
                  : "bg-white dark:bg-slate-800 text-[#64748B] dark:text-slate-300 border-[#E2E8F0] dark:border-slate-700"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isStacked ? "Stacked Bars" : "Grouped Bars"}</span>
            </button>
          </div>
        </div>

        {/* Primary Interactive Bar Chart */}
        <div className="h-[360px] w-full pt-2">
          {monthlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-8 text-[#64748B]">
              <p>No payroll disbursement data found for the selected period.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                barGap={4}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#64748B", fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: "#CBD5E1" }}
                />
                <YAxis
                  tickFormatter={(val) => `GHS ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#CBD5E1" }}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                  iconType="circle"
                />

                {/* Conditional Bars based on chartMode */}
                {chartMode === "disbursement_vs_tax" && (
                  <>
                    <Bar
                      dataKey="netSalary"
                      name="Net Salary Disbursed"
                      fill="#16A34A"
                      radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "a" : undefined}
                    />
                    <Bar
                      dataKey="baseSalary"
                      name="Base Salary"
                      fill="#002185"
                      radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "a" : undefined}
                    />
                    <Bar
                      dataKey="totalTaxAndStatutory"
                      name="Tax & Deductions"
                      fill="#6366F1"
                      radius={isStacked ? [6, 6, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "a" : undefined}
                    />
                  </>
                )}

                {chartMode === "tax_breakdown" && (
                  <>
                    <Bar
                      dataKey="taxDeductions"
                      name="Income Tax (PAYE)"
                      fill="#6366F1"
                      radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "tax" : undefined}
                    />
                    <Bar
                      dataKey="socialSecurity"
                      name="SSNIT / Pension (5.5%)"
                      fill="#002185"
                      radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "tax" : undefined}
                    />
                    <Bar
                      dataKey="healthInsurance"
                      name="Health NHIS (2.5%)"
                      fill="#06B6D4"
                      radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "tax" : undefined}
                    />
                    <Bar
                      dataKey="absenteeismDeductions"
                      name="Absence Deductions"
                      fill="#DC2626"
                      radius={isStacked ? [6, 6, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "tax" : undefined}
                    />
                  </>
                )}

                {chartMode === "all_metrics" && (
                  <>
                    <Bar
                      dataKey="grossSalary"
                      name="Gross Payroll"
                      fill="#002185"
                      radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "main" : undefined}
                    />
                    <Bar
                      dataKey="netSalary"
                      name="Net Disbursed"
                      fill="#16A34A"
                      radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "main" : undefined}
                    />
                    <Bar
                      dataKey="allowances"
                      name="Allowances"
                      fill="#ff5500"
                      radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "main" : undefined}
                    />
                    <Bar
                      dataKey="totalDeductions"
                      name="Total Taxes & Deductions"
                      fill="#6366F1"
                      radius={isStacked ? [6, 6, 0, 0] : [6, 6, 0, 0]}
                      stackId={isStacked ? "main" : undefined}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Secondary Visual Section: Department Breakdown & Tax Allocation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Departmental Comparison Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#002185] dark:text-blue-400 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#002185] dark:text-blue-400" />
                <span>Departmental Payroll & Tax Comparison</span>
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                Disbursements and tax liabilities across operational divisions
              </p>
            </div>
            <span className="text-xs font-semibold bg-[#F8FAFC] dark:bg-slate-800 px-2.5 py-1 rounded-lg text-[#64748B] dark:text-slate-300">
              {deptData.length} Departments
            </span>
          </div>

          <div className="h-[280px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deptData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis
                  type="number"
                  tickFormatter={(val) => `GHS ${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  axisLine={{ stroke: "#CBD5E1" }}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 600 }}
                  axisLine={{ stroke: "#CBD5E1" }}
                  width={90}
                />
                <Tooltip
                  formatter={(val, name) => [formatCurrencyDetailed(val), name]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                <Bar dataKey="netSalary" name="Net Disbursed" fill="#16A34A" radius={[0, 4, 4, 0]} />
                <Bar dataKey="taxDeductions" name="Tax Withheld" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statutory Tax Deductions Composition (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#002185] dark:text-blue-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                  <span>Tax & Statutory Withholdings Breakdown</span>
                </h3>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                  Annual cumulative deductions composition
                </p>
              </div>
            </div>

            {/* List of Tax Category Cards */}
            <div className="mt-4 space-y-3">
              {taxCategories.map((item, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC]/70 dark:bg-slate-950/70 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 rounded-md shrink-0"
                      style={{ backgroundColor: item.fill }}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                        {item.percentage}% of total withholdings
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-[#002185] dark:text-blue-400">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center gap-2.5">
            {onOpenGenerateModal && (
              <button
                type="button"
                onClick={onOpenGenerateModal}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#002185] text-white hover:bg-[#ff5500] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Generate Payroll</span>
              </button>
            )}
            {onOpenCalculator && (
              <button
                type="button"
                onClick={onOpenCalculator}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#002185] dark:text-blue-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff5500]" />
                <span>Attendance Calc</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
