// ไฟล์: src/components/Sidebar.jsx
// [Phase 2.8] Sidebar ใหม่ - แทน Navbar (อาจารย์สั่งย้ายเมนูเป็น sidebar ซ้าย)
//   - พับได้ (collapsed) มีปุ่มยุบ → เหลือเฉพาะไอคอน
//   - มี dropdown สำหรับกลุ่มที่เกี่ยวกัน (โอที, จัดการรายวัน, จัดการระบบ)
//   - ยึดสิทธิ์ตาม role เหมือนเดิม
//   - มือถือ: เปลี่ยนเป็น overlay เลื่อนเข้าจากซ้ายเมื่อกดปุ่ม hamburger
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
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
  CalendarClock,    // [Phase 2.2] จัดตาราง OT
  CalendarHeart,    // [Phase 2.4] กิจกรรมพิเศษ
  ChevronLeft,      // [Phase 2.8] ปุ่มยุบ sidebar
  ChevronDown,      // [Phase 2.8] ปุ่ม dropdown
  FileText,         // ReportPage
  Settings,         // กลุ่มจัดการระบบ
  Briefcase,        // กลุ่มโอที
  CalendarRange,    // กลุ่มจัดการรายวัน
  ClipboardList,  // ภาระงาน
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

// ─────────────────────────────────────────────────────────────
// โครงเมนู - แบ่งเป็น group + single
// แต่ละ item มี roles? = ใครเห็นได้ (undefined = ทุกคน)
// ─────────────────────────────────────────────────────────────
const buildMenu = (role) => {
  const has = (allowed) => !allowed || allowed.includes(role);

  const menu = [];

  // 1. กลุ่มโอที (dropdown)
  const otGroup = {
    type: 'group',
    name: 'โอที',
    icon: <Briefcase size={18} />,
    items: [
      { name: "โอทีของฉัน", path: "/my-ot", icon: <Calendar size={16} /> },
      { name: "ภาระงาน", path: "/duty-report", icon: <ClipboardList size={16} /> }, // [Phase D]
      has(["supervisor", "admin"]) && { name: "อนุมัติ OT", path: "/approve-ot", icon: <CheckSquare size={16} /> },
      has(["finance", "admin"]) && { name: "อนุมัติ (การเงิน)", path: "/finance-approve", icon: <CheckSquare size={16} /> },
      has(["admin"]) && { name: "อนุมัติ (ผอ.)", path: "/admin-approve", icon: <CheckSquare size={16} /> },
      has(["finance", "admin", "supervisor"]) && { name: "การเงิน", path: "/finance", icon: <BadgeDollarSign size={16} /> },
    ].filter(Boolean),
  };
  if (otGroup.items.length > 0) menu.push(otGroup);

  // 2. กลุ่มจัดการรายวัน (dropdown) - ปฏิทินต่างๆ
  const calGroup = {
    type: 'group',
    name: 'จัดการรายวัน',
    icon: <CalendarRange size={18} />,
    items: [
      has(["supervisor", "admin"]) && { name: "จัดตาราง OT", path: "/shift-schedule", icon: <CalendarClock size={16} /> },
      has(["hr", "admin"]) && { name: "กิจกรรมพิเศษ", path: "/special-events", icon: <CalendarHeart size={16} /> },
    ].filter(Boolean),
  };
  if (calGroup.items.length > 0) menu.push(calGroup);

  // 3. นำเข้าข้อมูล (standalone - ไม่ครอบ)
  if (has(["admin", "hr", "finance"])) {
    menu.push({
      type: 'single',
      name: "นำเข้า Excel",
      path: "/import-excel",
      icon: <FileSpreadsheet size={18} />,
    });
  }

  // 4. กลุ่มจัดการระบบ (dropdown)
  const sysGroup = {
    type: 'group',
    name: 'จัดการระบบ',
    icon: <Settings size={18} />,
    items: [
      has(["hr", "admin"]) && { name: "สิทธิ์ทำ OT", path: "/ot-permissions", icon: <ToggleRight size={16} /> },
      has(["admin"]) && { name: "Admin Panel", path: "/admin", icon: <ShieldCheck size={16} /> },
    ].filter(Boolean),
  };
  if (sysGroup.items.length > 0) menu.push(sysGroup);

  // 5. รายงาน (standalone - ทุกคน)
  menu.push({
    type: 'single',
    name: "รายงาน",
    path: "/report",
    icon: <FileText size={18} />,
  });

  // 6. ลายเซ็น (standalone - แยกออกมาท้ายสุด มี divider ด้านบน)
  menu.push({
    type: 'single',
    name: "ลายเซ็น",
    path: "/signature",
    icon: <PenTool size={18} />,
    divider: true, // เส้นแบ่งด้านบนตัวนี้
  });

  return menu;
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // [Phase 2.8] สถานะ sidebar
  // - collapsed (desktop): พับเหลือไอคอน
  // - mobileOpen: เปิด overlay ในมือถือ
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === '1';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({}); // เก็บว่า group ไหนถูกเปิดอยู่

  const menu = buildMenu(user?.role);

  // เปิด group ที่มีหน้าปัจจุบันอยู่ ให้อัตโนมัติ
  useEffect(() => {
    const next = { ...openGroups };
    let changed = false;
    for (const m of menu) {
      if (m.type === 'group' && m.items.some(it => it.path === location.pathname)) {
        if (!next[m.name]) { next[m.name] = true; changed = true; }
      }
    }
    if (changed) setOpenGroups(next);
    setMobileOpen(false); // ปิด mobile overlay เมื่อเปลี่ยนหน้า
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleCollapsed = () => {
    const v = !collapsed;
    setCollapsed(v);
    localStorage.setItem('sidebar_collapsed', v ? '1' : '0');
    if (v) setOpenGroups({}); // ตอนพับให้ปิด dropdown ทั้งหมด
  };

  const toggleGroup = (name) => {
    if (collapsed) {
      // ถ้ายุบอยู่ ให้กางออกก่อนแล้วเปิด group
      setCollapsed(false);
      localStorage.setItem('sidebar_collapsed', '0');
      setOpenGroups({ ...openGroups, [name]: true });
    } else {
      setOpenGroups({ ...openGroups, [name]: !openGroups[name] });
    }
  };

  const isActive = (path) => location.pathname === path;
  const groupHasActive = (group) => group.type === 'group' && group.items.some(it => isActive(it.path));

  // ─────────────────────────────────────────────────────────────
  // เนื้อของ sidebar (ใช้ร่วมกันทั้ง desktop และ mobile overlay)
  // ─────────────────────────────────────────────────────────────
  const sidebarBody = (
    <div className="h-full flex flex-col bg-white">
      {/* Header: logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-100 ${collapsed ? 'justify-center' : ''}`}>
        <Link to="/my-ot" className="flex items-center gap-3 group shrink-0">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/30 group-hover:rotate-6 transition-all duration-300">
            <ShieldCheck className="text-white" size={22} />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter text-slate-900 leading-none">
                SMART<span className="text-blue-600">OT</span>
              </span>
              <span className="text-[9px] text-blue-500 font-black tracking-[0.2em] uppercase">Enterprise</span>
            </div>
          )}
        </Link>
      </div>

      {/* User mini-card */}
      {!collapsed ? (
        <div className="mx-3 mt-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-slate-100 to-white flex items-center justify-center text-slate-400 border-2 border-white shadow-sm">
              <UserCircle size={22} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 leading-tight truncate">{user?.fullname || '-'}</p>
            <p className="text-[9px] font-black text-blue-600/70 uppercase tracking-wider mt-0.5">
              {roleLabel(user?.role)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-3 relative" title={`${user?.fullname || ''} (${roleLabel(user?.role)})`}>
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-slate-100 to-white flex items-center justify-center text-slate-400 border-2 border-white shadow-sm">
            <UserCircle size={22} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menu.map((item, idx) => {
          if (item.divider) {
            return (
              <div key={`div-${idx}`}>
                <div className="my-3 mx-2 border-t border-slate-100" />
                {renderItem(item)}
              </div>
            );
          }
          if (item.type === 'single') return <div key={item.path}>{renderItem(item)}</div>;
          // group
          return <div key={item.name}>{renderGroup(item)}</div>;
        })}
      </nav>

      {/* Footer: logout + toggle collapse */}
      <div className="border-t border-slate-100 p-3 space-y-2">
        <button
          onClick={logout}
          title="ออกจากระบบ"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs
            bg-slate-900 text-white hover:bg-rose-600 transition-all duration-200 shadow-sm active:scale-95
            ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>OUT</span>}
        </button>
        {/* ปุ่มพับ/กางเฉพาะ desktop */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'กางเมนู' : 'ยุบเมนู'}
          className={`hidden md:flex w-full items-center gap-3 px-3 py-2 rounded-xl font-bold text-[11px]
            text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all
            ${collapsed ? 'justify-center' : ''}`}
        >
          <ChevronLeft
            size={16}
            className={`shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
          {!collapsed && <span className="uppercase tracking-widest">ยุบเมนู</span>}
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // render เมนูเดี่ยว (single item)
  // ─────────────────────────────────────────────────────────────
  function renderItem(item) {
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        title={collapsed ? item.name : undefined}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
          ${active ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}
          ${collapsed ? 'justify-center' : ''}`}
      >
        {active && !collapsed && (
          <motion.span
            layoutId="sidebar-active-bar"
            className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.6)]"
          />
        )}
        <span className={`shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`}>{item.icon}</span>
        {!collapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // render เมนูแบบ group (มี dropdown)
  // ─────────────────────────────────────────────────────────────
  function renderGroup(group) {
    const isOpen = !!openGroups[group.name];
    const hasActiveChild = groupHasActive(group);

    return (
      <div>
        <button
          onClick={() => toggleGroup(group.name)}
          title={collapsed ? group.name : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
            ${hasActiveChild ? 'text-blue-700' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}
            ${collapsed ? 'justify-center' : ''}`}
        >
          <span className={`shrink-0 ${hasActiveChild ? 'text-blue-600' : 'text-slate-400'}`}>{group.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{group.name}</span>
              <ChevronDown
                size={14}
                className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>

        <AnimatePresence initial={false}>
          {isOpen && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-4 mt-1 pl-3 border-l border-slate-100 space-y-1">
                {group.items.map(it => {
                  const active = isActive(it.path);
                  return (
                    <Link
                      key={it.path}
                      to={it.path}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all
                        ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50/70'}`}
                    >
                      <span className={`shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`}>{it.icon}</span>
                      <span className="truncate">{it.name}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Mobile topbar (เห็นเฉพาะจอเล็ก)
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile topbar */}
      <div className="md:hidden sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm flex items-center justify-between px-4 h-14">
        <Link to="/my-ot" className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <ShieldCheck className="text-white" size={18} />
          </div>
          <span className="font-black tracking-tighter text-slate-900">
            SMART<span className="text-blue-600">OT</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-100"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-slate-900/40 z-60"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-70 shadow-2xl"
            >
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              {sidebarBody}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex md:flex-col fixed top-0 left-0 bottom-0 z-40 border-r border-slate-100 shadow-sm
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-60'}`}
      >
        {sidebarBody}
      </aside>
    </>
  );
}