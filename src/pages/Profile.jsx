// ไฟล์: src/pages/Profile.jsx
// [โปรไฟล์] หน้าโปรไฟล์พนักงาน — ทุก role เข้าได้ ดูได้เฉพาะของตัวเอง
//   - รูปโปรไฟล์: อัป/เปลี่ยน/ลบได้เอง (.png/.jpg ไม่เกิน 2 MB)
//   - ข้อมูลชื่อ/อีเมล/รหัสพนักงาน: ดูอย่างเดียว (มาจากฝ่ายบุคคล / อนาคตมาจาก SSO ของมหาวิทยาลัย)
//   - ลายเซ็น: ดูรูปที่อัปไว้ (เดิมอัปแล้วมองไม่เห็นอีกเลย) + ลิงก์ไปหน้าลายเซ็นถ้ายังไม่อัป
//   รูปดึงผ่าน API ที่ต้อง login (แนบ token) → ใช้ axios แบบ blob แล้วแปลงเป็น URL ชั่วคราว
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import api from "../utils/api";
import {
  UserCircle, Camera, Trash2, Mail, IdCard, ShieldCheck, ToggleRight,
  PenTool, Loader2, Info, BadgeCheck,
} from "lucide-react";

const MAX_PHOTO_MB = 2;

const roleLabel = (role) => {
  switch (role) {
    case "admin": return "ผู้อำนวยการ";
    case "supervisor": return "หัวหน้าฝ่าย";
    case "hr": return "ฝ่ายบุคคล";
    case "finance": return "ฝ่ายการเงิน";
    case "user": return "พนักงาน";
    default: return role || "-";
  }
};

// คำนำหน้า + ชื่อ (ชื่อภาษาอังกฤษเว้นวรรค 1 ช่อง แบบเดียวกับใน PDF)
const displayName = (p) => {
  if (!p) return "-";
  const name = p.fullname || "-";
  if (!p.prefix || name.startsWith(p.prefix)) return name;
  return p.prefix + (/^[A-Za-z]/.test(name) ? " " : "") + name;
};

// โหลดรูปจาก API (ต้อง login) → URL ชั่วคราวสำหรับ <img>, ไม่มีรูป → null
const loadImage = async (url) => {
  try {
    const res = await api.get(url, { responseType: "blob" });
    return URL.createObjectURL(res.data);
  } catch {
    return null;
  }
};

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [signUrl, setSignUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const fileRef = useRef(null);

  // เปลี่ยนรูป → คืนหน่วยความจำของ URL เก่า
  const replaceUrl = (setter) => (next) =>
    setter((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next;
    });
  const setPhoto = replaceUrl(setPhotoUrl);
  const setSign = replaceUrl(setSignUrl);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/users/me");
      setProfile(res.data);
      setPhoto(res.data.has_photo ? await loadImage("/users/me/photo") : null);
      setSign(res.data.has_signature ? await loadImage("/users/me/signature") : null);
    } catch (err) {
      setError(err.response?.data?.message || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // คืนหน่วยความจำของรูปตอนออกจากหน้า
    return () => {
      setPhotoUrl((u) => { if (u) URL.revokeObjectURL(u); return null; });
      setSignUrl((u) => { if (u) URL.revokeObjectURL(u); return null; });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";   // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setMessage({ type: "error", text: "รองรับเฉพาะรูป .png หรือ .jpg" });
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setMessage({ type: "error", text: `ไฟล์ใหญ่เกิน ${MAX_PHOTO_MB} MB` });
      return;
    }
    setBusy(true);
    setMessage({ type: "", text: "" });
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await api.post("/users/me/photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setPhoto(await loadImage("/users/me/photo"));
      setProfile((p) => ({ ...p, has_photo: true }));
      setMessage({ type: "success", text: res.data.message });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "อัปโหลดรูปไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm("ต้องการลบรูปโปรไฟล์ใช่หรือไม่?")) return;
    setBusy(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await api.delete("/users/me/photo");
      setPhoto(null);
      setProfile((p) => ({ ...p, has_photo: false }));
      setMessage({ type: "success", text: res.data.message });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "ลบรูปไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center py-32 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> กำลังโหลด...
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-3xl mx-auto bg-rose-50 border border-rose-100 text-rose-600 text-sm p-4 rounded-2xl">{error}</div>
      </PageTransition>
    );
  }

  const infoRows = [
    { icon: <IdCard size={18} />, label: "รหัสพนักงาน", value: profile.empId },
    { icon: <Mail size={18} />, label: "อีเมล", value: profile.email || "-" },
    { icon: <ShieldCheck size={18} />, label: "บทบาทในระบบ", value: roleLabel(profile.role) },
  ];

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── การ์ดหลัก: รูป + ชื่อ ── */}
        <div className="bg-white rounded-4xl border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-100 border-4 border-white shadow-md flex items-center justify-center text-slate-300">
              {photoUrl
                ? <img src={photoUrl} alt="รูปโปรไฟล์" className="w-full h-full object-cover" />
                : <UserCircle size={72} strokeWidth={1.25} />}
            </div>
            {busy && (
              <div className="absolute inset-0 rounded-3xl bg-white/70 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight break-words">{displayName(profile)}</h1>
            <p className="text-sm font-medium text-slate-400 mt-1">{roleLabel(profile.role)} · {profile.empId}</p>

            {profile.photo_supported ? (
              <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handlePickPhoto} />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-all active:scale-95"
                >
                  <Camera size={16} /> {profile.has_photo ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
                </button>
                {profile.has_photo && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleDeletePhoto}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 disabled:opacity-50 transition-all active:scale-95"
                  >
                    <Trash2 size={16} /> ลบรูป
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400">ยังเปิดใช้รูปโปรไฟล์ไม่ได้ (ผู้ดูแลระบบต้องตั้งค่าฐานข้อมูลก่อน)</p>
            )}
            <p className="mt-2 text-[11px] text-slate-400">รูป .png หรือ .jpg ไม่เกิน {MAX_PHOTO_MB} MB</p>
          </div>
        </div>

        {message.text && (
          <div className={`p-3 rounded-xl text-sm text-center ${message.type === "error" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── ข้อมูลพนักงาน ── */}
          <div className="bg-white rounded-4xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-black text-slate-800 mb-4">ข้อมูลพนักงาน</h2>
            <div className="space-y-4">
              {infoRows.map((r) => (
                <div key={r.label} className="flex items-start gap-3">
                  <div className="mt-0.5 text-slate-400">{r.icon}</div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-400">{r.label}</p>
                    <p className="text-sm font-semibold text-slate-700 break-all">{r.value}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-slate-400"><ToggleRight size={18} /></div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400">สิทธิ์ทำ OT</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-xs font-bold border ${profile.can_do_ot ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
                    {profile.can_do_ot ? "เปิดอยู่" : "ถูกปิด — ติดต่อฝ่ายบุคคล"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2 text-[11px] text-slate-400 bg-slate-50 rounded-xl p-3">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>ชื่อ อีเมล และรหัสพนักงานมาจากข้อมูลของฝ่ายบุคคล แก้จากหน้านี้ไม่ได้ ถ้าไม่ถูกต้องให้ติดต่อฝ่ายบุคคล</span>
            </div>
          </div>

          {/* ── ลายเซ็น ── */}
          <div className="bg-white rounded-4xl border border-slate-100 shadow-sm p-6 flex flex-col">
            <h2 className="font-black text-slate-800 mb-4">ลายเซ็น</h2>
            {profile.has_signature ? (
              <>
                <div className="flex-1 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl p-4 min-h-32">
                  {signUrl
                    ? <img src={signUrl} alt="ลายเซ็นของฉัน" className="max-h-28 object-contain" />
                    : <p className="text-xs text-slate-400">โหลดรูปลายเซ็นไม่ได้</p>}
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <BadgeCheck size={16} /> ระบบใส่ลายเซ็นนี้ในใบลงเวลาให้อัตโนมัติ
                </p>
                {profile.is_signature_locked && (
                  <p className="mt-1 text-[11px] text-slate-400">ลายเซ็นถูกล็อกไว้ ถ้าต้องการเปลี่ยนให้ติดต่อผู้ดูแลระบบ</p>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl p-6">
                <PenTool size={28} className="text-amber-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">ยังไม่ได้อัปโหลดลายเซ็น</p>
                <p className="text-xs text-slate-400 mt-1">ต้องมีลายเซ็นก่อน ใบลงเวลาจึงจะมีลายเซ็นของคุณ</p>
                <Link to="/signature" className="mt-4 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all">
                  ไปหน้าลายเซ็น
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
