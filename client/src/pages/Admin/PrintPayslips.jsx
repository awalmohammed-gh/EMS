import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAllPayslips } from "../../apis/fontApis";
import { ArrowLeft, Printer, CheckCircle2 } from "lucide-react";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

const PrintPayslips = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayslipData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data } = await getAllPayslips();
        if (data.success && data.list) {
          const found = data.list.find(
            (p) => String(p._id) === String(id) || String(p.id) === String(id) || String(p.payslipNumber) === String(id)
          );
          if (found) {
            setPayslip(found);
          } else {
            setError("Payslip record not found.");
          }
        } else {
          setError("Failed to load payslip data.");
        }
      } catch (err) {
        setError(err.message || "Failed to load payslip.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayslipData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (isLoading) return <Loading />;
  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8 flex items-center justify-center">
        <ErrorMessage message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      {/* Controls - Hidden on print */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate("/admin/dashboard/payslips")}
          className="inline-flex items-center px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#002185] hover:bg-[#F1F5F9] shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Payslips
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center px-4 py-2 bg-[#002185] text-white rounded-lg text-sm font-medium hover:bg-[#001760] shadow-md transition"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Payslip
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8 print:shadow-none print:border-none print:p-0">
        <div className="border-b border-[#E2E8F0] pb-6 mb-6 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#002185] text-white flex items-center justify-center font-bold text-xl">
              EN
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#002185]">EYENIT LIMITED</h1>
              <p className="text-xs text-[#64748B]">Official Employee Salary Slip</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {payslip?.status || "Paid"}
            </span>
            <p className="text-xs text-[#64748B] mt-2">
              Ref: <span className="font-mono font-medium text-[#0F172A]">{payslip?.payslipNumber || payslip?.id}</span>
            </p>
          </div>
        </div>

        {/* Employee Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] mb-6 text-xs">
          <div>
            <p className="text-[#64748B]">Employee Name</p>
            <p className="font-semibold text-[#0F172A] text-sm mt-0.5">{payslip?.employee?.fullName || payslip?.employeeName || "Kwame Mensah"}</p>
          </div>
          <div>
            <p className="text-[#64748B]">Employee ID</p>
            <p className="font-semibold text-[#0F172A] text-sm mt-0.5">{payslip?.employee?.employeeId || payslip?.employeeId || "EMP001"}</p>
          </div>
          <div>
            <p className="text-[#64748B]">Department</p>
            <p className="font-semibold text-[#0F172A] text-sm mt-0.5">{payslip?.employee?.department || payslip?.department || "Software Engineering"}</p>
          </div>
          <div>
            <p className="text-[#64748B]">Pay Period</p>
            <p className="font-semibold text-[#0F172A] text-sm mt-0.5">{payslip?.payMonth || payslip?.month || "August 2026"}</p>
          </div>
        </div>

        {/* Salary Breakdown Table */}
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#002185] text-white text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Earnings (GHS)</th>
                <th className="px-4 py-3 text-right">Deductions (GHS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              <tr>
                <td className="px-4 py-3 text-[#0F172A] font-medium">Basic Salary</td>
                <td className="px-4 py-3 text-right text-green-700 font-medium">{formatCurrency(payslip?.basicSalary)}</td>
                <td className="px-4 py-3 text-right text-[#64748B]">-</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-[#0F172A] font-medium">Allowances & Bonuses</td>
                <td className="px-4 py-3 text-right text-green-700 font-medium">{formatCurrency(payslip?.allowances)}</td>
                <td className="px-4 py-3 text-right text-[#64748B]">-</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-[#0F172A] font-medium">Statutory Taxes & Deductions</td>
                <td className="px-4 py-3 text-right text-[#64748B]">-</td>
                <td className="px-4 py-3 text-right text-red-600 font-medium">{formatCurrency(payslip?.deductions)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-[#F8FAFC] font-semibold text-sm border-t-2 border-[#E2E8F0]">
              <tr>
                <td className="px-4 py-3 text-[#002185] font-bold">Net Remuneration</td>
                <td colSpan={2} className="px-4 py-3 text-right text-[#002185] font-bold text-base">
                  {formatCurrency(payslip?.netSalary)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Meta */}
        <div className="grid grid-cols-2 gap-4 text-xs text-[#64748B] pt-4 border-t border-[#E2E8F0]">
          <div>
            <p>Payment Date: <span className="text-[#0F172A] font-medium">{payslip?.paymentDate || "2026-08-25"}</span></p>
            <p className="mt-1">Payment Method: <span className="text-[#0F172A] font-medium">{payslip?.paymentMethod || "Bank Transfer"}</span></p>
          </div>
          <div className="text-right">
            <p>Generated by: <span className="text-[#0F172A] font-medium">Payroll Department</span></p>
            <p className="mt-1 italic">This is a system-generated document and requires no physical signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPayslips;
