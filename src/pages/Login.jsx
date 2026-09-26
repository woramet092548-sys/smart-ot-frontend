import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";   // [ปิดสมัคร] เอา Link ออก (ไม่มีลิงก์ไปหน้าสมัครแล้ว)
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/api";
import PageTransition from "../components/PageTransition";

export default function Login() {
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // ส่งไปทั้ง 2 ชื่อ (email และ empId) เพื่อให้ Backend รับค่าได้ตามรูปแบบที่กำหนด
      const res = await api.post("/auth/login", {
        email: empId,   // เผื่อ Backend ใช้ตัวแปร email รับค่า
        empId: empId,   // เผื่อ Backend ใช้ตัวแปร empId รับค่า
        password: password
      });

      const token = res.data.token || res.data.access;

      if (token) {
        await login(token);
        navigate("/my-ot");
      } else {
        setError("ไม่พบ Token ในการตอบกลับจากเซิร์ฟเวอร์");
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 px-4 relative overflow-hidden">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden md:max-w-lg z-10 relative border border-gray-100"
        >

          <div className="bg-[#1e3a8a] py-10 px-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
              </svg>
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white tracking-wide">Smart OT</h2>
              {/* แก้ typo: ท างาน → ทำงาน */}
              <p className="text-blue-200 mt-2 text-sm font-light">ระบบจัดการการทำงานล่วงเวลา</p>
            </div>
          </div>

          <div className="p-8 pt-10">
            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 pl-1">รหัสพนักงาน / อีเมล</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 focus:bg-white"
                    placeholder="เช่น 66001 หรือ Adminshogun"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5 pl-1">
                  <label className="block text-sm font-semibold text-gray-700">รหัสผ่าน</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 focus:bg-white"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition">
                    {showPassword ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0 }} className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white uppercase tracking-wider ${isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-[#1e3a8a] hover:bg-blue-800 shadow-blue-900/20"} transition-all duration-200`}>
                {/* แก้ typo: กา ลัง → กำลัง */}
                {isLoading ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>กำลังเข้าสู่ระบบ...</div> : "เข้าสู่ระบบ"}
              </motion.button>
            </form>

            <div className="mt-8 text-center border-t border-gray-100 pt-6">
              {/* [ปิดสมัคร] เดิมเป็นลิงก์ "ลงทะเบียนพนักงานใหม่" — บัญชีมาจากข้อมูลบุคลากรของมหาวิทยาลัย */}
              <p className="text-sm text-gray-500">
                หากเข้าใช้งานไม่ได้ กรุณาติดต่อฝ่ายบุคคล
              </p>
            </div>
          </div>
        </motion.div>

        <div className="fixed bottom-4 text-center w-full text-gray-400 text-xs z-0">
          &copy; {new Date().getFullYear()} Smart OT Management System.
        </div>
      </div>
    </PageTransition>
  );
}