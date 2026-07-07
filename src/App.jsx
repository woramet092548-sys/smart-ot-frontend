// ไฟล์: src/App.jsx
// [Phase 2.8] เปลี่ยน Navbar → Sidebar (อาจารย์สั่งย้ายเมนูเป็น sidebar ซ้าย)
//   - desktop: เนื้อหาเว้นซ้ายตามความกว้าง sidebar (240px / 72px เมื่อพับ)
//   - mobile: sidebar เป็น overlay เลื่อนเข้า ส่วนเนื้อหาไม่เว้นซ้าย
import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// Components
import Sidebar from "./components/Sidebar"; // [Phase 2.8] ใหม่ (แทน Navbar)
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyOT from "./pages/MyOT";
import ReportPage from "./pages/ReportPage";
import ApproveOT from "./pages/ApproveOT";
import AdminPanel from "./pages/AdminPanel";
import FinanceOT from "./pages/FinanceOT";
import FinanceApproveOT from "./pages/FinanceApproveOT";
import Signature from "./pages/Signature";
import ImportExcel from "./pages/ImportExcel";
import OTPermissions from "./pages/OTPermissions";   // [Phase 2.1]
import ShiftSchedule from "./pages/ShiftSchedule";    // [Phase 2.2]
import SpecialEvents from "./pages/SpecialEvents";    // [Phase 2.4]
import DutyReport from "./pages/DutyReport";          // [Phase D]
import AdminApproveOT from "./pages/AdminApproveOT";

export default function App() {
  const location = useLocation();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);

  // [Phase 2.8] ตามสถานะ sidebar (เก็บใน localStorage) เพื่อให้เนื้อหา shift ตาม
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar_collapsed') === '1'
  );
  // sync เมื่อ Sidebar เปลี่ยนสถานะ (เผื่อมีการกดยุบ/กาง)
  useEffect(() => {
    const onStorage = () => {
      setCollapsed(localStorage.getItem('sidebar_collapsed') === '1');
    };
    window.addEventListener('storage', onStorage);
    // poll ทุก 200ms เผื่อ event storage ไม่ทำงานข้าม component ในแท็บเดียวกัน
    const interval = setInterval(onStorage, 200);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <AuthProvider>
      {!isAuthPage && <Sidebar />}

      {/* [Phase 2.8] เนื้อหา shift ตามความกว้าง sidebar
          - mobile: ไม่ shift (sidebar เป็น overlay)
          - desktop: shift ตามที่ sidebar พับ/กาง */}
      <div
        className={
          isAuthPage
            ? ""
            : `min-h-screen transition-[padding] duration-300 ease-in-out
               ${collapsed ? 'md:pl-[72px]' : 'md:pl-60'}`
        }
      >
        <div className={isAuthPage ? "" : "max-w-7xl mx-auto p-4 md:p-6"}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>

              {/* Public */}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* พนักงานทั่วไป */}
              <Route path="/my-ot" element={<ProtectedRoute><MyOT /></ProtectedRoute>} />
              <Route path="/claim-ot" element={<Navigate to="/my-ot" replace />} />
              <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
              <Route path="/signature" element={<ProtectedRoute><Signature /></ProtectedRoute>} />
              <Route path="/duty-report" element={<ProtectedRoute><DutyReport /></ProtectedRoute>} />

              {/* หัวหน้าฝ่าย / Admin */}
              <Route path="/approve-ot" element={
                <ProtectedRoute roles={["supervisor", "admin"]}><ApproveOT /></ProtectedRoute>
              } />

              {/* [Phase 2.2] จัดตาราง OT */}
              <Route path="/shift-schedule" element={
                <ProtectedRoute roles={["supervisor", "admin"]}><ShiftSchedule /></ProtectedRoute>
              } />

              {/* นำเข้า Excel */}
              <Route path="/import-excel" element={
                <ProtectedRoute roles={["admin", "hr", "finance"]}><ImportExcel /></ProtectedRoute>
              } />

              {/* [Phase 2.1] จัดการสิทธิ์ทำ OT */}
              <Route path="/ot-permissions" element={
                <ProtectedRoute roles={["hr", "admin"]}><OTPermissions /></ProtectedRoute>
              } />

              {/* [Phase 2.4] กิจกรรมพิเศษ */}
              <Route path="/special-events" element={
                <ProtectedRoute roles={["hr", "admin"]}><SpecialEvents /></ProtectedRoute>
              } />

              {/* การเงิน */}
              <Route path="/finance" element={
                <ProtectedRoute roles={["admin", "finance", "supervisor"]}><FinanceOT /></ProtectedRoute>
              } />

              {/* การเงิน - อนุมัติ (Phase E) */}
              <Route path="/finance-approve" element={
                <ProtectedRoute roles={["finance", "admin"]}><FinanceApproveOT /></ProtectedRoute>
              } />

              {/* Admin */}
              <Route path="/admin" element={
                <ProtectedRoute roles={["admin"]}><AdminPanel /></ProtectedRoute>
              } />

              {/* ผอ. - อนุมัติขั้นสุดท้าย (Phase E) */}
              <Route path="/admin-approve" element={
                <ProtectedRoute roles={["admin"]}><AdminApproveOT /></ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/login" />} />

            </Routes>
          </AnimatePresence>
        </div>
      </div>
    </AuthProvider>
  );
}