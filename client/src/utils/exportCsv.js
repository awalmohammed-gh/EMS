/**
 * Utility to export an array of employee objects to a downloadable CSV file.
 * Handles character escaping, dates, salaries, and UTF-8 BOM encoding for Excel compatibility.
 */
export const exportEmployeesToCSV = (
  employeeList = [],
  filename = `employee_directory_${new Date().toISOString().split("T")[0]}.csv`
) => {
  if (!employeeList || employeeList.length === 0) {
    return false;
  }

  const headers = [
    "Employee ID",
    "Full Name",
    "Email Address",
    "Phone Number",
    "Department",
    "Position / Title",
    "Employment Type",
    "Status",
    "Work Location",
    "Date Joined",
    "Basic Salary (GHS)",
    "Emergency Contact Name",
    "Emergency Contact Phone",
  ];

  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = employeeList.map((emp) => {
    const statusStr =
      emp.status || (emp.isActive !== false ? "Active" : "Inactive");
    const joinedStr = emp.joiningDate
      ? new Date(emp.joiningDate).toISOString().split("T")[0]
      : emp.createdAt
      ? new Date(emp.createdAt).toISOString().split("T")[0]
      : "N/A";

    return [
      escapeCSV(emp.employeeId || "N/A"),
      escapeCSV(emp.fullName || ""),
      escapeCSV(emp.email || ""),
      escapeCSV(emp.phone || "N/A"),
      escapeCSV(emp.department || "General"),
      escapeCSV(emp.position || "Staff"),
      escapeCSV(emp.employmentType || "Full-time"),
      escapeCSV(statusStr),
      escapeCSV(emp.location || emp.officeLocation || "Accra HQ"),
      escapeCSV(joinedStr),
      escapeCSV(emp.salary !== undefined ? emp.salary : 0),
      escapeCSV(emp.emergencyContact || emp.emergencyName || "N/A"),
      escapeCSV(emp.emergencyPhone || emp.emergencyContactPhone || "N/A"),
    ];
  });

  // Prepend UTF-8 Byte Order Mark (\uFEFF) for seamless opening in Excel, Sheets, and Numbers
  const csvContent =
    "\uFEFF" +
    [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};
