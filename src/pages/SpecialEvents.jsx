import { useState, useEffect } from "react";
import PageTransition from "../components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarHeart, ChevronLeft, ChevronRight,
  Plus, X, Trash2, Check, Loader2, Users
} from "lucide-react";
import api from "../utils/api";
import { getHolidayName } from "../utils/holidays"; // [วันหยุด] ไฟล์กลาง

// [วันหยุด] ใช้รายการกลางจาก utils/holidays.js (อิงปีจริง) แทนรายการเดิมที่ฝังไว้ในหน้านี้ (วันที่ไม่ตรงปี)

export default function SpecialEvents() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [eventUsers, setEventUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, text: "", type: "" });

  const [form, setForm] = useState({
    empIds: [],
    date_start: "",
    date_end: "",
    event_name: "",
  });

  useEffect(() => {
    fetchEvents();
  }, [currentMonth, currentYear]);

  const showToast = (text, type) => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: "", type: "" }), 3000);
  };

  const fetchEvents = async () => {
    setLoading(true);
    setSelectedDay(null);
    try {
      const res = await api.get(`/events`, { params: { month: currentMonth, year: currentYear } });
      setEvents(res.data || []);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async (presetDay = null) => {
    try {
      const res = await api.get(`/events/users`);
      setEventUsers(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("โหลดรายชื่อพนักงานไม่สำเร็จ", "error");
      return;
    }

    let presetDate = "";
    if (presetDay) {
      const mo = currentMonth.toString().padStart(2, '0');
      const da = presetDay.toString().padStart(2, '0');
      presetDate = `${currentYear}-${mo}-${da}`;
    }

    setForm({ empIds: [], date_start: presetDate, date_end: presetDate, event_name: "" });
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
    if (!form.event_name.trim()) return showToast("กรุณาระบุชื่อกิจกรรม", "error");

    setSaving(true);
    try {
      const payload = { ...form, date_end: form.date_end || form.date_start };
      const res = await api.post(`/events`, payload);
      showToast(res.data.message || "เพิ่มกิจกรรมสำเร็จ", "success");
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "เพิ่มกิจกรรมไม่สำเร็จ", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ต้องการลบกิจกรรมพิเศษนี้ใช่หรือไม่?")) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents(prev => prev.filter(e => e.id !== id));
      showToast("ลบเรียบร้อย", "success");
    } catch (err) {
      console.error(err);
      showToast("ลบไม่สำเร็จ", "error");
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString("th-TH", { month: "long" });

  const getEventsForDay = (day) => {
    return events.filter(e => {
      const d = new Date(e.event_date);
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

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">

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
              <CalendarHeart size={22} className="text-rose-500" />
              กิจกรรมพิเศษ
            </h1>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              เพิ่มวันที่พนักงานติดงานพิเศษ (รับปริญญา/อบรม) — ระบบจะไม่คิด OT วันนั้นตอน import
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-600 transition-all shadow-md active:scale-95"
            >
              <Plus size={18} />
              เพิ่มกิจกรรม
            </button>

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
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-rose-50 rounded-xl p-3 border border-rose-100 text-center">
                <p className="text-[10px] text-rose-500 font-bold uppercase">กิจกรรมเดือนนี้</p>
                <p className="text-lg font-bold text-rose-600">{events.length} <span className="text-xs font-normal">รายการ</span></p>
              </div>
              <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase">พนักงาน (ไม่ซ้ำ)</p>
                <p className="text-lg font-bold text-slate-700">{new Set(events.map(e => e.empId)).size} <span className="text-xs font-normal">คน</span></p>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (
                <div key={d} className={`text-center text-[11px] font-bold py-1 ${i === 0 || i === 6 ? 'text-rose-400' : 'text-slate-400'}`}>{d}</div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-3" /> กำลังโหลด...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const holiday = day ? getHolidayName(new Date(currentYear, currentMonth - 1, day)) : null; // [วันหยุด]
                  const isToday = day === now.getDate() && currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();
                  const isSelected = day === selectedDay;

                  return (
                    <motion.div
                      key={idx}
                      whileHover={day ? { scale: 1.02 } : {}}
                      onClick={() => day && setSelectedDay(isSelected ? null : day)}
                      className={`min-h-20 p-1.5 rounded-xl border-2 transition-all flex flex-col
                        ${!day ? 'invisible' : 'cursor-pointer'}
                        ${isSelected ? 'border-rose-500 bg-rose-50' : ''}
                        ${!isSelected && isToday ? 'border-blue-300 bg-blue-50/30' : ''}
                        ${!isSelected && !isToday && holiday ? 'border-rose-100 bg-rose-50/30' : ''}
                        ${!isSelected && !isToday && !holiday ? 'border-slate-100 hover:border-slate-300 bg-white' : ''}
                      `}
                    >
                      <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : holiday ? 'text-rose-500' : 'text-slate-600'}`}>{day}</span>
                      {holiday && <span className="text-[8px] font-semibold truncate text-rose-400">{holiday}</span>}
                      {dayEvents.length > 0 && (
                        <div className="mt-auto">
                          <div className="flex flex-wrap gap-0.5 mb-0.5">
                            {dayEvents.slice(0, 6).map((e, i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full bg-rose-500" title={e.fullname} />
                            ))}
                            {dayEvents.length > 6 && <span className="text-[8px] text-slate-400">+{dayEvents.length - 6}</span>}
                          </div>
                          <p className="text-[9px] text-rose-600 font-medium">{dayEvents.length} คน</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarHeart size={16} className="text-rose-500" />
                  <h3 className="font-bold text-slate-700 text-sm">
                    {selectedDay ? `${selectedDay} ${monthName} ${currentYear + 543}` : 'เลือกวันที่'}
                  </h3>
                </div>
                {selectedDay && (
                  <button onClick={() => openModal(selectedDay)} className="text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                    <Plus size={14} /> เพิ่ม
                  </button>
                )}
              </div>

              {!selectedDay ? (
                <div className="py-16 text-center opacity-30">
                  <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">กดที่วันในปฏิทิน</p>
                </div>
              ) : selectedEvents.length === 0 ? (
                <div className="py-12 text-center opacity-40">
                  <p className="text-xs text-slate-500">ไม่มีกิจกรรมพิเศษในวันนี้</p>
                  <button onClick={() => openModal(selectedDay)} className="mt-3 text-xs font-bold text-rose-600 hover:underline">+ เพิ่มกิจกรรมวันนี้</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((e) => (
                    <div key={e.id} className="flex items-start justify-between bg-rose-50/50 p-3 rounded-xl border border-rose-100 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{e.fullname || e.empId}</p>
                        <p className="text-[10px] text-slate-400">{e.empId}</p>
                        <p className="text-[10px] text-rose-600 mt-1 font-medium">{e.event_name}</p>
                      </div>
                      <button onClick={() => handleDelete(e.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100" title="ลบ">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 text-center">รวม {selectedEvents.length} คน</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
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
              <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <CalendarHeart size={22} className="text-rose-500" /> เพิ่มกิจกรรมพิเศษ
                </h3>
                <button onClick={() => !saving && setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={22} /></button>
              </div>

              <div className="p-6 space-y-5">
                {/* ชื่อกิจกรรม */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">ชื่อกิจกรรม</label>
                  <input
                    type="text" value={form.event_name}
                    onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                    placeholder="เช่น งานพระราชทานปริญญาบัตร, อบรมเชิงปฏิบัติการ..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* วันที่ */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">วันที่เริ่ม</label>
                    <input type="date" value={form.date_start} onChange={(e) => setForm({ ...form, date_start: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-100" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">ถึงวันที่ (เลือกช่วงได้)</label>
                    <input type="date" value={form.date_end} onChange={(e) => setForm({ ...form, date_end: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-100" />
                  </div>
                </div>

                {/* เลือกพนักงาน */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-500">เลือกพนักงานที่ไปงาน</label>
                    <span className="text-[11px] text-rose-600 font-bold">เลือกแล้ว {form.empIds.length} คน</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-slate-50">
                    {eventUsers.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6">ไม่มีพนักงานในระบบ</p>
                    ) : (
                      eventUsers.map((u) => {
                        const checked = form.empIds.includes(u.empId);
                        return (
                          <button key={u.empId} onClick={() => toggleEmp(u.empId)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${checked ? 'bg-rose-50' : 'hover:bg-slate-50'}`}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-rose-500 border-rose-500' : 'border-slate-300'}`}>
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

              <div className="flex gap-3 p-6 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-3xl">
                <button onClick={() => setShowModal(false)} disabled={saving}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50">ยกเลิก</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={16} /> บันทึก</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}