import React from "react";
import { useManagement } from "../context/ManagementContextProvider";
import DefaultPlatformLogo from "./DefaultPlatformLogo";

export const EmployeeHeader = ({ title, subtitle }) => {
  const { company, companyLogoUrl, user } = useManagement();
  const activeLogo = company?.logoUrl || companyLogoUrl;

  const employeeName = user?.fullName || "Employee";
  const displayTitle = title || `Welcome back, ${employeeName.split(" ")[0]}!`;
  const displaySubtitle = subtitle || "Track daily attendance, view payslips, and manage leave requests.";

  return (
    <header className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Custom Company Logo with DefaultPlatformLogo fallback */}
          {activeLogo ? (
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-center p-1 overflow-hidden shrink-0">
              <img
                src={activeLogo}
                alt={company?.name || company?.companyName || "Company Logo"}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = "flex";
                  }
                }}
              />
              <div className="hidden w-full h-full items-center justify-center bg-[#0B1E48] text-white font-bold text-sm rounded-lg">
                {(company?.name || company?.companyName || "W").charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <DefaultPlatformLogo className="w-12 h-12" />
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E48] dark:text-blue-100">
              {displayTitle}
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {displaySubtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 font-medium flex items-center gap-2 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {new Date().toLocaleDateString("en-GH", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default EmployeeHeader;
