// src/pages/Shop.jsx - النسخة المُصلحة نهائياً مع Drawer للجوال 📱💻
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import { useLang } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { toast } from "sonner";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";
const ITEMS_PER_PAGE = 20;

// ✅ Hook مخصص للتحقق من حجم الشاشة (يتحدث تلقائياً)
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    const listener = (e) => setMatches(e.matches);
    
    // ✅ استخدام addEventListener الحديث مع fallback
    if (media.addEventListener) {
      media.addEventListener("change", listener);
    } else {
      media.addListener(listener);
    }
    
    // ✅ مزامنة أولية
    setMatches(media.matches);
    
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
};

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, t } = useLang();
  const { isDark } = useTheme();

  // ✅ التحقق من حجم الشاشة
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // --- States ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState(() => ({
    parent: searchParams.get("parent") ? Number(searchParams.get("parent")) : null,
    child: searchParams.get("child") ? Number(searchParams.get("child")) : null,
    grandchild: searchParams.get("grandchild") ? Number(searchParams.get("grandchild")) : null,
    brand: searchParams.get("brand") || "",
    search: searchParams.get("search") || "",
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : 0,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : 300,
    view: searchParams.get("view") || "grid"
  }));

  // ✅ مزامنة الفلاتر مع URL
  useEffect(() => {
    const params = {};
    if (filters.parent !== null) params.parent = filters.parent;
    if (filters.child !== null) params.child = filters.child;
    if (filters.grandchild !== null) params.grandchild = filters.grandchild;
    if (filters.brand) params.brand = filters.brand;
    if (filters.search) params.search = filters.search;
    if (filters.minPrice > 0) params.minPrice = filters.minPrice;
    if (filters.maxPrice < 300) params.maxPrice = filters.maxPrice;
    if (filters.view !== "grid") params.view = filters.view;
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // ✅ منع التمرير عند فتح الفلاتر على الجوال
  useEffect(() => {
    if (showFilters && !isDesktop) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [showFilters, isDesktop]);

  // ✅ إغلاق الفلاتر عند الانتقال للديسكتوب
  useEffect(() => {
    if (isDesktop) {
      setShowFilters(false);
    }
  }, [isDesktop]);

  // ✅ جلب المنتجات
  const fetchProducts = useCallback(async (page, reset = false) => {
    try {
      setError(null);
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }

      const finalCatId = filters.grandchild || filters.child || filters.parent;
      const queryParams = {
        page,
        limit: ITEMS_PER_PAGE,
        ...(finalCatId && { category: finalCatId }),
        ...(filters.brand && { brand: filters.brand }),
        ...(filters.search && { search: filters.search }),
        ...(filters.minPrice > 0 && { min: filters.minPrice }),
        ...(filters.maxPrice < 300 && { max: filters.maxPrice })
      };

      const res = await axios.get(`${API_URL}/products`, { params: queryParams });
      
      let productsData = [];
      let paginationData = { currentPage: 1, totalPages: 1, totalProducts: 0, hasNextPage: false };
      
      if (Array.isArray(res.data)) {
        productsData = res.data;
        paginationData.totalProducts = res.data.length;
        paginationData.totalPages = Math.ceil(res.data.length / ITEMS_PER_PAGE);
      } else if (res.data?.products) {
        productsData = res.data.products;
        paginationData = res.data.pagination || paginationData;
      }
      
      if (reset) {
        setProducts(productsData);
        setTotalProducts(paginationData.totalProducts);
      } else {
        setProducts(prev => [...prev, ...productsData]);
      }
      setHasNextPage(paginationData.hasNextPage);
      setCurrentPage(paginationData.currentPage + 1);
      
    } catch (err) {
      setError(err.response?.status === 404 
        ? "السيرفر غير متصل - تأكد من تشغيل backend" 
        : "فشل تحميل المنتجات، حاول مرة أخرى");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  // ✅ جلب البيانات الثابتة
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [catsRes, brndsRes] = await Promise.all([
          axios.get(`${API_URL}/categories`),
          axios.get(`${API_URL}/brands`)
        ]);
        setCategories(catsRes.data);
        setBrands(brndsRes.data);
      } catch (err) {
        console.error("❌ Meta fetch error:", err);
      }
    };
    fetchMeta();
  }, []);

  // ✅ جلب المنتجات عند تغيير الفلتر
  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(1, true), 300);
    return () => clearTimeout(timer);
  }, [filters, fetchProducts]);

  // ✅ Helper Functions
  const getCategoryName = (cat) => cat?.[lang === "ar" ? "name_ar" : "name_en"] || "";
  const mainCats = useMemo(() => categories.filter(c => c.parent_id === null), [categories]);
  const childCats = useMemo(() => categories.filter(c => c.parent_id === filters.parent), [categories, filters.parent]);
  const grandChildCats = useMemo(() => categories.filter(c => c.parent_id === filters.child), [categories, filters.child]);

  const activeFilters = useMemo(() => {
    const list = [];
    if (filters.grandchild) {
      const cat = categories.find(c => c.id === filters.grandchild);
      if (cat) list.push({ type: "grandchild", label: getCategoryName(cat) });
    } else if (filters.child) {
      const cat = categories.find(c => c.id === filters.child);
      if (cat) list.push({ type: "child", label: getCategoryName(cat) });
    } else if (filters.parent) {
      const cat = categories.find(c => c.id === filters.parent);
      if (cat) list.push({ type: "parent", label: getCategoryName(cat) });
    }
    if (filters.brand) {
      const brand = brands.find(b => b.id === Number(filters.brand));
      if (brand) list.push({ type: "brand", label: brand.name });
    }
    if (filters.search) list.push({ type: "search", label: `"${filters.search}"` });
    if (filters.minPrice > 0 || filters.maxPrice < 300) {
      list.push({ type: "price", label: `₪${filters.minPrice} - ₪${filters.maxPrice}` });
    }
    return list;
  }, [filters, categories, brands, lang]);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilter = useCallback((type) => {
    if (["parent", "child", "grandchild"].includes(type)) {
      setFilters(prev => ({ ...prev, parent: null, child: null, grandchild: null }));
    } else if (type === "brand") {
      setFilters(prev => ({ ...prev, brand: "" }));
    } else if (type === "search") {
      setFilters(prev => ({ ...prev, search: "" }));
    } else if (type === "price") {
      setFilters(prev => ({ ...prev, minPrice: 0, maxPrice: 300 }));
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({ parent: null, child: null, grandchild: null, brand: "", search: "", minPrice: 0, maxPrice: 300, view: "grid" });
    toast.info(<span className="font-medium">{t("filtersCleared")} • {lang === "ar" ? "عرض جميع المنتجات" : "Viewing all products"}</span>, { duration: 2500 });
  }, [t, lang]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasNextPage) {
      fetchProducts(currentPage, false);
    }
  }, [loadingMore, hasNextPage, currentPage, fetchProducts]);

  // ✅ مكون محتوى الفلاتر (قابل لإعادة الاستخدام في الديسكتوب والجوال)
  const FiltersContent = () => (
    <>
      {/* Categories Tree */}
      <div className={`rounded-[2rem] p-6 border shadow-sm transition-colors ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-50'
      }`}>
        <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t("categories")}
        </h3>
        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
          {mainCats.length === 0 ? (
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {lang === "ar" ? "لا توجد تصنيفات" : "No categories"}
            </p>
          ) : (
            mainCats.map(cat => (
              <div key={cat.id} className="space-y-1">
                <button
                  onClick={() => updateFilter("parent", cat.id)}
                  className={`w-full ${lang === "ar" ? "text-right" : "text-left"} px-4 py-3 rounded-xl text-[13px] font-bold transition-all flex justify-between items-center group
                  ${filters.parent === cat.id 
                    ? (isDark ? "bg-pink-600 text-white" : "bg-gray-900 text-white") 
                    : `${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}`}
                >
                  {getCategoryName(cat)}
                  <span className={`w-2 h-2 rounded-full ${filters.parent === cat.id ? "bg-pink-500" : (isDark ? "bg-gray-600" : "bg-gray-200")}`} />
                </button>
                {filters.parent === cat.id && childCats.length > 0 && (
                  <div className={`${lang === "ar" ? "mr-4" : "ml-4"} space-y-1 py-1`}>
                    {childCats.map(child => (
                      <div key={child.id}>
                        <button
                          onClick={() => updateFilter("child", child.id)}
                          className={`w-full ${lang === "ar" ? "text-right" : "text-left"} py-2 px-2 text-xs font-semibold rounded-lg transition-all
                          ${filters.child === child.id 
                            ? (isDark ? "text-pink-400 bg-pink-900/30 font-bold" : "text-pink-600 bg-pink-50 font-bold") 
                            : `${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}`}
                        >
                          {getCategoryName(child)}
                        </button>
                        {filters.child === child.id && grandChildCats.length > 0 && (
                          <div className={`${lang === "ar" ? "mr-3" : "ml-3"} space-y-1 mt-1`}>
                            {grandChildCats.map(grand => (
                              <button
                                key={grand.id}
                                onClick={() => updateFilter("grandchild", grand.id)}
                                className={`w-full ${lang === "ar" ? "text-right" : "text-left"} py-1 px-2 text-[10px] rounded transition-all
                                ${filters.grandchild === grand.id 
                                  ? (isDark ? "text-white font-bold bg-gray-700" : "text-gray-900 font-bold bg-gray-100") 
                                  : `${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-300 hover:text-gray-500'}`}`}
                              >
                                {getCategoryName(grand)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Price Range */}
      <div className={`rounded-[2rem] p-6 border shadow-sm transition-colors ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-50'
      }`}>
        <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t("priceRange")}
        </h3>
        <div className="space-y-4">
          <div className={`flex justify-between text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
            <span>₪{filters.minPrice}</span>
            <span>₪{filters.maxPrice}</span>
          </div>
          <input
            type="range" 
            min="0" 
            max="300" 
            value={filters.maxPrice}
            onChange={(e) => updateFilter("maxPrice", Number(e.target.value))}
            className="w-full accent-pink-500"
          />
        </div>
      </div>
    </>
  );

  // ===== Error State =====
  if (error) {
    return (
      <div className={`min-h-screen pt-32 px-6 flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-[#fcfcfc]'}`} dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>⚠️ {error}</h2>
          <button 
            onClick={() => { setError(null); fetchProducts(1, true); }}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-gray-700 text-white hover:bg-pink-600' : 'bg-gray-900 text-white hover:bg-pink-600'}`}
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  // ===== Loading Skeleton =====
  if (loading && products.length === 0) {
    return (
      <div className={`min-h-screen pt-32 px-6 lg:px-12 ${isDark ? 'bg-gray-900' : 'bg-[#fcfcfc]'}`} dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="max-w-[1600px] mx-auto">
          <div className={`h-16 w-64 rounded-2xl animate-pulse mb-8 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="w-full lg:w-64 space-y-4">
              {[...Array(6)].map((_, i) => <div key={i} className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />)}
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <div key={i} className={`aspect-[4/5] rounded-[2.5rem] animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== Main Content =====
  return (
    <div className={`min-h-screen pt-32 ${isDark ? 'bg-gray-900' : 'bg-[#fcfcfc]'}`} dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        {/* ✅ SEO */}
        <SEO
          title={activeFilters.find(f => ["parent", "child", "grandchild"].includes(f.type))?.label || t("shop")}
          description={lang === "ar"
            ? "تصفحي مجموعتنا الواسعة من منتجات العناية والجمال من أرقى الماركات العالمية. فلترة سهلة، أسعار منافسة، وشحن سريع."
            : "Browse our wide collection of beauty and care products from top global brands. Easy filtering, competitive prices, and fast shipping."}
          image="/assets/hero/og-shop.jpg"
          url="/shop"
          type="collection"
        />
        
        {/* ===== Header ===== */}
        <div className={`mb-8 pb-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className={`space-y-3 ${lang === "ar" ? "text-right" : "text-left"}`}>
              <nav className="flex items-center gap-2 text-[10px] font-bold text-pink-500 uppercase tracking-[0.2em]">
                <span>{t("shop")}</span>
                {activeFilters.find(f => ["parent", "child", "grandchild"].includes(f.type)) && (
                  <>
                    <span className={isDark ? 'text-gray-600' : 'text-gray-200'}>/</span>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-900'}>{activeFilters.find(f => ["parent", "child", "grandchild"].includes(f.type))?.label}</span>
                  </>
                )}
              </nav>
              <h1 className={`text-4xl md:text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {activeFilters.find(f => ["parent", "child", "grandchild"].includes(f.type))?.label || t("shop")}
              </h1>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                {totalProducts} {totalProducts === 1 ? t("item") : t("items")}
              </p>
            </div>

            {/* ✅ زر الفلترة للجوال */}
            <button
              onClick={() => setShowFilters(true)}
              className={`md:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' 
                  : 'bg-white border-gray-200 text-gray-900 hover:border-pink-300 hover:text-pink-600'
              }`}
              aria-label={t("filter")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              {t("filter")}
              {activeFilters.length > 0 && (
                <span className="bg-pink-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>

          {/* Search & Brand Filter */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <input
                type="text"
                placeholder={lang === "ar" ? "ابحث عن منتج، SKU، أو متغير..." : "Search product, SKU, or variant..."}
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className={`w-full border rounded-2xl pl-12 pr-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/20 transition-colors ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-100 text-gray-900 placeholder-gray-300'
                }`}
              />
              <svg className={`absolute ${lang === "ar" ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="relative min-w-[180px]">
              <select 
                value={filters.brand} 
                onChange={(e) => updateFilter("brand", e.target.value)}
                className={`appearance-none border rounded-2xl px-4 py-3.5 text-[11px] font-bold w-full outline-none focus:ring-2 focus:ring-pink-500/20 transition-colors ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-100 text-gray-900'
                }`}
              >
                <option value="">{t("brands")}</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeFilters.map((f, i) => (
                <span key={i} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold ${
                  isDark ? 'bg-pink-900/30 text-pink-300' : 'bg-pink-50 text-pink-700'
                }`}>
                  {f.label}
                  <button onClick={() => clearFilter(f.type)} className={`rounded-full w-4 h-4 flex items-center justify-center transition ${isDark ? 'hover:bg-pink-800' : 'hover:bg-pink-200'}`}>✕</button>
                </span>
              ))}
              <button onClick={clearAllFilters} className={`text-xs underline ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>{t("clearAll")}</button>
            </div>
          )}
        </div>

        {/* ===== Quick Hierarchical Filter (Chips) ===== */}
        {filters.parent && (
          <div className={`mb-8 p-5 rounded-[2rem] border shadow-sm transition-colors ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-pink-400' : 'text-pink-500'}`}>
                {lang === "ar" ? "🗂️ تصفح الأقسام الفرعية:" : "🗂️ Browse Sub-categories:"}
              </span>
              <div className={`flex-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}></div>
            </div>
            
            {/* ✅ Scrollbar أفقي للتصنيفات الفرعية */}
            <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
              <button
                onClick={() => {
                  updateFilter("child", null);
                  updateFilter("grandchild", null);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                  !filters.child
                    ? (isDark ? "bg-gray-100 text-gray-900 border-gray-100 shadow-md" : "bg-gray-900 text-white border-gray-900 shadow-md")
                    : `${isDark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`
                }`}
              >
                {lang === "ar" ? "الكل" : "All"}
              </button>
              
              {childCats.map(child => (
                <button
                  key={child.id}
                  onClick={() => {
                    updateFilter("child", child.id);
                    updateFilter("grandchild", null);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 whitespace-nowrap ${
                    filters.child === child.id
                      ? "bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-500/20"
                      : `${isDark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-pink-500/50' : 'bg-white border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600'}`
                  }`}
                >
                  {getCategoryName(child)}
                  {filters.child === child.id && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
              ))}
            </div>

            {filters.child && grandChildCats.length > 0 && (
              <div className={`mt-4 pt-4 border-t border-dashed ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                    {lang === "ar" ? "🔍 تصفح الأقسام التفصيلية:" : "🔍 Browse Detailed Sub-categories:"}
                  </span>
                  <div className={`flex-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}></div>
                </div>
                <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
                  {grandChildCats.map(grand => (
                    <button
                      key={grand.id}
                      onClick={() => updateFilter("grandchild", grand.id)}
                      className={`px-4 py-2 rounded-lg text-[11px] font-bold transition-all border whitespace-nowrap ${
                        filters.grandchild === grand.id
                          ? (isDark ? "bg-gray-100 text-gray-900 border-gray-100" : "bg-gray-900 text-white border-gray-900")
                          : `${isDark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`
                      }`}
                    >
                      {getCategoryName(grand)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-16">
          {/* ===== Sidebar Filters - للديسكتوب فقط ===== */}
          <aside className="hidden lg:block w-full lg:w-72 shrink-0">
            <div className="sticky top-36 space-y-8">
              <FiltersContent />
            </div>
          </aside>

          {/* ===== Products Grid ===== */}
          <main className="flex-1 pb-20">
            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 animate-fadeIn">
                {products.map((product) => (
                  <div key={product.id} className="animate-fadeIn">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              !loading && (
                <div className="h-[50vh] flex flex-col items-center justify-center text-center">
                  <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t("noResults")}</h2>
                  <button onClick={clearAllFilters} className="text-pink-600 font-bold hover:underline">{t("clearAll")}</button>
                </div>
              )
            )}

            {/* Load More Button */}
            {hasNextPage && (
              <div className="mt-16 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className={`inline-flex items-center gap-3 border px-8 py-4 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-pink-500 hover:text-pink-400' 
                      : 'bg-white border-gray-200 text-gray-700 hover:border-pink-500 hover:text-pink-600'
                  }`}
                >
                  {loadingMore ? t("loading") : t("loadMore")}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ✅ ✅ ✅ Mobile Filters Drawer - منفصل تماماً عن الـ Layout */}
      {showFilters && !isDesktop && (
        <>
          {/* Overlay - z-40 */}
          <div 
            className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm transition-opacity animate-fadeIn"
            onClick={() => setShowFilters(false)}
            aria-hidden="true"
          />
          
          {/* Drawer Panel - z-50 (فوق الـ Overlay) */}
          <div 
            className={`fixed z-[999] top-0 ${lang === "ar" ? 'right-0' : 'left-0'} h-full w-[85%] max-w-sm shadow-2xl transition-transform duration-300 ease-out animate-slideIn ${
              isDark ? 'bg-gray-900' : 'bg-[#fcfcfc]'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={t("filter")}
          >
            {/* Drawer Header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between p-5 border-b ${
              isDark ? 'bg-gray-900 border-gray-800' : 'bg-[#fcfcfc] border-gray-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-pink-900/30' : 'bg-pink-50'
                }`}>
                  <svg className={`w-5 h-5 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                  </svg>
                </div>
                <div>
                  <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t("filter")}
                  </h2>
                  <p className={`text-[10px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                    {activeFilters.length > 0 
                      ? `${activeFilters.length} ${lang === "ar" ? "فلتر نشط" : "active filter(s)"}`
                      : (lang === "ar" ? "اختر الفلاتر" : "Choose filters")
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
                aria-label={t("close")}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Content - Scrollable */}
            <div className="h-[calc(100%-80px)] overflow-y-auto p-5 space-y-5 scrollbar-hide">
              <FiltersContent />
            </div>

            {/* Drawer Footer - Apply Button */}
            <div className={`sticky bottom-0 p-4 border-t ${
              isDark ? 'bg-gray-900 border-gray-800' : 'bg-[#fcfcfc] border-gray-100'
            }`}>
              <div className="flex gap-3">
                {activeFilters.length > 0 && (
                  <button
                    onClick={() => {
                      clearAllFilters();
                      setShowFilters(false);
                    }}
                    className={`flex-1 py-3.5 rounded-xl text-xs font-bold transition-colors ${
                      isDark 
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t("clearAll")}
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 bg-pink-600 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-pink-700 transition-colors shadow-lg shadow-pink-500/20"
                >
                  {lang === "ar" ? "عرض النتائج" : "View Results"} 
                  {totalProducts > 0 && ` (${totalProducts})`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Shop;
