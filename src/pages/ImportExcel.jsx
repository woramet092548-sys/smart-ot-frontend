// ไฟล์: src/pages/ImportExcel.jsx
// [CSV] ให้เลือกไฟล์ .csv ได้ด้วย (เดิมรับแค่ .xlsx/.xls) — backend รองรับ .csv อยู่แล้ว
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud, FileSpreadsheet, CheckCircle,
  AlertCircle, Loader2, XCircle, History, ChevronDown, ChevronUp,
  AlertTriangle
} from "lucide-react";
import api from "../utils/api";

// ─────────────────────────────────────────────────────────────
//  Helper: format วันที่ ISO "YYYY-MM-DD" → "DD/MM/YYYY" (แบบไทย)
//  ⭐ สำคัญ: parse แบบ explicit ป้องกัน new Date() shift timezone
// ─────────────────────────────────────────────────────────────
const formatDateThai = (isoStr) => {
  if (!isoStr) return "-";
  const str = String(isoStr).substring(0, 10);
  const parts = str.split("-");
  if (parts.length !== 3) return isoStr;
  const [y, m, d] = parts;
  const yearTH = parseInt(y, 10) + 543;
  return `${parseInt(d, 10)}/${parseInt(m, 10)}/${yearTH}`;
};

const ImportExcel = () => {
  const [step, setStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [summary, setSummary] = useState({ total: 0, inserted: 0, updated: 0, skipped: 0 });
  const [skippedRows, setSkippedRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/upload/history");
      setHistory(res.data || []);
    } catch (err) {
      console.error("ไม่สามารถโหลดประวัติได้:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg("");
      setStep(0);
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;
    setStep(1);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data.data || [];
      const sum = response.data.summary || { total: data.length, inserted: data.length, updated: 0, skipped: 0 };
      setPreviewData(data);
      setSummary(sum);
      setSkippedRows(response.data.skipped || []);
      setStep(2);
      fetchHistory();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "เกิดข้อผิดพลาดในการอัปโหลด");
      setStep(0);
    }
  };

  const resetProcess = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setSkippedRows([]);
    setErrorMsg("");
    setStep(0);
    const input = document.getElementById("file-upload");
    if (input) input.value = "";
  };

  const columns = [
    { key: "รหัสพนักงาน", label: "รหัสพนักงาน" },
    { key: "ชื่อ-นามสกุล", label: "ชื่อ-นามสกุล" },
    { key: "วันที่", label: "วันที่" },
    { key: "เวลาเข้า", label: "เข้างาน" },
    { key: "เวลาออก", label: "ออกงาน" },
    { key: "ประเภท", label: "ประเภท" },
    { key: "ชั่วโมง", label: "OT (ชม.)" },
    { key: "ยอดเงิน", label: "ยอดเงิน (฿)" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

      {/* Card อัปโหลด */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="mb-8 border-b pb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <FileSpreadsheet className="mr-3 text-emerald-500" size={28} />
            นำเข้าข้อมูลเวลาปฏิบัติงาน (Import Excel / CSV)
          </h2>
          <p className="text-gray-500 mt-2">
            สำหรับฝ่ายบุคคล (HR) นำเข้าไฟล์ข้อมูลการสแกนนิ้วจากเครื่องลงเวลา
          </p>
          <div className="mt-3 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg inline-block">
            💡 OT วันธรรมดา นับจากเวลา <b>17:00</b> เป็นต้นไป (cap 3 ชม. @ 50฿) | วันหยุด cap 5 ชม. @ 60฿
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto">
              {errorMsg && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <XCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="font-semibold text-red-700 text-sm">เกิดข้อผิดพลาด</p>
                    <p className="text-red-600 text-sm mt-0.5">{errorMsg}</p>
                  </div>
                </motion.div>
              )}
              <div className="border-2 border-dashed border-gray-300 rounded-3xl p-12 text-center hover:bg-gray-50 transition duration-300">
                <UploadCloud className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์
                </h3>
                {/* [CSV] เพิ่ม .csv ในข้อความ + ใน accept ของช่องเลือกไฟล์ */}
                <p className="text-sm text-gray-500 mb-6">รองรับไฟล์ .xlsx, .xls, .csv (ไฟล์จากเครื่องสแกนนิ้ว)</p>
                <input type="file" id="file-upload" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                <label htmlFor="file-upload" className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-full font-medium hover:bg-gray-50 transition shadow-sm">
                  เลือกไฟล์ Excel / CSV
                </label>
                {selectedFile && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center text-emerald-700">
                      <FileSpreadsheet size={20} className="mr-2 shrink-0" />
                      <span className="font-medium truncate max-w-xs">{selectedFile.name}</span>
                    </div>
                    <button onClick={handleUploadClick}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-md">
                      อัปโหลดและบันทึก
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-20 text-center">
              <Loader2 className="mx-auto h-16 w-16 text-emerald-500 animate-spin mb-6" />
              <h3 className="text-xl font-bold text-gray-700">กำลังประมวลผลข้อมูล...</h3>
              <p className="text-gray-500 mt-2">ระบบกำลังอ่านไฟล์ คำนวณ OT และบันทึกลงฐานข้อมูล</p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                  <p className="text-sm text-blue-500 font-medium">ทั้งหมด</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{summary.total}</p>
                  <p className="text-xs text-blue-400">รายการ</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                  <p className="text-sm text-emerald-500 font-medium">เพิ่มใหม่</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">{summary.inserted}</p>
                  <p className="text-xs text-emerald-400">รายการ</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
                  <p className="text-sm text-indigo-500 font-medium">อัปเดต</p>
                  <p className="text-3xl font-bold text-indigo-700 mt-1">{summary.updated}</p>
                  <p className="text-xs text-indigo-400">รายการ</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                  <p className="text-sm text-amber-500 font-medium">ข้าม</p>
                  <p className="text-3xl font-bold text-amber-700 mt-1">{summary.skipped}</p>
                  <p className="text-xs text-amber-400">รายการ</p>
                </div>
              </div>

              {skippedRows.length > 0 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-amber-600" size={18} />
                    <p className="font-semibold text-amber-700 text-sm">
                      มี {skippedRows.length} แถวที่ข้ามไป
                    </p>
                  </div>
                  <ul className="text-xs text-amber-700 space-y-1 ml-6 list-disc">
                    {skippedRows.slice(0, 5).map((s, i) => (
                      <li key={i}>
                        แถวที่ {s.row}{s.empId ? ` (${s.empId})` : ''} — {s.reason}
                      </li>
                    ))}
                    {skippedRows.length > 5 && (
                      <li className="text-amber-600 italic">
                        ... และอีก {skippedRows.length - 5} แถว
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <CheckCircle className="mr-2 text-emerald-500" size={20} />
                    บันทึกข้อมูลสำเร็จ — ข้อมูลที่นำเข้าระบบ
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">ข้อมูลถูกบันทึกลงฐานข้อมูลเรียบร้อยแล้ว</p>
                </div>
                <button onClick={resetProcess} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm">
                  นำเข้าไฟล์ใหม่
                </button>
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      {columns.map((col) => (
                        <th key={col.key} className="p-4 text-sm font-semibold text-gray-600 whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="p-8 text-center text-gray-400">
                          ไม่พบข้อมูลในไฟล์
                        </td>
                      </tr>
                    ) : (
                      previewData.map((row, idx) => {
                        const otHours = Number(row["ชั่วโมง"] || 0);
                        const isWeekend = row["ประเภท"] === 'วันหยุด';
                        return (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-4 text-sm font-medium text-gray-800">{row["รหัสพนักงาน"] || "-"}</td>
                            <td className="p-4 text-sm text-gray-600">{row["ชื่อ-นามสกุล"] || "-"}</td>
                            <td className="p-4 text-sm text-gray-600">
                              {formatDateThai(row["วันที่"])}
                            </td>
                            <td className="p-4 text-sm text-center text-gray-600">{row["เวลาเข้า"] || "-"}</td>
                            <td className="p-4 text-sm text-center text-gray-600">{row["เวลาออก"] || "-"}</td>
                            <td className="p-4 text-sm text-center">
                              <span className={`px-2 py-1 rounded-md font-medium text-xs ${
                                isWeekend ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                              }`}>
                                {row["ประเภท"] || "-"}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-center">
                              <span className={`px-2 py-1 rounded-md font-bold text-xs ${
                                otHours > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                              }`}>
                                {otHours} ชม.
                              </span>
                            </td>
                            <td className="p-4 text-sm text-center font-semibold text-gray-800">
                              {Number(row["ยอดเงิน"] || 0).toLocaleString("th-TH")} ฿
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Card ประวัติการ Import */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <button onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <History className="text-indigo-500" size={22} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800 text-lg">ประวัติการนำเข้าข้อมูล</h3>
              <p className="text-sm text-gray-400">แสดง 20 รายการล่าสุด</p>
            </div>
          </div>
          {showHistory ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="px-6 pb-6">
                {historyLoading ? (
                  <div className="py-10 text-center">
                    <Loader2 className="mx-auto h-8 w-8 text-indigo-400 animate-spin mb-3" />
                    <p className="text-gray-400 text-sm">กำลังโหลดประวัติ...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-10 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-gray-200 mb-3" />
                    <p className="text-gray-400 font-medium">ยังไม่มีประวัติการนำเข้าข้อมูล</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="p-4 text-sm font-semibold text-gray-600">#</th>
                          <th className="p-4 text-sm font-semibold text-gray-600">วันที่นำเข้า</th>
                          <th className="p-4 text-sm font-semibold text-gray-600">เวลา</th>
                          <th className="p-4 text-sm font-semibold text-gray-600 text-center">รายการทั้งหมด</th>
                          <th className="p-4 text-sm font-semibold text-gray-600 text-center">มี OT</th>
                          <th className="p-4 text-sm font-semibold text-gray-600 text-center">รวมชั่วโมง</th>
                          <th className="p-4 text-sm font-semibold text-gray-600 text-center">รวมยอดเงิน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-4 text-sm text-gray-400 font-medium">{idx + 1}</td>
                            <td className="p-4 text-sm font-medium text-gray-800">
                              {formatDateThai(row.import_date)}
                            </td>
                            <td className="p-4 text-sm text-gray-500">{row.import_time || "-"} น.</td>
                            <td className="p-4 text-sm text-center">
                              <span className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-md text-xs">
                                {row.total_records} รายการ
                              </span>
                            </td>
                            <td className="p-4 text-sm text-center">
                              <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-md text-xs">
                                {row.ot_count} รายการ
                              </span>
                            </td>
                            <td className="p-4 text-sm text-center font-semibold text-gray-700">
                              {Number(row.total_hours || 0).toFixed(1)} ชม.
                            </td>
                            <td className="p-4 text-sm text-center font-bold text-gray-800">
                              {Number(row.total_amount || 0).toLocaleString("th-TH")} ฿
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ImportExcel;