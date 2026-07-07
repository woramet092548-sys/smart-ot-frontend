import { createContext, useState, useContext, useEffect } from "react";
import { jwtDecode } from "jwt-decode";


const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // [แก้บั๊กเด้ง login ตอน refresh] loading = true จนกว่าจะอ่าน token จาก localStorage เสร็จ
  //   ป้องกัน ProtectedRoute ตัดสินตอน user ยังเป็น null ชั่วคราว
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ ...decoded, token });
      } catch {
        localStorage.removeItem("token");
      }
    }
    setLoading(false); // อ่าน token เสร็จแล้ว (มี/ไม่มี token ก็ตาม)
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    const decoded = jwtDecode(token);
    setUser({ ...decoded, token });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};