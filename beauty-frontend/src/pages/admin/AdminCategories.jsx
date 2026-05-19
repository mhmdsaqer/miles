// src/pages/admin/AdminCategories.jsx - النسخة المنطقية المُحسّنة ✅
import { useState, useEffect, useCallback, useMemo } from "react";
import { adminApi } from "../../utils/adminAuth";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "sonner";
import ImageUploader from "../../components/ImageUploader";
import { getImageUrl } from "../../utils/imageUtils";

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
  
  // ✅ بيانات النموذج - مع تحسينات المنطق
  const [formData, setFormData] = useState({
    id: "",
    name_ar: "",
    name_en: "",
    parent_id: null,      // ✅ null = تصنيف رئيسي
    is_parent: true,      // ✅ Checkbox: هل هذا تصنيف رئيسي؟
    image: "",            // ✅ اختياري
    // sort_order محذوف من الواجهة، يُستخدم 0 افتراضياً
  });

  // ✅ دوال التحقق من الصلاحيات
  const canCreate = useMemo(() => hasPermission("categories:create"), [hasPermission]);
  const canUpdate = useMemo(() => hasPermission("categories:update"), [hasPermission]);
  const canDelete = useMemo(() => hasPermission("categories:delete"), [hasPermission]);
  const canRead = useMemo(() => hasPermission("categories:read"), [hasPermission]);

  // ✅ جلب التصنيفات
  const fetchCategories = useCallback(async () => {
    if (!canRead) {
      toast.error(lang === "ar" ? "❌ غير مصرح بعرض التصنيفات" : "❌ Forbidden");
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
            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {lang === "ar" ? "خطأ" : "Error"}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {err.message}
            </p>
          </div>
        </div>,
        { duration: 4000 }
      );
    } finally {
      setLoading(false);
    }
  }, [lang, canRead, isDark]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ✅ خريطة التصنيفات للبحث السريع
  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  // ✅ التصنيفات الفرعية فقط (للاختيار كأب) - استثناء التصنيف الذي يتم تعديله
  const childOptions = useMemo(() => 
    categories
      .filter(c => c.parent_id !== null)  // ✅ فقط التصنيفات الفرعية يمكن أن تكون أباً لتصنيف جديد
      .filter(c => c.id !== editingId)     // ✅ استثناء التصنيف الذي يتم تعديله
      .map(c => ({ 
        id: c.id, 
        name: c[`name_${lang}`],
        hasChildren: categories.some(cc => cc.parent_id === c.id)  // ✅ للتحذير
      }))
  , [categories, lang, editingId]);

  // ✅ فلترة محلية للبحث
  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(c => 
      c.name_ar?.toLowerCase().includes(q) || 
      c.name_en?.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  }, [categories, search]);

  // ✅ بناء شجرة العرض - مع دعم التوسيع/الطي
  const buildTree = useCallback((items, parentId = null, level = 0) => {
    return items
      .filter(c => c.parent_id === parentId)
      .sort((a, b) => a.id - b.id)  // ✅ ترتيب حسب ID للعرض المنطقي
      .map(c => ({
        ...c,
        level,
        children: buildTree(items, c.id, level + 1)
      }));
  }, []);

  const tree = useMemo(() => buildTree(filtered), [filtered, buildTree]);

  // ✅ فتح/إغلاق النموذج - مع منطق Checkbox التصنيف الرئيسي
  const openModal = useCallback((cat = null) => {
    if (cat && !canUpdate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بتعديل التصنيفات" : "❌ Forbidden");
      return;
    }
    if (!cat && !canCreate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بإضافة تصنيفات" : "❌ Forbidden");
      return;
    }

    if (cat) {
      setEditingId(cat.id);
      setFormData({ 
        ...cat, 
        parent_id: cat.parent_id,
        is_parent: cat.parent_id === null,  // ✅ إذا لم يكن له أب = رئيسي
        image: cat.image || ""
      });
    } else {
      setEditingId(null);
      setFormData({ 
        id: "", 
        name_ar: "", 
        name_en: "", 
        parent_id: null, 
        is_parent: true,  // ✅ الافتراضي: تصنيف رئيسي
        image: ""
      });
    }
    setShowModal(true);
  }, [canCreate, canUpdate, lang]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setFormData({ id: "", name_ar: "", name_en: "", parent_id: null, is_parent: true, image: "" });
  }, []);

  // ✅ معالجة تغيير Checkbox التصنيف الرئيسي
  const handleIsParentChange = useCallback((e) => {
    const isParent = e.target.checked;
    setFormData(prev => ({
      ...prev,
      is_parent: isParent,
      parent_id: isParent ? null : prev.parent_id  // ✅ إذا أصبح رئيسي، نلغي الأب
    }));
  }, []);

  // ✅ حفظ التصنيف - مع منطق Checkbox
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingId && !canUpdate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بتحديث التصنيفات" : "❌ Forbidden");
      return;
    }
    if (!editingId && !canCreate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بإضافة تصنيفات" : "❌ Forbidden");
      return;
    }

    // ✅ التحقق من الحقول الأساسية
    if (!formData.id || !formData.name_ar || !formData.name_en) {
      toast.warning(
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "يرجى تعبئة: ID + الاسم بالعربي + الاسم بالإنجليزي" : "Please fill: ID + Arabic Name + English Name"}
          </span>
        </div>,
        { duration: 4000 }
      );
      return;
    }

    // ✅ التحقق من أن الـ ID رقمي وفريد
    const idNum = Number(formData.id);
    if (isNaN(idNum) || idNum <= 0) {
      toast.error(lang === "ar" ? "❌ الـ ID يجب أن يكون رقماً موجباً" : "❌ ID must be a positive number");
      return;
    }

    // ✅ التحقق من عدم تكرار الـ ID
    const exists = categories.find(c => c.id === idNum && c.id !== editingId);
    if (exists) {
      toast.error(lang === "ar" ? "❌ تصنيف بهذا الـ ID موجود مسبقاً" : "❌ Category with this ID already exists");
      return;
    }

    setSubmitting(true);
    try {
      // ✅ بناء الـ Payload النهائي
      const payload = { 
        id: idNum, 
        name_ar: formData.name_ar.trim(), 
        name_en: formData.name_en.trim(), 
        parent_id: formData.is_parent ? null : (formData.parent_id ? Number(formData.parent_id) : null),
        image: formData.image || "",  // ✅ الصورة اختيارية
        sort_order: 0  // ✅ قيمة افتراضية
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
      console.error("❌ Save Error:", err);
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <div>
            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "فشل في الحفظ" : "Save Failed"}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-mono`}>
              {err.response?.data?.message || err.message}
            </p>
          </div>
        </div>,
        { duration: 6000 }
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ حذف تصنيف - مع تحذير إذا كان يحتوي على منتجات
  const handleDelete = async (id) => {
    if (!canDelete) {
      toast.error(lang === "ar" ? "❌ غير مصرح بحذف التصنيفات" : "❌ Forbidden");
      return;
    }

    const category = categories.find(c => c.id === id);
    if (!category) return;

    // ✅ التحقق إذا كان التصنيف يحتوي على أبناء
    const hasChildren = categories.some(c => c.parent_id === id);
    
    // ✅ التحقق إذا كان التصنيف يحتوي على منتجات (من خلال البحث في المنتجات لاحقاً إذا لزم)
    // نكتفي بتحذير المستخدم

    const confirmMessage = lang === "ar" 
      ? `هل أنت متأكد من حذف "${category[`name_${lang}`]}"؟${hasChildren ? '\n\n⚠️ هذا التصنيف يحتوي على تصنيفات فرعية، سيتم حذفها أيضاً.' : ''}`
      : `Are you sure you want to delete "${category[`name_${lang}`]}"?${hasChildren ? '\n\n⚠️ This category has sub-categories, they will be deleted too.' : ''}`;

    if (!window.confirm(confirmMessage)) return;
    
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
      console.error("❌ Delete Error:", err);
      toast.error(
        <div className="flex items-center gap-2">
          <span>❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {err.response?.data?.message || (lang === "ar" ? "فشل في الحذف" : "Delete failed")}
          </span>
        </div>
      );
    }
  };

  // ✅ معالجة تغيير الحقول العادية
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ✅ مكون عرض الشجرة - مع تصميم منطقي وواضح
  const renderTree = (nodes) => (
    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-50'}`}>
      {nodes.map(node => {
        const parentName = node.parent_id 
          ? categoryMap.get(node.parent_id)?.[`name_${lang}`] 
          : null;
        const hasProducts = false; // ✅ يمكن إضافة تحقق من المنتجات لاحقاً
        
        return (
          <tr key={node.id} className={`transition-colors ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50/50'}`}>
            {/* ID */}
            <td className={`px-6 py-4 font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
              {node.id}
            </td>
            
            {/* الاسم مع الإزاحة حسب المستوى */}
            <td className={`px-6 py-4 ${isDark ? 'text-white' : 'text-gray-900'}`} style={{ paddingLeft: `${node.level * 24 + 24}px` }}>
              <div className="flex items-center gap-2">
                {/* أيقونة تشير للمستوى */}
                {node.level > 0 && (
                  <span className={`text-gray-300 select-none`} style={{ marginLeft: `${(node.level - 1) * 12}px` }}>
                    └─
                  </span>
                )}
                {/* اسم التصنيف */}
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {lang === "ar" ? node.name_ar : node.name_en}
                </span>
                {/* Badge: رئيسي / فرعي */}
                {node.parent_id === null && (
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    isDark ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-100 text-pink-700'
                  }`}>
                    {lang === "ar" ? "رئيسي" : "Main"}
                  </span>
                )}
              </div>
            </td>
            
            {/* اسم الأب (للفروع فقط) */}
            <td className={`px-6 py-4 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {parentName ? (
                <span className="truncate max-w-[150px] block" title={parentName}>
                  {parentName}
                </span>
              ) : (
                <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>—</span>
              )}
            </td>
            
            {/* الصورة */}
            <td className="px-6 py-4">
              {node.image ? (
                <img 
                  src={getImageUrl(node.image)}
                  alt={lang === "ar" ? node.name_ar : node.name_en} 
                  className="w-10 h-10 object-contain rounded-lg bg-gray-50 dark:bg-gray-700" 
                  loading="lazy"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : <span className={isDark ? 'text-gray-500' : 'text-gray-300'}>—</span>}
            </td>
            
            {/* الإجراءات */}
            <td className="px-6 py-4">
              <div className="flex gap-2">
                {canUpdate && (
                  <button 
                    onClick={() => openModal(node)} 
                    className={`px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                      isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    {lang === "ar" ? "تعديل" : "Edit"}
                  </button>
                )}
                {canDelete && (
                  <button 
                    onClick={() => handleDelete(node.id)} 
                    className={`px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                      isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {lang === "ar" ? "حذف" : "Delete"}
                  </button>
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
      
      {/* ===== Header ===== */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border transition-colors duration-300 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        <div>
          <h1 className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "إدارة التصنيفات" : "Categories Management"}
          </h1>
          <p className={`text-sm mt-1 font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {categories.filter(c => c.parent_id === null).length} {lang === "ar" ? "تصنيف رئيسي" : "main"} •{" "}
            {categories.filter(c => c.parent_id !== null).length} {lang === "ar" ? "تصنيف فرعي" : "sub"}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder={lang === "ar" ? "🔍 بحث عن تصنيف..." : "🔍 Search category..."}
            className={`flex-1 md:w-64 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/30 transition-colors ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            }`} 
          />
          {canCreate && (
            <button 
              onClick={() => openModal()} 
              className="bg-gray-900 dark:bg-gray-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-pink-600 transition-all whitespace-nowrap"
            >
              {lang === "ar" ? "+ إضافة تصنيف" : "+ Add Category"}
            </button>
          )}
        </div>
      </div>

      {/* ===== Table ===== */}
      <div className={`rounded-[2rem] border shadow-sm overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        {loading ? (
          <div className={`p-12 text-center font-bold animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {lang === "ar" ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`p-12 text-center font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {search ? (lang === "ar" ? "لا توجد نتائج مطابقة" : "No matching results") : (lang === "ar" ? "لا توجد تصنيفات" : "No categories yet")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`border-b ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                <tr>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID</th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "اسم التصنيف" : "Category Name"}
                  </th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "الأب" : "Parent"}
                  </th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "الصورة" : "Image"}
                  </th>
                  <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              {renderTree(tree)}
            </table>
          </div>
        )}
      </div>

      {/* ===== Modal: Add/Edit Category ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`rounded-[2.5rem] w-full max-w-lg shadow-2xl border transition-colors duration-300 ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-6 border-b flex justify-between items-center sticky top-0 rounded-t-[2.5rem] z-10 transition-colors ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingId 
                  ? (lang === "ar" ? "تعديل تصنيف" : "Edit Category") 
                  : (lang === "ar" ? "إضافة تصنيف" : "Add Category")}
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
            
            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* ✅ الصف الأول: ID + Checkbox التصنيف الرئيسي */}
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    ID (رقم فريد) *
                  </label>
                  <input 
                    name="id" 
                    type="number" 
                    min="1"
                    value={formData.id} 
                    onChange={handleChange} 
                    placeholder="مثال: 101" 
                    required 
                    disabled={!!editingId}  // ✅ لا يمكن تعديل الـ ID بعد الإنشاء
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-50 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`} 
                  />
                </div>
                
                {/* ✅ Checkbox: هل هذا تصنيف رئيسي؟ */}
                <div className="flex items-center gap-2 p-3 rounded-xl border transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={(e) => e.preventDefault()}>
                  <input 
                    type="checkbox" 
                    id="is_parent" 
                    checked={formData.is_parent} 
                    onChange={handleIsParentChange}
                    className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <label htmlFor="is_parent" className={`text-sm font-bold cursor-pointer select-none ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {lang === "ar" ? "تصنيف رئيسي" : "Main Category"}
                  </label>
                </div>
              </div>

              {/* ✅ Select اختيار الأب - يظهر فقط إذا لم يكن تصنيفاً رئيسياً */}
              {!formData.is_parent && (
                <div className="animate-fadeIn">
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "اختر التصنيف الأب *" : "Select Parent Category *"}
                  </label>
                  <select 
                    name="parent_id" 
                    value={formData.parent_id || ""} 
                    onChange={handleChange} 
                    required={!formData.is_parent}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="">— {lang === "ar" ? "اختر الأب" : "Select parent"} —</option>
                    {childOptions.map(p => (
                      <option 
                        key={p.id} 
                        value={p.id}
                        disabled={p.hasChildren}  // ✅ يمكن منع اختيار تصنيف له أبناء إذا لزم
                        title={p.hasChildren ? (lang === "ar" ? "هذا التصنيف يحتوي على فروع" : "This category has sub-categories") : ""}
                      >
                        {p.name} {p.hasChildren && "📁"}
                      </option>
                    ))}
                  </select>
                  {childOptions.length === 0 && !formData.is_parent && (
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      ⚠️ {lang === "ar" ? "لا توجد تصنيفات فرعية لاختيارها كأب" : "No sub-categories available to select as parent"}
                    </p>
                  )}
                </div>
              )}

              {/* ✅ الأسماء بالعربي والإنجليزي */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "الاسم بالعربي *" : "Arabic Name *"}
                  </label>
                  <input 
                    name="name_ar" 
                    value={formData.name_ar} 
                    onChange={handleChange} 
                    placeholder={lang === "ar" ? "مثال: مكياج" : "e.g., Makeup"} 
                    required 
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`} 
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "الاسم بالإنجليزي *" : "English Name *"}
                  </label>
                  <input 
                    name="name_en" 
                    value={formData.name_en} 
                    onChange={handleChange} 
                    placeholder={lang === "ar" ? "e.g., Makeup" : "مثال: مكياج"} 
                    required 
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`} 
                  />
                </div>
              </div>

              {/* ✅ ✅ ✅ مكون رفع الصور - اختياري */}
              <ImageUploader
                label={lang === "ar" ? "صورة التصنيف (اختياري)" : "Category Image (Optional)"}
                currentImage={formData.image}
                resourceType="categories"
                resourceData={{
                  name_ar: formData.name_ar,
                  name_en: formData.name_en,
                  name: formData.name_ar || formData.name_en
                }}
                onImageSelect={(path) => setFormData(prev => ({ ...prev, image: path }))}
              />

              {/* ✅ أزرار الحفظ والإلغاء */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="flex-1 bg-gray-900 dark:bg-gray-700 text-white py-3 rounded-xl font-black text-sm hover:bg-pink-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {lang === "ar" ? "جاري الحفظ..." : "Saving..."}
                    </>
                  ) : (
                    editingId ? (lang === "ar" ? "تحديث" : "Update") : (lang === "ar" ? "إضافة" : "Add")
                  )}
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

              {/* ✅ ملاحظة توضيحية */}
              <div className={`text-[10px] text-center p-3 rounded-xl ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                💡 {lang === "ar" 
                  ? "التصنيفات الرئيسية لا تحتاج لأب. الصورة اختيارية. الـ ID يجب أن يكون فريداً." 
                  : "Main categories don't need a parent. Image is optional. ID must be unique."}
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
