import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  ShieldCheck,
  Flag,
  RotateCcw,
  Eye,
  Edit3,
  Trash2,
  Zap,
  CheckCircle2,
  Printer,
} from "lucide-react";

const AttendanceQuickActionsMenu = ({
  item,
  onExcuse,
  onFlag,
  onUnflag,
  onRecalculate,
  onViewDetails,
  onPrintReport,
  onEdit,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const isExcused = Boolean(item.isExcused);
  const isFlagged = Boolean(item.flaggedForReview);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Quick Actions Trigger Button */}
      <button
        type="button"
        id={`quick-action-btn-${item._id || item.id}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
          isFlagged
            ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
            : isExcused
            ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
            : isOpen
            ? "bg-[#002185] text-white border-[#002185] shadow-xs"
            : "bg-white text-[#002185] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#002185]/40"
        }`}
        title="Open Quick Actions Menu"
      >
        <Zap className={`w-3.5 h-3.5 ${isExcused ? "text-emerald-600" : isFlagged ? "text-amber-600" : "text-[#002185]"}`} />
        <span className="hidden sm:inline">Actions</span>
        <MoreVertical className="w-3.5 h-3.5 opacity-70" />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          id={`quick-action-menu-${item._id || item.id}`}
          className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-white shadow-xl border border-[#E2E8F0] py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150 origin-top-right text-left divide-y divide-[#F1F5F9]"
        >
          {/* Header Info */}
          <div className="px-3 py-1.5 bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] flex items-center justify-between">
            <span className="truncate">
              {item.employee?.fullName?.split(" ")[0] || "Quick Actions"}
            </span>
            <span className="text-[10px] text-[#94A3B8]">
              {item.date}
            </span>
          </div>

          {/* Lateness & Management Actions */}
          <div className="py-1">
            {/* Excuse Lateness Option */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onExcuse(item);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-[#1E293B] hover:bg-emerald-50 hover:text-emerald-800 transition-colors flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-emerald-900 leading-tight">
                  {isExcused ? "Edit Excuse Reason" : "Excuse Lateness"}
                </p>
                <p className="text-[10px] text-[#64748B]">
                  {isExcused ? "Lateness waived (GH₵0)" : "Waive penalty deduction"}
                </p>
              </div>
            </button>

            {/* Flag / Unflag for Review */}
            {isFlagged ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onUnflag(item);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-[#1E293B] hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 leading-tight">
                    Remove Review Flag
                  </p>
                  <p className="text-[10px] text-[#64748B]">
                    Clear supervisor notice
                  </p>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onFlag(item);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-[#1E293B] hover:bg-amber-50 hover:text-amber-900 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Flag className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-amber-900 leading-tight">
                    Flag for HR Review
                  </p>
                  <p className="text-[10px] text-[#64748B]">
                    Mark for audit or policy notice
                  </p>
                </div>
              </button>
            )}

            {/* Recalculate Policy Penalty */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onRecalculate(item);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-[#1E293B] hover:bg-blue-50 hover:text-blue-900 transition-colors flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[#002185] leading-tight">
                  Recalculate Policy
                </p>
                <p className="text-[10px] text-[#64748B]">
                  Reset to shift rules & tiers
                </p>
              </div>
            </button>
          </div>

          {/* Standard Navigation / Editing & Print Report */}
          <div className="py-1">
            {typeof onPrintReport === "function" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onPrintReport(item);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-[#1e3a8a] hover:bg-blue-50 transition-colors flex items-center gap-2 cursor-pointer font-semibold"
              >
                <Printer className="w-3.5 h-3.5 text-[#1e3a8a]" />
                <span>Print Official Report</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onViewDetails(item);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC] hover:text-[#002185] transition-colors flex items-center gap-2 cursor-pointer font-medium"
            >
              <Eye className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Full Record Log</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onEdit(item);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC] hover:text-[#002185] transition-colors flex items-center gap-2 cursor-pointer font-medium"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Manual Edit / Override</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onDelete(item);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer font-medium"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Delete Record</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceQuickActionsMenu;
