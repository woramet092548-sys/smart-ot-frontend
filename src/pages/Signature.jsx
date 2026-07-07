import { useState, useEffect } from "react";
import PageTransition from "../components/PageTransition";
import api from "../utils/api";

export default function Signature() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLocked, setIsLocked] = useState(false);
  
  // ✅ เพิ่ม State สำหรับเก็บ userId ที่ได้จาก Backend โดยตรง
  const [userId, setUserId] = useState(null); 

  // 📌 1. เช็คสถานะลายเซ็นและดึง ID จาก Database เมื่อโหลดหน้าเว็บ
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // ยิงไปถามหลังบ้านว่า "ฉันคือใคร?"
        const response = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // ✅ เก็บ ID ที่ได้จากหลังบ้านไว้ใช้ตอนอัปโหลด
        setUserId(response.data.id);

        // เช็คว่าล็อคลายเซ็นหรือยัง
        if (response.data.is_signature_locked === 1) {
          setIsLocked(true);
        }
      } catch (error) {
        console.error("ไม่สามารถดึงข้อมูลสถานะได้:", error);
      }
    };
    fetchUserData();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== "image/png") {
        setMessage({ type: "error", text: "กรุณาอัปโหลดเฉพาะไฟล์นามสกุล .PNG เท่านั้นครับ" });
        setFile(null);
        setPreview(null);
        e.target.value = ""; 
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setMessage({ type: "", text: "" });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: "error", text: "กรุณาเลือกไฟล์รูปภาพก่อนอัปโหลด" });
      return;
    }

    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      
      // ✅ ใช้ userId ที่เราดึงมาจาก useEffect เลย ชัวร์ 100%
      if (!userId) {
        throw new Error("กำลังเชื่อมต่อข้อมูลผู้ใช้ หรือไม่พบข้อมูล กรุณารีเฟรชหน้าเว็บ 1 ครั้งครับ");
      }

      const formData = new FormData();
      formData.append("signature", file);
      formData.append("userId", userId); // ส่ง ID ให้ Backend

      const response = await api.post("/users/upload-signature", formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}` 
        },
      });

      setMessage({ type: "success", text: response.data.message });
      setIsLocked(true); 
      setFile(null);

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "เกิดข้อผิดพลาดในการอัปโหลด";
      setMessage({ type: "error", text: errorMsg });
      
      if (error.response?.status === 403) {
        setIsLocked(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800">จัดการลายเซ็นอิเล็กทรอนิกส์</h2>
          <p className="text-gray-500 text-sm mt-1">อัปโหลดรูปลายเซ็นของคุณเพื่อใช้สำหรับระบบเบิกจ่าย OT</p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg">
            <div className="flex">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">ข้อควรระวัง (Security Lock)</h3>
                <p className="text-sm text-amber-700 mt-1">
                  เพื่อความปลอดภัย คุณสามารถอัปโหลดลายเซ็นได้ <strong>เพียงครั้งเดียวเท่านั้น</strong> หากต้องการแก้ไข จะต้องติดต่อ Admin ระบบ
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            {isLocked ? (
              <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">คุณได้อัปโหลดลายเซ็นไปแล้ว</h3>
                <p className="mt-1 text-sm text-gray-500">ระบบได้ทำการล็อคลายเซ็นของคุณเรียบร้อยแล้ว</p>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">เลือกไฟล์รูปลายเซ็น <span className="text-red-500">*</span></label>
                <input type="file" accept="image/png" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 outline-none cursor-pointer" />
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>📌 หมายเหตุที่สำคัญ:</strong><br/>
                    1. ระบบรองรับเฉพาะไฟล์รูปภาพนามสกุล <strong>.PNG</strong> เท่านั้น<br/>
                    2. แนะนำให้ใช้ไฟล์ที่ <strong>"ไม่มีพื้นหลัง (โปร่งใส)"</strong> เพื่อความสวยงาม
                  </p>
                </div>
                {preview && (
                  <div className="mt-4 flex justify-center p-4 bg-gray-50 border rounded-lg">
                    <img src={preview} alt="Signature Preview" className="max-h-40 object-contain drop-shadow-md" />
                  </div>
                )}
              </div>
            )}

            {message.text && (
              <div className={`p-3 rounded-lg text-sm text-center ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {message.text}
              </div>
            )}

            {!isLocked && (
              <button type="submit" disabled={isLoading || !file || !userId} className={`w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${(isLoading || !file || !userId) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}>
                {isLoading ? "กำลังอัปโหลด..." : (!userId ? "กำลังโหลดข้อมูล..." : "ยืนยันการอัปโหลดลายเซ็น")}
              </button>
            )}
          </form>
        </div>
      </div>
    </PageTransition>
  );
}