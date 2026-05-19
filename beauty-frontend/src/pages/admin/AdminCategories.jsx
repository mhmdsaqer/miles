// src/pages/admin/AdminCategories.jsx - النسخة الشجرية التفاعلية ✅
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
  
  // ✅ حالة التصنيفات المفتوحة للعرض الشجري
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  
  // ✅ بيانات النموذج
  const [formData, setFormData] = useState({
    id: "",
    name_ar: "",
    name_en: "",
    parent_id: null,
    is_parent: true,      // ✅ Checkbox: تصنيف رئيسي
    image: "",            // ✅ اختياري
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
      // ✅ افتح كل التصنيفات الرئيسية عند التحميل
      const mainCats = res.data.filter(c => c.parent_id === null).map(c => c.id);
      setExpandedCategories(new Set(mainCats));
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

  // ✅ التصنيفات الرئيسية فقط
  const mainCategories = useMemo(() => 
    categories.filter(c => c.parent_id === null),
  [categories]);

  // ✅ التصنيفات الفرعية (للاختيار كأب)
  const childOptions = useMemo(() => 
    categories
      .filter(c => c.parent_id !== null)
      .filter(c => c.id !== editingId)
      .map(c => ({ 
        id: c.id, 
        name: c[`name_${lang}`],
        hasChildren: categories.some(cc => cc.parent_id === c.id)
      }))
  , [categories, lang, editingId]);

  // ✅ فلترة البحث
  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(c => 
      c.name_ar?.toLowerCase().includes(q) || 
      c.name_en?.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  }, [categories, search]);

  // ✅ دالة فتح/إغلاق تصنيف في العرض الشجري
  const toggleExpand = useCallback((catId) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  }, []);

  // ✅ دالة جلب أبناء تصنيف معين (مباشرة فقط)
  const getChildren = useCallback((parentId) => {
    return categories.filter(c => c.parent_id === parentId);
  }, [categories]);

  // ✅ فتح/إغلاق النموذج
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
        is_parent: cat.parent_id === null,
        image: cat.image || ""
      });
    } else {
      setEditingId(null);
      setFormData({ 
        id: "", 
        name_ar: "", 
        name_en: "", 
        parent_id: null, 
        is_parent: true,
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
      parent_id: isParent ? null : prev.parent_id
    }));
  }, []);

  // ✅ حفظ التصنيف
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

    const idNum = Number(formData.id);
    if (isNaN(idNum) || idNum <= 0) {
      toast.error(lang === "ar" ? "❌ الـ ID يجب أن يكون رقماً موجباً" : "❌ ID must be a positive number");
      return;
    }

    const exists = categories.find(c => c.id === idNum && c.id !== editingId);
    if (exists) {
      toast.error(lang === "ar" ? "❌ تصنيف بهذا الـ ID موجود مسبقاً" : "❌ Category with this ID already exists");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { 
        id: idNum, 
        name_ar: formData.name_ar.trim(), 
        name_en: formData.name_en.trim(), 
        parent_id: formData.is_parent ? null : (formData.parent_id ? Number(formData.parent_id) : null),
        image: formData.image || "",
        sort_order: 0
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

  // ✅ حذف تصنيف - مع تحذير ذكي
  const handleDelete = async (id) => {
    if (!canDelete) {
      toast.error(lang === "ar" ? "❌ غير مصرح بحذف التصنيفات" : "❌ Forbidden");
      return;
    }

    const category = categories.find(c => c.id === id);
    if (!category) return;

    const hasChildren = categories.some(c => c.parent_id === id);
    
    // ✅ تحذير مخصص حسب الحالة
    let confirmMessage = lang === "ar" 
      ? `هل أنت متأكد من حذف "${category[`name_${lang}`]}"؟`
      : `Are you sure you want to delete "${category[`name_${lang}`]}"?`;
    
    if (hasChildren) {
      confirmMessage += lang === "ar"
        ? `\n\n⚠️ هذا التصنيف يحتوي على ${categories.filter(c => c.parent_id === id).length} تصنيفات فرعية.`
        : `\n\n⚠️ This category has ${categories.filter(c => c.parent_id === id).length} sub-categories.`;
    }
    
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ✅ ✅ ✅ مكون عرض شجرة التصنيفات التفاعلي
  const renderCategoryTree = (parentId = null, level = 0) => {
    const children = categories.filter(c => c.parent_id === parentId);
    
    if (children.length === 0) return null;
    
    return (
      <ul className={`space-y-1 ${level > 0 ? 'mt-1' : ''}`}>
        {children.map(cat => {
          const hasChildren = categories.some(c => c.parent_id === cat.id);
          const isExpanded = expandedCategories.has(cat.id);
          const parentName = cat.parent_id ? categoryMap.get(cat.parent_id)?.[`name_${lang}`] : null;
          
          return (
            <li key={cat.id}>
              <div 
                className={`
                  flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer group
                  ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}
                  ${level > 0 ? 'ml-4' : ''}
                `}
                style={{ borderLeft: level > 0 ? `2px solid ${isDark ? '#374151' : '#e5e7eb'}` : 'none', paddingLeft: level > 0 ? '12px' : '0' }}
              >
                {/* ✅ زر التوسيع/الطي */}
                {hasChildren ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id); }}
                    className={`
                      w-6 h-6 rounded flex items-center justify-center transition-transform
                      ${isExpanded ? 'rotate-90' : ''}
                      ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}
                    `}
                    title={isExpanded ? (lang === "ar" ? "طي" : "Collapse") : (lang === "ar" ? "توسيع" : "Expand")}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <span className="w-6" /> // مساحة فارغة للمحاذاة
                )}
                
                {/* ✅ أيقونة التصنيف */}
                <span className={`text-lg flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {cat.image ? (
                    <img 
                      src={getImageUrl(cat.image)} 
                      alt="" 
                      className="w-5 h-5 object-contain rounded"
                      onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = '📁'; }}
                    />
                  ) : '📁'}
                </span>
                
                {/* ✅ اسم التصنيف */}
                <div className="flex-1 min-w-0">
                  <span className={`font-bold truncate block ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {lang === "ar" ? cat.name_ar : cat.name_en}
                  </span>
                  {parentName && level === 0 && (
                    <span className={`text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {lang === "ar" ? "رئيسي" : "Main"}
                    </span>
                  )}
                </div>
                
                {/* ✅ عدد الأبناء */}
                {hasChildren && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {getChildren(cat.id).length}
                  </span>
                )}
                
                {/* ✅ أزرار الإجراءات - تظهر عند التحويم */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canUpdate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openModal(cat); }}
                      className={`p-1.5 rounded-lg transition ${
                        isDark ? 'hover:bg-blue-900/30 text-blue-400' : 'hover:bg-blue-50 text-blue-600'
                      }`}
                      title={lang === "ar" ? "تعديل" : "Edit"}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                      className={`p-1.5 rounded-lg transition ${
                        isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'
                      }`}
                      title={lang === "ar" ? "حذف" : "Delete"}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* ✅ عرض الأبناء إذا كان التصنيف مفتوحاً */}
              {hasChildren && isExpanded && (
                <div className="ml-8 mt-1">
                  {renderCategoryTree(cat.id, level + 1)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

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
            {mainCategories.length} {lang === "ar" ? "تصنيف رئيسي" : "main"} •{" "}
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

      {/* ===== شجرة التصنيفات التفاعلية ===== */}
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
          <div className="p-4">
            {/* ✅ عرض التصنيفات الرئيسية */}
            {mainCategories.length > 0 ? (
              <div className="space-y-2">
                {mainCategories
                  .filter(c => !search || c.name_ar?.toLowerCase().includes(search.toLowerCase()) || c.name_en?.toLowerCase().includes(search.toLowerCase()))
                  .map(cat => {
                    const children = getChildren(cat.id).filter(c => 
                      !search || c.name_ar?.toLowerCase().includes(search.toLowerCase()) || c.name_en?.toLowerCase().includes(search.toLowerCase())
                    );
                    const isExpanded = expandedCategories.has(cat.id);
                    
                    return (
                      <div key={cat.id} className={`rounded-xl border overflow-hidden transition-colors ${
                        isDark ? 'border-gray-700' : 'border-gray-100'
                      }`}>
                        {/* ✅ رأس التصنيف الرئيسي */}
                        <div 
                          className={`
                            flex items-center gap-3 p-4 cursor-pointer transition-colors
                            ${isDark ? 'bg-gray-750 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}
                          `}
                          onClick={() => toggleExpand(cat.id)}
                        >
                          {/* زر التوسيع */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id); }}
                            className={`
                              w-7 h-7 rounded-lg flex items-center justify-center transition-transform
                              ${isExpanded ? 'rotate-90' : ''}
                              ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}
                            `}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          
                          {/* صورة + اسم */}
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isDark ? 'bg-gray-600' : 'bg-white'
                            }`}>
                              {cat.image ? (
                                <img 
                                  src={getImageUrl(cat.image)} 
                                  alt="" 
                                  className="w-8 h-8 object-contain"
                                  onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = '📁'; }}
                                />
                              ) : '📁'}
                            </div>
                            <div>
                              <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {lang === "ar" ? cat.name_ar : cat.name_en}
                              </span>
                              <span className={`block text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {children.length} {lang === "ar" ? "تصنيف فرعي" : "sub-categories"}
                              </span>
                            </div>
                          </div>
                          
                          {/* أزرار الإجراءات */}
                          <div className="flex items-center gap-2">
                            {canUpdate && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openModal(cat); }}
                                className={`p-2 rounded-lg transition ${
                                  isDark ? 'hover:bg-blue-900/30 text-blue-400' : 'hover:bg-blue-50 text-blue-600'
                                }`}
                                title={lang === "ar" ? "تعديل" : "Edit"}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                                className={`p-2 rounded-lg transition ${
                                  isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'
                                }`}
                                title={lang === "ar" ? "حذف" : "Delete"}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* ✅ قائمة الأبناء - تظهر عند التوسيع */}
                        {isExpanded && children.length > 0 && (
                          <div className={`p-4 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
                            <div className="space-y-2">
                              {children.map(child => (
                                <div 
                                  key={child.id}
                                  className={`
                                    flex items-center gap-3 p-3 rounded-lg transition-colors
                                    ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}
                                  `}
                                >
                                  <span className="w-6" /> {/* مساحة للمحاذاة */}
                                  
                                  {/* صورة + اسم الابن */}
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                                      isDark ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}>
                                      {child.image ? (
                                        <img 
                                          src={getImageUrl(child.image)} 
                                          alt="" 
                                          className="w-6 h-6 object-contain"
                                          onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                      ) : '📄'}
                                    </div>
                                    <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                      {lang === "ar" ? child.name_ar : child.name_en}
                                    </span>
                                  </div>
                                  
                                  {/* أزرار إجراءات الابن */}
                                  <div className="flex items-center gap-1">
                                    {canUpdate && (
                                      <button
                                        onClick={() => openModal(child)}
                                        className={`p-1.5 rounded transition ${
                                          isDark ? 'hover:bg-blue-900/30 text-blue-400' : 'hover:bg-blue-50 text-blue-600'
                                        }`}
                                        title={lang === "ar" ? "تعديل" : "Edit"}
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        onClick={() => handleDelete(child.id)}
                                        className={`p-1.5 rounded transition ${
                                          isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'
                                        }`}
                                        title={lang === "ar" ? "حذف" : "Delete"}
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {lang === "ar" ? "لا توجد تصنيفات رئيسية" : "No main categories"}
              </div>
            )}
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
              
              {/* ID + Checkbox التصنيف الرئيسي */}
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
                    disabled={!!editingId}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-50 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`} 
                  />
                </div>
                
                {/* Checkbox: تصنيف رئيسي */}
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

              {/* Select اختيار الأب */}
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
                        disabled={p.hasChildren}
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

              {/* الأسماء بالعربي والإنجليزي */}
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

              {/* مكون رفع الصور - اختياري */}
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

              {/* أزرار الحفظ والإلغاء */}
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

              {/* ملاحظة توضيحية */}
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
