import { useState, useEffect } from "react";
import PageTransition from "../components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Clock, ChevronLeft, ChevronRight,
  CalendarPlus, X, Trash2, Check, Loader2, StickyNote
} from "lucide-react";
import api from "../utils/api";

const HOLIDAYS = {
  "1-1": { name: "ขึ้นปีใหม่", isHoliday: true },
  "2-26": { name: "มาฆบูชา", isHoliday: true },
  "4-6": { name: "วันจักรี", isHoliday: true },
  "4-13": { name: "สงกรานต์", isHoliday: true },
  "4-14": { name: "สงกรานต์", isHoliday: true },
  "4-15": { name: "สงกรานต์", isHoliday: true },
  "5-1": { name: "แรงงาน", isHoliday: true },
  "5-4": { name: "ฉัตรมงคล", isHoliday: true },
  "5-22": { name: "วิสาขบูชา", isHoliday: true },
  "6-3": { name: "เฉลิมฯ ราชินี", isHoliday: true },
  "7-20": { name: "อาสาฬหบูชา", isHoliday: true },
  "7-28": { name: "เฉลิมฯ ร.10", isHoliday: true },
  "8-12": { name: "วันแม่", isHoliday: true },
  "10-13": { name: "ร.9", isHoliday: true },
  "10-23": { name: "ปิยมหาราช", isHoliday: true },
  "12-5": { name: "วันพ่อ", isHoliday: true },
  "12-10": { name: "รัฐธรรมนูญ", isHoliday: true },
  "12-31": { name: "สิ้นปี", isHoliday: true },
};

export default function ShiftSchedule() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [schedules, setSchedules] = useState([]); // [Phase 2.2] ตารางที่จัดไว้
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // [Phase 2.2] state สำหรับ modal จัดตาราง
  const [showModal, setShowModal] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, text: "", type: "" });

  // form ใน modal
  const [form, setForm] = useState({
    empIds: [],
    date_start: "",
    date_end: "",
    time_start: "17:00",
    time_end: "20:00",
    note: "",
  });

  useEffect(() => {
    fetchSchedules();
  }, [currentMonth, currentYear]);

  const showToast = (text, type) => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: "", type: "" }), 3000);
  };

  const fetchSchedules = async () => {
    setLoading(true);
    setSelectedDay(null);
    try {
      const res = await api.get(`/schedules`, {
        params: { month: currentMonth, year: currentYear }
      });
      setSchedules(res.data || []);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  // โหลดรายชื่อพนักงานที่จัดได้ (ตอนเปิด modal)
  const openModal = async (presetDay = null) => {
    try {
      const res = await api.get(`/schedules/assignable-users`);
      setAssignableUsers(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("โหลดรายชื่อพนักงานไม่สำเร็จ", "error");
      return;
    }

    // ถ้ากดจากวันในปฏิทิน → preset วันที่
    let presetDate = "";
    if (presetDay) {
      const mo = currentMonth.toString().padStart(2, '0');
      const da = presetDay.toString().padStart(2, '0');
      presetDate = `${currentYear}-${mo}-${da}`;
    }

    setForm({
      empIds: [],
      date_start: presetDate,
      date_end: presetDate,
      time_start: "17:00",
      time_end: "20:00",
      note: "",
    });
    setShowModal(true);
  };

  const toggleEmp = (empId) => {
    setForm(prev => ({
      ...prev,
      empIds: prev.empIds.includes(empId)
        ? prev.empIds.filter(e => e !== empId)
        : [...prev.empIds, empId]
    }));
  };

  const handleSave = async () => {
    if (form.empIds.length === 0) return showToast("กรุณาเลือกพนักงานอย่างน้อย 1 คน", "error");
    if (!form.date_start) return showToast("กรุณาเลือกวันที่", "error");

    setSaving(true);
    try {
      const payload = {
        ...form,
        date_end: form.date_end || form.date_start,
      };
      const res = await api.post(`/schedules`, payload);
      showToast(res.data.message || "จัดตารางสำเร็จ", "success");
      setShowModal(false);
      fetchSchedules();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "จัดตารางไม่สำเร็จ", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ต้องการลบรายการจัด OT นี้ใช่หรือไม่?")) return;
    try {
      await api.delete(`/schedules/${id}`);
      setSchedules(prev => prev.filter(s => s.id !== id));
      showToast("ลบเรียบร้อย", "success");
    } catch (err) {
      console.error(err);
      showToast("ลบไม่สำเร็จ", "error");
    }
  };

  const getHoliday = (day) => HOLIDAYS[`${currentMonth}-${day}`];

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const monthName = new Date(currentYear, currentMonth - 1, 1)
    .toLocaleDateString("th-TH", { month: "long" });

  const getSchedulesForDay = (day) => {
    return schedules.filter(s => {
      const d = new Date(s.schedule_date);
      return d.getDate() === day && d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });
  };

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const selectedSchedules = selectedDay ? getSchedulesForDay(selectedDay) : [];

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">

        {/* Toast */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
              className={`fixed top-24 right-6 px-6 py-4 rounded-xl shadow-lg z-50 text-white font-medium
                ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users size={22} className="text-blue-500" />
              จัดตาราง OT พนักงาน
            </h1>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              เลือกวัน + พนักงาน เพื่อจัดแผนการอยู่ OT ล่วงหน้า
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* ปุ่มจัดตาราง */}
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              <CalendarPlus size={18} />
              จัดตาราง OT
            </button>

            {/* Month Navigator */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
              <button onClick={prevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center">
                {monthName} {currentYear + 543}
              </span>
              <button onClick={nextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* Calendar */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">

            {/* Stats */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase">จัดตารางแล้ว</p>
                <p className="text-lg font-bold text-slate-700">{schedules.length} <span className="text-xs font-normal">รายการ</span></p>
              </div>
              <div className="flex-1 bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
                <p className="text-[10px] text-blue-500 font-bold uppercase">พนักงาน (ไม่ซ้ำ)</p>
                <p className="text-lg font-bold text-blue-600">
                  {new Set(schedules.map(s => s.empId)).size} <span className="text-xs font-normal">คน</span>
                </p>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (
                <div key={d} className={`text-center text-[11px] font-bold py-1 ${i === 0 || i === 6 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                กำลังโหลด...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const dayScheds = day ? getSchedulesForDay(day) : [];
                  const holiday = day ? getHoliday(day) : null;
                  const isToday = day === now.getDate() && currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();
                  const isSelected = day === selectedDay;

                  return (
                    <motion.div
                      key={idx}
                      whileHover={day ? { scale: 1.02 } : {}}
                      onClick={() => day && setSelectedDay(isSelected ? null : day)}
                      className={`min-h-20 p-1.5 rounded-xl border-2 transition-all flex flex-col
                        ${!day ? 'invisible' : 'cursor-pointer'}
                        ${isSelected ? 'border-blue-500 bg-blue-50' : ''}
                        ${!isSelected && isToday ? 'border-blue-300 bg-blue-50/30' : ''}
                        ${!isSelected && !isToday && holiday?.isHoliday ? 'border-rose-100 bg-rose-50/50' : ''}
                        ${!isSelected && !isToday && !holiday?.isHoliday ? 'border-slate-100 hover:border-slate-300 bg-white' : ''}
                      `}
                    >
                      <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : holiday?.isHoliday ? 'text-rose-500' : 'text-slate-600'}`}>
                        {day}
                      </span>

                      {holiday && (
                        <span className="text-[8px] font-semibold truncate text-rose-400">
                          {holiday.name}
                        </span>
                      )}

                      {dayScheds.length > 0 && (
                        <div className="mt-auto">
                          <div className="flex flex-wrap gap-0.5 mb-0.5">
                            {dayScheds.slice(0, 6).map((s, i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500" title={s.fullname} />
                            ))}
                            {dayScheds.length > 6 && (
                              <span className="text-[8px] text-slate-400">+{dayScheds.length - 6}</span>
                            )}
                          </div>
                          <p className="text-[9px] text-blue-600 font-medium">{dayScheds.length} คน</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar — รายชื่อวันที่เลือก */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  <h3 className="font-bold text-slate-700 text-sm">
                    {selectedDay ? `${selectedDay} ${monthName} ${currentYear + 543}` : 'เลือกวันที่'}
                  </h3>
                </div>
                {selectedDay && (
                  <button
                    onClick={() => openModal(selectedDay)}
                    className="text-[11px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <CalendarPlus size={14} /> เพิ่ม
                  </button>
                )}
              </div>

              {!selectedDay ? (
                <div className="py-16 text-center opacity-30">
                  <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">กดที่วันในปฏิทิน</p>
                </div>
              ) : selectedSchedules.length === 0 ? (
                <div className="py-12 text-center opacity-40">
                  <p className="text-xs text-slate-500">ยังไม่มีใครถูกจัด OT ในวันนี้</p>
                  <button
                    onClick={() => openModal(selectedDay)}
                    className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                  >
                    + จัดตารางวันนี้
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedSchedules.map((s) => (
                    <div key={s.id} className="flex items-start justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{s.fullname || s.empId}</p>
                        <p className="text-[10px] text-slate-400">{s.empId} · {s.time_start} - {s.time_end}</p>
                        {s.note && (
                          <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                            <StickyNote size={10} /> {s.note}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 text-center">
                    รวม {selectedSchedules.length} คน
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════ Modal จัดตาราง OT ════════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => !saving && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <CalendarPlus size={22} className="text-blue-600" />
                  จัดตาราง OT
                </h3>
                <button onClick={() => !saving && setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={22} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* วันที่ */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">วันที่เริ่ม</label>
                    <input
                      type="date"
                      value={form.date_start}
                      onChange={(e) => setForm({ ...form, date_start: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">ถึงวันที่ (เลือกช่วงได้)</label>
                    <input
                      type="date"
                      value={form.date_end}
                      onChange={(e) => setForm({ ...form, date_end: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* เวลา */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">เวลาเริ่ม</label>
                    <input
                      type="time"
                      value={form.time_start}
                      onChange={(e) => setForm({ ...form, time_start: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">เวลาเลิก</label>
                    <input
                      type="time"
                      value={form.time_end}
                      onChange={(e) => setForm({ ...form, time_end: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* หมายเหตุ */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">หมายเหตุ (ถ้ามี)</label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="เช่น งานพระราชทานปริญญาบัตร, อบรม..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* เลือกพนักงาน */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-500">เลือกพนักงาน</label>
                    <span className="text-[11px] text-blue-600 font-bold">เลือกแล้ว {form.empIds.length} คน</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-slate-50">
                    {assignableUsers.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6">ไม่มีพนักงานที่จัดได้ (ต้องเปิดสิทธิ์ทำ OT ก่อน)</p>
                    ) : (
                      assignableUsers.map((u) => {
                        const checked = form.empIds.includes(u.empId);
                        return (
                          <button
                            key={u.empId}
                            onClick={() => toggleEmp(u.empId)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                              ${checked ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
                              ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                              {checked && <Check size={14} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-700 truncate">{u.fullname}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{u.empId}</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-6 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-3xl">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={16} /> บันทึกตาราง</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}