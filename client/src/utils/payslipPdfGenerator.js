import { jsPDF } from "jspdf";
import logo from "../assets/eyenit_logo.png";

/**
 * Formats a numeric value into standard Ghana Cedis (GH₵) currency representation
 */
export const formatCurrency = (amount) => {
  const val = Number(amount) || 0;
  return `GH₵${val.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Formats a date string into readable human format (e.g. "24 August 2026")
 */
export const formatPayslipDate = (dateString) => {
  if (!dateString) {
    return new Date().toLocaleDateString("en-GH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-GH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

/**
 * Normalizes payslip record fields across various API payloads
 */
export const normalizePayslipData = (payslip = {}) => {
  const employeeName =
    payslip.employee?.fullName ||
    payslip.employeeName ||
    payslip.name ||
    "Employee";
  const employeeId =
    payslip.employee?.employeeId ||
    payslip.employeeId ||
    "EMP-001";
  const department =
    payslip.employee?.department ||
    payslip.department ||
    "General";
  const position =
    payslip.employee?.position ||
    payslip.position ||
    "Staff Member";

  const payslipId =
    payslip.payslipNumber ||
    payslip.id ||
    (payslip._id ? `PAY-${String(payslip._id).slice(-6).toUpperCase()}` : "PAY-10024");

  const payPeriod =
    payslip.payMonth ||
    payslip.month ||
    "August 2026";

  const paymentDate = formatPayslipDate(payslip.paymentDate);
  const dateGenerated = formatPayslipDate(new Date());

  const basicSalary = Number(
    payslip.basicSalary !== undefined
      ? payslip.basicSalary
      : payslip.baseSalary !== undefined
      ? payslip.baseSalary
      : 4000
  );

  // Dynamic mapped allowances
  let dynamicAllowances = [];
  if (Array.isArray(payslip.earnings) && payslip.earnings.length > 0) {
    dynamicAllowances = payslip.earnings.map((item) => ({
      description: item.description || item.name || item.label || "Allowance",
      amount: Number(item.amount || 0),
    }));
  } else if (Number(payslip.allowances || payslip.totalEarnings || 0) > 0) {
    dynamicAllowances = [
      {
        description: "Allowances & Performance Bonuses",
        amount: Number(payslip.allowances || payslip.totalEarnings),
      },
    ];
  }

  // Dynamic mapped deductions
  let dynamicDeductions = [];
  if (Array.isArray(payslip.deductions) && payslip.deductions.length > 0) {
    dynamicDeductions = payslip.deductions.map((item) => ({
      description: item.description || item.name || item.label || "Deduction",
      amount: Number(item.amount || 0),
    }));
  } else if (
    typeof payslip.deductions === "number" &&
    Number(payslip.deductions) > 0
  ) {
    dynamicDeductions = [
      {
        description: "Statutory Deductions & Taxes",
        amount: Number(payslip.deductions),
      },
    ];
  }

  // Absenteeism penalty (GH₵10/day or absentDaysDeduction)
  const absentDaysDeduction = Number(
    payslip.absentDaysDeduction ||
      payslip.absenteeismDeductions ||
      (payslip.absentDays ? Number(payslip.absentDays) * 10 : 0)
  );

  const totalAllowances = dynamicAllowances.reduce(
    (acc, curr) => acc + curr.amount,
    0
  );
  const totalDeductions =
    dynamicDeductions.reduce((acc, curr) => acc + curr.amount, 0) +
    absentDaysDeduction;

  const netSalary = Number(
    payslip.netSalary !== undefined
      ? payslip.netSalary
      : payslip.netPay !== undefined
      ? payslip.netPay
      : Math.max(0, basicSalary + totalAllowances - totalDeductions)
  );

  const status = payslip.status || "Paid";

  return {
    payslipId,
    dateGenerated,
    employeeName,
    employeeId,
    department,
    position,
    payPeriod,
    paymentDate,
    status,
    basicSalary,
    dynamicAllowances,
    dynamicDeductions,
    absentDaysDeduction,
    totalAllowances,
    totalDeductions,
    netSalary,
  };
};

/**
 * Generates exact printable HTML string meeting corporate document layout
 */
export const generatePayslipHTML = (rawPayslip) => {
  const data = normalizePayslipData(rawPayslip);

  const allowancesRows =
    data.dynamicAllowances.length > 0
      ? data.dynamicAllowances
          .map(
            (item) => `
          <tr style="border-bottom: 1px solid #bfdbfe;">
            <td style="padding: 10px 16px; color: #1e293b; font-size: 13px;">${item.description}</td>
            <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: #059669; font-size: 13px;">${formatCurrency(item.amount)}</td>
          </tr>`
          )
          .join("")
      : `
        <tr style="border-bottom: 1px solid #bfdbfe;">
          <td colspan="2" style="padding: 10px 16px; color: #64748b; font-style: italic; font-size: 12px;">No additional earnings recorded</td>
        </tr>`;

  let deductionsRows = "";
  if (data.absentDaysDeduction > 0) {
    deductionsRows += `
      <tr style="border-bottom: 1px solid #bfdbfe;">
        <td style="padding: 10px 16px; color: #1e293b; font-size: 13px;">Absenteeism Penalty (GH₵10/day)</td>
        <td style="padding: 10px 16px; text-align: right; font-weight: 700; color: #dc2626; font-size: 13px;">-${formatCurrency(data.absentDaysDeduction)}</td>
      </tr>`;
  }

  if (data.dynamicDeductions.length > 0) {
    deductionsRows += data.dynamicDeductions
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #bfdbfe;">
          <td style="padding: 10px 16px; color: #1e293b; font-size: 13px;">${item.description}</td>
          <td style="padding: 10px 16px; text-align: right; font-weight: 700; color: #dc2626; font-size: 13px;">-${formatCurrency(item.amount)}</td>
        </tr>`
      )
      .join("");
  }

  if (!deductionsRows) {
    deductionsRows = `
      <tr style="border-bottom: 1px solid #bfdbfe;">
        <td colspan="2" style="padding: 10px 16px; color: #64748b; font-style: italic; font-size: 12px;">No deductions or absenteeism penalties recorded</td>
      </tr>`;
  }

  return `
    <div id="corporate-payslip-document" style="width: 100%; max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #0f172a; box-sizing: border-box; border: 1px solid #e2e8f0; border-radius: 8px;">
      
      <!-- 1. Document Header & Branding -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 4px;">
            <img src="${logo}" alt="Company Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
          <div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px; line-height: 1.1;">PAYSLIP</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 600; color: #64748b; font-family: monospace;">${data.payslipId}</p>
          </div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Date Generated</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">${data.dateGenerated}</p>
        </div>
      </div>

      <!-- Solid deep-navy line (#1e3a8a, height: 3px) spanning full width -->
      <div style="width: 100%; height: 3px; background-color: #1e3a8a; margin-bottom: 28px;"></div>

      <!-- 2. Metadata Grid (Two-Column Layouts) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
        
        <!-- EMPLOYEE INFORMATION -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px;">
          <h2 style="margin: 0 0 14px 0; font-size: 12px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.75px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            EMPLOYEE INFORMATION
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; row-gap: 12px; column-gap: 12px; font-size: 13px;">
            <div>
              <span style="display: block; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Name</span>
              <strong style="color: #0f172a; font-size: 13px;">${data.employeeName}</strong>
            </div>
            <div>
              <span style="display: block; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Employee ID</span>
              <strong style="color: #0f172a; font-size: 13px; font-family: monospace;">${data.employeeId}</strong>
            </div>
            <div>
              <span style="display: block; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Department</span>
              <strong style="color: #0f172a; font-size: 13px;">${data.department}</strong>
            </div>
            <div>
              <span style="display: block; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Position</span>
              <strong style="color: #0f172a; font-size: 13px;">${data.position}</strong>
            </div>
          </div>
        </div>

        <!-- PAYMENT INFORMATION -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px;">
          <h2 style="margin: 0 0 14px 0; font-size: 12px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.75px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            PAYMENT INFORMATION
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; row-gap: 12px; column-gap: 12px; font-size: 13px;">
            <div>
              <span style="display: block; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Pay Period</span>
              <strong style="color: #0f172a; font-size: 13px;">${data.payPeriod}</strong>
            </div>
            <div>
              <span style="display: block; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Payment Date</span>
              <strong style="color: #0f172a; font-size: 13px;">${data.paymentDate}</strong>
            </div>
            <div style="grid-column: span 2;">
              <span style="display: block; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Status</span>
              <span style="color: #16a34a; font-weight: 800; font-size: 14px;">${data.status}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- 3. Salary Breakdown Table -->
      <div style="margin-bottom: 28px; border: 1.5px solid #bfdbfe; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f0f7ff; border-bottom: 1.5px solid #bfdbfe;">
              <th style="padding: 12px 16px; font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.75px;">ITEM DESCRIPTION</th>
              <th style="padding: 12px 16px; font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.75px; text-align: right;">AMOUNT (GHS)</th>
            </tr>
          </thead>
          <tbody>
            <!-- Basic Salary -->
            <tr style="border-bottom: 1px solid #bfdbfe; background: #ffffff;">
              <td style="padding: 12px 16px; font-weight: 700; color: #0f172a; font-size: 13px;">Basic Salary</td>
              <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: #1e3a8a; font-size: 14px;">${formatCurrency(data.basicSalary)}</td>
            </tr>

            <!-- ADDITIONAL EARNINGS & ALLOWANCES subheader -->
            <tr style="background: #ecfdf5; border-bottom: 1px solid #bfdbfe;">
              <td colspan="2" style="padding: 8px 16px; font-size: 11px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.75px;">
                ADDITIONAL EARNINGS & ALLOWANCES
              </td>
            </tr>
            ${allowancesRows}

            <!-- DEDUCTIONS & ADJUSTMENTS subheader -->
            <tr style="background: #fef2f2; border-bottom: 1px solid #bfdbfe;">
              <td colspan="2" style="padding: 8px 16px; font-size: 11px; font-weight: 800; color: #dc2626; text-transform: uppercase; letter-spacing: 0.75px;">
                DEDUCTIONS & ADJUSTMENTS
              </td>
            </tr>
            ${deductionsRows}
          </tbody>

          <!-- NET SALARY summary footer row -->
          <tfoot>
            <tr style="background: #f1f5f9; border-top: 2px solid #1e3a8a;">
              <td style="padding: 16px 16px; font-size: 15px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">NET SALARY</td>
              <td style="padding: 16px 16px; text-align: right; font-size: 18px; font-weight: 900; color: #1e3a8a;">${formatCurrency(data.netSalary)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Official Footer Note -->
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 14px;">
        <span>Generated by Eyenit HR & Payroll Management System</span>
        <span style="font-style: italic;">Official System-Generated Document • No physical signature required</span>
      </div>

    </div>
  `;
};

/**
 * Loads an image from URL/asset and converts it to a Base64 string for jsPDF
 */
const getBase64ImageFromUrl = async (imgUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      try {
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imgUrl;
  });
};

/**
 * Generates an official, high-resolution vector PDF payslip using jsPDF
 */
export const generatePayslipPDF = async (rawPayslip) => {
  const data = normalizePayslipData(rawPayslip);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 18;

  // Try to load and embed company logo
  try {
    const base64Logo = await getBase64ImageFromUrl(logo);
    if (base64Logo) {
      doc.addImage(base64Logo, "PNG", margin, currentY, 16, 16);
    }
  } catch (err) {
    console.warn("Could not embed logo in PDF:", err);
  }

  // Header Title & Payslip ID
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 138); // #1e3a8a
  doc.text("PAYSLIP", margin + 20, currentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text(data.payslipId, margin + 20, currentY + 13);

  // Date Generated Top-Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("DATE GENERATED", pageWidth - margin, currentY + 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.dateGenerated, pageWidth - margin, currentY + 12, { align: "right" });

  currentY += 20;

  // Solid deep-navy horizontal line (#1e3a8a, height: 3px / ~1mm)
  doc.setFillColor(30, 58, 138); // #1e3a8a
  doc.rect(margin, currentY, contentWidth, 1.2, "F");

  currentY += 6;

  // Two-Column Metadata Box Grid
  const boxWidth = (contentWidth - 6) / 2;
  const boxHeight = 36;

  // Employee Information Box
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.roundedRect(margin, currentY, boxWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text("EMPLOYEE INFORMATION", margin + 4, currentY + 6);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 4, currentY + 8, margin + boxWidth - 4, currentY + 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Name:", margin + 4, currentY + 14);
  doc.text("Employee ID:", margin + boxWidth / 2 + 2, currentY + 14);
  doc.text("Department:", margin + 4, currentY + 24);
  doc.text("Position:", margin + boxWidth / 2 + 2, currentY + 24);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.employeeName, margin + 4, currentY + 19);
  doc.text(data.employeeId, margin + boxWidth / 2 + 2, currentY + 19);
  doc.text(data.department, margin + 4, currentY + 29);
  doc.text(data.position, margin + boxWidth / 2 + 2, currentY + 29);

  // Payment Information Box
  const rightBoxX = margin + boxWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX, currentY, boxWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text("PAYMENT INFORMATION", rightBoxX + 4, currentY + 6);
  doc.line(rightBoxX + 4, currentY + 8, rightBoxX + boxWidth - 4, currentY + 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Pay Period:", rightBoxX + 4, currentY + 14);
  doc.text("Payment Date:", rightBoxX + boxWidth / 2 + 2, currentY + 14);
  doc.text("Status:", rightBoxX + 4, currentY + 24);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.payPeriod, rightBoxX + 4, currentY + 19);
  doc.text(data.paymentDate, rightBoxX + boxWidth / 2 + 2, currentY + 19);

  // Status "Paid" in bold green #16a34a
  doc.setTextColor(22, 163, 74); // #16a34a
  doc.text(data.status, rightBoxX + 4, currentY + 29);

  currentY += boxHeight + 8;

  // Table Headers (Clean bordered table with blue accent border #bfdbfe)
  const col1X = margin + 4;
  const col2X = pageWidth - margin - 4;
  const rowHeight = 8.5;

  // Header Row
  doc.setFillColor(240, 247, 255); // #f0f7ff
  doc.setDrawColor(191, 219, 254); // #bfdbfe
  doc.rect(margin, currentY, contentWidth, rowHeight, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text("ITEM DESCRIPTION", col1X, currentY + 5.5);
  doc.text("AMOUNT (GHS)", col2X, currentY + 5.5, { align: "right" });

  currentY += rowHeight;

  // Basic Salary Row
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, currentY, contentWidth, rowHeight, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Basic Salary", col1X, currentY + 5.5);
  doc.setTextColor(30, 58, 138);
  doc.text(formatCurrency(data.basicSalary), col2X, currentY + 5.5, { align: "right" });

  currentY += rowHeight;

  // Subheader: ADDITIONAL EARNINGS & ALLOWANCES (Green #059669)
  doc.setFillColor(236, 253, 245); // #ecfdf5
  doc.rect(margin, currentY, contentWidth, 7, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105); // #059669
  doc.text("ADDITIONAL EARNINGS & ALLOWANCES", col1X, currentY + 4.8);

  currentY += 7;

  // Allowances Items
  if (data.dynamicAllowances.length > 0) {
    data.dynamicAllowances.forEach((item) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, currentY, contentWidth, rowHeight, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(item.description, col1X, currentY + 5.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(5, 150, 105);
      doc.text(`+${formatCurrency(item.amount)}`, col2X, currentY + 5.5, { align: "right" });
      currentY += rowHeight;
    });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, contentWidth, rowHeight, "FD");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("No additional earnings recorded", col1X, currentY + 5.5);
    currentY += rowHeight;
  }

  // Subheader: DEDUCTIONS & ADJUSTMENTS (Red #dc2626)
  doc.setFillColor(254, 242, 242); // #fef2f2
  doc.rect(margin, currentY, contentWidth, 7, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(220, 38, 38); // #dc2626
  doc.text("DEDUCTIONS & ADJUSTMENTS", col1X, currentY + 4.8);

  currentY += 7;

  // Deductions Items & Absenteeism penalty
  let hasDeductions = false;
  if (data.absentDaysDeduction > 0) {
    hasDeductions = true;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, contentWidth, rowHeight, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Absenteeism Penalty (GH₵10/day)", col1X, currentY + 5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(`-${formatCurrency(data.absentDaysDeduction)}`, col2X, currentY + 5.5, { align: "right" });
    currentY += rowHeight;
  }

  if (data.dynamicDeductions.length > 0) {
    hasDeductions = true;
    data.dynamicDeductions.forEach((item) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, currentY, contentWidth, rowHeight, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(item.description, col1X, currentY + 5.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`-${formatCurrency(item.amount)}`, col2X, currentY + 5.5, { align: "right" });
      currentY += rowHeight;
    });
  }

  if (!hasDeductions) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, contentWidth, rowHeight, "FD");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("No deductions or absenteeism penalties recorded", col1X, currentY + 5.5);
    currentY += rowHeight;
  }

  // NET SALARY Summary Footer Row (Highlighted slate background #f1f5f9, large bold navy net total)
  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.setDrawColor(30, 58, 138); // #1e3a8a top border
  doc.rect(margin, currentY, contentWidth, 12, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text("NET SALARY", col1X, currentY + 7.5);

  doc.setFontSize(13);
  doc.text(formatCurrency(data.netSalary), col2X, currentY + 7.5, { align: "right" });

  currentY += 20;

  // Footer Note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Generated by Eyenit HR & Payroll Management System", margin, currentY);
  doc.text(
    "Official System-Generated Document • No physical signature required",
    pageWidth - margin,
    currentY,
    { align: "right" }
  );

  return doc;
};

/**
 * Download handler that saves the PDF document directly to user's device
 */
export const downloadPayslipPDF = async (rawPayslip) => {
  const data = normalizePayslipData(rawPayslip);
  const doc = await generatePayslipPDF(rawPayslip);
  const safeName = data.employeeName.replace(/\s+/g, "_");
  const safePeriod = data.payPeriod.replace(/\s+/g, "_");
  const fileName = `Payslip_${safeName}_${safePeriod}.pdf`;
  doc.save(fileName);
};

/**
 * Printable Window Handler for instant preview or physical print
 */
export const printPayslipDocument = (rawPayslip) => {
  const data = normalizePayslipData(rawPayslip);
  const content = generatePayslipHTML(rawPayslip);
  const printWindow = window.open("", "_blank", "width=850,height=1000");
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${data.employeeName} (${data.payPeriod})</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
              background: #f8fafc;
              margin: 0;
              padding: 24px;
              display: flex;
              justify-content: center;
            }
            .controls {
              position: fixed;
              bottom: 20px;
              right: 20px;
              display: flex;
              gap: 10px;
              z-index: 100;
            }
            .btn {
              padding: 10px 18px;
              font-size: 13px;
              font-weight: bold;
              border-radius: 8px;
              cursor: pointer;
              border: none;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            .btn-primary { background: #1e3a8a; color: #ffffff; }
            .btn-secondary { background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; }
            @media print {
              body { background: #ffffff; padding: 0; }
              .controls { display: none !important; }
              #corporate-payslip-document { border: none !important; box-shadow: none !important; padding: 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="controls">
            <button class="btn btn-secondary" onclick="window.close()">Close</button>
            <button class="btn btn-primary" onclick="window.print()">Print Payslip</button>
          </div>
          ${content}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};
