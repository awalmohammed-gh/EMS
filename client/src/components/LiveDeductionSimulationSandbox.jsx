import { useState, useId, useMemo } from "react";
import {
  Calculator,
  Clock,
  UserX,
  Banknote,
  Sparkles,
  TrendingDown,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

/**
 * LiveDeductionSimulationSandbox
 * A modern, high-contrast, responsive dashboard widget for simulating attendance deductions & net payroll.
 */
export const LiveDeductionSimulationSandbox = ({
  penalties = {
    workStartTime: "08:00",
    absenceDeductionRate: 10,
    lateTier1_amount: 5,
    lateTier2_amount: 10,
    lateTier3_amount: 20,
    lateTier4_amount: 35,
    lateTier5_amount: 50,
    lateTier6_amount: 75,
  },
  className = "",
}) => {
  // Live React State
  const [simClockIn, setSimClockIn] = useState("08:45");
  const [simAbsentDays, setSimAbsentDays] = useState(2);
  const [simBaseSalary, setSimBaseSalary] = useState(4500);

  // Unique IDs for accessibility & labels
  const simClockInId = useId();
  const simAbsentDaysId = useId();
  const simBaseSalaryId = useId();

  // Helper to parse time string "HH:MM" into total minutes from midnight
  const parseMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(":").map((v) => parseInt(v, 10) || 0);
    return hours * 60 + minutes;
  };

  // Live evaluation of lateness penalty based on tiered schedule
  const latenessResult = useMemo(() => {
    const startTimeStr = penalties?.workStartTime || "08:00";
    if (!simClockIn) {
      return { minutesLate: 0, penalty: 0, tier: "On Time", status: "on-time" };
    }

    const startMins = parseMinutes(startTimeStr);
    const clockMins = parseMinutes(simClockIn);
    const diff = clockMins - startMins;

    if (diff <= 0) {
      return { minutesLate: 0, penalty: 0, tier: "On Time", status: "on-time" };
    }

    const tier1 = Number(penalties?.lateTier1_amount || 0);
    const tier2 = Number(penalties?.lateTier2_amount || 0);
    const tier3 = Number(penalties?.lateTier3_amount || 0);
    const tier4 = Number(penalties?.lateTier4_amount || 0);
    const tier5 = Number(penalties?.lateTier5_amount || 0);
    const tier6 = Number(penalties?.lateTier6_amount || 0);

    if (diff <= 30) {
      return { minutesLate: diff, penalty: tier1, tier: "Tier 1 (1–30m)", status: "late" };
    }
    if (diff <= 60) {
      return { minutesLate: diff, penalty: tier2, tier: "Tier 2 (31–60m)", status: "late" };
    }
    if (diff <= 120) {
      return { minutesLate: diff, penalty: tier3, tier: "Tier 3 (1–2h)", status: "late" };
    }
    if (diff <= 180) {
      return { minutesLate: diff, penalty: tier4, tier: "Tier 4 (2–3h)", status: "late" };
    }
    if (diff <= 240) {
      return { minutesLate: diff, penalty: tier5, tier: "Tier 5 (3–4h)", status: "late" };
    }
    return { minutesLate: diff, penalty: tier6, tier: "Tier 6 (4–5+h)", status: "late" };
  }, [simClockIn, penalties]);

  // Calculations
  const absenceRate = Number(penalties?.absenceDeductionRate || 10);
  const totalAbsenceDeduction = simAbsentDays * absenceRate;
  const totalDeductions = totalAbsenceDeduction + latenessResult.penalty;
  const simulatedNetPay = Math.max(0, simBaseSalary - totalDeductions);
  const deductionPercentage =
    simBaseSalary > 0
      ? ((totalDeductions / simBaseSalary) * 100).toFixed(1)
      : "0.0";

  const formatCurrency = (val) => {
    return `GH₵${Number(val || 0).toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div
      id="live-deduction-simulation-sandbox"
      className={`bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl transition-all ${className}`}
    >
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl shadow-inner flex items-center justify-center shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Live Deduction Simulation Sandbox
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Engine
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Simulate shift delays and absence rules to evaluate real-time employee net pay outcomes
            </p>
          </div>
        </div>

        {/* Formula Pill Tag */}
        <div className="self-start md:self-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold bg-slate-800/80 text-blue-300 border border-slate-700/60 rounded-full shadow-inner tracking-tight">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Formula: Net = Base − (Absence + Late)</span>
          </span>
        </div>
      </div>

      {/* 2. Responsive Layout Grid: Left Inputs (5 cols), Right Live Computed Metrics (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left Section: Interactive Input Controls */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
          {/* Input 1: Simulated Clock-In */}
          <div className="space-y-1.5">
            <label
              htmlFor={simClockInId}
              className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Simulated Clock-In
              </span>
              <span className="text-[10px] lowercase text-slate-500 font-normal">
                (Shift: {penalties?.workStartTime || "08:00"})
              </span>
            </label>
            <div className="relative">
              <input
                id={simClockInId}
                type="time"
                value={simClockIn}
                onChange={(e) => setSimClockIn(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white font-semibold rounded-xl px-3.5 py-2.5 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Input 2: Absent Days */}
          <div className="space-y-1.5">
            <label
              htmlFor={simAbsentDaysId}
              className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              <span className="flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-rose-400" />
                Absent Days
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                @ GH₵{absenceRate}/day
              </span>
            </label>
            <div className="relative">
              <input
                id={simAbsentDaysId}
                type="number"
                min="0"
                max="31"
                step="1"
                value={simAbsentDays}
                onChange={(e) =>
                  setSimAbsentDays(Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white font-semibold rounded-xl px-3.5 py-2.5 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Input 3: Base Salary */}
          <div className="space-y-1.5">
            <label
              htmlFor={simBaseSalaryId}
              className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              <span className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                Base Salary (GH₵)
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Monthly Gross</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                GH₵
              </div>
              <input
                id={simBaseSalaryId}
                type="number"
                min="0"
                step="50"
                value={simBaseSalary}
                onChange={(e) =>
                  setSimBaseSalary(Math.max(0, parseFloat(e.target.value) || 0))
                }
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white font-semibold rounded-xl pl-12 pr-3.5 py-2.5 outline-none transition-all text-sm"
              />
            </div>
          </div>
        </div>

        {/* Right Section: 4 Live Computed Metrics Panel */}
        <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-inner">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-blue-400" />
              Real-Time Calculation Output
            </span>
            <span className="text-[11px] text-slate-500">
              Total Deductions: {formatCurrency(totalDeductions)} ({deductionPercentage}%)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Metric 1: Delay Badge (Vibrant Amber/Orange) */}
            <div
              id="sim-card-delay"
              className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between space-y-1 hover:border-amber-500/30 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  Delay
                </span>
                <Clock className="w-3.5 h-3.5 text-amber-400/80" />
              </div>
              <div>
                <div className="text-amber-400 font-extrabold text-lg sm:text-xl tracking-tight">
                  {latenessResult.minutesLate > 0
                    ? `${latenessResult.minutesLate} min`
                    : "0 min"}
                </div>
                <div className="text-[11px] text-amber-500/80 font-medium truncate mt-0.5">
                  {latenessResult.minutesLate > 0
                    ? latenessResult.tier
                    : "On Time Shift"}
                </div>
              </div>
            </div>

            {/* Metric 2: Late Penalty Badge (Crisp Red) */}
            <div
              id="sim-card-late-penalty"
              className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between space-y-1 hover:border-rose-500/30 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  Late Penalty
                </span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400/80" />
              </div>
              <div>
                <div className="text-rose-400 font-extrabold text-lg sm:text-xl tracking-tight">
                  GH₵{latenessResult.penalty.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                  {latenessResult.penalty > 0 ? "Per shift fine" : "No late fine"}
                </div>
              </div>
            </div>

            {/* Metric 3: Absence Ded. (Crisp Red) */}
            <div
              id="sim-card-absence-deduction"
              className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between space-y-1 hover:border-rose-500/30 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  Absence Ded.
                </span>
                <UserX className="w-3.5 h-3.5 text-rose-400/80" />
              </div>
              <div>
                <div className="text-rose-400 font-extrabold text-lg sm:text-xl tracking-tight">
                  GH₵{totalAbsenceDeduction.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                  {simAbsentDays}d @ GH₵{absenceRate}
                </div>
              </div>
            </div>

            {/* Metric 4: Simulated Net Pay (High-emphasis Emerald Card) */}
            <div
              id="sim-card-simulated-net"
              className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between space-y-1 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/50 transition-colors"
            >
              <div className="flex items-center justify-between text-emerald-300">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  Simulated Net
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <div className="font-black text-xl sm:text-2xl text-emerald-400 tracking-tight">
                  {formatCurrency(simulatedNetPay)}
                </div>
                <div className="text-[11px] text-emerald-300/80 font-medium mt-0.5">
                  Payable Net Salary
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Footer Informational Banner */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Adjusting values above models real-time payroll impacts instantly without modifying saved company rules.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Shift: {penalties?.workStartTime || "08:00"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Absence: GH₵{absenceRate}/day
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveDeductionSimulationSandbox;
