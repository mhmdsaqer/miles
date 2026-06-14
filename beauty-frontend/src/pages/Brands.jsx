// src/pages/Brands.jsx - النسخة النهائية: كروت أصغر + أقسام Hero Style ✨
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useLang } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import SEO from "../components/SEO";
import { getImageUrl } from "../utils/imageUtils";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

const Brands = () => {
  const { lang, t } = useLang();
  const { isDark } = useTheme();
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  // ✅ جلب البراندات والأقسام معاً (Parallel Fetching)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [brandsRes, categoriesRes] = await Promise.all([
          axios.get(`${API_URL}/brands`),
          axios.get(`${API_URL}/categories`)
        ]);
        
        if (Array.isArray(brandsRes.data)) setBrands(brandsRes.data);
        if (Array.isArray(categoriesRes.data)) setCategories(categoriesRes.data);
      } catch (err) {
        console.error("❌ Fetch data error:", err);
        setError(err.message || "فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ فلترة الأقسام الرئيسية فقط
  const mainCategories = useMemo(() => {
    return categories.filter((c) => c.parent_id === null);
  }, [categories]);

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
    title: lang === "ar" ? "الماركات والأقسام الرئيسية" : "Brands & Main Categories",
    description: lang === "ar"
      ? "اكتشفي مجموعتنا الحصرية من الماركات العالمية والأقسام الرئيسية للعناية والجمال. منتجات أصلية 100%، شحن آمن، ودفع عند الاستلام."
      : "Discover our exclusive collection of global brands and main beauty categories. 100% authentic products, secure shipping, and cash on delivery.",
    image: "/assets/hero/og-brands.jpg",
    url: "/brands",
    type: "collection"
  }), [lang]);

  // ✅ 5 ألوان فخمة للبراندات (Luxury Palette)
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
      shadow: "group-hover:shadow-[0_20px_50px_-20px_rgba(217,119,6,0.25)]",
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
      shadow: "group-hover:shadow-[0_20px_50px_-20px_rgba(225,29,72,0.25)]",
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
      shadow: "group-hover:shadow-[0_20px_50px_-20px_rgba(87,83,78,0.25)]",
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
      shadow: "group-hover:shadow-[0_20px_50px_-20px_rgba(71,85,105,0.25)]",
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
      shadow: "group-hover:shadow-[0_20px_50px_-20px_rgba(147,51,234,0.25)]",
    },
  ], []);

  // ✅ Loading State
  if (loading) {
    return (
      <div className={`min-h-screen pt-32 px-4 sm:px-6 lg:px-12 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-b from-white via-stone-50/30 to-white'}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="max-w-[1400px] mx-auto space-y-16">
          <div className={`h-16 w-64 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-3xl animate-pulse mx-auto`} />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className={`aspect-square ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-3xl animate-pulse`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ✅ Error State
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === "ar" ? "فشل تحميل البيانات" : "Failed to Load Data"}</h1>
          <p className={`text-sm font-mono p-3 rounded-lg ${isDark ? 'text-gray-400 bg-gray-800' : 'text-gray-500 bg-gray-50'}`}>{error}</p>
          <button onClick={() => window.location.reload()} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-gray-700 text-white hover:bg-pink-600' : 'bg-gray-900 text-white hover:bg-pink-600'}`}>
            {lang === "ar" ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 sm:pb-24 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-b from-white via-stone-50/30 to-white'}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <SEO title={brandsSeoData.title} description={brandsSeoData.description} image={brandsSeoData.image} url={brandsSeoData.url} type={brandsSeoData.type} />
      
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 space-y-16 sm:space-y-20 pt-28 sm:pt-32">
        
        {/* ===== Header ===== */}
        <div className="text-center space-y-5">
          <nav className={`inline-flex items-center gap-2 text-[10px] font-bold text-pink-500 uppercase tracking-[0.3em] ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
            <Link to="/shop" className={`hover:text-pink-600 transition-colors ${isDark ? 'hover:text-pink-400' : ''}`}>{t('shop')}</Link>
            <span className={isDark ? 'text-gray-600' : 'text-gray-200'}>/</span>
            <span className={isDark ? 'text-gray-300' : 'text-gray-900'}>{lang === "ar" ? "الماركات والأقسام" : "Brands & Categories"}</span>
          </nav>
          
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "ar" ? "الماركات والأقسام الرئيسية" : "Brands & Main Categories"}
          </h1>
          
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`text-2xl md:text-3xl font-black tabular-nums ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>{enrichedBrands.length}</span>
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{t('brands')}</span>
            </div>
            <div className={`w-px h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className="flex items-center gap-2">
              <span className={`text-2xl md:text-3xl font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{mainCategories.length}</span>
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{lang === "ar" ? "قسم رئيسي" : "Main Categories"}</span>
            </div>
            <div className={`w-px h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className="flex items-center gap-2">
              <span className={`text-2xl md:text-3xl font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalProducts}+</span>
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{t('products')}</span>
            </div>
          </div>
        </div>

        {/* ===== Section 1: Brands Grid - Smaller & More Elegant ===== */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <span className="text-2xl">🏷️</span>
            <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('globalBrands')}</h2>
            <div className={`flex-1 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
          </div>
          
          {/* ✅ Changed: 5 columns on large screens, aspect-square, smaller padding */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5">
            {enrichedBrands.map((brand, index) => {
              const isHovered = hoveredId === brand.id;
              const brandImageUrl = getImageUrl(brand.image);
              const palette = luxuryPalettes[index % luxuryPalettes.length];
              
              return (
                <Link
                  key={brand.id}
                  to={`/brands/${brand.id}`}
                  onMouseEnter={() => setHoveredId(brand.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="group relative block"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className={`
                    relative overflow-hidden rounded-3xl 
                    bg-gradient-to-br ${isDark ? 'from-gray-800 via-gray-800 to-gray-900' : palette.bg}
                    border ${isDark ? 'border-gray-700 hover:border-gray-600' : `${palette.border} ${palette.hoverBorder}`} 
                    ${palette.shadow}
                    transition-all duration-500 ease-out
                    hover:-translate-y-1
                    aspect-square
                    flex flex-col
                  `}>
                    
                    <div className={`absolute top-3 ${lang === "ar" ? "right-4" : "left-4"} z-20`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest tabular-nums ${isDark ? 'text-gray-500' : 'text-gray-400/60'}`}>
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    {/* ✅ Smaller logo area */}
                    <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
                      <div className={`
                        absolute inset-0 opacity-0 group-hover:opacity-100
                        transition-opacity duration-700
                        bg-gradient-to-br from-white/40 via-transparent to-transparent
                      `} />
                      
                      <div className={`
                        relative w-full h-full flex items-center justify-center
                        transition-all duration-500 ease-out
                        group-hover:scale-105
                      `}>
                        {brand.image ? (
                          <img 
                            src={brandImageUrl} 
                            alt={brand.displayName} 
                            className="max-w-[80%] max-h-[70%] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.06)] transition-all duration-500 group-hover:drop-shadow-[0_15px_30px_rgba(0,0,0,0.1)]"
                            loading="lazy"
                            onError={(e) => { 
                              e.target.style.display = 'none'; 
                              if (e.target.parentElement) {
                                e.target.parentElement.innerHTML = `<span class="text-4xl ${isDark ? 'text-gray-600' : 'text-gray-300'}">🏷️</span>`;
                              }
                            }} 
                          />
                        ) : (
                          <span className={`text-4xl ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>🏷️</span>
                        )}
                      </div>
                    </div>

                    {/* ✅ Compact info area */}
                    <div className={`px-4 pb-4 text-center space-y-1.5 flex-shrink-0`}>
                      <h2 className={`
                        font-black 
                        text-sm md:text-base
                        tracking-tight leading-tight
                        ${isDark ? 'text-gray-200 group-hover:text-pink-400' : `text-gray-900 ${palette.hoverText}`}
                        transition-colors duration-300
                        ${lang === "en" ? "font-latin" : ""}
                        line-clamp-1
                      `}>
                        {brand.displayName}
                      </h2>
                      
                      <div className={`flex items-center justify-center gap-1.5 ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-pink-500' : palette.dot} ${isHovered ? 'animate-ping' : ''}`} />
                        <span className={`text-[11px] font-black tabular-nums ${isDark ? 'text-pink-400' : palette.accentText}`}>
                          {brand.productCount}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {t('products')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ===== Section 2: Main Categories - Hero Style with Full Background Images ===== */}
        {mainCategories.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <span className="text-2xl">🗂️</span>
              <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {lang === "ar" ? "الأقسام الرئيسية" : "Main Categories"}
              </h2>
              <div className={`flex-1 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
            </div>

            {/* ✅ Hero Style Grid - Full Background Images with Overlay */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {mainCategories.map((cat, index) => {
                const catImageUrl = getImageUrl(cat.image);
                const catName = lang === "ar" ? cat.name_ar : cat.name_en;
                
                return (
                  <Link 
                    key={cat.id} 
                    to={`/shop?parent=${cat.id}`}
                    className="group relative block overflow-hidden rounded-3xl aspect-[4/5]"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* ✅ Background Image - Full Cover */}
                    <div className="absolute inset-0">
                      {cat.image ? (
                        <img 
                          src={catImageUrl} 
                          alt={catName}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                          loading="lazy"
                          onError={(e) => { 
                            e.target.style.display = 'none';
                            // Fallback: show placeholder emoji with gradient
                            if (e.target.parentElement) {
                              e.target.parentElement.classList.add('bg-gradient-to-br');
                              e.target.parentElement.classList.add('from-gray-200', 'to-gray-300');
                              e.target.parentElement.innerHTML = `<span class="absolute inset-0 flex items-center justify-center text-7xl opacity-20">📁</span>`;
                            }
                          }}
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${
                          isDark 
                            ? 'bg-gradient-to-br from-gray-700 to-gray-900' 
                            : 'bg-gradient-to-br from-pink-50 to-purple-50'
                        }`}>
                          <span className="text-7xl opacity-20">📁</span>
                        </div>
                      )}
                    </div>

                    {/* ✅ Gradient Overlay - Dark for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 group-hover:from-black/90 group-hover:via-black/50 group-hover:to-black/20 transition-all duration-500" />

                    {/* ✅ Subtle color tint on hover */}
                    <div className="absolute inset-0 bg-pink-600/0 group-hover:bg-pink-600/10 transition-colors duration-500 mix-blend-overlay" />

                    {/* ✅ Content - Name and Explore Button */}
                    <div className="relative h-full flex flex-col justify-end p-5 sm:p-6">
                      {/* Top Badge - Category Number */}
                      <div className={`absolute top-4 ${lang === "ar" ? "right-4" : "left-4"}`}>
                        <span className="text-[9px] font-black uppercase tracking-widest tabular-nums text-white/60">
                          #{String(index + 1).padStart(2, '0')}
                        </span>
                      </div>

                      {/* Arrow Icon - Top Right */}
                      <div className={`absolute top-4 ${lang === "ar" ? "left-4" : "right-4"}`}>
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-500 group-hover:bg-white group-hover:scale-110">
                          <svg 
                            className={`w-4 h-4 text-white transition-all duration-500 group-hover:text-gray-900 ${
                              lang === "ar" ? 'rotate-180 group-hover:rotate-0' : 'group-hover:rotate-180'
                            }`} 
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                      </div>

                      {/* Category Name & Description */}
                      <div className="space-y-2 transform transition-transform duration-500 group-hover:translate-y-[-4px]">
                        <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                          {catName}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-0.5 bg-white transition-all duration-500 group-hover:w-12 ${isDark ? 'bg-pink-400' : 'bg-white'}`} />
                          <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
                            {lang === "ar" ? "تصفح المنتجات" : "Explore Products"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ✅ Hover Border Glow */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-white/0 group-hover:border-white/20 transition-all duration-500 pointer-events-none" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        
        {/* ===== CTA Section ===== */}
        <div className="text-center">
          <div className={`inline-flex flex-col items-center gap-5 p-8 sm:p-10 rounded-[2.5rem] max-w-2xl w-full ${
            isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-gray-900 to-gray-800'
          } text-white`}>
            <div className="text-3xl sm:text-4xl">✨</div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-black tracking-tight">
                {lang === "ar" ? "جاهزة لاكتشاف المزيد ؟" : "Ready to discover more?"}
              </h3>
              <p className={`text-xs sm:text-sm max-w-md ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                {lang === "ar" 
                  ? "تصفحي مجموعتنا الكاملة من المنتجات الفاخرة من جميع الماركات" 
                  : "Browse our complete collection of luxury products from all brands"}
              </p>
            </div>
            <Link 
              to="/shop"
              className="group inline-flex items-center gap-3 bg-white text-gray-900 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all duration-300"
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
