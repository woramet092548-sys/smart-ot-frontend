import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  // [แก้บั๊กเด้ง login ตอน refresh] ยังอ่าน token ไม่เสร็จ → รอก่อน อย่าเพิ่งตัดสิน
  //   ถ้าตัดสินตอนนี้ user จะยังเป็น null ชั่วคราว แล้วเด้ง login ทั้งที่จริงมีสิทธิ์
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}