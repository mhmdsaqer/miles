// src/pages/Brands.jsx - النسخة النهائية مع تحسينات SEO
import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useLang } from "../context/LanguageContext";
import SEO from "../components/SEO"; // ✅ استيراد مكون الـ SEO

import { getImageUrl } from "../utils/imageUtils";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

// ألوان خلفية مميزة لكل كارت براند بالتناوب
const BG_PALETTE = [
  "bg-[#F5F0EB]", "bg-[#EBF0F5]", "bg-[#F5EBF0]", "bg-[#EBF5EB]",
  "bg-[#F5F5EB]", "bg-[#EBF5F5]", "bg-[#F0EBF5]", "bg-[#F5EBEB]",
  "bg-[#EBEFF5]", "bg-[#F5ECEB]",
];

const Brands = () => {
  const { lang, t } = useLang();
  
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [loadedImages, setLoadedImages] = useState({});



  // ✅ جلب البيانات من MongoDB - مع دعم هيكلية الاستجابة الجديدة
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setError(null);
        
        const [brandsRes, productsRes] = await Promise.all([
          axios.get(`${API_URL}/brands`),
          // ✅ نجلب كل المنتجات (بدون Pagination للصفحة هذه)
          axios.get(`${API_URL}/products?limit=1000`),
        ]);
        
        // ✅ دعم كلا الهيكلين: مصفوفة مباشرة أو كائن يحتوي على products
        const productsData = Array.isArray(productsRes.data) 
          ? productsRes.data 
          : productsRes.data?.products || [];
        
        setBrands(brandsRes.data);
        setProducts(productsData);
      } catch (err) {
        console.error("Failed to fetch brands/products:", err);
        setError(err.message || "فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ✅ حساب البيانات المُثراة بـ useMemo لتحسين الأداء
  const enrichedBrands = useMemo(() => {
    return brands.map((brand) => {
      const brandProds = products.filter((p) => p.brand_id === brand.id);
      const previews = brandProds.slice(0, 4).map((p) => p.image);
      return { 
        ...brand, 
        productCount: brandProds.length, 
        previews,
        displayName: brand[`name_${lang}`] || brand.name 
      };
    });
  }, [brands, products, lang]);

  // ✅ بيانات الـ SEO لصفحة الماركات - ديناميكية حسب اللغة
  const brandsSeoData = useMemo(() => {
    return {
      title: lang === "ar" ? "الماركات العالمية" : "Global Brands",
      description: lang === "ar"
        ? "اكتشفي مجموعتنا الحصرية من 10 ماركات عالمية في العناية والجمال. منتجات أصلية 100%، شحن آمن، ودفع عند الاستلام في جميع أنحاء فلسطين."
        : "Discover our exclusive collection of 10 global beauty and care brands. 100% authentic products, secure shipping, and cash on delivery across Palestine.",
      image: "/assets/hero/og-brands.jpg",
      url: "/brands",
      type: "collection"
    };
  }, [lang]);

  // ✅ التعامل مع تحميل صور البراند
  const handleImageLoad = useCallback((brandId) => {
    setLoadedImages(prev => ({ ...prev, [brandId]: true }));
  }, []);

  const handleImageError = useCallback((e, brandId) => {
    console.warn(`Failed to load image for brand ${brandId}`);
    setLoadedImages(prev => ({ ...prev, [brandId]: false }));
    e.target.style.display = 'none';
  }, []);

  // ===== Loading State =====
  if (loading) {
    return (
      <div 
        className="min-h-screen bg-[#FAFAFA] pt-32 px-4 sm:px-6 lg:px-12" 
        dir={lang === "ar" ? "rtl" : "ltr"}
        lang={lang}
      >
        <div className="max-w-[1400px] mx-auto">
          <div className="h-12 sm:h-16 w-48 sm:w-64 bg-gray-100 rounded-2xl animate-pulse mb-12 sm:mb-16" />
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[4/5] sm:aspect-[4/3] bg-gray-100 rounded-[2rem] sm:rounded-[2.5rem] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== Error State =====
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">{lang === "ar" ? "فشل تحميل البيانات" : "Failed to Load Data"}</h1>
          <p className="text-gray-500 text-sm font-mono bg-gray-50 p-3 rounded-lg">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-pink-600 transition-all"
          >
            {lang === "ar" ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen bg-[#FAFAFA] pt-28 sm:pt-32 pb-20 sm:pb-24 ${lang === "ar" ? "font-arabic" : "font-latin"}`} 
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
    >
      {/* ✅ SEO لصفحة الماركات - يوضع في أعلى الـ return */}
      <SEO
        title={brandsSeoData.title}
        description={brandsSeoData.description}
        image={brandsSeoData.image}
        url={brandsSeoData.url}
        type={brandsSeoData.type}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">

        {/* ===== Header ===== */}
        <div className="mb-12 sm:mb-16 border-b border-gray-100 pb-8 sm:pb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div className={`space-y-2 sm:space-y-3 ${lang === "ar" ? "text-right" : "text-left"}`}>
            <nav className={`flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-pink-500 uppercase tracking-[0.2em] ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
              <Link to="/shop" className="hover:text-black transition-colors">{t('shop')}</Link>
              <span className="text-gray-200">/</span>
              <span className="text-gray-900">{t('brands')}</span>
            </nav>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tighter leading-none">
              {t('globalBrands')}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm font-medium">
              {enrichedBrands.length} {t('brands')} · {products.length} {t('products')}
            </p>
          </div>

          {/* زر العودة للمتجر */}
          <Link
            to="/shop"
            className={`group inline-flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all ${lang === "ar" ? "flex-row-reverse" : ""}`}
          >
            <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-black group-hover:text-white group-hover:border-black transition-all ${lang === "ar" ? "" : "rotate-180"}`}>
              ←
            </span>
            {t('allProducts')}
          </Link>
        </div>

        {/* ===== Brands Grid - Mobile First Responsive ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {enrichedBrands.map((brand, index) => {
            const brandImageUrl = getImageUrl(brand.image);
            
            return (
              <Link
                key={brand.id}
                to={`/brands/${brand.id}`}
                onMouseEnter={() => setHoveredId(brand.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group relative block"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div
                  className={`relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden transition-all duration-700
                    ${BG_PALETTE[index % BG_PALETTE.length]}
                    group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] sm:group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)]
                    group-hover:-translate-y-1 sm:group-hover:-translate-y-2`}
                >
                  {/* ===== منطقة عرض المنتجات — الأهم والأبرز ===== */}
                  <div className="relative h-40 sm:h-52 md:h-56 flex items-center justify-center px-3 sm:px-6 pt-4 sm:pt-6 gap-1.5 sm:gap-2 overflow-hidden">
                    {brand.previews.length > 0 ? (
                      brand.previews.map((img, i) => {
                        const isCenter = i === 1 && brand.previews.length > 1;
                        const isSide = i === 0 || i === 2;
                        
                        return (
                          <div
                            key={i}
                            className="relative transition-all duration-700 ease-out flex-shrink-0"
                            style={{
                              width: isCenter ? "42%" : "26%",
                              height: isCenter ? "130px" : "90px",
                              zIndex: isCenter ? 20 : (isSide ? 10 : 5),
                              transform: hoveredId === brand.id
                                ? isCenter 
                                  ? "translateY(-10px) scale(1.12)" 
                                  : isSide 
                                    ? `translateY(-4px) ${lang === "ar" ? (i === 0 ? "translateX(4px)" : "translateX(-4px)") : (i === 0 ? "translateX(-4px)" : "translateX(4px)")} rotate(${i === 0 ? "-5deg" : "5deg"}) scale(1.06)`
                                    : "translateY(-2px) scale(1.03)"
                                : isCenter
                                  ? "translateY(0) scale(1)"
                                  : isSide
                                    ? `translateY(0) rotate(${i === 0 ? "-2deg" : "2deg"})`
                                    : "translateY(0)",
                            }}
                          >
                            <img
                              src={getImageUrl(img)}
                              alt=""
                              className="w-full h-full object-contain drop-shadow-md sm:drop-shadow-lg"
                              loading="lazy"
                              onError={(e) => {
                                console.warn(`Failed to load preview image`);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        );
                      })
                    ) : (
                      // Placeholder إذا لم توجد منتجات
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-white/50 flex items-center justify-center">
                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Gradient overlay من الأسفل */}
                    <div className="absolute inset-x-0 bottom-0 h-12 sm:h-16 bg-gradient-to-t from-white/30 to-transparent pointer-events-none" />
                  </div>

                  {/* ===== قسم البراند — أصغر وأنيق في الأسفل ===== */}
                  <div className="bg-white/70 sm:bg-white/80 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-5 flex items-center justify-between border-t border-white/50">
                    <div className={`flex items-center gap-2 sm:gap-3 ${lang === "ar" ? "flex-row-reverse" : ""}`}>
                      {/* شعار البراند صغير وأنيق */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white shadow flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                        {brand.image ? (
                          <img 
                            src={brandImageUrl}
                            alt={brand.displayName}
                            className={`w-full h-full object-contain p-2 sm:p-3 transition-opacity duration-300 ${loadedImages[brand.id] !== false ? 'opacity-100' : 'opacity-0'}`}
                            loading="lazy"
                            onLoad={() => handleImageLoad(brand.id)}
                            onError={(e) => handleImageError(e, brand.id)}
                          />
                        ) : (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        )}
                      </div>
                      
                      {/* معلومات البراند */}
                      <div className={lang === "ar" ? "text-right" : "text-left"}>
                        <h2 className={`font-black text-gray-900 text-sm sm:text-lg tracking-tight leading-none ${lang === "en" ? "font-latin" : ""}`}>
                          {brand.displayName}
                        </h2>
                        <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">
                          {brand.productCount} {t('products')}
                        </p>
                      </div>
                    </div>

                    {/* سهم الانتقال */}
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-500 border
                      ${hoveredId === brand.id
                        ? "bg-gray-900 border-gray-900 text-white"
                        : "bg-white border-gray-100 text-gray-400"}`}
                    >
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5"
                        className={lang === "en" ? "rotate-180" : ""}
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Brands;
