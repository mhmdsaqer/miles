// src/pages/admin/AdminProducts.jsx - النسخة مع دعم الوضع الليلي 🌙
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { adminApi } from "../../utils/adminAuth";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext"; // ✅ إضافة جديدة
import { toast } from "sonner";
import ImageUploader from "../../components/ImageUploader";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

// ✅ مكون حقل خاصية المتغير - مع دعم الوضع الليلي
const VariantAttributeField = ({ attribute, onUpdate, onRemove, lang, isDark }) => (
  <div className="flex items-center gap-2" dir={lang === "ar" ? "rtl" : "ltr"}>
    <input
      type="text"
      value={attribute.key}
      onChange={(e) => onUpdate(attribute.tempId, "key", e.target.value)}
      placeholder={lang === "ar" ? "المفتاح" : "Key"}
      className={`flex-1 border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-pink-500/30 outline-none transition-colors ${
        isDark 
          ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
      }`}
    />
    <span className={isDark ? 'text-gray-400' : 'text-gray-400'}>:</span>
    <input
      type="text"
      value={attribute.value}
      onChange={(e) => onUpdate(attribute.tempId, "value", e.target.value)}
      placeholder={lang === "ar" ? "القيمة" : "Value"}
      className={`flex-1 border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-pink-500/30 outline-none transition-colors ${
        isDark 
          ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
      }`}
    />
    <button
      type="button"
      onClick={() => onRemove(attribute.tempId)}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
        isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-500 hover:bg-red-100'
      }`}
      title={lang === "ar" ? "حذف" : "Remove"}
    >
      ✕
    </button>
  </div>
);

const AdminProducts = () => {
  const { lang, t } = useLang();
  const { user, hasPermission } = useAuth();
  const { isDark } = useTheme(); // ✅ إضافة جديدة
  
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ فلاتر جديدة
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterHasVariants, setFilterHasVariants] = useState("all");
  const [viewMode, setViewMode] = useState("table");

  // حالة النموذج (Modal)
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showVariantsSection, setShowVariantsSection] = useState(false);
  
  // بيانات النموذج الرئيسي
  const [formData, setFormData] = useState({
    id: "", sku: "", brand_id: "", category_id: "",
    name_ar: "", name_en: "", description_ar: "", description_en: "",
    image: "", price: "", has_variants: false
  });

  // بيانات المتغيرات (Variants)
  const [variants, setVariants] = useState([]);

  // ✅ ✅ ✅ دوال التحقق من الصلاحيات
  const canCreate = useMemo(() => hasPermission("products:create"), [hasPermission]);
  const canUpdate = useMemo(() => hasPermission("products:update"), [hasPermission]);
  const canDelete = useMemo(() => hasPermission("products:delete"), [hasPermission]);
  const canRead = useMemo(() => hasPermission("products:read"), [hasPermission]);
  
  // ✅ ✅ ✅ دالة تنظيف الـ SKU - نفس الدالة في الـ Backend
  const cleanSKU = useCallback((sku) => {
    if (!sku) return "";
    return sku
      .toUpperCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9\-]/g, '');
  }, []);

  // ✅ دوال التحويل بين الهيكلين
  const attributesToArray = useCallback((attributes) => {
    if (!attributes) return [];
    return Object.entries(attributes).map(([key, value]) => ({
      tempId: crypto.randomUUID?.() || `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key, value
    }));
  }, []);

  const attributesToObject = useCallback((attributesArray) => {
    if (!attributesArray) return {};
    if (Array.isArray(attributesArray)) {
      return attributesArray.reduce((acc, attr) => {
        if (attr?.key?.trim()) acc[attr.key] = attr.value ?? "";
        return acc;
      }, {});
    }
    return attributesArray;
  }, []);

  // ✅ دالة جلب البيانات
  const fetchData = useCallback(async () => {
    if (!canRead) {
      toast.error(lang === "ar" ? "❌ غير مصرح بعرض المنتجات" : "❌ Forbidden - No read permission");
      return;
    }

    setLoading(true);
    try {
      const [prodRes, brandsRes, catsRes] = await Promise.all([
        adminApi.get("/products", { params: { limit: 500 } }),
        axios.get(`${API_URL}/brands`),
        axios.get(`${API_URL}/categories`)
      ]);
      const productsData = prodRes.data.products || prodRes.data;
      setProducts(productsData);
      setBrands(brandsRes.data);
      setCategories(catsRes.data);
    } catch (err) {
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <div>
            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t("error")}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{err.message}</p>
          </div>
        </div>,
        { duration: 4000 }
      );
    } finally {
      setLoading(false);
    }
  }, [t, canRead, lang, isDark]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ✅ فلترة متقدمة
  const filteredProducts = useMemo(() => {
    let res = products;
    
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(p => 
        p.name_ar?.toLowerCase().includes(q) || 
        p.name_en?.toLowerCase().includes(q) ||
        p.brand_name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    }
    
    if (filterBrand) {
      res = res.filter(p => String(p.brand_id) === filterBrand);
    }
    
    if (filterCategory) {
      res = res.filter(p => String(p.category_id) === filterCategory);
    }
    
    if (filterHasVariants !== "all") {
      res = res.filter(p => p.has_variants === (filterHasVariants === "true"));
    }
    
    return res;
  }, [products, search, filterBrand, filterCategory, filterHasVariants]);

  // ✅ فتح/إغلاق النموذج
  const openModal = useCallback(async (product = null) => {
    if (product && !canUpdate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بتعديل المنتجات" : "❌ Forbidden - No update permission");
      return;
    }
    
    if (!product && !canCreate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بإضافة منتجات" : "❌ Forbidden - No create permission");
      return;
    }

    if (product) {
      setEditingId(product.id);
      setFormData({
        ...product,
        brand_id: String(product.brand_id || ""),
        category_id: String(product.category_id || ""),
        sku: product.sku ? String(product.sku).toUpperCase() : "",
        description_ar: product.description_ar || "",
        description_en: product.description_en || ""
      });
      setShowVariantsSection(product.has_variants || false);
      
      if (product.has_variants) {
        try {
          const res = await adminApi.get(`/products/${product.id}`);
          const variantsData = res.data.variants || [];
          const transformed = variantsData.map(v => ({
            ...v,
            attributes: attributesToArray(v.attributes)
          }));
          setVariants(transformed);
        } catch (err) {
          console.warn("Failed to load variants:", err);
          setVariants([]);
        }
      } else {
        setVariants([]);
      }
    } else {
      setEditingId(null);
      setFormData({
        id: "", brand_id: "", category_id: "",
        name_ar: "", name_en: "", description_ar: "", description_en: "",
        image: "", price: "", has_variants: false, sku: ""
      });
      setVariants([]);
      setShowVariantsSection(false);
    }
    setShowModal(true);
  }, [attributesToArray, canCreate, canUpdate, lang]);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // ✅ دوال المتغيرات
  const addVariant = useCallback(() => {
    const newVariant = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sku: "", price: "", image: "", attributes: []
    };
    setVariants(prev => [...prev, newVariant]);
    toast.success(
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>✨</div>
        <div>
          <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "تم إضافة متغير جديد" : "New variant added"}</p>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{lang === "ar" ? "أضف التفاصيل واحفظ المنتج" : "Add details and save product"}</p>
        </div>
      </div>,
      { duration: 3000 }
    );
  }, [lang, isDark]);

  const removeVariant = useCallback((id) => {
    setVariants(prev => prev.filter(v => v.id !== id));
    toast.info(
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>🗑️</div>
        <div>
          <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "تم حذف المتغير" : "Variant deleted"}</p>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{lang === "ar" ? "يمكنك التراجع قبل الحفظ" : "Undo before saving"}</p>
        </div>
      </div>,
      { duration: 4000 }
    );
  }, [lang, isDark]);

  const updateVariant = useCallback((id, field, value) => {
    setVariants(prev => prev.map(v => 
      v.id === id ? { ...v, [field]: value || "" } : v
    ));
  }, []);

  const addVariantAttribute = useCallback((variantId) => {
    const newAttribute = {
      tempId: crypto.randomUUID?.() || `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key: "", value: ""
    };
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, attributes: [...v.attributes, newAttribute] } : v
    ));
  }, []);

  const updateVariantAttribute = useCallback((tempId, field, value) => {
    setVariants(prev => prev.map(v => ({
      ...v,
      attributes: v.attributes.map(attr => 
        attr.tempId === tempId ? { ...attr, [field]: value } : attr
      )
    })));
  }, []);

  const removeVariantAttribute = useCallback((tempId) => {
    setVariants(prev => prev.map(v => ({
      ...v,
      attributes: v.attributes.filter(attr => attr.tempId !== tempId)
    })));
  }, []);

  // ✅ دالة حفظ المنتج
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingId && !canUpdate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بتحديث المنتجات" : "❌ Forbidden - No update permission");
      return;
    }
    if (!editingId && !canCreate) {
      toast.error(lang === "ar" ? "❌ غير مصرح بإضافة منتجات" : "❌ Forbidden - No create permission");
      return;
    }
    
    if (!formData.id || !formData.name_ar || !formData.name_en || !formData.price) {
      toast.warning(
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "يرجى تعبئة الحقول الأساسية" : "Please fill required fields"}</span>
        </div>,
        { duration: 3500 }
      );
      return;
    }

    try {
      const cleanMainSku = cleanSKU(formData.sku);
      const skuSet = new Set();
      
      if (cleanMainSku) {
        skuSet.add(cleanMainSku);
      }

      const variantsPayload = variants.length > 0 
        ? variants.map((v, index) => {
            const isTemp = v.id?.startsWith?.('temp_');
            const generatedSku = cleanMainSku
              ? `${cleanMainSku}-${String(index + 1).padStart(3, '0')}`
              : `SKU-${formData.id}-${String(index + 1).padStart(3, '0')}`;
            
            const finalSku = cleanSKU(generatedSku);
            
            if (skuSet.has(finalSku)) {
              throw new Error(`⚠️ SKU "${finalSku}" مكرر في نفس المنتج`);
            }
            skuSet.add(finalSku);
            
            return {
              id: isTemp ? undefined : (v.id ? Number(v.id) : undefined),
              sku: finalSku,
              price: Number(v.price) || Number(formData.price),
              image: v.image || formData.image,
              attributes: attributesToObject(v.attributes)
            };
          })
        : undefined;

      const productPayload = {
        id: Number(formData.id),
        brand_id: Number(formData.brand_id),
        category_id: Number(formData.category_id),
        name_ar: formData.name_ar,
        name_en: formData.name_en,
        description_ar: formData.description_ar || "",
        description_en: formData.description_en || "",
        image: formData.image,
        price: Number(formData.price),
        sku: cleanMainSku,
        has_variants: variants.length > 0,
        variants: variantsPayload
      };

      if (editingId) {
        await adminApi.put(`/products/${editingId}`, productPayload);
        toast.success(
          <div className="flex items-center gap-3 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1">
              <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>✅ {lang === "ar" ? "تم تحديث المنتج!" : "Product Updated!"}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{formData.name_ar} • ₪{formData.price}</p>
            </div>
          </div>,
          { duration: 5000 }
        );
      } else {
        await adminApi.post("/products", productPayload);
        toast.success(
          <div className="flex items-center gap-3 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1">
              <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>✅ {lang === "ar" ? "تمت إضافة المنتج!" : "Product Added!"}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{formData.name_ar} • ₪{formData.price}</p>
            </div>
          </div>,
          { duration: 5000 }
        );
      }
      
      closeModal();
      fetchData();
      
    } catch (err) {
      console.error("❌ Save Error:", err);
      
      const errorMsg = err.response?.data?.message || err.message || (lang === "ar" ? "فشل في الحفظ" : "Save failed");
      
      if (errorMsg.toLowerCase().includes('sku') || errorMsg.toLowerCase().includes('duplicate') || errorMsg.toLowerCase().includes('مكرر')) {
        toast.error(
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "الـ SKU مكرر، يرجى تغييره" : "Duplicate SKU, please change it"}</span>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(
          <div className="flex items-center gap-3">
            <span className="text-xl">❌</span>
            <div>
              <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "فشل في الحفظ" : "Save Failed"}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-mono`}>{errorMsg}</p>
            </div>
          </div>,
          { duration: 6000 }
        );
      }
    }
  };

  // ✅ حذف منتج
  const handleDelete = async (id) => {
    if (!canDelete) {
      toast.error(lang === "ar" ? "❌ غير مصرح بحذف المنتجات" : "❌ Forbidden - No delete permission");
      return;
    }
    
    const product = products.find(p => p.id === id);
    if (!window.confirm(lang === "ar" ? `هل أنت متأكد من حذف "${product?.name_ar || product?.name_en}"؟` : `Are you sure you want to delete "${product?.name_en || product?.name_ar}"?`)) return;
    
    try {
      await adminApi.delete(`/products/${id}`);
      toast.success(
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>🗑️</div>
          <div>
            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "تم الحذف بنجاح" : "Deleted Successfully"}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{product?.name_ar || product?.name_en}</p>
          </div>
        </div>,
        { duration: 4000 }
      );
      fetchData();
    } catch (err) {
      toast.error(lang === "ar" ? "فشل في الحذف" : "Delete failed");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // ✅ دالة بناء خيارات التصنيف
  const buildCategoryOptions = useCallback((cats, parentId = null, level = 0) => {
    let opts = [];
    const children = cats.filter(c => c.parent_id === parentId);
    
    children.forEach(cat => {
      const prefix = "─ ".repeat(level);
      const displayName = lang === "ar" ? cat.name_ar : cat.name_en;
      
      const hasChildren = cats.some(c => c.parent_id === cat.id);
      
      opts.push({ 
        id: String(cat.id), 
        label: `${prefix}${displayName}`,
        level,
        hasChildren,
        disabled: hasChildren,
        tooltip: hasChildren 
          ? (lang === "ar" ? "هذا تصنيف رئيسي، اختر فرعاً منه" : "This is a parent category, please select a sub-category")
          : ""
      });
      
      opts.push(...buildCategoryOptions(cats, cat.id, level + 1));
    });
    
    return opts;
  }, [lang]);

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories, buildCategoryOptions]);

  // ✅ الحصول على منتجات مقترحة
  const getSuggestedProducts = useCallback((currentProduct) => {
    if (!currentProduct) return [];
    return products.filter(p => 
      p.id !== currentProduct.id && 
      (p.brand_id === currentProduct.brand_id || p.category_id === currentProduct.category_id)
    ).slice(0, 4);
  }, [products]);

  // ✅ حالة عدم وجود صلاحية القراءة - مع دعم الوضع الليلي
  if (!canRead) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] text-center ${isDark ? 'bg-gray-900' : 'bg-white'}`} dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "وصول مرفوض" : "Access Denied"}
          </h2>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {lang === "ar" ? "لا تملك صلاحية عرض المنتجات" : "You don't have permission to view products"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-colors duration-300 ${isDark ? 'dark bg-gray-900' : ''}`} dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* ✅ Header & Filters */}
      <div className={`p-4 rounded-2xl border transition-colors duration-300 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>

        <div className={lang === "ar" ? "text-right" : "text-left"}>
          <h1 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>{t("products")}</h1>
          <p className={`text-xs mt-1 font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {lang === "ar" ? "إجمالي" : "Total"}:{" "}
            <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{products.length}</span>{" "}
            {lang === "ar" ? "منتج" : "products"}
            
            {(search || filterBrand || filterCategory || filterHasVariants !== "all") && (
              <>
                {" "}|{" "}
                <span className="text-pink-500 dark:text-pink-400">
                  {lang === "ar" ? "النتائج" : "Results"}:{" "}
                  <span className={`font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{filteredProducts.length}</span>
                </span>
                  <button 
                  onClick={() => {
                    setSearch("");
                    setFilterBrand("");
                    setFilterCategory("");
                    setFilterHasVariants("all");
                  }}
                  className={`text-[10px] font-bold hover:underline mr-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {lang === "ar" ? "مسح الفلاتر" : "Clear filters"}
                </button>
              </>
            )}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* بحث */}
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={`flex-1 lg:w-56 border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500/30 outline-none transition-colors ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
            }`}
          />
          
          {/* فلتر البراند */}
          <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm w-36 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100' 
              : 'bg-gray-50 border-gray-200 text-gray-900'
          }`}>
            <option value="">{t("allBrands")}</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          
          {/* فلتر التصنيف */}
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm w-40 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100' 
              : 'bg-gray-50 border-gray-200 text-gray-900'
          }`}>
            <option value="">{t("allCategories")}</option>
            {categoryOptions.map(o => (
              <option 
                key={o.id} 
                value={o.id}
                disabled={o.disabled}
                title={o.tooltip}
                style={{ 
                  fontWeight: o.hasChildren ? 'bold' : 'normal',
                  color: o.disabled ? '#ec4899' : (isDark ? 'inherit' : 'inherit'),
                  paddingLeft: `${o.level * 20}px`
                }}
              >
                {o.label}{o.disabled ? (lang === "ar" ? " 🔒" : " 🔒") : ""}
              </option>
            ))}
          </select>
          
          {/* فلتر المتغيرات */}
          <select value={filterHasVariants} onChange={e => setFilterHasVariants(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm w-32 transition-colors ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-100' 
              : 'bg-gray-50 border-gray-200 text-gray-900'
          }`}>
            <option value="all">{t("allVariants")}</option>
            <option value="true">{t("withVariants")}</option>
            <option value="false">{t("withoutVariants")}</option>
          </select>
          
          {/* تبديل العرض */}
          <div className={`flex rounded-xl p-1 transition-colors ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              viewMode === "table" 
                ? (isDark ? 'bg-gray-600 text-white' : 'bg-white shadow-sm text-gray-900') 
                : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
            }`}>☰</button>
            <button onClick={() => setViewMode("grid")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              viewMode === "grid" 
                ? (isDark ? 'bg-gray-600 text-white' : 'bg-white shadow-sm text-gray-900') 
                : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
            }`}>▦</button>
          </div>
          
          {/* ✅ زر الإضافة */}
          {canCreate && (
            <button onClick={() => openModal()} className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-pink-600 transition">+ {t("add")}</button>
          )}
        </div>
      </div>

      {/* ✅ Table View */}
      {viewMode === "table" && (
        <div className={`rounded-2xl border overflow-hidden transition-colors duration-300 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}>
          {loading ? (
            <div className={`p-12 text-center font-bold animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{lang === "ar" ? "جاري التحميل..." : "Loading..."}</div>
          ) : filteredProducts.length === 0 ? (
            <div className={`p-12 text-center font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{t("noResults")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`border-b ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                  <tr>
                    {["ID", "name", "brand", "price", "variants", "actions"].map(k => (
                      <th key={k} className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] ${lang === "ar" ? "text-right" : "text-left"} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t(k)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-50'}`}>
                  {filteredProducts.map(p => (
                    <tr key={p.id} className={`transition-colors ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50/50'}`}>
                      <td className={`px-6 py-4 font-mono ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{p.id}</td>
                      <td className={`px-6 py-4 font-bold truncate max-w-[250px] ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? p.name_ar : p.name_en}</td>
                      <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>{p.brand_name}</td>
                      <td className={`px-6 py-4 font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>₪{p.price}</td>
                      <td className="px-6 py-4">
                        {p.has_variants ? (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${isDark ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-50 text-pink-700'}`}>🔀 {t("multiple")}</span>
                        ) : (<span className={isDark ? 'text-gray-500' : 'text-gray-300'}>—</span>)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {canUpdate && (
                            <button onClick={() => openModal(p)} className={`px-3 py-1.5 rounded-lg font-bold transition text-xs ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>{t("edit")}</button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(p.id)} className={`px-3 py-1.5 rounded-lg font-bold transition text-xs ${isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>{t("delete")}</button>
                          )}
                          {!canUpdate && !canDelete && (
                            <span className={`text-[10px] italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t("readOnly")}</span>
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
      )}

      {/* ✅ Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(p => (
            <div key={p.id} className={`p-4 rounded-2xl border hover:shadow-md transition group ${
              isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'
            }`}>
              <div className={`aspect-square rounded-xl mb-3 overflow-hidden flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <img 
                  src={p.image ? `${API_URL}/${p.image.replace(/^assets\//i, "")}` : ""} 
                  alt="" 
                  className="max-h-full object-contain p-4 group-hover:scale-105 transition" 
                  onError={e => e.target.style.display='none'} 
                />
              </div>
              <div className={lang === "ar" ? "text-right" : "text-left"}>
                <p className="text-[10px] font-bold uppercase text-pink-500 dark:text-pink-400">{p.brand_name}</p>
                <h3 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? p.name_ar : p.name_en}</h3>
                <div className="flex justify-between items-center mt-2">
                  <span className={`font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>₪{p.price}</span>
                  {canUpdate && (
                    <button onClick={() => openModal(p)} className="text-xs text-blue-500 dark:text-blue-400 hover:underline">{t("edit")}</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 && !loading && <div className={`text-center py-12 font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{t("noResults")}</div>}

      {/* ✅ Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border transition-colors duration-300 ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            <div className={`p-6 border-b flex justify-between items-center sticky top-0 rounded-t-[2.5rem] z-10 transition-colors ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{editingId ? t("editProduct") : t("addProduct")}</h2>
              <button onClick={closeModal} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* القسم الأساسي */}
              <div className="space-y-4">
                <h3 className={`text-sm font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <span className="w-1.5 h-5 bg-pink-500 rounded-full"></span>
                  {t("basicInfo")}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="id" type="number" value={formData.id} onChange={handleChange} placeholder="ID" required className={`border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                  }`} />
                  <input name="sku" type="text" value={formData.sku || ""} onChange={handleChange} placeholder="SKU (رمز المنتج الفريد)" required className={`border rounded-xl px-4 py-2.5 text-sm uppercase transition-colors ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                  }`} />
                  <input name="price" type="number" step="0.5" value={formData.price} onChange={handleChange} placeholder={t("price")} required className={`border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                  }`} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select name="brand_id" value={formData.brand_id} onChange={handleChange} required className={`border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}>
                    <option value="">{t("selectBrand")}</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  
                  {/* ✅ Select التصنيفات */}
                  <div className="relative">
                    <select 
                      name="category_id" 
                      value={formData.category_id} 
                      onChange={handleChange} 
                      required 
                      className={`border rounded-xl px-4 py-2.5 text-sm w-full pr-10 transition-colors ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="">{t("selectCategory")}</option>
                      {categoryOptions.map(opt => (
                        <option 
                          key={opt.id} 
                          value={opt.id}
                          disabled={opt.disabled}
                          title={opt.tooltip}
                          style={{ 
                            fontWeight: opt.hasChildren ? 'bold' : 'normal',
                            color: opt.disabled ? '#ec4899' : 'inherit',
                            paddingLeft: `${opt.level * 20}px`
                          }}
                        >
                          {opt.label}{opt.disabled ? (lang === "ar" ? " 🔒" : " 🔒") : ""}
                        </option>
                      ))}
                    </select>
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`} title={lang === "ar" ? "التصنيفات الوردية لا يمكن اختيارها - اختر فرعاً منها" : "Pink categories cannot be selected - choose a sub-category"}>
                      ℹ️
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    name="name_ar" 
                    value={formData.name_ar} 
                    onChange={handleChange} 
                    placeholder="الاسم بالعربي *" 
                    required 
                    className={`col-span-2 border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`} 
                  />
                  <input 
                    name="name_en" 
                    value={formData.name_en} 
                    onChange={handleChange} 
                    placeholder="English Name *" 
                    required 
                    className={`col-span-2 border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`} 
                  />
                </div>
                
                <textarea name="description_ar" value={formData.description_ar} onChange={handleChange} placeholder="الوصف بالعربي" rows="2" className={`w-full border rounded-xl px-4 py-2.5 text-sm resize-none transition-colors ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`} />
                <textarea 
                  name="description_en" 
                  value={formData.description_en} 
                  onChange={handleChange} 
                  placeholder="Description in English" 
                  rows="2" 
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm resize-none transition-colors ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                  }`} 
                />
                
                <ImageUploader
                  label={t("productImage")}
                  currentImage={formData.image}
                  resourceType="products"
                  resourceData={{ 
                    brand_id: formData.brand_id,
                    sku: formData.sku,
                    name_en: formData.name_en,
                    name_ar: formData.name_ar
                  }}
                  onImageSelect={(path) => setFormData(prev => ({ ...prev, image: path }))}
                />
              </div>

              {/* قسم المتغيرات */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowVariantsSection(!showVariantsSection)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    showVariantsSection 
                      ? (isDark ? 'border-pink-500 bg-pink-900/20' : 'border-pink-500 bg-pink-50/50') 
                      : (isDark ? 'border-gray-600 bg-gray-700 hover:border-gray-500' : 'border-gray-100 bg-gray-50 hover:border-gray-200')
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔀</span>
                    <div className="text-right">
                      <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{t("manageVariants")}</p>
                      <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                        {variants.length > 0 ? `${variants.length} ${lang === "ar" ? "متغير مُعد" : "variant(s) configured"}` : (lang === "ar" ? "اضغط لإضافة أحجام، ألوان، إلخ..." : "Click to add sizes, colors, etc...")}
                      </p>
                    </div>
                  </div>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-transform ${
                    isDark ? 'bg-gray-600' : 'bg-gray-200'
                  } ${showVariantsSection ? "rotate-180" : ""}`}>▼</span>
                </button>
                
                {showVariantsSection && (
                  <div className={`space-y-4 p-4 rounded-xl border transition-colors ${
                    isDark ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <button type="button" onClick={addVariant} className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      isDark 
                        ? 'border-gray-600 text-gray-400 hover:border-pink-500 hover:text-pink-400 hover:bg-pink-900/20' 
                        : 'border-gray-300 text-gray-500 hover:border-pink-500 hover:text-pink-600 hover:bg-pink-50/50'
                    }`}>
                      <span>➕</span> {t("addVariant")}
                    </button>
                    
                    {variants.map((variant, index) => (
                      <div key={variant.id} className={`rounded-xl p-4 border space-y-3 transition-colors ${
                        isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{t("variant")} #{index + 1}</span>
                          <button type="button" onClick={() => removeVariant(variant.id)} className={`text-xs font-bold transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'}`}>{t("remove")}</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input 
                            type="text" 
                            value={variant.sku || ""} 
                            onChange={(e) => updateVariant(variant.id, "sku", e.target.value)} 
                            placeholder="SKU (اختياري)" 
                            className={`border rounded-lg px-3 py-2 text-xs transition-colors ${
                              isDark 
                                ? 'bg-gray-600 border-gray-500 text-gray-100 placeholder-gray-400' 
                                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                            }`} 
                          />
                          <input 
                            type="number" step="0.5" 
                            value={variant.price || ""} 
                            onChange={(e) => updateVariant(variant.id, "price", e.target.value)} 
                            placeholder={t("price")} 
                            className={`border rounded-lg px-3 py-2 text-xs transition-colors ${
                              isDark 
                                ? 'bg-gray-600 border-gray-500 text-gray-100 placeholder-gray-400' 
                                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                            }`} 
                          />
                          <div className="col-span-3">
                            <ImageUploader 
                              currentImage={variant.image} 
                              onImageSelect={(p) => updateVariant(variant.id, "image", p)} 
                              resourceType="products"
                              resourceData={{ 
                                brand_id: formData.brand_id,
                                sku: variant.sku?.trim() 
			      ? variant.sku 
			      : (formData.sku?.trim() ? `${formData.sku.trim()}-VAR-${variant.id}` : `VAR-${variant.id}`),
                                name_en: formData.name_en,
                                name_ar: formData.name_ar,
                                isVariant: true  // ✅ ✅ ✅ إضافة حقل للإشارة أن هذا متغير
                              }}
                              label={null} 
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{t("attributes")}</span>
                            <button type="button" onClick={() => addVariantAttribute(variant.id)} className={`text-[10px] font-bold hover:underline ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>+ {t("add")}</button>
                          </div>
                          {variant.attributes.map((attr) => (
                            <VariantAttributeField 
                              key={attr.tempId} 
                              attribute={attr} 
                              onUpdate={updateVariantAttribute} 
                              onRemove={removeVariantAttribute} 
                              lang={lang}
                              isDark={isDark} // ✅ تمرير isDark للمكون الفرعي
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* ✅ منتجات مقترحة */}
              {editingId && products.find(p => p.id === editingId) && (
                <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <h4 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t("relatedProducts")}</h4>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {getSuggestedProducts(products.find(p => p.id === editingId)).map(sp => (
                      <div key={sp.id} className={`min-w-[120px] p-3 rounded-xl border transition-colors ${
                        isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <img src={`${API_URL}/${sp.image?.replace(/^assets\//i, "")}`} alt="" className="w-16 h-16 mx-auto object-contain mb-2" onError={e => e.target.style.display='none'} />
                        <p className={`text-[10px] font-bold truncate text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? sp.name_ar : sp.name_en}</p>
                        <p className="text-[10px] text-pink-500 dark:text-pink-400 text-center font-black">₪{sp.price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* أزرار الحفظ والإلغاء */}
              <div className={`flex gap-3 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <button type="submit" className="flex-1 bg-gray-900 dark:bg-gray-700 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition flex items-center justify-center gap-2">
                  {editingId ? t("update") : t("add")}
                  {variants.length > 0 && <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px]">{variants.length} 🔀</span>}
                </button>
                <button type="button" onClick={closeModal} className={`flex-1 py-3 rounded-xl font-bold transition ${
                  isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>{t("cancel")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
