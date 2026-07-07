import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "../utils/api";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../context/AuthContext";
import { FileClock, FileText, Receipt, Download, Users } from "lucide-react";

export default function ReportPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);

  // [Phase 3] สิทธิ์: HR/Finance/Admin เลือกพนักงานคนไหนก็ได้, user เห็นแค่ตัวเอง
  const canSelectEmployee = ["hr", "finance", "admin"].includes(user?.role);

  // [Phase 3] รายชื่อพนักงานที่มี OT ในเดือนนั้น (สำหรับ dropdown)
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("");

  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // [Phase 3] โหลดรายชื่อพนักงานเมื่อเปลี่ยนเดือน/ปี (เฉพาะ role ที่เลือกคนได้)
  useEffect(() => {
    if (!canSelectEmployee) return;
    const fetchEmployees = async () => {
      try {
        const res = await api.get(`/report/employees-with-ot?month=${month}&year=${year}`);
        setEmployees(res.data || []);
        // ถ้าคนที่เลือกอยู่ไม่อยู่ในเดือนใหม่ ให้ reset
        if (res.data && !res.data.find(e => e.empId === selectedEmp)) {
          setSelectedEmp(res.data.length ? res.data[0].empId : "");
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
        setEmployees([]);
      }
    };
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, canSelectEmployee]);

  // ─────────────────────────────────────────────────────────────
  // [Phase 3] ดาวน์โหลดใบลงเวลา (ฟอร์มจริง)
  //   - user: เอา empId ตัวเอง / HR-Finance-Admin: เอา empId ที่เลือกจาก dropdown
  // ─────────────────────────────────────────────────────────────
  const handleDownloadDatetimeForm = async () => {
    const empId = canSelectEmployee ? selectedEmp : user?.empId;
    if (!empId) {
      alert("กรุณาเลือกพนักงาน");
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.get(
        `/report/datetime-form?empId=${empId}&month=${month}&year=${year}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ใบลงเวลา_${empId}_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      if (error.response?.status === 404) {
        alert("ไม่พบข้อมูล OT ของพนักงานคนนี้ในเดือนที่เลือก");
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างเอกสาร หรือเซิร์ฟเวอร์ขัดข้อง");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ปุ่มเก่า (รายงานสรุป report เดิม) — ยังใช้ /report/pdf, /report/excel
  // ─────────────────────────────────────────────────────────────
  const handleDownloadLegacy = async (reportType, format) => {
    setIsLoading(true);
    try {
      const endpoint = format === "pdf" ? "/report/pdf" : "/report/excel";
      const response = await api.get(
        `${endpoint}?month=${month}&year=${year}&report_type=${reportType}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Report_${reportType}_${month}_${year}.${format === "pdf" ? "pdf" : "xlsx"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download error:", error);
      alert("ไม่พบข้อมูลที่อนุมัติแล้วในเดือนนี้ หรือเซิร์ฟเวอร์ขัดข้อง");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="border-b pb-4 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">ออกรายงานระบบ OT</h2>
            <p className="text-gray-500 text-sm mt-1">เลือกเดือนและปีที่ต้องการดาวน์โหลดเอกสาร</p>
          </div>

          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {monthNames.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value={new Date().getFullYear()}>{new Date().getFullYear() + 543}</option>
              <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() + 542}</option>
            </select>
          </div>
        </div>

        {/* [Phase 3] เลือกพนักงาน — เฉพาะ HR/Finance/Admin */}
        {canSelectEmployee && (
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <Users size={18} className="text-blue-500 shrink-0" />
            <label className="text-sm font-bold text-slate-600 shrink-0">เลือกพนักงาน:</label>
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              {employees.length === 0 ? (
                <option value="">— ไม่มีพนักงานที่มี OT ในเดือนนี้ —</option>
              ) : (
                employees.map((emp) => (
                  <option key={emp.empId} value={emp.empId}>
                    {emp.fullname} ({emp.empId})
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {/* การ์ดเอกสาร */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* [Phase 3] Card 1 — ใบลงเวลา (ฟอร์มจริง ใช้งานได้แล้ว) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow md:col-span-2">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <FileClock size={22} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-blue-700">1. ใบลงเวลาปฏิบัติงานนอกเวลา</h3>
                <p className="text-gray-500 text-sm mt-1">
                  ตารางเวลาเข้า-ออกรายวันทั้งเดือน ตามแบบฟอร์มราชการจริง
                  {!canSelectEmployee && " (ของคุณ)"}
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadDatetimeForm}
              disabled={isLoading || (canSelectEmployee && !selectedEmp)}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <Download size={16} />
              {isLoading ? "กำลังสร้างเอกสาร..." : "ดาวน์โหลดใบลงเวลา (PDF)"}
            </button>
          </div>

          {/* Card 2 — ใบเบิกจ่าย (ยังเป็น report เดิม รอแปลงเป็นฟอร์มจริง) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow relative">
            <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-600">
              ยังเป็นแบบเดิม
            </span>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Receipt size={22} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-emerald-700">2. หลักฐานการเบิกจ่าย</h3>
                <p className="text-gray-500 text-sm mt-1">แบบฟอร์มเบิกเงิน (ขั้นต่อไปจะแปลงเป็นฟอร์มจริง)</p>
              </div>
            </div>
            <button
              onClick={() => handleDownloadLegacy(2, "pdf")}
              disabled={isLoading}
              className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? "กำลังโหลด..." : "ดาวน์โหลด PDF (เดิม)"}
            </button>
          </div>

          {/* Card 3 — ใบภาระงาน (placeholder รอทำ) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow relative">
            <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
              เร็วๆ นี้
            </span>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <FileText size={22} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-purple-700">3. ใบรายงานภาระงาน</h3>
                <p className="text-gray-500 text-sm mt-1">สรุปภาระงานที่ทำช่วง OT ทั้งเดือน</p>
              </div>
            </div>
            <button
              disabled
              className="w-full bg-gray-300 text-white py-2 rounded-lg cursor-not-allowed"
            >
              อยู่ระหว่างพัฒนา
            </button>
          </div>

          {/* Card 4 — สรุปยอดรวม (ฝ่ายบัญชี) — ยังเป็น report เดิม */}
          {canSelectEmployee && (
            <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow md:col-span-2 relative">
              <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-600">
                ยังเป็นแบบเดิม
              </span>
              <h3 className="font-bold text-lg text-slate-700">4. สรุปยอดเบิกจ่ายรวม (ฝ่ายบัญชี)</h3>
              <p className="text-gray-500 text-sm mt-1 mb-4">รวมยอดเงินทั้งหมดของพนักงานทุกคนในแผนก</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleDownloadLegacy(3, "pdf")}
                  disabled={isLoading}
                  className="bg-slate-600 text-white py-2 rounded-lg hover:bg-slate-700 disabled:bg-gray-400"
                >
                  โหลด PDF (เดิม)
                </button>
                <button
                  onClick={() => handleDownloadLegacy(3, "excel")}
                  disabled={isLoading}
                  className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  โหลด Excel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* หมายเหตุ */}
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3">
          <span className="text-amber-500">⚠️</span>
          <p className="text-xs text-amber-800">
            ใบลงเวลา (ข้อ 1) ดึงข้อมูลทุกสถานะ (ยกเว้นที่ HR ยกเลิก) เพื่อใช้ทดสอบช่วงพัฒนา
            ภายหลังจะปรับให้ดึงเฉพาะรายการที่ "อนุมัติ" แล้วเมื่อระบบ flow อนุมัติเสร็จสมบูรณ์
          </p>
        </div>
      </div>
    </PageTransition>
  );
}