import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import PageTransition from "../components/PageTransition";
import {
  ShieldCheck,
  Users,
  UserCog,
  UserCheck,
  Search,
  RefreshCw,
  Mail,
  UserCircle
} from "lucide-react";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { user: currentUser } = useAuth();

  const load = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRole = async (id, role) => {
    // แก้ typo + ใช้ label ไทย
    if (!window.confirm(`ต้องการเปลี่ยนสิทธิ์ User ID ${id} เป็น ${role} ใช่หรือไม่?`)) return;
    setSavingId(id);
    try {
      await api.patch(`/users/${id}/role`, { role });
      await load();
    } catch (err) {
      alert("อัปเดตสิทธิ์ไม่สำเร็จ");
    } finally {
      setSavingId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // เปลี่ยน approver → supervisor + เพิ่ม hr/finance ใน stats
  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    supervisor: users.filter(u => u.role === 'supervisor').length,
    hr: users.filter(u => u.role === 'hr').length,
    finance: users.filter(u => u.role === 'finance').length,
    user: users.filter(u => u.role === 'user').length,
  };

  // ตัวช่วย: แปลง role → ภาษาไทย (สำหรับแสดง badge)
  const roleLabel = (role) => {
    switch (role) {
      case 'admin': return 'ผู้อำนวยการ';
      case 'supervisor': return 'หัวหน้าฝ่าย';
      case 'hr': return 'ฝ่ายบุคคล';
      case 'finance': return 'ฝ่ายการเงิน';
      case 'user': return 'พนักงาน';
      default: return role;
    }
  };

  // ตัวช่วย: สี badge ตาม role
  const roleBadgeClass = (role) => {
    switch (role) {
      case 'admin':      return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'supervisor': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'hr':         return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'finance':    return 'bg-amber-50 text-amber-600 border-amber-100';
      default:           return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    }
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 bg-[#f8fafc] min-h-screen">

        {/* --- Header Section --- */}
        <div className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-100">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">จัดการผู้ใช้งาน</h1>
              {/* แก้ typo */}
              <p className="text-sm font-medium text-slate-400">สรุปข้อมูลและกำหนดสิทธิ์พนักงานในระบบ</p>
            </div>
          </div>

          <button
            onClick={load}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={18} className={savingId ? "animate-spin" : ""} />
            Refresh Data
          </button>
        </div>

        {/* --- Dashboard Stats (3 Cards) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-linear-to-br from-blue-600 to-indigo-700 p-8 rounded-4xl shadow-2xl shadow-blue-200 text-white relative overflow-hidden group">
            <Users className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform" size={120} />
            {/* แก้ typo */}
            <p className="text-xs font-black opacity-80 uppercase tracking-[0.2em]">จำนวนพนักงานทั้งหมด</p>
            <h2 className="text-5xl font-black mt-2 tracking-tighter">
              {stats.total} <span className="text-xl font-medium opacity-70">คน</span>
            </h2>
          </div>

          {/* การ์ดที่ 2: รวม Admin/Supervisor/HR/Finance (เปลี่ยนจาก APPROVER เดิม) */}
          <div className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">เจ้าหน้าที่ (ADMIN / SUPERVISOR / HR / FINANCE)</p>
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
                {stats.admin + stats.supervisor + stats.hr + stats.finance}
                <span className="text-sm font-bold text-slate-400 ml-2">
                  ({stats.admin} / {stats.supervisor} / {stats.hr} / {stats.finance})
                </span>
              </h2>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl text-amber-500 group-hover:rotate-6 transition-transform">
              <UserCog size={32} />
            </div>
          </div>

          <div className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">พนักงานทั่วไป</p>
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{stats.user} คน</h2>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500 group-hover:rotate-6 transition-transform">
              <UserCheck size={32} />
            </div>
          </div>
        </div>

        {/* --- Table Section --- */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">

          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
              รายชื่อสมาชิกในระบบ
              <span className="bg-blue-50 text-blue-600 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">Active</span>
            </h3>

            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input
                type="text"
                placeholder="ค้นหาชื่อ หรือ อีเมล..."
                className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">พนักงาน</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">อีเมลติดต่อ</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">สถานะปัจจุบัน</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <UserCircle size={24} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{u.fullname}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                        <Mail size={14} className="text-slate-300" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {/* ใช้ helper function เลือกสี + แสดงเป็นภาษาไทย */}
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border ${roleBadgeClass(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center">
                        <select
                          value={u.role}
                          disabled={savingId === u.id || u.id === currentUser?.id}
                          onChange={(e) => updateRole(u.id, e.target.value)}
                          className={`
                            px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer
                            ${u.id === currentUser?.id ? "opacity-30 cursor-not-allowed bg-slate-50" : "hover:border-blue-400 shadow-sm"}
                          `}
                        >
                          {/* ใช้ label ภาษาไทยล้วน */}
                          <option value="user">พนักงาน</option>
                          <option value="supervisor">หัวหน้าฝ่าย</option>
                          <option value="hr">ฝ่ายบุคคล</option>
                          <option value="finance">ฝ่ายการเงิน</option>
                          <option value="admin">ผู้อำนวยการ</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}