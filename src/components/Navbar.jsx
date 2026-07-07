import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  LogOut,
  Calendar,
  PenTool,
  CheckSquare,
  FileSpreadsheet,
  BadgeDollarSign,
  ShieldCheck,
  Menu,
  X,
  UserCircle,
  ToggleRight,
  CalendarClock,   // [Phase 2.2] จัดตาราง OT
  CalendarHeart    // [Phase 2.4] กิจกรรมพิเศษ
} from "lucide-react";

const roleLabel = (role) => {
  switch (role) {
    case 'admin': return 'ผู้อำนวยการ';
    case 'supervisor': return 'หัวหน้าฝ่าย';
    case 'hr': return 'ฝ่ายบุคคล';
    case 'finance': return 'ฝ่ายการเงิน';
    case 'user': return 'พนักงาน';
    default: return role || '-';
  }
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "โอทีของฉัน", path: "/my-ot", icon: <Calendar size={18} /> },
    { name: "ลายเซ็น", path: "/signature", icon: <PenTool size={18} /> },
  ];

  if (["supervisor", "admin"].includes(user?.role)) {
    navLinks.push({ name: "อนุมัติ OT", path: "/approve-ot", icon: <CheckSquare size={18} /> });
    // [Phase 2.2] จัดตาราง OT
    navLinks.push({ name: "จัดตาราง OT", path: "/shift-schedule", icon: <CalendarClock size={18} /> });
  }

  if (["admin", "hr", "finance"].includes(user?.role)) {
    navLinks.push({ name: "นำเข้า Excel", path: "/import-excel", icon: <FileSpreadsheet size={18} /> });
  }

  // [Phase 2.1] สิทธิ์ทำ OT (HR / Admin)
  if (["hr", "admin"].includes(user?.role)) {
    navLinks.push({ name: "สิทธิ์ทำ OT", path: "/ot-permissions", icon: <ToggleRight size={18} /> });
    // [Phase 2.4] กิจกรรมพิเศษ (HR / Admin)
    navLinks.push({ name: "กิจกรรมพิเศษ", path: "/special-events", icon: <CalendarHeart size={18} /> });
  }

  if (["finance", "admin", "supervisor"].includes(user?.role)) {
    navLinks.push({ name: "การเงิน", path: "/finance", icon: <BadgeDollarSign size={18} /> });
  }

  if (user?.role === "admin") {
    navLinks.push({ name: "Admin", path: "/admin", icon: <ShieldCheck size={18} /> });
  }

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <nav className="sticky top-0 z-100 w-full bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] border-b-[1.5px] border-blue-700/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">

          <div className="flex items-center">
            <Link to="/my-ot" className="flex items-center gap-3 group">
              <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/30 group-hover:rotate-6 transition-all duration-300">
                <ShieldCheck className="text-white" size={26} />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter text-slate-900 leading-none">
                  SMART<span className="text-blue-600">OT</span>
                </span>
                <span className="text-[10px] text-blue-500 font-black tracking-[0.2em] uppercase">Enterprise</span>
              </div>
            </Link>

            <div className="hidden md:ml-12 md:flex md:space-x-2 h-full items-center">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative flex items-center gap-2 px-3 py-3 text-sm font-black transition-all duration-300 rounded-xl group
                      ${isActive ? "text-blue-700 bg-blue-50/50 shadow-inner" : "text-slate-500 hover:text-blue-600 hover:bg-slate-50"}`}
                  >
                    <span className={`${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500"}`}>
                      {link.icon}
                    </span>
                    {link.name}
                    {isActive && (
                      <motion.div layoutId="nav-glow" className="absolute -bottom-5 left-0 w-full h-[3px] bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="h-10 w-px bg-slate-100"></div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-black text-slate-800 leading-tight">{user?.fullname}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[10px] font-black text-blue-600/70 uppercase tracking-widest">{roleLabel(user?.role)}</p>
                </div>
              </div>
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-slate-100 to-white flex items-center justify-center text-slate-400 border-2 border-slate-50 shadow-md">
                  <UserCircle size={28} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <button onClick={logout}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-rose-600 transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-rose-200 active:scale-95">
              <LogOut size={16} />
              <span>OUT</span>
            </button>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-3 rounded-2xl bg-white text-slate-800 border-2 border-slate-100 shadow-xl">
              {isOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t-2 border-slate-50 shadow-2xl overflow-hidden">
          <div className="px-4 py-6 space-y-3">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-base font-black transition-all
                  ${location.pathname === link.path ? "bg-blue-600 text-white shadow-2xl shadow-blue-300 scale-[1.02]" : "text-slate-600 bg-slate-50 border border-transparent"}`}>
                {link.icon}
                {link.name}
              </Link>
            ))}
            <div className="pt-6 mt-4 border-t-2 border-slate-50">
              <button onClick={logout} className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-rose-50 text-rose-600 font-black shadow-inner">
                <LogOut size={20} />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;