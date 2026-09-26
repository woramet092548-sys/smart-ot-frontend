// ไฟล์: src/pages/OTPermissions.jsx
// [Phase 2.1] หน้าจัดการสิทธิ์ทำ OT (HR + Admin)
// [Phase 2.1.5] เพิ่ม Tabs:
//   Tab 1 = "ปิดถาวรรายคน" (เดิม)
//   Tab 2 = "จัดการรายวัน" (ใหม่ - ยกเลิก record เฉพาะวัน)

import { useEffect, useState, useMemo } from "react";
import PageTransition from "../components/PageTransition";
import { API_BASE } from "../utils/api"; // [deploy] ที่อยู่ API จากไฟล์ .env (เดิมเขียน localhost:5000 ตายตัว)
import {
  ToggleLeft,
  ToggleRight,
  Search,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Mail,
  UserCircle,
  Loader2,
  Calendar,
  XCircle,
  RotateCcw,
  Filter
} from "lucide-react";

export default function OTPermissions() {
  // [Phase 2.1.5] state สำหรับ tab
  const [activeTab, setActiveTab] = useState("permanent"); // permanent | daily

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 bg-[#f8fafc] min-h-screen">

        {/* --- Header --- */}
        <div className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-xl shadow-indigo-100">
            <ToggleRight className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">จัดการสิทธิ์ทำ OT</h1>
            <p className="text-sm font-medium text-slate-400">ปิดสิทธิ์ทำ OT ทั้งคน หรือยกเลิกเฉพาะรายวัน</p>
          </div>
        </div>

        {/* --- Tabs --- */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab("permanent")}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2
              ${activeTab === "permanent"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-50"
              }`}
          >
            <Users size={16} />
            ปิดถาวร (รายคน)
          </button>
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2
              ${activeTab === "daily"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-50"
              }`}
          >
            <Calendar size={16} />
            จัดการรายวัน
          </button>
        </div>

        {/* --- Tab Content --- */}
        {activeTab === "permanent" ? <PermanentTab /> : <DailyTab />}

      </div>
    </PageTransition>
  );
}

// ════════════════════════════════════════════
// Tab 1: ปิดถาวรรายคน (เดิม)
// ════════════════════════════════════════════
function PermanentTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const getToken = () => localStorage.getItem("token");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/permissions`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      } else {
        alert("โหลดข้อมูลไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (user) => {
    const newValue = user.can_do_ot === 1 ? 0 : 1;
    const actionTxt = newValue === 1 ? "เปิด" : "ปิด";

    if (!window.confirm(`ต้องการ${actionTxt}สิทธิ์ทำ OT ของ "${user.fullname}" ใช่หรือไม่?`))
      return;

    setTogglingId(user.id);
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}/can-do-ot`, {
        method: 'PATCH',
        headers: {
          "Authorization": `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ can_do_ot: newValue })
      });

      if (res.ok) {
        setUsers(prev => prev.map(u =>
          u.id === user.id ? { ...u, can_do_ot: newValue } : u
        ));
      } else {
        const data = await res.json();
        alert(data.message || "อัปเดตสิทธิ์ไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.empId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    enabled: users.filter(u => u.can_do_ot === 1).length,
    disabled: users.filter(u => u.can_do_ot === 0).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-linear-to-br from-indigo-600 to-purple-700 p-8 rounded-4xl shadow-2xl shadow-indigo-200 text-white relative overflow-hidden group">
          <Users className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform" size={120} />
          <p className="text-xs font-black opacity-80 uppercase tracking-[0.2em]">พนักงานทั้งหมด</p>
          <h2 className="text-5xl font-black mt-2 tracking-tighter">
            {stats.total} <span className="text-xl font-medium opacity-70">คน</span>
          </h2>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">เปิดสิทธิ์ทำ OT</p>
            <h2 className="text-3xl font-black text-emerald-600 tracking-tighter">{stats.enabled} <span className="text-sm text-slate-400">คน</span></h2>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500 group-hover:rotate-6 transition-transform">
            <UserCheck size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">ปิดสิทธิ์ทำ OT</p>
            <h2 className="text-3xl font-black text-rose-600 tracking-tighter">{stats.disabled} <span className="text-sm text-slate-400">คน</span></h2>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl text-rose-500 group-hover:rotate-6 transition-transform">
            <UserX size={32} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
            รายชื่อพนักงาน
            <span className="bg-indigo-50 text-indigo-600 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
              {filteredUsers.length} คน
            </span>
          </h3>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, อีเมล, หรือรหัสพนักงาน..."
                className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-500 transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">พนักงาน</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">รหัส</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">อีเมล</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">สถานะ</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">สิทธิ์ทำ OT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                    <Loader2 className="mx-auto animate-spin text-indigo-500" size={32} />
                    <p className="text-sm text-slate-400 mt-3">กำลังโหลดข้อมูล...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-slate-400">
                    <UserCircle size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-base font-medium">ไม่พบข้อมูลพนักงาน</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm
                          ${u.can_do_ot === 1
                            ? "bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white"
                            : "bg-rose-50 text-rose-400 group-hover:bg-rose-400 group-hover:text-white"
                          }`}>
                          <UserCircle size={24} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{u.fullname}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                        {u.empId}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                        <Mail size={14} className="text-slate-300" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border
                        ${u.can_do_ot === 1
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                        {u.can_do_ot === 1 ? "เปิดสิทธิ์" : "ปิดสิทธิ์"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button
                        onClick={() => handleToggle(u)}
                        disabled={togglingId === u.id}
                        className="inline-flex items-center justify-center disabled:opacity-50 transition-all hover:scale-110 active:scale-95"
                        title={u.can_do_ot === 1 ? "กดเพื่อปิดสิทธิ์" : "กดเพื่อเปิดสิทธิ์"}
                      >
                        {togglingId === u.id ? (
                          <Loader2 className="animate-spin text-slate-400" size={36} />
                        ) : u.can_do_ot === 1 ? (
                          <ToggleRight className="text-emerald-500" size={48} strokeWidth={2} />
                        ) : (
                          <ToggleLeft className="text-slate-300" size={48} strokeWidth={2} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 2: จัดการรายวัน (ใหม่ - Phase 2.1.5)
// ════════════════════════════════════════════
function DailyTab() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null); // id ที่กำลัง action
  const [searchTerm, setSearchTerm] = useState("");

  // Filter
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const getToken = () => localStorage.getItem("token");

  const HR_CANCEL_STATUS = 'ยกเลิกโดย HR';

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: filterMonth,
        year: filterYear,
      }).toString();
      const res = await fetch(`${API_BASE}/ot-records?${params}`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data || []);
      } else {
        const errData = await res.json();
        alert(errData.message || "โหลดข้อมูลไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filterMonth, filterYear]);

  // กดยกเลิก record
  const handleCancel = async (record) => {
    const reason = window.prompt(
      `ระบุเหตุผลที่ยกเลิกรายการ OT ของ "${record.fullname}" วันที่ ${new Date(record.date_work).toLocaleDateString('th-TH')}\n(ปล่อยว่างก็ได้)`,
      ""
    );
    // ถ้ากด cancel = null → ไม่ดำเนินการ
    if (reason === null) return;

    setActionId(record.id);
    try {
      const res = await fetch(`${API_BASE}/ot-records/${record.id}/cancel-by-hr`, {
        method: 'PATCH',
        headers: {
          "Authorization": `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: reason || "" })
      });

      if (res.ok) {
        setRecords(prev => prev.map(r =>
          r.id === record.id ? { ...r, status: HR_CANCEL_STATUS } : r
        ));
      } else {
        const data = await res.json();
        alert(data.message || "ยกเลิกไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setActionId(null);
    }
  };

  // กดคืนค่า
  const handleRestore = async (record) => {
    if (!window.confirm(`ต้องการคืนค่ารายการของ "${record.fullname}" กลับเป็น "รอยืนยัน" ใช่หรือไม่?`))
      return;

    setActionId(record.id);
    try {
      const res = await fetch(`${API_BASE}/ot-records/${record.id}/restore`, {
        method: 'PATCH',
        headers: { "Authorization": `Bearer ${getToken()}` }
      });

      if (res.ok) {
        setRecords(prev => prev.map(r =>
          r.id === record.id ? { ...r, status: 'รอยืนยัน' } : r   // [สถานะ] ตรงกับที่ backend ตั้งจริง
        ));
      } else {
        const data = await res.json();
        alert(data.message || "คืนค่าไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setActionId(null);
    }
  };

  // Filter ด้วย search
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const s = searchTerm.toLowerCase();
    return records.filter(r =>
      r.fullname?.toLowerCase().includes(s) ||
      r.empId?.toLowerCase().includes(s)
    );
  }, [records, searchTerm]);

  // Stats
  const stats = useMemo(() => ({
    total: records.length,
    cancelled: records.filter(r => r.status === HR_CANCEL_STATUS).length,
    active: records.filter(r => r.status !== HR_CANCEL_STATUS).length,
  }), [records]);

  // Status pill
  const statusPill = (status) => {
    const map = {
      // [สถานะ] สีเดียวกับปฏิทินหน้าโอทีของฉัน (เดิมมีแค่ 'รออนุมัติ' → สถานะใน flow อนุมัติขึ้นเป็นสีเทาหมด)
      'รอยืนยัน': 'bg-orange-50 text-orange-600 border-orange-100',
      'รอหัวหน้า': 'bg-amber-50 text-amber-600 border-amber-100',
      'รอการเงิน': 'bg-sky-50 text-sky-600 border-sky-100',
      'รอผอ.': 'bg-violet-50 text-violet-600 border-violet-100',
      'รออนุมัติ': 'bg-amber-50 text-amber-600 border-amber-100',   // ชื่อเก่า (ข้อมูลก่อนรัน SQL เปลี่ยนชื่อ)
      'อนุมัติ': 'bg-emerald-50 text-emerald-600 border-emerald-100',
      'ไม่อนุมัติ': 'bg-rose-50 text-rose-600 border-rose-100',
      [HR_CANCEL_STATUS]: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return (
      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${map[status] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
        {status}
      </span>
    );
  };

  // Month options
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-linear-to-br from-blue-600 to-indigo-700 p-8 rounded-4xl shadow-2xl shadow-blue-200 text-white relative overflow-hidden">
          <Calendar className="absolute -right-4 -bottom-4 opacity-10" size={120} />
          <p className="text-xs font-black opacity-80 uppercase tracking-[0.2em]">รายการในเดือนนี้</p>
          <h2 className="text-5xl font-black mt-2 tracking-tighter">
            {stats.total} <span className="text-xl font-medium opacity-70">รายการ</span>
          </h2>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">ใช้งานอยู่</p>
            <h2 className="text-3xl font-black text-emerald-600 tracking-tighter">{stats.active} <span className="text-sm text-slate-400">รายการ</span></h2>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500">
            <UserCheck size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">HR ยกเลิกไว้</p>
            <h2 className="text-3xl font-black text-slate-500 tracking-tighter">{stats.cancelled} <span className="text-sm text-slate-400">รายการ</span></h2>
          </div>
          <div className="bg-slate-100 p-4 rounded-2xl text-slate-400">
            <XCircle size={32} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter size={18} />
          <span className="font-bold text-sm">ตัวกรอง:</span>
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">เดือน</label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {monthNames.map((name, idx) => (
              <option key={idx} value={idx + 1}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ปี (ค.ศ.)</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            placeholder="ค้นหาชื่อหรือรหัสพนักงาน..."
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span className="text-sm font-bold">Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
            รายการ OT ทั้งหมด
            <span className="bg-blue-50 text-blue-600 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
              {filteredRecords.length} รายการ
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider">วันที่</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider">พนักงาน</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider">เวลา</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-center">ประเภท</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-right">ชม.</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-right">ยอด</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-center">สถานะ</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-16 text-center">
                    <Loader2 className="mx-auto animate-spin text-indigo-500" size={32} />
                    <p className="text-sm text-slate-400 mt-3">กำลังโหลดข้อมูล...</p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-16 text-center text-slate-400">
                    <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-base font-medium">ไม่มีรายการ OT ในเดือนนี้</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isCancelled = r.status === HR_CANCEL_STATUS;
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/50 transition-colors ${isCancelled ? "opacity-50" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700">
                          {new Date(r.date_work).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{r.fullname || '-'}</span>
                          <span className="text-xs text-slate-400 font-mono">{r.empId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                        {r.time_start} – {r.time_end}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs text-slate-500">{r.type || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                        {r.hours ?? '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">
                        {r.total != null ? `${parseFloat(r.total).toLocaleString()} ฿` : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {statusPill(r.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {actionId === r.id ? (
                          <Loader2 className="mx-auto animate-spin text-slate-400" size={20} />
                        ) : isCancelled ? (
                          <button
                            onClick={() => handleRestore(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold transition-all"
                            title="คืนค่า"
                          >
                            <RotateCcw size={14} />
                            คืนค่า
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCancel(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all"
                            title="ยกเลิกรายการ"
                          >
                            <XCircle size={14} />
                            ยกเลิก
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}