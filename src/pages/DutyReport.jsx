import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/api";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../context/AuthContext";
import {
  ChevronLeft, ChevronRight,
  Plus, Trash2,
  Save, ShieldCheck,
  ClipboardList,
  Lock, AlertCircle, Info,
} from "lucide-react";

// [Phase D] ค่าคงที่ — backend คืนค่าจริงผ่าน config (เผื่อปรับทีหลัง)
const DEFAULT_MAX_LINES = 18;
const DEFAULT_CHARS_PER_LINE = 65;

// helper: นับบรรทัดของข้อความ (รวม line-wrap)
const countLines = (text, charsPerLine) => {
  if (!text) return 0;
  return String(text).split('\n').reduce(
    (sum, ln) => sum + Math.max(1, Math.ceil(ln.length / charsPerLine)),
    0
  );
};

export default function DutyReport() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('draft');
  const [lockedAt, setLockedAt] = useState(null);
  const [config, setConfig] = useState({ maxLines: DEFAULT_MAX_LINES, charsPerLine: DEFAULT_CHARS_PER_LINE });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthName = currentDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  const isLocked = status === 'locked';

  // โหลดข้อมูลภาระงานของเดือนปัจจุบัน
  useEffect(() => {
    fetchDuty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const fetchDuty = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/duty?month=${month}&year=${year}`);
      setItems(res.data.items || []);
      setStatus(res.data.status || 'draft');
      setLockedAt(res.data.locked_at || null);
      if (res.data.config) setConfig(res.data.config);
    } catch (err) {
      console.error("Error fetching duty:", err);
      setItems([]);
      setStatus('draft');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // คำนวณบรรทัดรวม + เช็คเกิน (real-time)
  // ─────────────────────────────────────────────────────────────
  const linesPerItem = useMemo(
    () => items.map(it => countLines(it.text, config.charsPerLine)),
    [items, config.charsPerLine]
  );
  const totalLines = linesPerItem.reduce((s, n) => s + n, 0);
  const remaining = config.maxLines - totalLines;
  const isOverLimit = totalLines > config.maxLines;

  // ─────────────────────────────────────────────────────────────
  // CRUD ข้อ
  // ─────────────────────────────────────────────────────────────
  const handleAddItem = () => {
    if (isLocked) return;
    if (totalLines >= config.maxLines) {
      alert(`ครบ ${config.maxLines} บรรทัดแล้ว ไม่สามารถเพิ่มข้อใหม่ได้`);
      return;
    }
    setItems([...items, { no: items.length + 1, text: "" }]);
  };

  const handleRemoveItem = (idx) => {
    if (isLocked) return;
    const next = items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, no: i + 1 }));
    setItems(next);
  };

  // [Phase D] เปลี่ยนข้อความ + กันพิมพ์เกินบรรทัด
  //   ลองนับด้วยข้อความใหม่ ถ้ารวมเกินจะ "ไม่อัปเดต" + ไม่ดักผ่าน maxLength เพราะนับ \n + wrap
  const handleChangeText = (idx, newText) => {
    if (isLocked) return;
    const nextItems = items.map((it, i) => i === idx ? { ...it, text: newText } : it);
    const nextTotal = nextItems.reduce(
      (s, it) => s + countLines(it.text, config.charsPerLine), 0
    );
    if (nextTotal > config.maxLines) {
      // เกินขีดจำกัด → ไม่อัพเดท (block พิมพ์เพิ่ม)
      return;
    }
    setItems(nextItems);
  };

  // ─────────────────────────────────────────────────────────────
  // บันทึก draft
  // ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    const cleaned = items.filter(it => it.text.trim() !== "");
    if (cleaned.length === 0) {
      alert("กรุณากรอกอย่างน้อย 1 ข้อ");
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/duty', { month, year, items: cleaned });
      alert(res.data.message || "บันทึกเรียบร้อย");
      fetchDuty();
    } catch (err) {
      console.error("Save error:", err);
      alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ยืนยันส่ง (lock)
  // ─────────────────────────────────────────────────────────────
  const handleConfirmLock = async () => {
    if (!window.confirm(
      "เมื่อยืนยันแล้ว จะไม่สามารถแก้ไขภาระงานเดือนนี้ได้อีก\nต้องการดำเนินการต่อหรือไม่?"
    )) return;

    // บันทึก draft ก่อน lock (กันกรณีมีการเปลี่ยนแปลงค้างใน UI)
    const cleaned = items.filter(it => it.text.trim() !== "");
    if (cleaned.length === 0) {
      alert("กรุณากรอกอย่างน้อย 1 ข้อ");
      return;
    }
    setSaving(true);
    try {
      await api.put('/duty', { month, year, items: cleaned });
      const res = await api.post('/duty/lock', { month, year });
      alert(res.data.message || "ยืนยันเรียบร้อย");
      fetchDuty();
    } catch (err) {
      console.error("Lock error:", err);
      alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการยืนยัน");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={22} className="text-blue-500" />
              ภาระงานรายเดือน
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              DUTY REPORT • <span className="text-blue-500 uppercase">{user?.role}</span> {user?.fullname} ({user?.empId})
            </p>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 2))}
              disabled={loading}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">{monthName}</span>
            <button
              onClick={() => setCurrentDate(new Date(year, month))}
              disabled={loading}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Banner: locked */}
        {isLocked && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-start gap-3"
          >
            <Lock className="text-emerald-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-emerald-800 text-sm">ภาระงานเดือนนี้ถูกยืนยันแล้ว</p>
              <p className="text-xs text-emerald-700 mt-1">
                ยืนยันเมื่อ: {lockedAt ? new Date(lockedAt).toLocaleString("th-TH") : '-'} —
                ไม่สามารถแก้ไขได้ (หากต้องการแก้ไข กรุณาติดต่อแอดมิน)
              </p>
            </div>
          </motion.div>
        )}

        {/* แถบสรุปบรรทัด */}
        <div className={`p-4 rounded-2xl border shadow-sm transition-colors
          ${isOverLimit ? 'bg-rose-50 border-rose-200' : (remaining <= 3 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200')}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={16} className={isOverLimit ? 'text-rose-500' : (remaining <= 3 ? 'text-amber-500' : 'text-blue-500')} />
              <span className="text-xs font-bold text-slate-600">บรรทัดที่ใช้</span>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold leading-none
                ${isOverLimit ? 'text-rose-600' : (remaining <= 3 ? 'text-amber-600' : 'text-slate-700')}`}>
                {totalLines} <span className="text-xs font-normal">/ {config.maxLines}</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {remaining > 0 ? `เหลืออีก ${remaining} บรรทัด` : 'ครบขีดจำกัดแล้ว'}
              </p>
            </div>
          </div>
          {/* progress bar */}
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${isOverLimit ? 'bg-rose-500' : (remaining <= 3 ? 'bg-amber-500' : 'bg-blue-500')}`}
              style={{ width: `${Math.min(100, (totalLines / config.maxLines) * 100)}%` }}
            />
          </div>
        </div>

        {/* ปุ่ม Add */}
        {!isLocked && (
          <button
            onClick={handleAddItem}
            disabled={remaining <= 0}
            className="w-full bg-white border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 rounded-xl py-3 text-sm font-bold text-slate-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            เพิ่มข้อ
          </button>
        )}

        {/* รายการข้อ */}
        <div className="space-y-3">
          <AnimatePresence>
            {items.length === 0 && !loading && (
              <div className="text-center py-16 text-slate-400">
                <ClipboardList size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">ยังไม่มีรายการ — กด "เพิ่มข้อ" เพื่อเริ่ม</p>
              </div>
            )}

            {items.map((item, idx) => {
              const lines = linesPerItem[idx] || 0;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-3"
                >
                  {/* ลำดับ */}
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>

                  <div className="flex-1 space-y-2">
                    <textarea
                      value={item.text}
                      onChange={(e) => handleChangeText(idx, e.target.value)}
                      disabled={isLocked}
                      rows={Math.max(2, lines)}
                      placeholder={`รายละเอียดของข้อ ${idx + 1}`}
                      className="w-full text-sm p-3 rounded-lg border border-slate-200 focus:border-blue-400 outline-none transition-all bg-slate-50/50 leading-relaxed resize-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400">
                        ข้อนี้ใช้ {lines} บรรทัด
                      </span>
                      {!isLocked && (
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all"
                          title="ลบข้อนี้"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ปุ่ม Action */}
        {!isLocked && items.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSaveDraft}
              disabled={saving || isOverLimit}
              className="flex-1 bg-slate-800 text-white font-bold text-sm py-3 rounded-xl hover:bg-slate-900 transition-all shadow-sm active:scale-[0.98] disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {saving ? "กำลังบันทึก..." : "บันทึกฉบับร่าง"}
            </button>
            <button
              onClick={handleConfirmLock}
              disabled={saving || isOverLimit || totalLines === 0}
              className="flex-1 bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98] disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} />
              ยืนยันส่ง (ล็อก)
            </button>
          </div>
        )}

        {/* คำเตือนเกิน */}
        {isOverLimit && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700">
              รวมบรรทัดเกินขีดจำกัด ({totalLines}/{config.maxLines}) —
              กรุณาลดข้อความบางส่วนก่อนบันทึก
            </p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}