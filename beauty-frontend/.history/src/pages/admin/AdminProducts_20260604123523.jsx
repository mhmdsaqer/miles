// src/pages/admin/AdminProducts.jsx - النسخة مع دعم isAvailable والوضع الليلي + ميزة معاينة التحويل 🌙
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { adminApi } from "../../utils/adminAuth";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
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
  const { isDark } = useTheme();
  
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
  
  // ✅ ✅ ✅ NEW: حالة نافذة معاينة التحويل لمنتج
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteData, setPromoteData] = useState(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
  
  // بيانات النموذج الرئيسي
  const [formData, setFormData] = useState({
    id: "", sku: "", brand_id: "", category_id: "",
    name_ar: "", name_en: "", description_ar: "", description_en: "",
    image: "", price: "", has_variants: false,
    isAvailable: true
  });

  // بيانات المتغيرات (Variants)
  const [variants, setVariants] = useState([]);

  // ✅ ✅ ✅ دوال التحقق من الصلاحيات
  const canCreate = useMemo(() => hasPermission("products:create"), [hasPermission]);
  const canUpdate = useMemo(() => hasPermission("products:update"), [hasPermission]);
  const canDelete = useMemo(() => hasPermission("products:delete"), [hasPermission]);
  const canRead = useMemo(() => hasPermission("products:read"), [hasPermission]);
  
  // ✅ ✅ ✅ دالة تنظيف الـ SKU
  const cleanSKU = (sku) => {
    if (!sku) return "";
    return sku
      .toUpperCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^A-Z0-9\-_.]/g, '')
      .substring(0, 100);
  };

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
        description_en: product.description_en || "",
        isAvailable: product.isAvailable !== false
      });
      setShowVariantsSection(product.has_variants || false);
      
      if (product.has_variants) {
        try {
          const res = await adminApi.get(`/products/${product.id}`);
          const variantsData = res.data.variants || [];
          const transformed = variantsData.map(v => ({
            ...v,
            attributes: attributesToArray(v.attributes),
            _originalSku: v.sku,
            isAvailable: v.isAvailable !== false
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
        image: "", price: "", has_variants: false, sku: "",
        isAvailable: true
      });
      setVariants([]);
      setShowVariantsSection(false);
    }
    setShowModal(true);
  }, [attributesToArray, canCreate, canUpdate, lang]);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // ✅ ✅ ✅ NEW: فتح نافذة معاينة التحويل لمنتج - النسخة المُصححة
  const openPromotePreview = useCallback(async (variant) => {
    try {
      // جلب بيانات المنتج الأب
      const parentRes = await adminApi.get(`/products/${variant.product_id}`);
      const parentProduct = parentRes.data;
      
      // ✅ ✅ ✅ دالة مساعدة لعرض الـ attributes بشكل صحيح (تدعم الهيكلين)
      const formatAttributes = (attrs) => {
        if (!attrs) return "";
        if (Array.isArray(attrs)) {
          return attrs
            .filter(attr => attr?.key?.trim())
            .map(attr => `${attr.key}: ${attr.value}`)
            .join(" - ");
        }
        if (typeof attrs === "object") {
          return Object.entries(attrs)
            .filter(([k, v]) => k?.trim() && v?.toString()?.trim())
            .map(([k, v]) => `${k}: ${v}`)
            .join(" - ");
        }
        return "";
      };
      
      // توليد اسم مقترح للمتغير كمنتج جديد
      const attrs = variant.attributes || {};
      const attrStr = formatAttributes(attrs); // ✅ الإصلاح هنا!
      const suffix = attrStr ? ` (${attrStr})` : "";
      
      // ملء بيانات المعاينة بالقيم التلقائية
      setPromoteData({
        variantId: variant.id,
        // البيانات من المتغير (أولوية)
        sku: variant.sku ? String(variant.sku).toUpperCase() : "",
        price: variant.price || parentProduct.price,
        image: variant.image || parentProduct.image,
        isAvailable: variant.isAvailable !== undefined ? variant.isAvailable : true,
        // البيانات من المنتج الأب (Fallback)
        name_ar: `${parentProduct.name_ar}${suffix}`,
        name_en: `${parentProduct.name_en}${suffix}`,
        description_ar: parentProduct.description_ar || "",
        description_en: parentProduct.description_en || "",
        brand_id: String(parentProduct.brand_id || ""),
        category_id: String(parentProduct.category_id || ""),
        // للعرض فقط
        parentProductName: parentProduct[`name_${lang}`] || parentProduct.name_ar,
        variantAttrs: attrStr // ✅ الآن سيعرض بشكل صحيح!
      });
      
      setShowPromoteModal(true);
    } catch (err) {
      console.error("Failed to load variant data:", err);
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "فشل تحميل بيانات المتغير" : "Failed to load variant data"}
          </span>
        </div>,
        { duration: 4000 }
      );
    }
  }, [lang, isDark]);
  // ✅ ✅ ✅ NEW: إغلاق نافذة المعاينة
  const closePromotePreview = useCallback(() => {
    setShowPromoteModal(false);
    setPromoteData(null);
  }, []);

  // ✅ ✅ ✅ NEW: تأكيد التحويل مع البيانات المعدلة
  const handleConfirmPromote = useCallback(async () => {
    if (!promoteData) return;
    
    setPromoteLoading(true);
    
    try {
      // تحضير الـ body مع القيم المعدلة
      const payload = {
        name_ar: promoteData.name_ar?.trim() || "",
        name_en: promoteData.name_en?.trim() || "",
        description_ar: promoteData.description_ar?.trim() || "",
        description_en: promoteData.description_en?.trim() || "",
        sku: promoteData.sku?.trim() ? cleanSKU(promoteData.sku) : undefined,
        price: promoteData.price !== undefined ? Number(promoteData.price) : undefined,
        image: promoteData.image || undefined,
        brand_id: promoteData.brand_id ? Number(promoteData.brand_id) : undefined,
        category_id: promoteData.category_id ? Number(promoteData.category_id) : undefined,
        isAvailable: promoteData.isAvailable !== undefined ? promoteData.isAvailable : true
      };
      
      // إرسال الطلب للـ Backend
      const res = await adminApi.post(`/variants/${promoteData.variantId}/promote`, payload, {
        params: { lang }
      });
      
      toast.success(
        <div className="flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <div>
            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {res.data.message}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              SKU: {res.data.product?.sku} • ID: {res.data.product?.id}
            </p>
          </div>
        </div>,
        { duration: 6000 }
      );
      
      // إغلاق النافذة وتحديث البيانات
      closePromotePreview();
      fetchData();
      
      // إذا كنا في وضع التعديل، نغلقه أيضاً لضمان المزامنة
      if (showModal) {
        closeModal();
      }
      
    } catch (err) {
      console.error("Promote variant error:", err);
      const errorMsg = err.response?.data?.message || err.message || (lang === "ar" ? "فشل تحويل المتغير" : "Failed to promote variant");
      
      toast.error(
        <div className="flex items-center gap-3">
          <span className="text-xl">❌</span>
          <div>
            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "فشل في التحويل" : "Promote Failed"}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-mono`}>{errorMsg}</p>
          </div>
        </div>,
        { duration: 6000 }
      );
    } finally {
      setPromoteLoading(false);
    }
  }, [promoteData, lang, isDark, fetchData, closeModal, closePromotePreview, showModal, cleanSKU]);

  // ✅ دوال المتغيرات
  const addVariant = useCallback(() => {
    const newVariant = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sku: "", price: "", image: "", attributes: [],
      isAvailable: true
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

  // ✅ دالة حذف المتغير نهائياً من الداتابيس
  const handleDeleteVariant = useCallback(async (variantId) => {
    if (!confirm(lang === "ar" 
      ? "⚠️ هل تريد حذف هذا المتغير نهائياً؟ لا يمكن التراجع!" 
      : "⚠️ Delete this variant permanently?")) return;
      
    try {
      await adminApi.delete(`/variants/${variantId}`);
      
      toast.success(
        <div className="flex items-center gap-2">
          <span className="text-xl">🗑️</span>
          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "تم حذف المتغير" : "Variant deleted"}
          </span>
        </div>,
        { duration: 3000 }
      );
      
      closeModal();
      fetchData();
      
    } catch (err) {
      console.error("Delete variant error:", err);
      toast.error(
        <div className="flex items-center gap-2">
          <span className="text-xl">❌</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {err.response?.data?.message || (lang === "ar" ? "فشل حذف المتغير" : "Failed to delete variant")}
          </span>
        </div>,
        { duration: 4000 }
      );
    }
  }, [lang, fetchData, closeModal, isDark]);

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
      v.id === id ? { ...v, [field]: value } : v
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
          if (editingId) {
          const originalProduct = products.find(p => p.id === editingId);
          const originalSkuClean = originalProduct?.sku ? cleanSKU(originalProduct.sku) : null;
          
          if (originalSkuClean !== cleanMainSku) {
            if (skuSet.has(cleanMainSku)) {
              throw new Error(`⚠️ SKU "${cleanMainSku}" مكرر في نفس المنتج`);
            }
          }
        }
      
        skuSet.add(cleanMainSku);
      }

      const variantsPayload = variants.length > 0 
        ? variants.map((v, index) => {
            const isTemp = v.id?.startsWith?.('temp_');
            const isExisting = !isTemp && editingId;
            
            let finalSku;
            if (v.sku?.trim()) {
              finalSku = cleanSKU(v.sku);
            } else if (isExisting && v._originalSku) {
              finalSku = cleanSKU(v._originalSku);
            } else if (formData.sku?.trim()) {
              finalSku = cleanSKU(`${formData.sku.toUpperCase().trim()}-${String(index + 1).padStart(3, '0')}`);
            } else {
              finalSku = cleanSKU(`VAR-${formData.id || Date.now()}-${String(index + 1).padStart(3, '0')}`);
            }
            
            if (isExisting && v._originalSku && cleanSKU(v._originalSku) === finalSku) {
              skuSet.add(finalSku);
            } else {
              if (skuSet.has(finalSku)) {
                throw new Error(`⚠️ SKU "${finalSku}" مكرر في نفس المنتج`);
              }
              skuSet.add(finalSku);
            }
            return {
              id: isTemp ? undefined : (v.id ? Number(v.id) : undefined),
              sku: finalSku,
              price: Number(v.price) || Number(formData.price),
              image: v.image || formData.image,
              attributes: attributesToObject(v.attributes),
              isAvailable: v.isAvailable !== false
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
        variants: variantsPayload,
        isAvailable: formData.isAvailable !== false
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

  // ✅ حالة عدم وجود صلاحية القراءة
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
                    {["ID", "name", "brand", "price", "status", "variants", "actions"].map(k => (
                      <th key={k} className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] ${lang === "ar" ? "text-right" : "text-left"} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t(k) || (k === 'status' ? (lang === "ar" ? "الحالة" : "Status") : k)}</th>
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
                      {/* ✅ NEW: عمود الحالة */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${p.isAvailable !== false ? 'bg-green-500' : 'bg-red-500'} ${p.isAvailable !== false ? 'animate-pulse' : ''}`}></div>
                          <span className={`text-[10px] font-bold ${p.isAvailable !== false ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                            {p.isAvailable !== false ? (lang === "ar" ? "متاح" : "Available") : (lang === "ar" ? "غير متاح" : "Out of Stock")}
                          </span>
                        </div>
                      </td>
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
            } ${p.isAvailable === false ? 'opacity-75 grayscale-[0.2]' : ''}`}>
              <div className={`aspect-square rounded-xl mb-3 overflow-hidden flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <img 
                  src={p.image ? `${API_URL}/${p.image.replace(/^assets\//i, "")}` : ""} 
                  alt="" 
                  className="max-h-full object-contain p-4 group-hover:scale-105 transition" 
                  onError={e => e.target.style.display='none'} 
                />
              </div>
              <div className={lang === "ar" ? "text-right" : "text-left"}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold uppercase text-pink-500 dark:text-pink-400">{p.brand_name}</p>
                  {/* ✅ NEW: مؤشر الحالة */}
                  <div className={`w-2 h-2 rounded-full ${p.isAvailable !== false ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
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
                  
                  {/* ✅ NEW: Checkbox التوفر للمنتج الرئيسي */}
                  <div 
                    className="flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" 
                    onClick={() => setFormData(prev => ({ ...prev, isAvailable: !prev.isAvailable }))}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isAvailable !== false}
                      onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label className={`text-sm font-bold cursor-pointer select-none ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      {formData.isAvailable !== false 
                        ? (lang === "ar" ? "✅ المنتج متاح للبيع" : "✅ Available for sale") 
                        : (lang === "ar" ? "❌ المنتج غير متاح (نفذت الكمية)" : "❌ Out of Stock")}
                    </label>
                  </div>
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
                    
                    {variants.map((variant, index) => {
                      const isSavedVariant = !String(variant.id).startsWith('temp_');
                      
                      return (
                        <div key={variant.id} className={`relative rounded-xl p-4 border space-y-3 transition-colors ${
                          isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
                        } ${variant.isAvailable === false ? 'opacity-70 grayscale-[0.2]' : ''}`}>
                          
                          {/* ✅ ✅ ✅ السطر الأول: العنوان + أزرار الإجراءات (للمتغيرات المحفوظة فقط) */}
                          {isSavedVariant && (
                            <div className={`flex items-center justify-between pb-3 border-b ${
                              isDark ? 'border-gray-600' : 'border-gray-100'
                            }`}>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                                {t("variant")} #{index + 1}
                              </span>
                              
                              <div className="flex items-center gap-2">
                                {/* ✅ ✅ ✅ زر التحويل لمنتج - مُحدَّث لفتح المعاينة */}
                                <button
                                  type="button"
                                  onClick={() => openPromotePreview(variant)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 ${
                                    isDark 
                                      ? "bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/50 border border-indigo-700" 
                                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                                  }`}
                                  title={lang === "ar" ? "معاينة وتحويل هذا المتغير إلى منتج مستقل" : "Preview and promote this variant to standalone product"}
                                >
                                  <span>👁️</span> {lang === "ar" ? "معاينة + تحويل" : "Preview + Promote"}
                                </button>

                                {/* ✅ زر الحذف النهائي - للمحفوظ فقط */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVariant(variant.id)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 ${
                                    isDark 
                                      ? "bg-red-900/40 text-red-300 hover:bg-red-800/50 border border-red-700" 
                                      : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                                  }`}
                                  title={lang === "ar" ? "حذف هذا المتغير نهائياً من قاعدة البيانات" : "Delete this variant permanently from database"}
                                >
                                  <span>🗑️</span> {lang === "ar" ? "حذف نهائي" : "Delete"}
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* ✅ ✅ ✅ السطر الثاني: Checkbox التوفر + زر الإزالة (للمؤقت فقط) */}
                          <div className="flex items-center justify-between">
                            {/* عنوان المتغير - يظهر فقط للمؤقت */}
                            {!isSavedVariant && (
                              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                                {t("variant")} #{index + 1}
                              </span>
                            )}
                            
                            {/* مكان فارغ للمحفوظ (العنوان في الأعلى) */}
                            {isSavedVariant && <div></div>}
                            
                            <div className="flex items-center gap-3">
                              {/* ✅ Checkbox التوفر للمتغير */}
                              <label 
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                  variant.isAvailable !== false 
                                    ? (isDark ? 'bg-green-900/20 border-green-700 hover:bg-green-900/30' : 'bg-green-50 border-green-200 hover:bg-green-100')
                                    : (isDark ? 'bg-red-900/20 border-red-700 hover:bg-red-900/30' : 'bg-red-50 border-red-200 hover:bg-red-100')
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={variant.isAvailable !== false}
                                  onChange={(e) => updateVariant(variant.id, "isAvailable", e.target.checked)}
                                  className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className={`text-[10px] font-bold ${
                                  variant.isAvailable !== false 
                                    ? (isDark ? 'text-green-400' : 'text-green-700') 
                                    : (isDark ? 'text-red-400' : 'text-red-700')
                                }`}>
                                  {variant.isAvailable !== false 
                                    ? (lang === "ar" ? "✅ متاح" : "✅ Available") 
                                    : (lang === "ar" ? "❌ غير متاح" : "❌ Out of Stock")}
                                </span>
                              </label>

                              {/* ✅ زر الإزالة - للمؤقت فقط (يزيل من القائمة قبل الحفظ) */}
                              {!isSavedVariant && (
                                <button 
                                  type="button" 
                                  onClick={() => removeVariant(variant.id)} 
                                  className={`text-xs font-bold transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'}`}
                                  title={lang === "ar" ? "إزالة هذا المتغير من القائمة" : "Remove this variant from list"}
                                >
                                  {t("remove")}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* باقي الحقول (SKU, Price, Image) */}
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
                                  sku: (() => {
                                    if (variant.sku?.trim()) {
                                      return variant.sku.trim().toUpperCase();
                                    }
                                    if (formData.sku?.trim()) {
                                      return `${formData.sku.trim().toUpperCase()}-${String(index + 1).padStart(3, '0')}`;
                                    }
                                    return `VAR-${formData.id || Date.now()}-${String(index + 1).padStart(3, '0')}`;
                                  })(),
                                  name_en: formData.name_en,
                                  name_ar: formData.name_ar,
                                  isVariant: true
                                }}
                                label={null} 
                              />
                            </div>
                          </div>
                          
                          {/* قسم الخصائص */}
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
                                isDark={isDark}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
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

      {/* ✅ ✅ ✅ NEW: نافذة معاينة التحويل لمنتج (Promote Preview Modal) */}
      {showPromoteModal && promoteData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className={`rounded-[2.5rem] w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl border transition-colors duration-300 ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            {/* Modal Header */}
            <div className={`p-6 border-b flex justify-between items-center sticky top-0 rounded-t-[2.5rem] z-10 transition-colors ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  isDark ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  📦
                </div>
                <div>
                  <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {lang === "ar" ? "معاينة قبل التحويل" : "Preview Before Promoting"}
                  </h2>
                  <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                    {lang === "ar" ? "راجع وعدّل البيانات قبل إنشاء المنتج الجديد" : "Review and edit data before creating the new product"}
                  </p>
                </div>
              </div>
              <button 
                onClick={closePromotePreview}
                disabled={promoteLoading}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                } ${promoteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body - Form */}
            <div className="p-6 space-y-5">
              {/* معلومات المصدر */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                  {lang === "ar" ? "المصدر" : "Source"}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {promoteData.parentProductName}
                  </span>
                  <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>
                  <span className={`font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {promoteData.variantAttrs || (lang === "ar" ? "بدون خصائص" : "No attributes")}
                  </span>
                </div>
              </div>
              
              {/* الحقول القابلة للتعديل */}
              <div className="space-y-4">
                {/* الأسماء */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {lang === "ar" ? "الاسم بالعربي *" : "Arabic Name *"}
                    </label>
                    <input
                      type="text"
                      value={promoteData.name_ar || ""}
                      onChange={(e) => setPromoteData(prev => prev ? { ...prev, name_ar: e.target.value } : null)}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                      }`}
                      placeholder={lang === "ar" ? "اسم المنتج الجديد" : "New product name"}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {lang === "ar" ? "الاسم بالإنجليزي *" : "English Name *"}
                    </label>
                    <input
                      type="text"
                      value={promoteData.name_en || ""}
                      onChange={(e) => setPromoteData(prev => prev ? { ...prev, name_en: e.target.value } : null)}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                      }`}
                      placeholder="New product name"
                    />
                  </div>
                </div>
                
                {/* SKU والسعر */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      SKU {lang === "ar" ? "(اختياري)" : "(Optional)"}
                    </label>
                    <input
                      type="text"
                      value={promoteData.sku || ""}
                      onChange={(e) => setPromoteData(prev => prev ? { ...prev, sku: e.target.value.toUpperCase() } : null)}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm uppercase transition-colors ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                      }`}
                      placeholder="PRODUCT-SKU"
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t("price")} *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={promoteData.price || ""}
                      onChange={(e) => setPromoteData(prev => prev ? { ...prev, price: e.target.value } : null)}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-colors ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-pink-500/30' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-pink-500/30'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                {/* الوصف */}
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "الوصف بالعربي" : "Description (Arabic)"}
                  </label>
                  <textarea
                    value={promoteData.description_ar || ""}
                    onChange={(e) => setPromoteData(prev => prev ? { ...prev, description_ar: e.target.value } : null)}
                    rows="2"
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm resize-none transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder={lang === "ar" ? "وصف المنتج الجديد..." : "New product description..."}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === "ar" ? "الوصف بالإنجليزي" : "Description (English)"}
                  </label>
                  <textarea
                    value={promoteData.description_en || ""}
                    onChange={(e) => setPromoteData(prev => prev ? { ...prev, description_en: e.target.value } : null)}
                    rows="2"
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm resize-none transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder="New product description..."
                  />
                </div>
                
                {/* الصورة والبراند والتصنيف */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t("productImage")}
                    </label>
                    <ImageUploader
                      currentImage={promoteData.image}
                      onImageSelect={(path) => setPromoteData(prev => prev ? { ...prev, image: path } : null)}
                      resourceType="products"
                      resourceData={{ 
                        brand_id: promoteData.brand_id,
                        sku: promoteData.sku,
                        name_en: promoteData.name_en,
                        name_ar: promoteData.name_ar,
                        isVariant: false
                      }}
                      label={null}
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {lang === "ar" ? "التوفر" : "Availability"}
                      </label>
                      <div 
                        className="flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" 
                        onClick={() => setPromoteData(prev => prev ? { ...prev, isAvailable: !prev.isAvailable } : null)}
                      >
                        <input
                          type="checkbox"
                          checked={promoteData.isAvailable !== false}
                          onChange={(e) => setPromoteData(prev => prev ? { ...prev, isAvailable: e.target.checked } : null)}
                          className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <label className={`text-sm font-bold cursor-pointer select-none ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          {promoteData.isAvailable !== false 
                            ? (lang === "ar" ? "✅ متاح للبيع" : "✅ Available") 
                            : (lang === "ar" ? "❌ غير متاح" : "❌ Out of Stock")}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* ملاحظة تحذيرية */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-amber-900/20 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <p className="text-sm">
                    {lang === "ar" 
                      ? "بعد التأكيد، سيتم إنشاء منتج جديد بهذا المتغير، وسيتم حذف المتغير الأصلي من المنتج الأب." 
                      : "After confirmation, a new product will be created with this variant, and the original variant will be removed from the parent product."}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Modal Footer - Action Buttons */}
            <div className={`p-6 border-t flex gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <button
                type="button"
                onClick={handleConfirmPromote}
                disabled={promoteLoading || !promoteData?.name_ar?.trim() || !promoteData?.name_en?.trim() || !promoteData?.price}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  promoteLoading || !promoteData?.name_ar?.trim() || !promoteData?.name_en?.trim() || !promoteData?.price
                    ? (isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                    : (isDark ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700')
                }`}
              >
                {promoteLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {lang === "ar" ? "جاري التحويل..." : "Promoting..."}
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    {lang === "ar" ? "تأكيد التحويل" : "Confirm & Promote"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={closePromotePreview}
                disabled={promoteLoading}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                  isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${promoteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
