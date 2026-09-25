/**
 * Comprehensive HR Reporting & Employee Database CSV Export Engine.
 * Handles character escaping, dates, salaries, filters, and UTF-8 BOM encoding
 * for seamless compatibility with Microsoft Excel, Google Sheets, Apple Numbers, and HRIS systems.
 */

const escapeCSV = (value) => {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Trigger browser file download for a given Blob or CSV string.
 */
export const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Standard employee export (maintained for backward compatibility).
 */
export const exportEmployeesToCSV = (
  employeeList = [],
  filename = `employee_directory_${new Date().toISOString().split("T")[0]}.csv`
) => {
  return exportHREmployeeReportToCSV(employeeList, { filename });
};

/**
 * Full-featured HR Employee Database CSV Export with custom filtering and comprehensive auditing fields.
 */
export const exportHREmployeeReportToCSV = (
  employeeList = [],
  options = {}
) => {
  if (!employeeList || employeeList.length === 0) {
    return { success: false, message: "No employee records found to export.", count: 0 };
  }

  const {
    filterStatus = "all",
    filterDepartment = "all",
    reportType: _reportType = "full_audit", // "full_audit" | "directory"
    filename = `workpulse_hr_employee_report_${new Date().toISOString().split("T")[0]}.csv`,
  } = options;

  // 1. Apply filtering
  const filteredList = employeeList.filter((emp) => {
    const rawStatus = (emp.status || (emp.isActive !== false ? "active" : "inactive")).toLowerCase().trim();
    if (filterStatus !== "all" && rawStatus !== filterStatus.toLowerCase()) {
      return false;
    }
    if (filterDepartment !== "all" && (emp.department || "General").toLowerCase() !== filterDepartment.toLowerCase()) {
      return false;
    }
    return true;
  });

  if (filteredList.length === 0) {
    return {
      success: false,
      message: "No employees match the selected filter criteria.",
      count: 0,
    };
  }

  // 2. Define Headers
  const headers = [
    "Employee ID",
    "Full Name",
    "Email Address",
    "Phone Number",
    "Department",
    "Position / Job Title",
    "Employment Type",
    "Employment Status",
    "Date Joined",
    "Basic Monthly Salary (GHS)",
    "Work Location",
    "System Role",
    "Emergency Contact Name",
    "Emergency Contact Phone",
    "Record Created Date",
  ];

  // 3. Map Rows
  const rows = filteredList.map((emp) => {
    const statusStr =
      emp.status || (emp.isActive !== false ? "Active" : "Inactive");

    const joinedStr = emp.employmentDate
      ? new Date(emp.employmentDate).toISOString().split("T")[0]
      : emp.joiningDate
      ? new Date(emp.joiningDate).toISOString().split("T")[0]
      : emp.createdAt
      ? new Date(emp.createdAt).toISOString().split("T")[0]
      : "N/A";

    const createdStr = emp.createdAt
      ? new Date(emp.createdAt).toISOString().split("T")[0]
      : "N/A";

    const salaryVal =
      emp.baseSalary !== undefined
        ? emp.baseSalary
        : emp.salary !== undefined
        ? emp.salary
        : emp.basicSalary !== undefined
        ? emp.basicSalary
        : 0;

    const numSalary = Number(salaryVal);
    const salaryFormatted = isNaN(numSalary) ? "0.00" : numSalary.toFixed(2);

    return [
      escapeCSV(emp.employeeId || "N/A"),
      escapeCSV(emp.fullName || ""),
      escapeCSV(emp.email || ""),
      escapeCSV(emp.phone || "N/A"),
      escapeCSV(emp.department || "General"),
      escapeCSV(emp.position || "Staff Member"),
      escapeCSV(emp.employmentType || "Full-time"),
      escapeCSV(statusStr),
      escapeCSV(joinedStr),
      escapeCSV(salaryFormatted),
      escapeCSV(emp.location || emp.officeLocation || "Accra Head Office"),
      escapeCSV(emp.role || "employee"),
      escapeCSV(emp.emergencyContact || emp.emergencyName || "N/A"),
      escapeCSV(emp.emergencyPhone || emp.emergencyContactPhone || "N/A"),
      escapeCSV(createdStr),
    ];
  });

  // 4. Prepend UTF-8 Byte Order Mark (\uFEFF)
  const csvContent =
    "\uFEFF" +
    [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);

  return {
    success: true,
    count: filteredList.length,
    filename,
    message: `Successfully exported ${filteredList.length} employee record${filteredList.length === 1 ? "" : "s"} to CSV.`,
  };
};

export default {
  exportEmployeesToCSV,
  exportHREmployeeReportToCSV,
  triggerDownload,
};
