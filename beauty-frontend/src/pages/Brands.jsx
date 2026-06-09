// src/pages/Brands.jsx - النسخة المُحسّنة للأداء العالي ⚡
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useLang } from "../context/LanguageContext";
import SEO from "../components/SEO";
import { getImageUrl } from "../utils/imageUtils";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

const Brands = () => {
  const { lang, t } = useLang();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);

  // ✅ ✅ ✅ جلب البراندات فقط (بدون products!)
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setError(null);
        const brandsRes = await axios.get(`${API_URL}/brands`);
        
        // ✅ تأمين المصفوفة
        if (Array.isArray(brandsRes.data)) {
          setBrands(brandsRes.data);
        } else {
          console.warn("⚠️ Unexpected brands response:", brandsRes.data);
          setBrands([]);
        }
      } catch (err) {
        console.error("❌ Fetch brands error:", err);
        setError(err.message || "فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  // ✅ ✅ ✅ استخدام productCount من الـ Backend مباشرة
  const enrichedBrands = useMemo(() => {
    return brands.map((brand) => ({
      ...brand,
      // ✅ إذا كان productCount موجوداً من الـ Backend، نستخدمه
      // وإلا نستخدم 0 كـ fallback
      productCount: brand.productCount ?? 0,
      displayName: brand[`name_${lang}`] || brand.name
    }));
  }, [brands, lang]);

  // ✅ حساب العدد الإجمالي للمنتجات من جميع البراندات
  const totalProducts = useMemo(() => {
    return enrichedBrands.reduce((sum, brand) => sum + (brand.productCount || 0), 0);
  }, [enrichedBrands]);

  const brandsSeoData = useMemo(() => ({
    title: lang === "ar" ? "الماركات العالمية" : "Global Brands",
    description: lang === "ar"
      ? "اكتشفي مجموعتنا الحصرية من 10 ماركات عالمية في العناية والجمال. منتجات أصلية 100%، شحن آمن، ودفع عند الاستلام."
      : "Discover our exclusive collection of 10 global beauty and care brands. 100% authentic products, secure shipping, and cash on delivery.",
    image: "/assets/hero/og-brands.jpg",
    url: "/brands",
    type: "collection"
  }), [lang]);

  // ✅ ألوان خلفية إبداعية لكل براند
  const brandGradients = useMemo(() => [
    "from-pink-100 via-rose-50 to-white",
    "from-blue-100 via-sky-50 to-white", 
    "from-purple-100 via-violet-50 to-white",
    "from-amber-100 via-orange-50 to-white",
    "from-emerald-100 via-teal-50 to-white",
    "from-fuchsia-100 via-pink-50 to-white",
    "from-cyan-100 via-blue-50 to-white",
    "from-lime-100 via-green-50 to-white",
    "from-rose-100 via-red-50 to-white",
    "from-indigo-100 via-purple-50 to-white",
  ], []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-32 px-4 sm:px-6 lg:px-12" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="max-w-[1400px] mx-auto">
          <div className="h-16 w-64 bg-gray-100 rounded-3xl animate-pulse mb-16" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[16/9] md:aspect-[21/9] bg-gray-100 rounded-[2.5rem] animate-pulse" />
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
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">{lang === "ar" ? "فشل تحميل البيانات" : "Failed to Load Data"}</h1>
          <p className="text-gray-500 text-sm font-mono bg-gray-50 p-3 rounded-lg">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-pink-600 transition-all">{lang === "ar" ? "إعادة المحاولة" : "Retry"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-white to-gray-50 pt-28 sm:pt-32 pb-20 sm:pb-24 ${lang === "ar" ? "font-arabic" : "font-latin"}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <SEO title={brandsSeoData.title} description={brandsSeoData.description} image={brandsSeoData.image} url={brandsSeoData.url} type={brandsSeoData.type} />
      
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
        {/* ===== Header إبداعي ===== */}
        <div className="mb-16 sm:mb-24 text-center space-y-6">
          <nav className={`inline-flex items-center gap-2 text-[10px] font-bold text-pink-500 uppercase tracking-[0.3em] ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
            <Link to="/shop" className="hover:text-black transition-colors">{t('shop')}</Link>
            <span className="text-gray-200">/</span>
            <span className="text-gray-900">{t('brands')}</span>
          </nav>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-gray-900 tracking-tighter leading-none">
            {t('globalBrands')}
          </h1>
          
          {/* ✅ استخدام totalProducts المحسوب من enrichedBrands */}
          <p className="text-gray-400 text-sm sm:text-base font-medium max-w-2xl mx-auto">
            {enrichedBrands.length} {t('brands')} · {totalProducts} {t('products')}
          </p>
          
          <Link to="/shop" className={`inline-flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all mx-auto ${lang === "ar" ? "flex-row-reverse" : ""}`}>
            <span className={`w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all ${lang === "ar" ? "" : "rotate-180"}`}>←</span>
            {t('allProducts')}
          </Link>
        </div>

        {/* ===== Creative Brands Grid - Large Cards with Shadows ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {enrichedBrands.map((brand, index) => {
            const isActive = activeIndex === brand.id;
            const brandImageUrl = getImageUrl(brand.image);
            const gradient = brandGradients[index % brandGradients.length];
            
            return (
              <Link
                key={brand.id}
                to={`/brands/${brand.id}`}
                onMouseEnter={() => setActiveIndex(brand.id)}
                onMouseLeave={() => setActiveIndex(null)}
                className="group relative block"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* ✅ الكرت الإبداعي الكبير */}
                <div className={`
                  relative overflow-hidden rounded-[2.5rem] 
                  bg-gradient-to-br ${gradient}
                  border border-gray-100/50
                  transition-all duration-700 ease-out
                  hover:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.15)]
                  hover:-translate-y-2 hover:scale-[1.01]
                  hover:border-pink-200/50
                  aspect-[21/9] md:aspect-[24/9] lg:aspect-[28/9]
                  flex items-center
                `}>
                  
                  {/* ✅ خلفية زخرفية ناعمة */}
                  <div className={`
                    absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700
                    bg-gradient-to-r ${gradient.replace('from-', 'via-').replace('via-', 'to-')}
                  `} />
                  
                  {/* ✅ تأثير ضوء عائم */}
                  <div className={`
                    absolute -top-20 -${lang === "ar" ? 'right' : 'left'}-20 w-64 h-64 
                    bg-white/40 rounded-full blur-3xl 
                    opacity-0 group-hover:opacity-100 
                    transition-all duration-1000 ease-out
                    group-hover:translate-y-4 group-hover:translate-x-4
                  `} />
                  
                  {/* ✅ منطقة الصورة الكبيرة */}
                  <div className={`
                    relative z-10 flex-1 flex items-center ${lang === "ar" ? 'justify-start pl-8 md:pl-12 lg:pl-16' : 'justify-end pr-8 md:pr-12 lg:pr-16'}
                    transition-all duration-700
                  `}>
                    <div className={`
                      relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48
                      bg-white rounded-3xl shadow-lg border border-gray-100
                      flex items-center justify-center p-4 sm:p-6
                      transition-all duration-700
                      group-hover:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.15)]
                      group-hover:scale-110 group-hover:rotate-1
                      overflow-hidden
                    `}>
                      {brand.image ? (
                        <img 
                          src={brandImageUrl} 
                          alt={brand.displayName} 
                          className="w-full h-full object-contain drop-shadow-sm"
                          loading="lazy"
                          onError={(e) => { 
                            e.target.style.display = 'none'; 
                            e.target.parentElement.innerHTML = `<span class="text-4xl text-gray-300">🏷️</span>`; 
                          }} 
                        />
                      ) : <span className="text-4xl text-gray-300">🏷️</span>}
                      
                      {/* ✅ دائرة توهج حول اللوجو */}
                      <div className="absolute inset-0 rounded-3xl border-2 border-white/50 group-hover:border-pink-300/50 transition-colors duration-500" />
                    </div>
                  </div>
                  
                  {/* ✅ معلومات البراند */}
                  <div className={`
                    relative z-10 flex-1 flex flex-col ${lang === "ar" ? 'items-end text-right pr-8 md:pr-12 lg:pr-16' : 'items-start text-left pl-8 md:pl-12 lg:pl-16'}
                    transition-all duration-700
                  `}>
                    <div className="space-y-3">
                      {/* اسم البراند */}
                      <h2 className={`
                        font-black text-gray-900 
                        text-2xl sm:text-3xl md:text-4xl lg:text-5xl 
                        tracking-tight leading-none
                        group-hover:text-pink-600 transition-colors duration-500
                        ${lang === "en" ? "font-latin" : ""}
                      `}>
                        {brand.displayName}
                      </h2>
                      
                      {/* عدد المنتجات */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {t('products')}
                        </span>
                        <span className="text-lg sm:text-xl font-black text-gray-900 tabular-nums">
                          {brand.productCount}
                        </span>
                        <span className={`
                          w-2 h-2 rounded-full bg-green-500
                          transition-all duration-500
                          ${isActive ? 'animate-ping' : ''}
                        `} />
                      </div>
                      
                      {/* زر استكشف - يظهر عند الهوفر */}
                      <div className={`
                        inline-flex items-center gap-2 
                        text-[10px] sm:text-[11px] font-black uppercase tracking-wider
                        text-gray-500 group-hover:text-pink-600
                        transition-all duration-500
                        ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                        ${lang === "ar" ? "flex-row-reverse" : ""}
                      `}>
                        {lang === "ar" ? "استكشف المجموعة" : "View Collection"}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`transition-transform duration-300 ${lang === "en" ? "rotate-180 group-hover:translate-x-1" : "group-hover:-translate-x-1"}`}>
                          <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* ✅ زخرفة زاوية */}
                  <div className={`
                    absolute ${lang === "ar" ? 'left-6' : 'right-6'} bottom-6
                    w-12 h-12 rounded-full border-2 border-gray-200/50
                    flex items-center justify-center
                    opacity-0 group-hover:opacity-100
                    transition-all duration-500 delay-100
                  `}>
                    <span className="text-xs font-black text-gray-400">#{index + 1}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* ✅ CTA Section في الأسفل */}
        <div className="mt-20 sm:mt-32 text-center">
          <div className="inline-flex flex-col items-center gap-6 p-8 sm:p-12 rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-gray-800 text-white">
            <div className="text-4xl sm:text-5xl">✨</div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                {lang === "ar" ? "جاهزة لاكتشاف المزيد ؟" : "Ready to discover more?"}
              </h3>
              <p className="text-gray-400 text-sm sm:text-base max-w-md">
                {lang === "ar" 
                  ? "تصفحي مجموعتنا الكاملة من المنتجات الفاخرة من جميع الماركات" 
                  : "Browse our complete collection of luxury products from all brands"}
              </p>
            </div>
            <Link 
              to="/shop"
              className="group inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all duration-300"
            >
              {t('shopNow')}
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Brands;
