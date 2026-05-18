// src/pages/admin/AdminCategories.jsx - النسخة المُصححة ✅
import { useState, useEffect, useCallback, useMemo } from "react";
import { adminApi } from "../../utils/adminAuth";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "sonner";
import ImageUploader from "../../components/ImageUploader"; // ✅ استيراد مكون رفع الصور
import { getImageUrl } from "../../utils/imageUtils"; // ✅ استيراد دالة معالجة الصور

const AdminCategories = () => {
  const { lang } = useLang();
  const { user, hasPermission } = useAuth();
  const { isDark } = useTheme();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    name_ar: "",
    name_en: "",
    parent_id: "",
    image: "",
    sort_order: 0
  });

  // ✅ دوال التحقق من الصلاحيات
  const canCreate = useMemo(() => hasPermission("categories:create"), [hasPermission]);
  const canUpdate = useMemo(() => hasPermission("categories:update"), [hasPermission]);
  const canDelete = useMemo(() => hasPermission("categories:delete"), [hasPermission]);
  const canRead = useMemo(() => hasPermission("categories:read"), [hasPermission]);

  // ✅ جلب التصنيفات
  const fetchCategories = useCallback(async () => {
    if (!canRead) {
      toast.error(lang === "ar" ? "❌ غير مصرح بعرض التصنيفات" : "❌ Forbidden - No read permission");
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.get("/categories");
      setCategories(res.data);
    } catch (err) {
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

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ✅ خريطة التصنيفات للبحث السريع عن اسم الأب
  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  // ✅ التصنيفات الرئيسية فقط (للاختيار كأب)
  const parentOptions = useMemo(() => 
    categories.filter(c => !c.parent_id).map(c => ({ 
      id: c.id, 
      name: c[`name_${lang}`] 
    }))
  , [categories, lang]);

  // ✅ فلترة محلية
  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(c => 
      c.name_ar?.toLowerCase().includes(q) || 
      c.name_en?.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  }, [categories, search]);

  // ✅ بناء شجرة العرض
  const buildTree = useCallback((items, parentId = null, level = 0) => {
    return items
      .filter(c => c.parent_id === parentId)
      .map(c => ({
        ...c,
        level,
        children: buildTree(items, c.id, level + 1)
      }));
  }, []);

  const tree = useMemo(() => buildTree(filtered), [filtered, buildTree]);

  // ✅ فتح/إغلاق النموذج
  const openModal = useCallback((cat = null) => {
    if (cat && !canUpdate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بتعديل التصنيفات" : "❌ Forbidden - No update permission");
      return;
    }
    if (!cat && !canCreate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بإضافة تصنيفات" : "❌ Forbidden - No create permission");
      return;
    }

    if (cat) {
      setEditingId(cat.id);
      setFormData({ 
        ...cat, 
        parent_id: cat.parent_id ? String(cat.parent_id) : "" 
      });
    } else {
      setEditingId(null);
      setFormData({ 
        id: "", 
        name_ar: "", 
        name_en: "", 
        parent_id: "", 
        image: "", 
        sort_order: 0 
      });
    }
    setShowModal(true);
  }, [canCreate, canUpdate, lang]);

  const closeModal = useCallback(() => setShowModal(false), []);

  // ✅ حفظ التصنيف
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingId && !canUpdate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بتحديث التصنيفات" : "❌ Forbidden - No update permission");
      return;
    }
    if (!editingId && !canCreate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بإضافة تصنيفات" : "❌ Forbidden - No create permission");
      return;
    }

    if (!formData.id || !formData.name_ar || !formData.name_en) {
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
      const payload = { 
        ...formData, 
        id: Number(formData.id), 
        parent_id: formData.parent_id ? Number(formData.parent_id) : null,
        sort_order: Number(formData.sort_order) || 0
      };
      
      if (editingId) {
        await adminApi.put(`/categories/${editingId}`, payload);
        toast.success(
          <div className="flex items-center gap-3 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1">
              <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>✅ {lang === "ar" ? "تم تحديث التصنيف!" : "Category Updated!"}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{formData[`name_${lang}`]}</p>
            </div>
          </div>,
          { duration: 5000 }
        );
      } else {
        await adminApi.post("/categories", payload);
        toast.success(
          <div className="flex items-center gap-3 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1">
              <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>✅ {lang === "ar" ? "تمت إضافة التصنيف!" : "Category Added!"}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{formData[`name_${lang}`]}</p>
            </div>
          </div>,
          { duration: 5000 }
        );
      }
      closeModal();
      fetchCategories();
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

  // ✅ حذف تصنيف
  const handleDelete = async (id) => {
    if (!canDelete) {
      toast.error(lang === "ar" ? "❌ غير مصرح بحذف التصنيفات" : "❌ Forbidden - No delete permission");
      return;
    }

    const hasChildren = categories.some(c => c.parent_id === id);
    if (hasChildren) {
      toast.warning(
        <div className="flex items-center gap-2">
          <span>⚠️</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "لا يمكن حذف تصنيف يحتوي على أبناء" : "Cannot delete category with children"}
          </span>
        </div>
      );
      return;
    }
    
    const category = categories.find(c => c.id === id);
    if (!window.confirm(lang === "ar" ? `هل أنت متأكد من حذف "${category?.[`name_${lang}`]}"؟` : `Are you sure you want to delete "${category?.[`name_${lang}`]}"?`)) return;
    
    try {
      await adminApi.delete(`/categories/${id}`);
      toast.success(
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>🗑️</div>
          <div>
            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "تم الحذف بنجاح" : "Deleted Successfully"}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{category?.[`name_${lang}`]}</p>
          </div>
        </div>,
        { duration: 4000 }
      );
      fetchCategories();
    } catch (err) {
      toast.error(
        <div className="flex items-center gap-2">
          <span>❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "فشل في الحذف" : "Delete failed"}</span>
        </div>
      );
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "number" ? Number(value) : value }));
  };

  // ✅ مكون عرض الشجرة - مع عرض الصور من Cloudinary واسم الأب
  const renderTree = (nodes) => (
    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-50'}`}>
      {nodes.map(node => {
        // ✅ عرض اسم التصنيف الأب بدلاً من الـ ID
        const parentName = node.parent_id 
          ? categoryMap.get(node.parent_id)?.[`name_${lang}`] || categoryMap.get(node.parent_id)?.name_ar 
          : null;
        
        return (
          <tr key={node.id} className={`transition-colors ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50/50'}`} style={{ paddingLeft: `${node.level * 24}px` }}>
            <td className={`px-6 py-4 font-mono ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{node.id}</td>
            <td className={`px-6 py-4 font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} style={{ paddingRight: `${node.level * 20}px` }}>
              {node.level > 0 && <span className={isDark ? 'text-gray-500' : 'text-gray-300'} mr-2>{"─".repeat(node.level)}</span>}
              {lang === "ar" ? node.name_ar : node.name_en}
            </td>
            <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
              {/* ✅ عرض اسم الأب بدلاً من الـ ID */}
              {parentName || <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>—</span>}
            </td>
            <td className="px-6 py-4">
              {node.image ? (
                <img 
                  src={getImageUrl(node.image)} // ✅ استخدام getImageUrl لدعم Cloudinary
                  alt={lang === "ar" ? node.name_ar : node.name_en} 
                  className="w-10 h-10 object-contain rounded-lg bg-gray-50 dark:bg-gray-700" 
                  loading="lazy"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : <span className={isDark ? 'text-gray-500' : 'text-gray-300'}>—</span>}
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                {canUpdate && (
                  <button onClick={() => openModal(node)} className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}>{lang === "ar" ? "تعديل" : "Edit"}</button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(node.id)} className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}>{lang === "ar" ? "حذف" : "Delete"}</button>
                )}
                {!canUpdate && !canDelete && (
                  <span className={`text-[10px] italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}> </span>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  );

  // ✅ حالة عدم وجود صلاحية القراءة
  if (!canRead) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] text-center transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-white'}`} dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "وصول مرفوض" : "Access Denied"}
          </h2>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {lang === "ar" ? "لا تملك صلاحية عرض التصنيفات" : "You don't have permission to view categories"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-colors duration-300 ${isDark ? 'dark bg-gray-900' : ''}`} dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border transition-colors duration-300 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        <h1 className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {lang === "ar" ? "إدارة التصنيفات" : "Categories Management"}
        </h1>
        <div className="flex gap-3 w-full md:w-auto">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} 
            placeholder={lang === "ar" ? "بحث عن تصنيف..." : "Search category..."}
            className={`flex-1 md:w-64 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            }`} />
          {canCreate && (
            <button onClick={() => openModal()} 
              className="bg-gray-900 dark:bg-gray-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-pink-600 transition-all whitespace-nowrap">
              {lang === "ar" ? "+ إضافة تصنيف" : "+ Add Category"}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-[2rem] border shadow-sm overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        {loading ? <div className={`p-12 text-center font-bold animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{lang === "ar" ? "جاري التحميل..." : "Loading..."}</div> :
        filtered.length === 0 ? <div className={`p-12 text-center font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{lang === "ar" ? "لا توجد نتائج" : "No results"}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`border-b ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                <tr>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID</th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{lang === "ar" ? "الاسم" : "Name"}</th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Parent</th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{lang === "ar" ? "الصورة" : "Image"}</th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{lang === "ar" ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              {renderTree(tree)}
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`rounded-[2.5rem] w-full max-w-lg shadow-2xl border transition-colors duration-300 ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            <div className={`p-6 border-b flex justify-between items-center sticky top-0 rounded-t-[2.5rem] z-10 transition-colors ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{editingId ? (lang === "ar" ? "تعديل تصنيف" : "Edit Category") : (lang === "ar" ? "إضافة تصنيف" : "Add Category")}</h2>
              <button onClick={closeModal} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input name="id" type="number" value={formData.id} onChange={handleChange} placeholder="ID (رقم فريد)" required className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                }`} />
                <input name="sort_order" type="number" value={formData.sort_order} onChange={handleChange} placeholder="ترتيب العرض" className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                }`} />
              </div>
              <input name="name_ar" value={formData.name_ar} onChange={handleChange} placeholder="الاسم بالعربي *" required className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
              }`} />
              <input name="name_en" value={formData.name_en} onChange={handleChange} placeholder="الاسم بالإنجليزي *" required className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
              }`} />
              
              {/* ✅ Select التصنيف الأب */}
              <select name="parent_id" value={formData.parent_id} onChange={handleChange} className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-gray-100' 
                  : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}>
                <option value="">— {lang === "ar" ? "تصنيف رئيسي (بدون أب)" : "Main Category (No Parent)"} —</option>
                {parentOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              
              {/* ✅ ✅ ✅ مكون رفع الصور مع دعم Cloudinary */}
              <ImageUploader
                label={lang === "ar" ? "صورة التصنيف *" : "Category Image *"}
                currentImage={formData.image}
                resourceType="categories"
                resourceData={{
                  name_ar: formData.name_ar,
                  name_en: formData.name_en,
                  name: formData.name_ar || formData.name_en  // ✅ أضف فاصلة هنا إذا كان هناك المزيد
                }}  // ✅ تأكد من إغلاق الكائن بـ }}
                onImageSelect={(path) => setFormData(prev => ({ ...prev, image: path }))}
              />
              
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="flex-1 bg-gray-900 dark:bg-gray-700 text-white py-3 rounded-xl font-black text-sm hover:bg-pink-600 transition-all disabled:opacity-50">
                  {submitting ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (editingId ? (lang === "ar" ? "تحديث" : "Update") : (lang === "ar" ? "إضافة" : "Add"))}
                </button>
                <button type="button" onClick={closeModal} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                  isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>{lang === "ar" ? "إلغاء" : "Cancel"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
