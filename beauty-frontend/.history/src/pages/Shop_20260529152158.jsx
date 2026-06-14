// src/pages/Shop.jsx - النسخة المُصححة مع معالجة الأخطاء
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";
const ITEMS_PER_PAGE = 20;

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, t } = useLang();

  // --- Data States ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  
  // --- Loading & Error States ---
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null); // ✅ إضافة حالة الخطأ
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  // --- Filter States ---
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

  // ✅ مزامنة الفلاتر مع الـ URL
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

  // ✅ دالة جلب المنتجات - مع معالجة أخطاء محسّنة
  const fetchProducts = useCallback(async (page, reset = false) => {
    try {
      setError(null); // ✅ مسح الخطأ السابق
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }

      const finalCatId = filters.grandchild || filters.child || filters.parent;
      const queryParams = {
        page: page,
        limit: ITEMS_PER_PAGE,
        ...(finalCatId && { category: finalCatId }),
        ...(filters.brand && { brand: filters.brand }),
        ...(filters.search && { search: filters.search }),
        ...(filters.minPrice > 0 && { min: filters.minPrice }),
        ...(filters.maxPrice < 300 && { max: filters.maxPrice })
      };

      console.log("🔍 Fetching products with params:", queryParams);
      const res = await axios.get(`${API_URL}/products`, { params: queryParams });
      console.log("✅ API Response:", res.data);
      
      // ✅ دعم هيكلين للاستجابة: مصفوفة مباشرة أو كائن مع products/pagination
      let productsData = [];
      let paginationData = { currentPage: 1, totalPages: 1, totalProducts: 0, hasNextPage: false };
      
      if (Array.isArray(res.data)) {
        productsData = res.data;
        paginationData.totalProducts = res.data.length;
        paginationData.totalPages = Math.ceil(res.data.length / ITEMS_PER_PAGE);
      } else if (res.data?.products) {
        productsData = res.data.products;
        paginationData = res.data.pagination || paginationData;
      } else {
        console.warn("⚠️ Unexpected API response structure:", res.data);
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
      console.error("❌ Fetch products error:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url
      });
      setError(err.response?.status === 404 
        ? "السيرفر غير متصل - تأكد من تشغيل backend" 
        : "فشل تحميل المنتجات، حاول مرة أخرى");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  // ✅ جلب الـ Meta Data مع معالجة الأخطاء
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [catsRes, brndsRes] = await Promise.all([
          axios.get(`${API_URL}/categories`),
          axios.get(`${API_URL}/brands`)
        ]);
        setCategories(catsRes.data);
        setBrands(brndsRes.data);
        console.log("✅ Meta data loaded:", { categories: catsRes.data.length, brands: brndsRes.data.length });
      } catch (err) {
        console.error("❌ Meta fetch error:", err);
        // ✅ لا نوقف الصفحة إذا فشل جلب الميتا
      }
    };
    fetchMeta();
  }, []);

  // ✅ جلب المنتجات عند تغيير الفلتر - مع تحسين الـ Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, fetchProducts]);

  // ✅ Helper Functions
  const getCategoryName = (cat) => cat?.[lang === "ar" ? "name_ar" : "name_en"] || "";
  const mainCats = useMemo(() => categories.filter(c => c.parent_id === null), [categories]);
  const childCats = useMemo(() => categories.filter(c => c.parent_id === filters.parent), [categories, filters.parent]);
  const grandChildCats = useMemo(() => categories.filter(c => c.parent_id === filters.child), [categories, filters.child]);

  // ✅ Active Filters Display
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
    if (type === "parent" || type === "child" || type === "grandchild") {
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

  // ===== Error State - عرض رسالة خطأ واضحة =====
  if (error) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] pt-32 px-6 flex items-center justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900">⚠️ {error}</h2>
          <button 
            onClick={() => { setError(null); fetchProducts(1, true); }}
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-pink-600 transition-all"
          >
            {t('tryAgain')}
          </button>
          <p className="text-gray-400 text-xs">
            💡 تأكد أن السيرفر يعمل على {API_URL} وأن MongoDB متصل
          </p>
        </div>
      </div>
    );
  }

  // ===== Loading Skeleton =====
  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] pt-32 px-6 lg:px-12" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="max-w-[1600px] mx-auto">
          <div className="h-16 w-64 bg-gray-100 rounded-2xl animate-pulse mb-8" />
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="w-full lg:w-64 space-y-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== Main Content =====
  return (
    <div className="min-h-screen bg-[#fcfcfc] pt-32" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        {/* ✅ SEO لصفحة المتجر */}
        <SEO
          title={activeFilters.find(f => f.type === "parent" || f.type === "child" || f.type === "grandchild")?.label || t("shop")}
          description={lang === "ar"
            ? "تصفحي مجموعتنا الواسعة من منتجات العناية والجمال من أرقى الماركات العالمية. فلترة سهلة، أسعار منافسة، وشحن سريع."
            : "Browse our wide collection of beauty and care products from top global brands. Easy filtering, competitive prices, and fast shipping."}
          image="/assets/hero/og-shop.jpg"
          url="/shop"
          type="collection"
        />
        {/* ===== Header ===== */}
        <div className="mb-8 pb-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className={`space-y-3 ${lang === "ar" ? "text-right" : "text-left"}`}>
              <nav className="flex items-center gap-2 text-[10px] font-bold text-pink-500 uppercase tracking-[0.2em]">
                <span>{t("shop")}</span>
                {activeFilters.find(f => f.type === "parent" || f.type === "child" || f.type === "grandchild") && (
                  <>
                    <span className="text-gray-200">/</span>
                    <span className="text-gray-900">{activeFilters.find(f => f.type === "parent" || f.type === "child" || f.type === "grandchild")?.label}</span>
                  </>
                )}
              </nav>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">
                {activeFilters.find(f => f.type === "parent" || f.type === "child" || f.type === "grandchild")?.label || t("shop")}
              </h1>
              <p className="text-gray-400 text-sm font-medium">
                {totalProducts} {totalProducts === 1 ? t("item") : t("items")}
              </p>
            </div>
          </div>

          {/* Search & Brand Filter */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
		<input
		  type="text"
		  placeholder={lang === "ar" ? "ابحث عن منتج، SKU، أو متغير..." : "Search product, SKU, or variant..."}
		  value={filters.search}
		  onChange={(e) => updateFilter("search", e.target.value)}
		  className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-5 py-3.5 text-sm text-gray-900 placeholder-gray-300 focus:ring-2 focus:ring-pink-500/20 outline-none"
		/>
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <div className="relative min-w-[180px]">
              <select 
                value={filters.brand} 
                onChange={(e) => updateFilter("brand", e.target.value)}
                className="appearance-none bg-white border border-gray-100 rounded-2xl pl-10 pr-4 py-3.5 text-[11px] font-bold text-gray-900 w-full"
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
                <span key={i} className="inline-flex items-center gap-2 bg-pink-50 text-pink-700 px-4 py-2 rounded-full text-[10px] font-bold">
                  {f.label}
                  <button onClick={() => clearFilter(f.type)} className="hover:bg-pink-200 rounded-full w-4 h-4 flex items-center justify-center">✕</button>
                </span>
              ))}
              <button onClick={clearAllFilters} className="text-xs text-gray-400 underline">{t("clearAll")}</button>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-16">
          {/* ===== Sidebar Filters ===== */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="sticky top-36 space-y-8">
              
              {/* Categories Tree */}
              <div className="bg-white rounded-[2rem] p-6 border border-gray-50 shadow-sm">
                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] mb-5">{t("categories")}</h3>
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {mainCats.map(cat => (
                    <div key={cat.id} className="space-y-1">
                      <button
                        onClick={() => updateFilter("parent", cat.id)}
                        className={`w-full ${lang === "ar" ? "text-right" : "text-left"} px-4 py-3 rounded-xl text-[13px] font-bold transition-all flex justify-between items-center group
                        ${filters.parent === cat.id ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                      >
                        {getCategoryName(cat)}
                        <span className={`w-2 h-2 rounded-full ${filters.parent === cat.id ? "bg-pink-500" : "bg-gray-200"}`} />
                      </button>
                      {filters.parent === cat.id && childCats.length > 0 && (
                        <div className={`${lang === "ar" ? "mr-4" : "ml-4"} space-y-1 py-1`}>
                          {childCats.map(child => (
                            <div key={child.id}>
                              <button
                                onClick={() => updateFilter("child", child.id)}
                                className={`w-full ${lang === "ar" ? "text-right" : "text-left"} py-2 px-2 text-xs font-semibold rounded-lg transition-all
                                ${filters.child === child.id ? "text-pink-600 bg-pink-50 font-bold" : "text-gray-400 hover:text-gray-700"}`}
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
                                      ${filters.grandchild === grand.id ? "text-gray-900 font-bold bg-gray-100" : "text-gray-300"}`}
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
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="bg-white rounded-[2rem] p-6 border border-gray-50 shadow-sm">
                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] mb-5">{t("priceRange")}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-bold">
                    <span>₪{filters.minPrice}</span>
                    <span>₪{filters.maxPrice}</span>
                  </div>
                  <input
                    type="range" min="0" max="300" value={filters.maxPrice}
                    onChange={(e) => updateFilter("maxPrice", Number(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </div>
              </div>
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
                  <h2 className="text-2xl font-black text-gray-900 mb-2">{t("noResults")}</h2>
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
                  className="inline-flex items-center gap-3 bg-white border border-gray-200 px-8 py-4 rounded-2xl text-sm font-bold text-gray-700 hover:border-pink-500 hover:text-pink-600 transition-all disabled:opacity-50"
                >
                  {loadingMore ? t("loading") : t("loadMore")}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Shop;
