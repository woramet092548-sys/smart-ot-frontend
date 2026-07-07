import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Wallet, Clock, Users, Search, Download, 
    FileText, FileSpreadsheet, CheckCircle, AlertCircle, CalendarDays 
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import api from "../utils/api"; 

export default function FinanceOT() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmpName, setSelectedEmpName] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [summaryData, setSummaryData] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState({ show: false, text: "", type: "" }); // สำหรับแจ้งเตือน

  // --- 1. โหลดข้อมูลจริงจาก Backend API ---
  const fetchFinanceSummary = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/ot/finance-summary`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      setSummaryData(response.data);
    } catch (error) {
      console.error("Error fetching finance summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceSummary();
    setSelectedEmpName("all"); // รีเซ็ตการดูรายละเอียดเมื่อเปลี่ยนเดือน
  }, [selectedMonth, selectedYear]);

  // ฟังก์ชันโชว์แจ้งเตือน Pop-up (ใช้ตอนกด Export)
  const showMessage = (text, type) => {
      setToastMessage({ show: true, text, type });
      setTimeout(() => setToastMessage({ show: false, text: "", type: "" }), 3000);
  };

  // ฟังก์ชันจำลองการกด Export
const handleExport = async (type) => {
  if (finalDisplayData.length === 0) {
    return showMessage("ไม่มีข้อมูลสำหรับดาวน์โหลดในเดือนนี้", "error");
  }
  try {
    showMessage(`กำลังสร้างไฟล์ ${type}...`, "success");
    const endpoint = type === 'PDF' ? '/report/pdf' : '/report/excel';
    const response = await api.get(endpoint, {
      params: { month: selectedMonth, year: selectedYear },
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `OT_Finance_${selectedMonth}_${selectedYear}.${type === 'PDF' ? 'pdf' : 'xlsx'}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    showMessage("เกิดข้อผิดพลาดในการดาวน์โหลด", "error");
  }
};

  // --- 2. Filter ตาม Dropdown และ Search ---
  const displayedEmployees = selectedEmpName === "all" 
      ? summaryData 
      : summaryData.filter(e => e.fullname === selectedEmpName);

  const finalDisplayData = displayedEmployees.filter(emp => 
      emp.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- 3. คำนวณยอดรวม (Grand Total) ประจำเดือน ---
  const grandTotalAmount = finalDisplayData.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
  const grandTotalHours = finalDisplayData.reduce((sum, e) => sum + Number(e.total_hours || 0), 0);

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto space-y-6 pb-10 relative p-4 md:p-6">
        
        {/* Pop-up แจ้งเตือน (Toast) */}
        <AnimatePresence>
            {toastMessage.show && (
                <motion.div 
                    initial={{ opacity: 0, x: 50 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 50 }}
                    className={`fixed top-24 right-6 px-6 py-4 rounded-xl shadow-lg z-50 flex items-center text-white font-medium
                        ${toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}
                >
                    {toastMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <AlertCircle className="mr-2" />}
                    {toastMessage.text}
                </motion.div>
            )}
        </AnimatePresence>

        {/* Header & Controls */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Wallet className="mr-3 text-indigo-600" size={32} />
              ระบบจัดการบัญชี (Finance)
            </h2>
            <p className="text-gray-500 mt-2">สรุปยอดเบิกจ่าย OT ประจำเดือน (เฉพาะรายการที่อนุมัติแล้ว)</p>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* ตัวเลือกเดือน/ปี */}
            <div className="flex items-center bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                <CalendarDays className="text-gray-400 ml-2 mr-1" size={18} />
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-2 py-1.5 bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-gray-700"
                >
                    {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={i+1}>
                        {new Date(0, i).toLocaleDateString("th-TH", { month: "long" })}
                    </option>
                    ))}
                </select>
                <span className="text-gray-300 mx-1">/</span>
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-2 py-1.5 bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-gray-700"
                >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y + 543}</option>)}
                </select>
            </div>

            <div className="h-8 w-px bg-gray-200 hidden sm:block mx-1"></div>

            {/* ปุ่ม Export */}
            <div className="flex space-x-2 w-full sm:w-auto">
                <button onClick={() => handleExport('PDF')} className="flex-1 sm:flex-none flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm border border-rose-100">
                    <FileText size={18} className="mr-2" /> PDF
                </button>
                <button onClick={() => handleExport('Excel')} className="flex-1 sm:flex-none flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm border border-emerald-100">
                    <FileSpreadsheet size={18} className="mr-2" /> Excel
                </button>
            </div>
          </div>
        </motion.div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-linear-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-blue-100 font-medium">ยอดเบิกจ่ายรวม ({selectedMonth}/{selectedYear})</p>
                    <h3 className="text-4xl font-bold mt-2">฿{grandTotalAmount.toLocaleString()}</h3>
                </div>
                <div className="absolute right-0 bottom-0 opacity-20 p-2 transform translate-x-4 translate-y-4">
                    <Wallet size={100} />
                </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 font-medium mb-1">ชั่วโมงที่อนุมัติแล้ว</p>
                    <h3 className="text-3xl font-bold text-gray-800">{grandTotalHours.toFixed(2)} <span className="text-base font-medium text-gray-400">ชม.</span></h3>
                </div>
                <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl">
                    <Clock size={32} />
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 font-medium mb-1">จำนวนพนักงาน</p>
                    <h3 className="text-3xl font-bold text-gray-800">
                        {finalDisplayData.length} <span className="text-base font-medium text-gray-400">คน</span>
                    </h3>
                </div>
                <div className="p-4 bg-purple-50 text-purple-500 rounded-2xl">
                    <Users size={32} />
                </div>
            </motion.div>
        </div>

        {/* Content Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
             {isLoading ? (
                <div className="flex flex-col justify-center items-center h-64 text-gray-400">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    กำลังโหลดข้อมูลการเงิน...
                </div>
             ) : (
                <>
                    {/* Table Header & Search */}
                    <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 text-lg">รายละเอียดการเบิกจ่ายรายบุคคล</h3>
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-72 pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">รหัสพนักงาน</th>
                                    <th className="p-4 font-semibold">ชื่อ-นามสกุล</th>
                                    <th className="p-4 font-semibold text-center">จำนวนวัน (รายการ)</th>
                                    <th className="p-4 font-semibold text-right">รวมชั่วโมง (ชม.)</th>
                                    <th className="p-4 font-semibold text-right">ยอดสุทธิ (บาท)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {finalDisplayData.length > 0 ? finalDisplayData.map((emp, idx) => (
                                    <motion.tr 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        key={idx} 
                                        className="hover:bg-indigo-50/30 transition group"
                                    >
                                        <td className="p-4 font-mono text-gray-500">{emp.empId}</td>
                                        <td className="p-4 font-bold text-gray-800">{emp.fullname}</td>
                                        <td className="p-4 text-center text-gray-600">
                                            <span className="bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-bold group-hover:bg-white">{emp.total_days}</span>
                                        </td>
                                        <td className="p-4 text-right text-gray-600 font-medium">{Number(emp.total_hours).toFixed(2)}</td>
                                        <td className="p-4 text-right">
                                            <span className="text-base font-bold text-indigo-600">
                                                ฿{Number(emp.total_amount).toLocaleString()}
                                            </span>
                                        </td>
                                    </motion.tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="p-16 text-center text-gray-400">
                                            <Wallet size={48} className="mx-auto mb-3 text-gray-300 opacity-50" />
                                            <p className="text-lg font-medium text-gray-600">ไม่มีรายการเบิกจ่ายในเดือนนี้</p>
                                            <p className="text-sm mt-1">ยังไม่มีการอนุมัติ OT หรือไม่มีข้อมูลในระบบ</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
             )}
        </motion.div>
      </div>
    </PageTransition>
  );
}