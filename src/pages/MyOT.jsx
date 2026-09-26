import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../utils/api"; // [deploy] ที่อยู่ API จากไฟล์ .env (เดิมเขียน localhost:5000 ตายตัว)
import { getHolidayName, getDayOffLabel } from "../utils/holidays"; // [Phase 3.1]
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  BadgeCent,
  FileEdit,
  Trash2,
  Calendar as CalendarIcon,
  Info,
  AlertCircle,
  Ban, // [Phase 2.1.5] icon สำหรับรายการที่ HR ยกเลิก
  Wallet,       // [Phase 2.7] ไอคอนสรุปเงิน
  TrendingUp,   // [Phase 2.7] ไอคอนสรุปชั่วโมง
  CalendarDays, // [Phase 2.7] ไอคอนจำนวนวัน
  LogIn,        // [Phase 2.7] ไอคอนเวลาเข้า
  LogOut as LogOutIcon, // [Phase 2.7] ไอคอนเวลาออก
  PartyPopper,  // [Phase 3.1] ไอคอนวันหยุด
  Send,         // [Phase E] ไอคอนปุ่มยืนยันส่งอนุมัติ
  CheckCircle2, // [Phase E] ไอคอนในปุ่มยืนยัน
} from "lucide-react";

// [Phase 2.7] ค่าคงที่กฎ OT (ให้ตรงกับ backend src/config/ot-rules.js) — ใช้คำนวณเหตุผลฝั่งหน้าจอ
// [17:00] อาจารย์ยืนยันเวลาเลิกงานปกติ = 17:00
const OT_RULE = {
  WORK_END_TIME: "17:00", // เวลาเลิกงานปกติ (วันธรรมดานับ OT จากเวลานี้)
};

export default function MyOT() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [reportText, setReportText] = useState("");
  const [confirming, setConfirming] = useState(false); // [Phase E] สถานะระหว่างกดยืนยัน
  const { user } = useAuth();

  // [Phase 2.1] สิทธิ์ทำ OT จาก JWT
  const canDoOt = user?.can_do_ot === undefined ? true : user?.can_do_ot === 1;

  // [Phase 2.1.5] ค่า status ที่ HR ยกเลิก
  const HR_CANCEL_STATUS = 'ยกเลิกโดย HR';

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
      const res = await fetch(`${API_BASE}/ot/my`, {
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
      const res = await fetch(`${API_BASE}/ot/${id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (res.ok) {
        fetchOTRecords();
        setSelectedDate(null);
      }
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleSaveReport = async (id, source) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/ot/${id}/report`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ report_text: reportText, source })
      });
      if (res.ok) {
        alert(" บันทึกเรียบร้อย");
        fetchOTRecords();
      }
    } catch (err) { console.error("Error saving report:", err); }
  };

  // ─────────────────────────────────────────────────────────────
  // [Phase E] ยืนยัน OT ทั้งเดือน → ส่งเข้า flow อนุมัติ (รอยืนยัน → รอหัวหน้า)
  //   ยิง POST /api/approvals/confirm ด้วย { month, year } ของเดือนที่กำลังดู
  //   หมายเหตุ: JS เดือนเริ่มที่ 0 (ม.ค.=0) จึงต้องส่ง month + 1 ให้ backend
  // ─────────────────────────────────────────────────────────────
  const handleConfirmMonth = async () => {
    if (pendingConfirmCount === 0) return;
    if (!window.confirm(
      `ยืนยันส่งอนุมัติ OT เดือน ${monthName} จำนวน ${pendingConfirmCount} วัน?\n` +
      `หลังยืนยันแล้วรายการจะถูกส่งให้หัวหน้าฝ่ายอนุมัติ`
    )) return;

    setConfirming(true);
    try {
      const res = await fetch(`${API_BASE}/approvals/confirm`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ month: month + 1, year }) // month + 1 = แปลงให้ตรงเดือนจริง
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        fetchOTRecords();   // โหลดใหม่ให้สถานะขยับเป็น 'รอหัวหน้า'
        setSelectedDate(null);
      } else {
        alert(`⚠️ ${data.message || 'ยืนยันไม่สำเร็จ'}`);
      }
    } catch (err) {
      console.error("Error confirming month:", err);
      alert("เกิดข้อผิดพลาดในการยืนยัน");
    } finally {
      setConfirming(false);
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

  const isPending = (status) => ['รออนุมัติ', 'รอดำเนินการ', 'pending'].includes(status);
  const isHrCancelled = (status) => status === HR_CANCEL_STATUS;

  // [Phase E] สถานะที่ "รอ user ยืนยัน" (รวมค่าเก่าที่อาจตกค้าง) — ใช้ตัดสินว่าจะโชว์ปุ่มยืนยันไหม
  const isConfirmable = (status) => ['รอยืนยัน', 'รออนุมัติ', 'รอดำเนินการ', 'pending'].includes(status);

  // ─────────────────────────────────────────────────────────────
  // [Phase 2.7 - C1] สรุปทั้งเดือน
  // ─────────────────────────────────────────────────────────────
  const monthlySummary = useMemo(() => {
    const inMonth = records.filter(r => {
      if (!r.date_work) return false;
      const d = new Date(r.date_work);
      return d.getFullYear() === year && d.getMonth() === month && !isHrCancelled(r.status);
    });

    let totalAmount = 0;
    let totalHours = 0;
    let weekdayDays = 0;
    let weekendDays = 0;
    let otDays = 0;

    for (const r of inMonth) {
      const amt = parseFloat(r.total) || 0;
      const hrs = parseFloat(r.hours) || 0;
      if (amt > 0 || hrs > 0) {
        totalAmount += amt;
        totalHours += hrs;
        otDays++;
        if (r.type === 'วันหยุด') weekendDays++;
        else weekdayDays++;
      }
    }

    return { totalAmount, totalHours, otDays, weekdayDays, weekendDays };
  }, [records, year, month]);

  // [Phase E] นับจำนวนวันที่ "รอยืนยัน" ในเดือนที่ดูอยู่ — ใช้ควบคุม banner + ปุ่มยืนยัน
  const pendingConfirmCount = useMemo(() => {
    return records.filter(r => {
      if (!r.date_work) return false;
      const d = new Date(r.date_work);
      return d.getFullYear() === year && d.getMonth() === month && isConfirmable(r.status);
    }).length;
  }, [records, year, month]);

  // ─────────────────────────────────────────────────────────────
  // [Phase 2.7 - C2] คำนวณ "เหตุผลที่ไม่ได้ OT" จากเวลาเข้า-ออก
  // ─────────────────────────────────────────────────────────────
  const getNoOtReason = (rec) => {
    if (!rec || rec.total == null) return null;
    if (parseFloat(rec.total) > 0) return null;

    const type = rec.type;
    if (type === 'วันหยุด') {
      return 'ไม่มีชั่วโมงทำงานในวันหยุด';
    }
    if (rec.time_end) {
      const [eH, eM] = String(rec.time_end).split(':').map(Number);
      const [wH, wM] = OT_RULE.WORK_END_TIME.split(':').map(Number);
      const endMin = eH * 60 + (eM || 0);
      const workEndMin = wH * 60 + wM;
      if (endMin <= workEndMin) {
        return `เลิกงานไม่เกินเวลาเลิกปกติ (${OT_RULE.WORK_END_TIME})`;
      }
    }
    return 'ไม่เข้าเงื่อนไขการคิด OT';
  };

  // [Phase 2.1.5] เพิ่ม case 'ยกเลิกโดย HR' (สีเทา)
  // [Phase E] เพิ่มสีของสถานะ flow อนุมัติ 4 ขั้น
  const getStatusStyle = (status) => {
    switch(status) {
      case 'อนุมัติ':
      case 'approved':
        return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', dot: 'bg-emerald-500' };
      // [Phase E] รอ user ยืนยัน (ต้องลงมือ) — ส้ม
      case 'รอยืนยัน':
        return { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' };
      // [Phase E] ขั้นในระหว่าง flow อนุมัติ
      case 'รอหัวหน้า':
        return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', dot: 'bg-amber-500' };
      case 'รอการเงิน':
        return { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-600', dot: 'bg-sky-500' };
      case 'รอผอ.':
        return { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-600', dot: 'bg-violet-500' };
      case 'รออนุมัติ':
      case 'รอดำเนินการ':
      case 'pending':
        return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', dot: 'bg-amber-500' };
      case 'rejected':
      case 'ไม่อนุมัติ':
        return { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600', dot: 'bg-rose-500' };
      case HR_CANCEL_STATUS: // [Phase 2.1.5]
        return { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-500', dot: 'bg-slate-400' };
      default:
        return { bg: 'bg-white', border: 'border-slate-100', text: 'text-slate-500', dot: 'bg-slate-300' };
    }
  };

  // [Phase 2.7] เหตุผลที่ไม่ได้ OT ของวันที่เลือก
  const noOtReason = selectedDate && !selectedDate.noData ? getNoOtReason(selectedDate) : null;

  // [Phase 3.1] ชื่อวันหยุดของวันที่เลือก
  const selectedHolidayName = selectedDate
    ? getHolidayName(selectedDate.date_work)
    : null;

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4 bg-slate-50/30 min-h-[calc(100vh-64px)]">

        {/* [Phase 2.1] Banner เตือน */}
        {!canDoOt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3"
          >
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-amber-800 text-sm">สิทธิ์ทำ OT ของคุณถูกปิดอยู่</p>
              <p className="text-xs text-amber-700 mt-1">
                คุณสามารถดูประวัติย้อนหลังได้ แต่จะไม่ถูกรวมในรอบนำเข้าข้อมูล Excel ครั้งต่อไป
                หากต้องการเปิดสิทธิ์ กรุณาติดต่อฝ่ายบุคคล
              </p>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">MY OT</h1>
            <p className="text-[11px] text-slate-400 font-medium">
              OT MANAGEMENT • <span className="text-blue-500 uppercase">{user?.role}</span> {user?.fullname} ({user?.empId})
            </p>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
            <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">{monthName}</span>
            <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* [Phase 2.7 - C1] แถบสรุปทั้งเดือน */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Wallet size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">รวมทั้งเดือน</p>
              <p className="text-lg font-bold text-blue-600 leading-tight">
                {monthlySummary.totalAmount.toLocaleString()} ฿
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">รวมชั่วโมง</p>
              <p className="text-lg font-bold text-slate-700 leading-tight">
                {monthlySummary.totalHours.toLocaleString()} <span className="text-xs font-medium">ชม.</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <CalendarDays size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">วันที่ทำ OT</p>
              <p className="text-lg font-bold text-slate-700 leading-tight">
                {monthlySummary.otDays} <span className="text-xs font-medium">วัน</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <CalendarIcon size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">ธรรมดา / หยุด</p>
              <p className="text-lg font-bold text-slate-700 leading-tight">
                {monthlySummary.weekdayDays} <span className="text-xs font-medium">/</span> {monthlySummary.weekendDays}
              </p>
            </div>
          </div>
        </motion.div>

        {/* [Phase E] Banner ยืนยันส่งอนุมัติ — โผล่เฉพาะเมื่อมีวัน 'รอยืนยัน' ในเดือนนี้ */}
        <AnimatePresence>
          {pendingConfirmCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                  <Send size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-blue-800 text-sm">
                    มี {pendingConfirmCount} วัน รอคุณยืนยัน
                  </p>
                  <p className="text-[11px] text-blue-600 mt-0.5">
                    ตรวจสอบ OT เดือน {monthName} ให้เรียบร้อย แล้วกดยืนยันเพื่อส่งให้หัวหน้าฝ่ายอนุมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={handleConfirmMonth}
                disabled={confirming}
                className="bg-blue-600 text-white font-bold text-xs px-5 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-2"
              >
                {confirming ? (
                  'กำลังยืนยัน...'
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    ยืนยันส่งอนุมัติ ({pendingConfirmCount} วัน)
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* Calendar */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, i) => (
                <div key={day} className={`text-center font-bold text-[11px] uppercase tracking-wider ${i === 0 || i === 6 ? "text-rose-400" : "text-slate-400"}`}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const otData = getOTForDay(day);
                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                const style = getStatusStyle(otData?.status);
                const cancelled = isHrCancelled(otData?.status);

                // [Phase 3.1] เช็ควันหยุดนักขัตฤกษ์ของช่องนี้
                const dayDate = day ? new Date(year, month, day) : null;
                const holidayName = day ? getHolidayName(dayDate) : null;

                return (
                  <div
                    key={idx}
                    onClick={() => day && setSelectedDate(otData || { date_work: new Date(year, month, day), noData: true })}
                    className={`min-h-[75px] p-2 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between
                      ${!day ? 'invisible' : 'visible'}
                      ${isToday ? 'border-blue-500 bg-blue-50/30' : 'border-slate-50 hover:border-slate-200'}
                      ${otData ? `${style.bg} ${style.border}` : (holidayName ? 'bg-rose-50/40 border-rose-100' : 'bg-white')}
                      ${cancelled ? 'opacity-60' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-medium ${isToday ? 'text-blue-600 font-bold' : (holidayName && !otData ? 'text-rose-500' : 'text-slate-600')} ${cancelled ? 'line-through' : ''}`}>
                        {day}
                      </span>
                      {otData && !cancelled && <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></div>}
                      {cancelled && <Ban size={10} className="text-slate-400" />}
                      {/* [Phase 3.1] จุดวันหยุด (เฉพาะวันหยุดที่ไม่มี OT) */}
                      {holidayName && !otData && <PartyPopper size={11} className="text-rose-400" />}
                    </div>

                    {/* เงิน OT */}
                    {otData && otData.total != null && (
                      <div className="text-right">
                        <p className={`text-[11px] font-semibold ${style.text} ${cancelled ? 'line-through' : ''}`}>
                          {parseFloat(otData.total).toLocaleString()} ฿
                        </p>
                      </div>
                    )}

                    {/* [Phase 3.1] ชื่อวันหยุด (เฉพาะวันหยุดที่ไม่มี OT) */}
                    {holidayName && !otData && (
                      <p className="text-[8px] font-semibold text-rose-400 leading-tight line-clamp-2">
                        {holidayName}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                <FileEdit size={16} className="text-blue-500" />
                <h3 className="font-bold text-slate-700 text-sm">รายละเอียดงาน</h3>
              </div>

              {selectedDate ? (
                <div className="space-y-4">
                  {/* [Phase 2.1.5] Banner กรณีถูก HR ยกเลิก */}
                  {isHrCancelled(selectedDate.status) && (
                    <div className="bg-slate-100 border-l-4 border-slate-400 p-3 rounded-r-lg flex items-start gap-2">
                      <Ban className="text-slate-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="font-bold text-slate-700 text-xs">รายการนี้ถูก HR ยกเลิก</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">จะไม่ถูกคิดในการเบิกจ่าย</p>
                      </div>
                    </div>
                  )}

                  {/* [Phase 3.1] Banner วันหยุดนักขัตฤกษ์ */}
                  {selectedHolidayName && (
                    <div className="bg-rose-50 border-l-4 border-rose-300 p-3 rounded-r-lg flex items-start gap-2">
                      <PartyPopper className="text-rose-400 shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="font-bold text-rose-600 text-xs">{selectedHolidayName}</p>
                        <p className="text-[10px] text-rose-500 mt-0.5">วันหยุดราชการ (ทำงานวันนี้คิดเหมา 300 บาท)</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">วันที่เลือก</p>
                      <p className="text-sm font-bold text-slate-700">
                        {new Date(selectedDate.date_work).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                    </div>
                    {selectedDate.status && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${getStatusStyle(selectedDate.status).bg} ${getStatusStyle(selectedDate.status).text} border border-current opacity-80`}>
                        {selectedDate.status}
                      </span>
                    )}
                  </div>

                  {selectedDate.source && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block
                      ${selectedDate.source === 'imported' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
                      {selectedDate.source === 'imported' ? ' IMPORT' : ' MANUAL'}
                    </span>
                  )}

                  {!selectedDate.noData ? (
                    <>
                      {/* [Phase 2.7 - C2] รายละเอียดเวลาเข้า-ออกดิบ + ประเภทวัน */}
                      <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <LogIn size={14} className="text-emerald-500 shrink-0" />
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">เวลาเข้า</p>
                              <p className="text-xs font-bold text-slate-700">{selectedDate.time_start || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <LogOutIcon size={14} className="text-rose-500 shrink-0" />
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">เวลาออก</p>
                              <p className="text-xs font-bold text-slate-700">{selectedDate.time_end || '—'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">ประเภทวัน</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded
                            ${selectedDate.type === 'วันหยุด' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                            {selectedDate.type || '—'}
                          </span>
                        </div>
                        {selectedDate.rate != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">เรท</span>
                            <span className="text-[10px] font-bold text-slate-600">
                              {selectedDate.type === 'วันหยุด'
                                ? `เหมา ${parseFloat(selectedDate.rate).toLocaleString()} ฿/วัน`
                                : `${parseFloat(selectedDate.rate).toLocaleString()} ฿/ชม.`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* [Phase 2.7 - C2] กล่องเหตุผล เมื่อวันนี้มี record แต่ไม่ได้ OT */}
                      {noOtReason && (
                        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
                          <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-amber-700 uppercase">ไม่ได้คิด OT</p>
                            <p className="text-[11px] text-amber-700 mt-0.5">{noOtReason}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">ยอดเงิน</p>
                          <p className={`text-base font-bold text-blue-600 ${isHrCancelled(selectedDate.status) ? 'line-through opacity-50' : ''}`}>
                            {selectedDate.total != null
                              ? parseFloat(selectedDate.total).toLocaleString() + ' ฿'
                              : '—'}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">ชั่วโมง</p>
                          <p className={`text-base font-bold text-slate-700 ${isHrCancelled(selectedDate.status) ? 'line-through opacity-50' : ''}`}>
                            {selectedDate.hours != null ? selectedDate.hours + ' hr' : '—'}
                          </p>
                        </div>
                      </div>

                      {/* [Phase 2.1.5] ซ่อน textarea เมื่อ HR ยกเลิก */}
                      {!isHrCancelled(selectedDate.status) && (
                        <div className="space-y-2">
                          <textarea
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-blue-400 outline-none transition-all bg-slate-50 min-h-[100px] leading-relaxed"
                            placeholder="รายงานภาระงาน..."
                            value={reportText}
                            onChange={(e) => setReportText(e.target.value)}
                          ></textarea>

                          <button
                            onClick={() => handleSaveReport(selectedDate.id, selectedDate.source)}
                            className="w-full bg-slate-800 text-white font-bold text-xs py-3 rounded-xl hover:bg-blue-600 transition-all shadow-sm active:scale-[0.98]"
                          >
                            บันทึกรายงาน
                          </button>
                        </div>
                      )}

                      {isPending(selectedDate.status) && (
                        <button
                          onClick={() => handleCancelOT(selectedDate.id)}
                          className="w-full text-rose-500 py-1 rounded-lg font-bold text-[10px] hover:bg-rose-50 transition-colors uppercase tracking-wider"
                        >
                          ยกเลิกรายการนี้
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="py-10 text-center space-y-2">
                      {selectedHolidayName ? (
                        <div className="opacity-70">
                          <PartyPopper size={32} className="mx-auto text-rose-300" />
                          <p className="text-xs font-medium text-rose-500 mt-2">{selectedHolidayName}</p>
                          <p className="text-[10px] text-slate-400 mt-1">วันหยุดราชการ ไม่มีการทำงาน</p>
                        </div>
                      ) : (
                        <div className="opacity-40">
                          <Info size={32} className="mx-auto text-slate-300" />
                          <p className="text-xs font-medium text-slate-500">ไม่มีข้อมูลโอทีในวันนี้</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center opacity-30">
                  <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">กรุณาเลือกวันที่</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}