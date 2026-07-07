import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Clock4,
  CheckCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Users,
  Inbox,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";
import api from "../utils/api";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../context/AuthContext";

// ─────────────────────────────────────────────────────────────
// [Phase E] หน้าอนุมัติของ "ฝ่ายการเงิน" (finance)
//   โครงเหมือน ApproveOT เป๊ะ — backend กรองสถานะ 'รอการเงิน' ให้ตาม role ที่ login
//   1) GET /approvals/queue?month=&year=   → คิวของ role ปัจจุบัน (เห็นเฉพาะ 'รอการเงิน')
//   2) GET /approvals/detail?empId=&month=&year= → รายละเอียดรายวันของคนที่เลือก
//   3) POST /approvals/decide {empId, month, year, action:'approve'|'reject', reason}
//        - approve → ส่งต่อให้ ผอ. ('รอการเงิน' → 'รอผอ.')
//        - reject  → ตีกลับให้หัวหน้าฝ่าย ('รอการเงิน' → 'รอหัวหน้า') *บังคับใส่เหตุผล*
//   หมายเหตุ: JS เดือนเริ่มที่ 0 (ม.ค.=0) จึงส่ง month + 1 ให้ backend เสมอ
// ─────────────────────────────────────────────────────────────

export default function FinanceApproveOT() {
  const { user } = useAuth();

  // เดือน/ปีที่กำลังดูคิว (ค.ศ. ภายใน, ส่ง month+1 ให้ backend)
  const [currentDate, setCurrentDate] = useState(new Date());

  // คิวรายคนที่รออนุมัติในเดือนนี้
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  // คนที่ถูกเลือก + รายละเอียดรายวันของคนนั้น
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // สถานะระหว่างกด approve/reject + modal ใส่เหตุผลตีกลับ
  const [deciding, setDeciding] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // toast แจ้งเตือนมุมขวาบน
  const [toast, setToast] = useState({ show: false, text: "", type: "" });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthName = currentDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  // ───────── helper อ่าน field จากคิว (ตรงกับโครงสร้างจริงจาก approval.controller.js) ─────────
  //   backend คืน: { stage, status, items: [ { empId, fullname, total_days, total_hours, total_amount, ... } ] }
  const qName = (q) => q?.fullname || q?.name || q?.empId || "-";
  const qCount = (q) => q?.total_days ?? q?.count ?? q?.days ?? null;
  const qAmount = (q) => parseFloat(q?.total_amount) || 0; // ยอดเงินรวมของคนนั้น
  const qHours = (q) => parseFloat(q?.total_hours) || 0; // ชั่วโมงรวมของคนนั้น

  // ───────── โหลดคิวเมื่อ mount และทุกครั้งที่เปลี่ยนเดือน ─────────
  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const showToast = (text, type) => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: "", type: "" }), 3000);
  };

  const fetchQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await api.get("/approvals/queue", {
        params: { month: month + 1, year }, // month + 1 = แปลงให้ตรงเดือนจริง
      });
      // backend ห่อ array ไว้ใน .items → { stage, status, items: [...] }
      setQueue(res.data?.items || []);
      // ล้างการเลือกเดิมเมื่อเปลี่ยนเดือน/รีเฟรช
      setSelected(null);
      setDetail([]);
    } catch (err) {
      console.error("Error fetching queue:", err);
      showToast("โหลดคิวอนุมัติไม่สำเร็จ", "error");
    } finally {
      setLoadingQueue(false);
    }
  };

  // ───────── เลือกคน → โหลดรายละเอียดรายวัน ─────────
  const openDetail = async (item) => {
    setSelected(item);
    setLoadingDetail(true);
    setDetail([]);
    try {
      const res = await api.get("/approvals/detail", {
        params: { empId: item.empId, month: month + 1, year },
      });
      // เผื่อ detail ห่อใน .items เหมือน queue → รองรับทั้งสองแบบ
      setDetail(res.data?.items || res.data || []);
    } catch (err) {
      console.error("Error fetching detail:", err);
      showToast("โหลดรายละเอียดไม่สำเร็จ", "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  // ───────── อนุมัติ (ส่งต่อให้ ผอ.) ─────────
  const handleApprove = () => {
    if (!selected) return;
    if (
      !window.confirm(
        `อนุมัติ OT ของ ${qName(selected)} เดือน ${monthName}?\n` +
          `รายการจะถูกส่งต่อให้ ผอ. อนุมัติขั้นสุดท้าย`
      )
    )
      return;
    sendDecision("approve", "");
  };

  // ───────── ยืนยันตีกลับ (จาก modal) — บังคับใส่เหตุผล ─────────
  const submitReject = () => {
    if (!rejectReason.trim()) {
      showToast("กรุณาระบุเหตุผลการตีกลับ", "error");
      return;
    }
    sendDecision("reject", rejectReason.trim());
  };

  // ───────── ยิง decide จริง (ใช้ร่วมทั้ง approve/reject) ─────────
  const sendDecision = async (action, reason) => {
    if (!selected) return;
    setDeciding(true);
    try {
      const res = await api.post("/approvals/decide", {
        empId: selected.empId,
        month: month + 1,
        year,
        action,
        reason,
      });
      showToast(
        res.data?.message ||
          (action === "approve" ? "อนุมัติเรียบร้อยแล้ว" : "ตีกลับเรียบร้อยแล้ว"),
        "success"
      );
      setRejectOpen(false);
      setRejectReason("");
      fetchQueue(); // รีเฟรช: คนที่จัดการแล้วจะหลุดจากคิว + เคลียร์ selection
    } catch (err) {
      console.error("Error deciding:", err);
      showToast(err.response?.data?.message || "ดำเนินการไม่สำเร็จ", "error");
    } finally {
      setDeciding(false);
    }
  };

  // ───────── สรุปยอดของคนที่เลือก (คำนวณจาก detail โดยตรง ไม่พึ่ง field จากคิว) ─────────
  const detailSummary = useMemo(() => {
    let totalAmount = 0;
    let totalHours = 0;
    for (const r of detail) {
      totalAmount += parseFloat(r.total) || 0;
      totalHours += parseFloat(r.hours) || 0;
    }
    return { totalAmount, totalHours, days: detail.length };
  }, [detail]);

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4 bg-slate-50/30 min-h-[calc(100vh-64px)]">

        {/* ───────── Toast ───────── */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={`fixed top-24 right-6 px-6 py-4 rounded-xl shadow-lg z-50 flex items-center text-white font-medium
              ${toast.type === "success" ? "bg-emerald-600" : "bg-red-500"}`}
            >
              {toast.type === "success" ? (
                <CheckCircle className="mr-2" />
              ) : (
                <AlertCircle className="mr-2" />
              )}
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ───────── Header + ตัวเลื่อนเดือน ───────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center">
              <Wallet className="mr-2 text-blue-600" size={26} />
              อนุมัติ OT — ฝ่ายการเงิน
            </h1>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              FINANCE OT •{" "}
              <span className="text-blue-500 uppercase">{user?.role}</span>{" "}
              {user?.fullname} ({user?.empId})
            </p>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1))}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
              {monthName}
            </span>
            <button
              onClick={() => setCurrentDate(new Date(year, month + 1))}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* ───────── เนื้อหา: ซ้าย = คิวรายคน / ขวา = รายละเอียด ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* ───── ซ้าย: คิวรอตรวจการเงิน ───── */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-500" />
                <h3 className="font-bold text-slate-700 text-sm">รอตรวจ (การเงิน)</h3>
              </div>
              <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-100 flex items-center gap-1">
                <Clock4 size={12} />
                {queue.length} คน
              </span>
            </div>

            {loadingQueue ? (
              <div className="flex flex-col items-center justify-center text-slate-400 py-16">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                กำลังโหลด...
              </div>
            ) : queue.length === 0 ? (
              <div className="py-16 text-center opacity-50">
                <Inbox size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">ไม่มีรายการรอตรวจ</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  เดือน {monthName} ยังไม่มีรายการส่งถึงการเงิน
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((item) => {
                  const active = selected?.empId === item.empId;
                  const count = qCount(item);
                  return (
                    <button
                      key={item.empId}
                      onClick={() => openDetail(item)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between gap-2
                        ${
                          active
                            ? "border-blue-500 bg-blue-50/50"
                            : "border-slate-100 hover:border-slate-200 bg-white"
                        }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 text-sm truncate">
                          {qName(item)}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.empId}</p>
                        <p className="text-[11px] font-semibold text-blue-500 mt-0.5">
                          {qAmount(item).toLocaleString()} ฿
                        </p>
                      </div>
                      {count != null && (
                        <span className="shrink-0 bg-amber-50 text-amber-600 text-[11px] font-bold px-2 py-1 rounded-lg border border-amber-100">
                          {count} วัน
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ───── ขวา: รายละเอียดของคนที่เลือก ───── */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            {!selected ? (
              <div className="py-24 text-center opacity-30">
                <FileText size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                  เลือกพนักงานจากคิวด้านซ้าย
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* หัวข้อ + ปุ่มย้อนกลับ (มือถือ) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => {
                        setSelected(null);
                        setDetail([]);
                      }}
                      className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg shrink-0"
                      title="กลับไปคิว"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-base truncate">
                        {qName(selected)}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {selected.empId} • {monthName}
                      </p>
                    </div>
                  </div>

                  {/* ปุ่ม approve / reject */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setRejectOpen(true)}
                      disabled={deciding || loadingDetail}
                      className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition text-sm font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <XCircle size={16} /> ตีกลับ
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={deciding || loadingDetail}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg transition text-sm font-bold shadow-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> อนุมัติ
                    </button>
                  </div>
                </div>

                {/* สรุปยอด */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50/60 rounded-xl border border-blue-100 p-3 text-center">
                    <Wallet size={16} className="mx-auto text-blue-500 mb-1" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase">ยอดรวม</p>
                    <p className="text-sm font-bold text-blue-600 leading-tight">
                      {detailSummary.totalAmount.toLocaleString()} ฿
                    </p>
                  </div>
                  <div className="bg-emerald-50/60 rounded-xl border border-emerald-100 p-3 text-center">
                    <TrendingUp size={16} className="mx-auto text-emerald-500 mb-1" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase">ชั่วโมง</p>
                    <p className="text-sm font-bold text-slate-700 leading-tight">
                      {detailSummary.totalHours.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-amber-50/60 rounded-xl border border-amber-100 p-3 text-center">
                    <CalendarDays size={16} className="mx-auto text-amber-500 mb-1" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase">จำนวนวัน</p>
                    <p className="text-sm font-bold text-slate-700 leading-tight">
                      {detailSummary.days} วัน
                    </p>
                  </div>
                </div>

                {/* ตารางรายวัน */}
                {loadingDetail ? (
                  <div className="flex flex-col items-center justify-center text-slate-400 py-16">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    กำลังโหลดรายละเอียด...
                  </div>
                ) : detail.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    ไม่มีรายการรายวัน
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                          <th className="p-3 font-semibold">วันที่</th>
                          <th className="p-3 font-semibold">เวลา</th>
                          <th className="p-3 font-semibold">ประเภท</th>
                          <th className="p-3 font-semibold">ภาระงาน</th>
                          <th className="p-3 font-semibold text-center">ชม.</th>
                          <th className="p-3 font-semibold text-right">ยอดเงิน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-slate-50 hover:bg-slate-50/60 transition"
                          >
                            <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                              {new Date(r.date_work).toLocaleDateString("th-TH", {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                              })}
                            </td>
                            <td className="p-3 text-slate-500 whitespace-nowrap text-xs">
                              {r.time_start} - {r.time_end}
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded
                                ${
                                  r.type === "วันหยุด"
                                    ? "bg-rose-50 text-rose-500"
                                    : "bg-blue-50 text-blue-500"
                                }`}
                              >
                                {r.type || "—"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 max-w-[220px]">
                              <span className="truncate block" title={r.location}>
                                {r.location || (
                                  <span className="text-red-400 text-xs italic">
                                    ยังไม่ระบุ
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700">
                              {r.hours ?? "—"}
                            </td>
                            <td className="p-3 text-right font-bold text-blue-600 whitespace-nowrap">
                              {r.total != null
                                ? parseFloat(r.total).toLocaleString() + " ฿"
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ───────── Modal ใส่เหตุผลตีกลับ (reject) ───────── */}
        <AnimatePresence>
          {rejectOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => !deciding && setRejectOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <XCircle className="text-red-500" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">ตีกลับรายการ</h3>
                    <p className="text-[11px] text-slate-400">
                      {qName(selected)} • {monthName} — จะถูกส่งกลับให้หัวหน้าฝ่ายตรวจสอบ
                    </p>
                  </div>
                </div>

                <textarea
                  autoFocus
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="ระบุเหตุผลการตีกลับ (จำเป็น)..."
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:border-red-400 outline-none transition-all bg-slate-50 min-h-[110px] leading-relaxed"
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRejectOpen(false)}
                    disabled={deciding}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 transition disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={submitReject}
                    disabled={deciding}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition shadow-sm disabled:opacity-50 flex items-center gap-1"
                  >
                    {deciding ? "กำลังส่ง..." : "ยืนยันตีกลับ"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}