// src/pages/BrandDetails.jsx - النسخة النهائية الفاخرة المضيئة ✨
import SEO from "../components/SEO";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useLang } from "../context/LanguageContext";
import ProductCard from "../components/ProductCard";
import { getImageUrl } from "../utils/imageUtils";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";
const ITEMS_PER_PAGE = 24;

const BrandDetails = () => {
  const { lang, t } = useLang();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("default");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      setProducts([]);
      setCurrentPage(1);
      
      try {
        const [brandsRes, prodsRes] = await Promise.all([
          axios.get(`${API_URL}/brands`),
          axios.get(`${API_URL}/products?brand=${id}&page=1&limit=${ITEMS_PER_PAGE}&sort=${sortBy}`),
        ]);
        
        const foundBrand = brandsRes.data.find((b) => String(b.id) === String(id));
        setBrand(foundBrand || null);
        setAllBrands(brandsRes.data);
        
        const productsData = prodsRes.data?.products || prodsRes.data || [];
        const pagination = prodsRes.data?.pagination || {};
        
        setProducts(productsData);
        setTotalProducts(pagination.totalProducts || productsData.length);
        setHasNextPage(pagination.hasNextPage || false);
        setCurrentPage(pagination.currentPage || 1);
        
      } catch (err) {
        console.error("Failed to fetch brand details:", err);
        setError(err.message || "فشل تحميل بيانات الماركة");
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchInitialData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id, sortBy]);

  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await axios.get(
        `${API_URL}/products?brand=${id}&page=${nextPage}&limit=${ITEMS_PER_PAGE}&sort=${sortBy}`
      );
      
      const newProducts = res.data?.products || res.data || [];
      const pagination = res.data?.pagination || {};
      
      setProducts(prev => [...prev, ...newProducts]);
      setHasNextPage(pagination.hasNextPage || false);
      setCurrentPage(pagination.currentPage || nextPage);
    } catch (err) {
      console.error("Failed to load more products:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [id, currentPage, hasNextPage, loadingMore, sortBy]);

  const brandDisplayName = useMemo(() => {
    if (!brand) return "";
    return brand.name;
  }, [brand]);

  const brandSeoData = useMemo(() => {
    if (!brand) return null;
    return {
      title: brandDisplayName,
      description: lang === "ar"
        ? `اكتشفي مجموعة ${brandDisplayName} من منتجات العناية والجمال الأصلية في MILES Beauty Store. شحن آمن، دفع عند الاستلام، ومنتجات أصلية 100%.`
        : `Discover the ${brandDisplayName} collection of original beauty and care products at MILES Beauty Store. Secure shipping, cash on delivery, and 100% authentic products.`,
      image: getImageUrl(brand.header_image || brand.image),
      url: `/brands/${id}`,
      type: "collection",
      brandData: {
        "@type": "Brand",
        "name": brand.name,
        "url": `https://miles-beauty.com/brands/${id}`,
        "logo": getImageUrl(brand.image),
        "image": getImageUrl(brand.header_image || brand.image),
        "sameAs": []
      }
    };
  }, [brand, brandDisplayName, id, lang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pt-32 px-6 lg:px-12" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="max-w-[1400px] mx-auto space-y-10 animate-pulse">
          <div className="w-full aspect-[16/7] md:aspect-[16/6] bg-gray-100 rounded-[2rem] sm:rounded-[3rem]" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">{lang === "ar" ? "فشل التحميل" : "Failed to Load"}</h1>
          <p className="text-gray-500 text-sm font-mono bg-gray-50 p-3 rounded-lg">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-pink-600 transition-all">
            {lang === "ar" ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="text-center space-y-6">
          <p className="text-6xl">🔍</p>
          <h1 className="text-3xl font-black text-gray-900">{t('brandNotFound')}</h1>
          <Link to="/brands" className="text-pink-500 font-bold hover:underline">
            {lang === "ar" ? "←" : "→"} {t('backToBrands')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#FAFAFA] pb-24 ${lang === "ar" ? "font-arabic" : "font-latin"}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      {brandSeoData && (
        <SEO
          title={brandSeoData.title}
          description={brandSeoData.description}
          image={brandSeoData.image}
          url={brandSeoData.url}
          type={brandSeoData.type}
          productData={null}
          brandData={brandSeoData.brandData}
        />
      )}

      {/* ===== Hero Banner - نسخة مضيئة ومحسنة لتفاصيل الصورة بالكامل 1632x656 ✨ ===== */}
      <div className="relative bg-white overflow-hidden pt-16 md:pt-20">
        
        {/* حاوية الصورة المتجاوبة تماماً */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[16/7] md:aspect-[16/6] lg:max-h-[500px] flex items-center bg-gray-50">
          
          {brand.header_image ? (
            <img
              src={getImageUrl(brand.header_image)}
              alt={`${brandDisplayName} Header`}
              className="absolute inset-0 w-full h-full object-contain md:object-cover object-center transition-transform duration-[2000ms] ease-out hover:scale-101"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
          )}

          {/* 1️⃣ تظليل علوي ناعم جداً ومخفف لتداخل الـ NavBar بدون حواف قاسية */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/25 to-transparent pointer-events-none z-10" />

          {/* 2️⃣ تظليل سفلي خفيف وذكي (تم تقليله من 90% إلى 45%) ليوضح النصوص مع إبقاء الصورة ساطعة */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent z-0" />

          {/* 3️⃣ محتوى الهيدر المتناسق */}
          <div className={`
            absolute bottom-0 left-0 right-0 z-10
            max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 
            pb-4 sm:pb-6 md:pb-8 pt-12
            flex flex-col md:flex-row items-start md:items-end justify-between gap-4 md:gap-8
            ${lang === "ar" ? "text-right" : "text-left"}
          `}>
            
            {/* الجانب الأيمن/الأيسر: البيانات والشعار */}
            <div className={`space-y-2.5 sm:space-y-3.5 w-full ${lang === "ar" ? "text-right" : "text-left"}`}>
              
              {/* Breadcrumb - نصوص بيضاء محمية بظل ناعم */}
              <nav className={`flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-white/90 uppercase tracking-[0.2em] drop-shadow-sm ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
                <Link to="/" className="hover:text-pink-300 transition-colors">{t('shop')}</Link>
                <span className="text-white/50">/</span>
                <Link to="/brands" className="hover:text-pink-300 transition-colors">{t('brands')}</Link>
                <span className="text-white/50">/</span>
                <span className="text-pink-300 font-black">{brandDisplayName.toUpperCase()}</span>
              </nav>

              {/* اللوجو + اسم البراند */}
              <div className="flex items-center gap-3 sm:gap-4">
                {brand.image && (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200/50 flex items-center justify-center p-1.5 shadow-lg">
                    <img
                      src={getImageUrl(brand.image)}
                      alt={brandDisplayName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                
                <div>
                  {/* اسم البراند بظل ناعم لضمان القراءة على الخلفيات المضيئة */}
                  <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-none italic drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                    {brandDisplayName}
                  </h1>
                  <div className={`mt-1.5 h-1 w-10 sm:w-14 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full shadow-md ${lang === "ar" ? "ml-auto" : "mr-auto"}`} />
                </div>
              </div>

              {/* عدد المنتجات */}
              <div className={`flex items-center gap-2 ${lang === "ar" ? "flex-row-reverse" : ""}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shadow-sm" />
                <p className="text-white text-xs font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                  <span className="text-white font-black text-sm sm:text-lg">{totalProducts}</span> {t('productsInCollection')}
                </p>
              </div>
            </div>

            {/* الجانب الآخر: زر العودة (تم تحويله لتصميم زجاجي داكن خفيف ليتناسق مع السطوع) */}
            <button
              onClick={() => navigate("/brands")}
              className={`group flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/20 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 hover:border-gray-900 transition-all shrink-0 shadow-md ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={lang === "en" ? "rotate-180" : ""}>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              {t('allBrands')}
            </button>
          </div>
        </div>
      </div>

      {/* ===== باقي المحتوى ===== */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 mt-8 sm:mt-12">
        {/* ===== Toolbar ===== */}
        <div className="flex items-center justify-between mb-8 sm:mb-10 flex-wrap gap-4">
          <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            {t('showing')} <span className="text-gray-900 font-black">{products.length}</span> / {totalProducts} {t('products')}
          </p>

          <div className={`flex items-center gap-2 sm:gap-3 ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
            <span className="text-[9px] sm:text-[10px] font-black text-gray-300 uppercase tracking-widest hidden sm:inline">{t('sortBy')}</span>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1">
              {[
                { key: "default",    label: lang === "ar" ? "الافتراضي" : "Default" },
                { key: "price_asc",  label: lang === "ar" ? "السعر ↑" : "Price ↑" },
                { key: "price_desc", label: lang === "ar" ? "السعر ↓" : "Price ↓" },
                { key: "name_asc",   label: lang === "ar" ? "الاسم أ→ي" : "Name A→Z" },
                { key: "name_desc",  label: lang === "ar" ? "الاسم ي→أ" : "Name Z→A" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap
                    ${sortBy === opt.key
                      ? "bg-gray-900 text-white"
                      : "bg-white border border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-700"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== Products Grid ===== */}
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-12">
              {products.map((product, i) => (
                <div
                  key={product.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
            
            {/* Load More Button */}
            {hasNextPage && (
              <div className="mt-12 sm:mt-16 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-3 bg-white border border-gray-200 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-xs sm:text-sm font-bold text-gray-700 hover:border-pink-500 hover:text-pink-600 transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {lang === "ar" ? "جاري التحميل..." : "Loading..."}
                    </>
                  ) : (
                    <>
                      {t('loadMore')}
                      <span className="text-[10px] text-gray-400">({products.length} / {totalProducts})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="h-[40vh] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-pink-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-gray-900">{t('noProducts')}</h2>
            <p className="text-gray-400 text-sm mt-2">{t('noProductsForBrand')}</p>
          </div>
        )}

        {/* ===== Other Brands Strip ===== */}
        {allBrands.length > 1 && (
          <div className="mt-16 sm:mt-24 pt-8 sm:pt-12 border-t border-gray-100">
            <h3 className={`text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-4 sm:mb-6 flex items-center gap-3 ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
              <span className="w-8 h-[1px] bg-gray-200" />
              {t('otherBrands')}
            </h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {allBrands
                .filter((b) => String(b.id) !== String(id))
                .map((b) => (
                  <Link
                    key={b.id}
                    to={`/brands/${b.id}`}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-gray-100 bg-white text-[10px] sm:text-[11px] font-black text-gray-500 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all"
                  >
                    {b.name}
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandDetails;
