// src/pages/Brands.jsx - النسخة الفاخرة مع 5 ألوان موحدة ✨
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
  const [hoveredId, setHoveredId] = useState(null);

  // ✅ جلب البراندات
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setError(null);
        const brandsRes = await axios.get(`${API_URL}/brands`);
        if (Array.isArray(brandsRes.data)) {
          setBrands(brandsRes.data);
        } else {
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

  const enrichedBrands = useMemo(() => {
    return brands.map((brand) => ({
      ...brand,
      productCount: brand.productCount ?? 0,
      displayName: brand[`name_${lang}`] || brand.name
    }));
  }, [brands, lang]);

  const totalProducts = useMemo(() => {
    return enrichedBrands.reduce((sum, brand) => sum + (brand.productCount || 0), 0);
  }, [enrichedBrands]);

  const brandsSeoData = useMemo(() => ({
    title: lang === "ar" ? "الماركات العالمية" : "Global Brands",
    description: lang === "ar"
      ? "اكتشفي مجموعتنا الحصرية من الماركات العالمية في العناية والجمال. منتجات أصلية 100%، شحن آمن، ودفع عند الاستلام."
      : "Discover our exclusive collection of global beauty and care brands. 100% authentic products, secure shipping, and cash on delivery.",
    image: "/assets/hero/og-brands.jpg",
    url: "/brands",
    type: "collection"
  }), [lang]);

  // ✅ 5 ألوان فخمة ومتناسقة (Luxury Palette)
  // تتوزع على كل البراندات تلقائياً (يعمل لأي عدد)
  const luxuryPalettes = useMemo(() => [
    {
      name: "champagne",
      bg: "from-amber-50/80 via-stone-50 to-white",
      hoverText: "group-hover:text-amber-700",
      accentBg: "bg-amber-100/80",
      accentText: "text-amber-700",
      border: "border-amber-200/50",
      hoverBorder: "hover:border-amber-300/70",
      dot: "bg-amber-500",
      shadow: "group-hover:shadow-[0_40px_100px_-30px_rgba(217,119,6,0.25)]",
    },
    {
      name: "rose",
      bg: "from-rose-50/80 via-pink-50/50 to-white",
      hoverText: "group-hover:text-rose-700",
      accentBg: "bg-rose-100/80",
      accentText: "text-rose-700",
      border: "border-rose-200/50",
      hoverBorder: "hover:border-rose-300/70",
      dot: "bg-rose-500",
      shadow: "group-hover:shadow-[0_40px_100px_-30px_rgba(225,29,72,0.25)]",
    },
    {
      name: "pearl",
      bg: "from-stone-100/60 via-gray-50/50 to-white",
      hoverText: "group-hover:text-stone-800",
      accentBg: "bg-stone-100/80",
      accentText: "text-stone-700",
      border: "border-stone-200/50",
      hoverBorder: "hover:border-stone-400/70",
      dot: "bg-stone-600",
      shadow: "group-hover:shadow-[0_40px_100px_-30px_rgba(87,83,78,0.25)]",
    },
    {
      name: "midnight",
      bg: "from-slate-100/70 via-blue-50/50 to-white",
      hoverText: "group-hover:text-slate-800",
      accentBg: "bg-slate-100/80",
      accentText: "text-slate-700",
      border: "border-slate-200/50",
      hoverBorder: "hover:border-slate-400/70",
      dot: "bg-slate-600",
      shadow: "group-hover:shadow-[0_40px_100px_-30px_rgba(71,85,105,0.25)]",
    },
    {
      name: "mauve",
      bg: "from-purple-50/80 via-fuchsia-50/40 to-white",
      hoverText: "group-hover:text-purple-700",
      accentBg: "bg-purple-100/80",
      accentText: "text-purple-700",
      border: "border-purple-200/50",
      hoverBorder: "hover:border-purple-300/70",
      dot: "bg-purple-500",
      shadow: "group-hover:shadow-[0_40px_100px_-30px_rgba(147,51,234,0.25)]",
    },
  ], []);

  // ✅ Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-stone-50/30 to-white pt-32 px-4 sm:px-6 lg:px-12" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="max-w-[1400px] mx-auto">
          <div className="h-16 w-64 bg-gray-100 rounded-3xl animate-pulse mb-16 mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ✅ Error State
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
    <div className={`min-h-screen bg-gradient-to-b from-white via-stone-50/30 to-white pt-28 sm:pt-32 pb-20 sm:pb-24 ${lang === "ar" ? "font-arabic" : "font-latin"}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <SEO title={brandsSeoData.title} description={brandsSeoData.description} image={brandsSeoData.image} url={brandsSeoData.url} type={brandsSeoData.type} />
      
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
        {/* ===== Header ===== */}
        <div className="mb-16 sm:mb-24 text-center space-y-6">
          <nav className={`inline-flex items-center gap-2 text-[10px] font-bold text-pink-500 uppercase tracking-[0.3em] ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
            <Link to="/shop" className="hover:text-black transition-colors">{t('shop')}</Link>
            <span className="text-gray-200">/</span>
            <span className="text-gray-900">{t('brands')}</span>
          </nav>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-gray-900 tracking-tighter leading-none">
            {t('globalBrands')}
          </h1>
          
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-pink-600 tabular-nums">{enrichedBrands.length}</span>
              <span className="text-gray-400 text-sm font-medium">{t('brands')}</span>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-gray-900 tabular-nums">{totalProducts}+</span>
              <span className="text-gray-400 text-sm font-medium">{t('products')}</span>
            </div>
          </div>
          
          <Link to="/shop" className={`inline-flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all mx-auto group ${lang === "ar" ? "flex-row-reverse" : ""}`}>
            <span className={`w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all ${lang === "ar" ? "" : "rotate-180"}`}>←</span>
            {t('allProducts')}
          </Link>
        </div>

        {/* ===== Brands Grid - Portrait Cards ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {enrichedBrands.map((brand, index) => {
            const isHovered = hoveredId === brand.id;
            const brandImageUrl = getImageUrl(brand.image);
            // ✅ توزيع الألوان تلقائياً (يعمل لأي عدد من البراندات)
            const palette = luxuryPalettes[index % luxuryPalettes.length];
            
            return (
              <Link
                key={brand.id}
                to={`/brands/${brand.id}`}
                onMouseEnter={() => setHoveredId(brand.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group relative block"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* ✅ الكرت العمودي الفاخر */}
                <div className={`
                  relative overflow-hidden rounded-[2.5rem] 
                  bg-gradient-to-br ${palette.bg}
                  border ${palette.border} ${palette.hoverBorder} ${palette.shadow}
                  transition-all duration-700 ease-out
                  hover:-translate-y-3
                  aspect-[4/5]
                  flex flex-col
                `}>
                  
                  {/* ✅ رقم البراند - الزاوية العلوية */}
                  <div className={`absolute top-5 ${lang === "ar" ? "right-6" : "left-6"} z-20`}>
                    <span className="text-[11px] font-black text-gray-400/60 uppercase tracking-widest tabular-nums">
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* ✅ عدد المنتجات - الزاوية العلوية الأخرى */}
                  <div className={`absolute top-5 ${lang === "ar" ? "left-6" : "right-6"} z-20 flex items-center gap-1.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${palette.dot} ${isHovered ? 'animate-ping' : ''}`} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider tabular-nums">
                      {brand.productCount}
                    </span>
                  </div>

                  {/* ✅ منطقة الصورة (تأخذ معظم المساحة) */}
                  <div className="relative flex-1 flex items-center justify-center p-8 sm:p-12 overflow-hidden">
                    {/* تأثير ضوئي ناعم عند الـ hover */}
                    <div className={`
                      absolute inset-0 opacity-0 group-hover:opacity-100
                      transition-opacity duration-1000
                      bg-gradient-to-br from-white/50 via-transparent to-transparent
                    `} />
                    
                    {/* ✅ حاوية الصورة مع تأثير التكبير */}
                    <div className={`
                      relative w-full h-full flex items-center justify-center
                      transition-all duration-700 ease-out
                      group-hover:scale-110
                    `}>
                      {brand.image ? (
                        <img 
                          src={brandImageUrl} 
                          alt={brand.displayName} 
                          className="max-w-full max-h-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-700 group-hover:drop-shadow-[0_30px_60px_rgba(0,0,0,0.15)]"
                          loading="lazy"
                          onError={(e) => { 
                            e.target.style.display = 'none'; 
                            if (e.target.parentElement) {
                              e.target.parentElement.innerHTML = `<span class="text-6xl text-gray-300">🏷️</span>`;
                            }
                          }} 
                        />
                      ) : (
                        <span className="text-6xl text-gray-300">🏷️</span>
                      )}
                    </div>
                  </div>

                  {/* ✅ فاصل أنيق بين الصورة والنص */}
                  <div className="mx-8 sm:mx-10 h-px bg-gradient-to-r from-transparent via-gray-300/50 to-transparent" />

                  {/* ✅ معلومات البراند - في المنتصف تماماً */}
                  <div className="px-8 sm:px-10 py-6 sm:py-8 text-center space-y-3">
                    {/* اسم البراند */}
                    <h2 className={`
                      font-black text-gray-900 
                      text-2xl sm:text-3xl 
                      tracking-tight leading-tight
                      ${palette.hoverText}
                      transition-colors duration-500
                      ${lang === "en" ? "font-latin" : ""}
                    `}>
                      {brand.displayName}
                    </h2>
                    
                    {/* زر استكشف - يظهر عند الـ hover */}
                    <div className={`
                      inline-flex items-center gap-2 
                      text-[10px] font-black uppercase tracking-widest
                      ${palette.accentText}
                      transition-all duration-500 ease-out
                      ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                      ${lang === "ar" ? "flex-row-reverse" : ""}
                    `}>
                      <span>{lang === "ar" ? "استكشف المجموعة" : "View Collection"}</span>
                      <svg 
                        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                        className={`transition-transform duration-300 ${lang === "en" ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`}
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* ✅ أيقونة الاستكشاف - الزاوية السفلية */}
                  <div className={`absolute bottom-5 ${lang === "ar" ? "left-6" : "right-6"} z-20`}>
                    <div className={`
                      w-9 h-9 rounded-full ${palette.accentBg}
                      flex items-center justify-center
                      opacity-0 group-hover:opacity-100
                      transition-all duration-500 delay-100
                      group-hover:scale-110
                    `}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`${palette.accentText} ${lang === "ar" ? "rotate-180" : ""}`}>
                        <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* ===== CTA Section ===== */}
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