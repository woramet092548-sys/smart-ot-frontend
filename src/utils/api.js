import axios from "axios";

// [deploy] ที่อยู่ API อ่านจากไฟล์ .env ของ frontend (ตัวแปร VITE_API_URL)
//   - ไม่ได้ตั้งค่า (ตอนพัฒนาบนเครื่อง) → ใช้ http://localhost:5000/api เหมือนเดิม
//   - ขึ้นเซิร์ฟเวอร์จริง → ตั้ง VITE_API_URL ก่อน npm run build (เช่น /api ถ้าหน้าเว็บกับ API อยู่โดเมนเดียวกัน)
//   หน้าที่ยังใช้ fetch() ตรง (MyOT, OTPermissions) ก็ import API_BASE จากไฟล์นี้ไปใช้ → แก้ที่เดียวพอ
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
