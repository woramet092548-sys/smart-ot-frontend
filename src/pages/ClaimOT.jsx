import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../context/AuthContext";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, BadgeCent, FileEdit, AlertCircle, Trash2 } from "lucide-react";

export default function ClaimOT() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [reportText, setReportText] = useState("");
  const { user } = useAuth();

  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    if (user) { fetchOTRecords(); }
  }, [user]);

  useEffect(() => {
    if (selectedDate && !selectedDate.noData) {
      setReportText(selectedDate.location || "");
    } else {
      setReportText("");
    }
  }, [selectedDate]);

  const fetchOTRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/ot/my", {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data || []);
      }
    } catch (err) {
      console.error("Error fetching OT:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOT = async (id) => {
    if (!window.confirm("คุณต้องการยกเลิกรายการโอทีนี้ใช่หรือไม่?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/ot/${id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (res.ok) {
        alert("ยกเลิกรายการสำเร็จ");
        fetchOTRecords();
        setSelectedDate(null);
      }
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  // ✅ แก้แล้ว — รับ source และส่งไปด้วย
  const handleSaveReport = async (id, source) => {
    if (!id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/ot/${id}/report`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ report_text: reportText, source })
      });
      if (res.ok) {
        alert("✅ บันทึกรายงานภาระงานเรียบร้อยแล้ว");
        fetchOTRecords();
      } else {
        alert("❌ เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err) {
      console.error("Error saving report:", err);
    }
  };

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth(year, month); i++) { calendarDays.push(null); }
  for (let d = 1; d <= daysInMonth(year, month); d++) { calendarDays.push(d); }

  const getOTForDay = (day) => {
    if (!day) return null;
    return records.find(r => {
      if (!r.date_work) return false;
      const d = new Date(r.date_work);
      return (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day);
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'อนุมัติ':
      case 'approved':
        return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-500' };
      case 'รออนุมัติ':
      case 'รอดำเนินการ':
      case 'pending':
        return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500' };
      case 'ไม่อนุมัติ':
      case 'rejected':
      case 'ยกเลิก':
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', badge: 'bg-gray-400' };
      default:
        return { bg: 'bg-white', border: 'border-gray-100', text: 'text-gray-800', badge: 'bg-transparent' };
    }
  };

  const isPending = (status) => ['รออนุมัติ', 'รอดำเนินการ', 'pending'].includes(status);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <CalendarDays className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">ปฏิทินโอทีของฉัน</h2>
              <p className="text-sm text-gray-500 mt-1">พนักงาน: <span className="font-medium text-gray-700">{user?.fullname}</span> ({user?.empId})</p>
            </div>
          </div>

          <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 w-full md:w-auto justify-between">
            <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-base min-w-[140px] text-center text-gray-800">{monthName}</span>
            <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-7 gap-2 mb-4 text-center font-bold text-gray-400 text-xs sm:text-sm">
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, i) => (
                <div key={day} className={i === 0 || i === 6 ? "text-red-400" : ""}>{day}</div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                กำลังโหลด...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {calendarDays.map((day, idx) => {
                  const otData = getOTForDay(day);
                  const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                  const colors = getStatusColor(otData?.status);

                  return (
                    <motion.div
                      whileHover={day ? { y: -2, scale: 1.02 } : {}}
                      key={idx}
                      onClick={() => day && setSelectedDate(otData || { date_work: new Date(year, month, day), noData: true })}
                      className={`min-h-20 sm:min-h-[100px] p-2 sm:p-3 rounded-2xl relative cursor-pointer transition-all flex flex-col justify-between border-2
                        ${!day ? 'bg-transparent border-transparent cursor-default' : 'bg-white hover:shadow-md'}
                        ${isToday ? 'border-blue-400 ring-4 ring-blue-50' : colors.border}
                        ${otData ? colors.bg : 'border-gray-100'}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-sm sm:text-base font-bold w-7 h-7 flex items-center justify-center rounded-full
                          ${!day ? 'text-transparent' : isToday ? 'bg-blue-500 text-white' : 'text-gray-700'}
                        `}>
                          {day}
                        </span>
                        {otData && <span className={`w-2 h-2 rounded-full ${colors.badge}`}></span>}
                      </div>

                      {otData && (
                        <div className="mt-2 text-right sm:text-left">
                          <div className={`text-[10px] sm:text-xs font-bold ${colors.text}`}>
                            {otData.total != null ? parseFloat(otData.total).toLocaleString() + ' ฿' : '—'}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium hidden sm:block">
                            {otData.hours != null ? otData.hours + ' ชั่วโมง' : '—'}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2 border-b pb-4">
              <FileEdit className="text-indigo-500" size={24} /> รายละเอียดงาน
            </h3>

            {selectedDate ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDate.id || 'new'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5 grow"
                >
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400 font-bold mb-1">วันที่เลือก</p>
                      <p className="font-bold text-gray-800">
                        {new Date(selectedDate.date_work).toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    {selectedDate.status && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(selectedDate.status).bg} ${getStatusColor(selectedDate.status).text} border ${getStatusColor(selectedDate.status).border}`}>
                        {selectedDate.status}
                      </span>
                    )}
                  </div>

                  {/* Badge source */}
                  {selectedDate.source && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block
                      ${selectedDate.source === 'imported' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
                      {selectedDate.source === 'imported' ? '📥 IMPORT' : '✏️ MANUAL'}
                    </span>
                  )}

                  {!selectedDate.noData ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-linear-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center text-center">
                          <BadgeCent className="text-blue-500 mb-2" size={24} />
                          <p className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">ยอดเงิน</p>
                          <p className="text-xl font-black text-blue-700 mt-1">
                            {selectedDate.total != null ? parseFloat(selectedDate.total).toLocaleString() + ' ฿' : '—'}
                          </p>
                        </div>
                        <div className="bg-linear-to-br from-purple-50 to-purple-100/50 p-4 rounded-2xl border border-purple-100 flex flex-col items-center text-center">
                          <Clock className="text-purple-500 mb-2" size={24} />
                          <p className="text-[11px] text-purple-600 font-bold uppercase tracking-wider">เวลาที่ทำ</p>
                          <p className="text-xl font-black text-purple-700 mt-1">
                            {selectedDate.hours != null ? selectedDate.hours + ' ชม.' : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          รายงานภาระงาน (รายละเอียด)
                        </label>
                        <textarea
                          className="w-full text-sm p-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none bg-gray-50 focus:bg-white"
                          rows="4"
                          placeholder="ระบุงานที่รับผิดชอบในวันนี้..."
                          value={reportText}
                          onChange={(e) => setReportText(e.target.value)}
                        ></textarea>
                        {/* ✅ แก้แล้ว — ส่ง source ไปด้วย */}
                        <button
                          onClick={() => handleSaveReport(selectedDate.id, selectedDate.source)}
                          className="w-full mt-3 bg-gray-900 text-white font-bold text-sm py-3 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
                        >
                          บันทึกรายงาน
                        </button>
                      </div>

                      {isPending(selectedDate.status) && (
                        <button
                          onClick={() => handleCancelOT(selectedDate.id)}
                          className="w-full mt-4 flex items-center justify-center gap-2 border-2 border-red-100 text-red-500 py-3 rounded-xl font-bold text-sm hover:bg-red-50 hover:border-red-200 transition-all"
                        >
                          <Trash2 size={18} /> ยกเลิกรายการโอที
                        </button>
                      )}

                      {(selectedDate.status === 'ยกเลิก' || selectedDate.status === 'rejected' || selectedDate.status === 'ไม่อนุมัติ') && (
                        <div className="mt-4 flex items-center justify-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-100">
                          <AlertCircle size={18} /> รายการนี้ถูกยกเลิกแล้ว
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 h-full">
                      <CalendarDays size={48} className="mb-4 text-gray-200" />
                      <p className="font-medium text-gray-500">ไม่มีข้อมูลโอทีในวันนี้</p>
                      <p className="text-xs mt-1">สามารถลงเวลาปฏิบัติงานได้ที่หน้าหลัก</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 h-full">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📅</span>
                </div>
                <p className="text-sm font-medium text-gray-500 text-center">คลิกเลือกวันที่ในปฏิทิน<br/>เพื่อดูรายละเอียดและรายงาน</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}