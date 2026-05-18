// src/pages/admin/AdminBrands.jsx - النسخة مع نظام الصلاحيات + دعم الوضع الليلي
import { useState, useEffect, useCallback, useMemo } from "react";
import { adminApi } from "../../utils/adminAuth";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext"; // ✅ إضافة جديدة
import { toast } from "sonner";
import ImageUploader from "../../components/ImageUploader";
import { getImageUrl } from "../../utils/imageUtils";

const AdminBrands = () => {
  const { lang } = useLang();
  const { user, hasPermission } = useAuth();
  const { isDark } = useTheme(); // ✅ إضافة جديدة
  
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    code: "",
    image: ""
  });

  // ✅ ✅ ✅ دوال التحقق من الصلاحيات (مبسطة وسهلة الاستخدام)
  const canCreate = useMemo(() => hasPermission("brands:create"), [hasPermission]);
  const canUpdate = useMemo(() => hasPermission("brands:update"), [hasPermission]);
  const canDelete = useMemo(() => hasPermission("brands:delete"), [hasPermission]);
  const canRead = useMemo(() => hasPermission("brands:read"), [hasPermission]);

  // ✅ جلب البراندات من الـ Backend
  const fetchBrands = useCallback(async () => {
    // ✅ التحقق من صلاحية القراءة أولاً
    if (!canRead) {
      toast.error(lang === "ar" ? "❌ غير مصرح بعرض البراندات" : "❌ Forbidden - No read permission");
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.get("/brands");
      setBrands(res.data);
    } catch (err) {
      console.error("❌ Fetch brands error:", err);
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <div>
            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "خطأ" : "Error"}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{err.message}</p>
          </div>
        </div>,
        { duration: 4000 }
      );
    } finally {
      setLoading(false);
    }
  }, [lang, canRead, isDark]);

  useEffect(() => { 
    fetchBrands(); 
  }, [fetchBrands]);

  // ✅ فلترة محلية للبحث
  const filtered = useMemo(() => {
    if (!search) return brands;
    const q = search.toLowerCase();
    return brands.filter(b => 
      b.name?.toLowerCase().includes(q) || 
      b.code?.toLowerCase().includes(q) ||
      String(b.id).includes(q)
    );
  }, [brands, search]);

  // ✅ فتح/إغلاق النموذج (Modal) - مع التحقق من الصلاحيات
  const openModal = useCallback((brand = null) => {
    // ✅ عند التعديل: التحقق من صلاحية التحديث
    if (brand && !canUpdate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بتعديل البراندات" : "❌ Forbidden - No update permission");
      return;
    }
    
    // ✅ عند الإضافة: التحقق من صلاحية الإنشاء
    if (!brand && !canCreate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بإضافة براندات" : "❌ Forbidden - No create permission");
      return;
    }

    if (brand) {
      setEditingId(brand.id);
      setFormData({ ...brand });
    } else {
      setEditingId(null);
      setFormData({ id: "", name: "", code: "", image: "" });
    }
    setShowModal(true);
  }, [canCreate, canUpdate, lang]);

  const closeModal = useCallback(() => setShowModal(false), []);

  // ✅ حفظ البراند (إضافة أو تعديل) - مع التحقق من الصلاحيات
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ التحقق من الصلاحية قبل الحفظ
    if (editingId && !canUpdate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بتحديث البراندات" : "❌ Forbidden - No update permission");
      return;
    }
    if (!editingId && !canCreate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بإضافة براندات" : "❌ Forbidden - No create permission");
      return;
    }

    if (!formData.id || !formData.name || !formData.code) {
      toast.warning(
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "يرجى تعبئة الحقول الأساسية" : "Please fill required fields"}
          </span>
        </div>,
        { duration: 3500 }
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...formData, id: Number(formData.id) };
      if (editingId) {
        await adminApi.put(`/brands/${editingId}`, payload);
        toast.success(
          <div className="flex items-center gap-3 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1">
              <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>✅ {lang === "ar" ? "تم تحديث البراند!" : "Brand Updated!"}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{formData.name}</p>
            </div>
          </div>,
          { duration: 5000 }
        );
      } else {
        await adminApi.post("/brands", payload);
        toast.success(
          <div className="flex items-center gap-3 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1">
              <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>✅ {lang === "ar" ? "تمت إضافة البراند!" : "Brand Added!"}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{formData.name}</p>
            </div>
          </div>,
          { duration: 5000 }
        );
      }
      closeModal();
      fetchBrands();
    } catch (err) {
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <div>
            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "فشل في الحفظ" : "Save Failed"}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-mono`}>{err.response?.data?.message || err.message}</p>
          </div>
        </div>,
        { duration: 6000 }
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ حذف براند - مع التحقق من الصلاحية
  const handleDelete = async (id) => {
    // ✅ التحقق من صلاحية الحذف أولاً
    if (!canDelete) {
      toast.error(lang === "ar" ? "❌ غير مصرح بحذف البراندات" : "❌ Forbidden - No delete permission");
      return;
    }

    const brand = brands.find(b => b.id === id);
    if (!window.confirm(lang === "ar" ? `هل أنت متأكد من حذف "${brand?.name}"؟` : `Are you sure you want to delete "${brand?.name}"?`)) return;
    
    try {
      await adminApi.delete(`/brands/${id}`);
      toast.success(
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>🗑️</div>
          <div>
            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "تم الحذف بنجاح" : "Deleted Successfully"}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{brand?.name}</p>
          </div>
        </div>,
        { duration: 4000 }
      );
      fetchBrands();
    } catch (err) {
      toast.error(
        <div className="flex items-center gap-2">
          <span>❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "فشل في الحذف" : "Delete failed"}</span>
        </div>
      );
    }
  };

  // ✅ معالجة تغيير الحقول
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ✅ حالة عدم وجود صلاحية القراءة - مع دعم الوضع الليلي
  if (!canRead) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] text-center transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-white'}`} dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "وصول مرفوض" : "Access Denied"}
          </h2>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {lang === "ar" ? "لا تملك صلاحية عرض البراندات" : "You don't have permission to view brands"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-colors duration-300 ${isDark ? 'dark bg-gray-900' : ''}`} dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* ===== Header & Actions ===== */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border transition-colors duration-300 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        <h1 className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {lang === "ar" ? "إدارة البراندات" : "Brands Management"}
        </h1>
        <div className="flex gap-3 w-full md:w-auto">
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder={lang === "ar" ? "بحث عن براند..." : "Search brand..."}
            className={`flex-1 md:w-64 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            }`} 
          />
          {/* ✅ زر الإضافة - يظهر فقط لمن لديه صلاحية الإنشاء */}
          {canCreate && (
            <button 
              onClick={() => openModal()} 
              className="bg-gray-900 dark:bg-gray-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-pink-600 transition-all whitespace-nowrap"
            >
              {lang === "ar" ? "+ إضافة براند" : "+ Add Brand"}
            </button>
          )}
        </div>
      </div>

      {/* ===== Brands Table ===== */}
      <div className={`rounded-[2rem] border shadow-sm overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        {loading ? (
          <div className={`p-12 text-center font-bold animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {lang === "ar" ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`p-12 text-center font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {lang === "ar" ? "لا توجد نتائج" : "No results"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`border-b ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                <tr>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID</th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "الاسم" : "Name"}
                  </th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Code</th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "الصورة" : "Image"}
                  </th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-50'}`}>
                {filtered.map(b => (
                  <tr key={b.id} className={`transition-colors ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50/50'}`}>
                    <td className={`px-6 py-4 font-mono ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{b.id}</td>
                    <td className={`px-6 py-4 font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{b.name}</td>
                    <td className={`px-6 py-4 font-mono ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>{b.code}</td>
                    <td className="px-6 py-4">
                      {b.image ? (
                        <img 
                          src={getImageUrl(b.image)} 
                          alt={b.name} 
                          className="w-12 h-12 object-contain rounded-lg bg-gray-50 dark:bg-gray-700" 
                          loading="lazy"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : <span className={isDark ? 'text-gray-500' : 'text-gray-300'}>—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {/* ✅ زر التعديل - يظهر فقط لمن لديه صلاحية التحديث */}
                        {canUpdate && (
                          <button 
                            onClick={() => openModal(b)} 
                            className={`px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                              isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            {lang === "ar" ? "تعديل" : "Edit"}
                          </button>
                        )}
                        {/* ✅ زر الحذف - يظهر فقط لمن لديه صلاحية الحذف */}
                        {canDelete && (
                          <button 
                            onClick={() => handleDelete(b.id)} 
                            className={`px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                              isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            {lang === "ar" ? "حذف" : "Delete"}
                          </button>
                        )}
                        {/* ✅ رسالة توضيحية إذا لم تكن هناك صلاحيات */}
                        {!canUpdate && !canDelete && (
                          <span className={`text-[10px] italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {lang === "ar" ? " " : " "}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* ===== Modal: Add/Edit Brand ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`rounded-[2.5rem] w-full max-w-lg shadow-2xl border transition-colors duration-300 ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            <div className={`p-6 border-b flex justify-between items-center sticky top-0 rounded-t-[2.5rem] z-10 transition-colors ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingId 
                  ? (lang === "ar" ? "تعديل براند" : "Edit Brand") 
                  : (lang === "ar" ? "إضافة براند" : "Add Brand")}
              </h2>
              <button 
                onClick={closeModal} 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <input 
                name="id" 
                type="number" 
                value={formData.id} 
                onChange={handleChange} 
                placeholder="ID (رقم فريد)" 
                required 
                className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                }`} 
              />
              <input 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder={lang === "ar" ? "اسم البراند *" : "Brand name *"} 
                required 
                className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                }`} 
              />
              <input 
                name="code" 
                value={formData.code} 
                onChange={handleChange} 
                placeholder={lang === "ar" ? "Code (اختصار) *" : "Code (abbreviation) *"} 
                required 
                className={`w-full border rounded-xl px-4 py-2.5 text-sm uppercase transition-colors ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                }`} 
              />
              
              {/* ✅ مكون رفع الصور */}
              <ImageUploader
                label={lang === "ar" ? "صورة البراند *" : "Brand Image *"}
                currentImage={formData.image}
                resourceType="brands"
                resourceData={{ 
                  name: formData.name,
                  name_ar: formData.name,  // للأمان
                  name_en: formData.name   // للأمان
                }}  // ✅ تأكد من وجود }} هنا
                onImageSelect={(path) => setFormData(prev => ({ ...prev, image: path }))}
              />
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="flex-1 bg-gray-900 dark:bg-gray-700 text-white py-3 rounded-xl font-black text-sm hover:bg-pink-600 transition-all disabled:opacity-50"
                >
                  {submitting 
                    ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") 
                    : (editingId ? (lang === "ar" ? "تحديث" : "Update") : (lang === "ar" ? "إضافة" : "Add"))}
                </button>
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBrands;
