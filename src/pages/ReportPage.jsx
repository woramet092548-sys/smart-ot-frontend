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
        // [ฟอร์มราชการ] ฟอร์มดึงเฉพาะรายการที่ ผอ. อนุมัติแล้ว
        alert("ไม่พบข้อมูล OT ที่ ผอ. อนุมัติแล้ว ของพนักงานคนนี้ในเดือนที่เลือก");
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างเอกสาร หรือเซิร์ฟเวอร์ขัดข้อง");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // [ฟอร์มราชการ] ดาวน์โหลดใบขวาง (หลักฐานการเบิกจ่าย)
  //   - all = true → ทุกคนในเดือนนั้น (HR/การเงิน/admin เท่านั้น)
  //   - all = false → คนที่เลือกใน dropdown (หรือตัวเองถ้าเป็น user)
  // ─────────────────────────────────────────────────────────────
  const handleDownloadPaymentForm = async (all = false) => {
    const empId = all ? "ALL" : (canSelectEmployee ? selectedEmp : user?.empId);
    if (!empId) {
      alert("กรุณาเลือกพนักงาน");
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.get(
        `/report/payment-form?empId=${empId}&month=${month}&year=${year}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ใบขวาง_${all ? "ทุกคน" : empId}_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      if (error.response?.status === 404) {
        alert("ไม่พบข้อมูล OT ที่ ผอ. อนุมัติแล้ว ในเดือนที่เลือก");
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างเอกสาร หรือเซิร์ฟเวอร์ขัดข้อง");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // [ฟอร์มราชการ] ดาวน์โหลดใบภาระงาน (ข้อมูลจากหน้า "ภาระงานรายเดือน")
  //   - ถ้าพนักงานยังไม่กดยืนยัน PDF จะมีลายน้ำ "ฉบับร่าง"
  // ─────────────────────────────────────────────────────────────
  const handleDownloadDutyForm = async () => {
    const empId = canSelectEmployee ? selectedEmp : user?.empId;
    if (!empId) {
      alert("กรุณาเลือกพนักงาน");
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.get(
        `/duty/pdf?empId=${empId}&month=${month}&year=${year}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ใบภาระงาน_${empId}_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      if (error.response?.status === 404) {
        alert("พนักงานคนนี้ยังไม่ได้กรอกภาระงานของเดือนที่เลือก");
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
                <option value="">— ไม่มีพนักงานที่มี OT อนุมัติแล้วในเดือนนี้ —</option>
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

          {/* [ฟอร์มราชการ] Card 2 — ใบขวาง (หลักฐานการเบิกจ่าย) ตามฟอร์มจริงปี 2569 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow relative">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Receipt size={22} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-emerald-700">2. หลักฐานการเบิกจ่าย (ใบขวาง)</h3>
                <p className="text-gray-500 text-sm mt-1">
                  ตารางชั่วโมง OT รายวัน + ยอดเงิน ตามแบบฟอร์มราชการจริง
                  {!canSelectEmployee && " (ของคุณ)"}
                </p>
              </div>
            </div>
            <div className={canSelectEmployee ? "grid grid-cols-2 gap-2" : ""}>
              <button
                onClick={() => handleDownloadPaymentForm(false)}
                disabled={isLoading || (canSelectEmployee && !selectedEmp)}
                className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <Download size={15} />
                {isLoading ? "กำลังสร้าง..." : (canSelectEmployee ? "คนที่เลือก" : "ดาวน์โหลด (PDF)")}
              </button>
              {/* ทุกคนในไฟล์เดียว — เฉพาะ HR/การเงิน/admin */}
              {canSelectEmployee && (
                <button
                  onClick={() => handleDownloadPaymentForm(true)}
                  disabled={isLoading || employees.length === 0}
                  className="w-full bg-emerald-800 text-white py-2 rounded-lg hover:bg-emerald-900 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <Users size={15} />
                  {isLoading ? "กำลังสร้าง..." : "ทุกคน (ไฟล์เดียว)"}
                </button>
              )}
            </div>
          </div>

          {/* [ฟอร์มราชการ] Card 3 — ใบภาระงาน ตามฟอร์มจริง (ข้อมูลจากหน้าภาระงานรายเดือน) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow relative">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <FileText size={22} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-purple-700">3. ใบรายงานภาระงาน</h3>
                <p className="text-gray-500 text-sm mt-1">
                  ผลการปฏิบัติงานที่กรอกในหน้า "ภาระงานรายเดือน"
                  {!canSelectEmployee && " (ของคุณ)"}
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadDutyForm}
              disabled={isLoading || (canSelectEmployee && !selectedEmp)}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
            >
              <Download size={15} />
              {isLoading ? "กำลังสร้าง..." : "ดาวน์โหลดใบภาระงาน (PDF)"}
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
          {/* [ฟอร์มราชการ] อัปเดตหมายเหตุ: ฟอร์มดึงเฉพาะรายการที่อนุมัติแล้ว + ใส่ลายเซ็นอัตโนมัติ */}
          <p className="text-xs text-amber-800">
            ใบลงเวลา (ข้อ 1) และใบขวาง (ข้อ 2) ดึงเฉพาะรายการที่ ผอ. "อนุมัติ" แล้วเท่านั้น
            ใบลงเวลาใส่รูปลายเซ็นของพนักงานให้อัตโนมัติ (ถ้ายังไม่ได้อัปโหลดลายเซ็นที่หน้าลายเซ็น ช่องลายมือชื่อจะเว้นว่าง)
            — ใบภาระงาน (ข้อ 3) ถ้าพนักงานยังไม่กดยืนยัน จะมีลายน้ำ "ฉบับร่าง"
          </p>
        </div>
      </div>
    </PageTransition>
  );
}