// src/pages/Brands.jsx - النسخة الجديدة: Magazine Editorial Style ✨
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

  // ✅ تقسيم البراندات: الأول = Featured، الباقي = Grid
  const featuredBrand = enrichedBrands[0];
  const gridBrands = enrichedBrands.slice(1);

  const brandsSeoData = useMemo(() => ({
    title: lang === "ar" ? "الماركات العالمية" : "Global Brands",
    description: lang === "ar"
      ? "اكتشفي مجموعتنا الحصرية من 10 ماركات عالمية في العناية والجمال."
      : "Discover our exclusive collection of 10 global beauty and care brands.",
    image: "/assets/hero/og-brands.jpg",
    url: "/brands",
    type: "collection"
  }), [lang]);

  // ✅ Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pt-32 px-6" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="max-w-[1400px] mx-auto space-y-12">
          <div className="h-32 bg-gray-100 rounded-3xl animate-pulse" />
          <div className="h-[500px] bg-gray-100 rounded-[3rem] animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ✅ Error State
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">{lang === "ar" ? "فشل التحميل" : "Failed to Load"}</h1>
          <button onClick={() => window.location.reload()} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-pink-600 transition-all">
            {lang === "ar" ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#FAFAFA] ${lang === "ar" ? "font-arabic" : "font-latin"}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <SEO title={brandsSeoData.title} description={brandsSeoData.description} image={brandsSeoData.image} url={brandsSeoData.url} type={brandsSeoData.type} />

      {/* ===== HERO SECTION - Editorial Style ===== */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        {/* خلفية زخرفية */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-20 ${lang === "ar" ? "left-10" : "right-10"} w-96 h-96 bg-pink-100/40 rounded-full blur-[120px]`} />
          <div className={`absolute bottom-0 ${lang === "ar" ? "right-10" : "left-10"} w-80 h-80 bg-purple-100/30 rounded-full blur-[100px]`} />
        </div>

        <div className="max-w-[1400px] mx-auto relative">
          {/* Breadcrumb */}
          <nav className={`flex items-center gap-2 text-[10px] font-bold text-pink-500 uppercase tracking-[0.3em] mb-8 ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
            <Link to="/" className="hover:text-black transition-colors">{t('home')}</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900">{t('brands')}</span>
          </nav>

          {/* العنوان الضخم */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-[2px] bg-pink-500" />
                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-pink-600">
                  {lang === "ar" ? "المجموعة الحصرية" : "Exclusive Collection"}
                </span>
              </div>
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-gray-900 tracking-tighter leading-[0.85]">
                {lang === "ar" ? "الماركات" : "Global"}
                <br />
                <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {lang === "ar" ? "العالمية" : "Brands"}
                </span>
              </h1>
            </div>

            {/* الإحصائيات */}
            <div className={`flex gap-8 ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
              <div className={lang === "ar" ? "text-right" : "text-left"}>
                <div className="text-5xl md:text-6xl font-black text-gray-900 tabular-nums">{enrichedBrands.length}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{t('brands')}</div>
              </div>
              <div className="w-px bg-gray-200" />
              <div className={lang === "ar" ? "text-right" : "text-left"}>
                <div className="text-5xl md:text-6xl font-black text-pink-600 tabular-nums">{totalProducts}+</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{t('products')}</div>
              </div>
            </div>
          </div>

          {/* الوصف */}
          <p className="text-gray-500 text-base md:text-lg max-w-2xl leading-relaxed">
            {lang === "ar"
              ? "اكتشفي مجموعتنا الفاخرة من أرقى الماركات العالمية في العناية والجمال. كل منتج مختار بعناية فائقة ليمنحكِ تجربة استثنائية."
              : "Discover our luxury collection of the finest global beauty and care brands. Every product carefully selected to give you an exceptional experience."}
          </p>
        </div>
      </section>

      {/* ===== FEATURED BRAND - Cinematic ===== */}
      {featuredBrand && (
        <section className="px-6 mb-16">
          <div className="max-w-[1400px] mx-auto">
            <Link
              to={`/brands/${featuredBrand.id}`}
              onMouseEnter={() => setHoveredId(featuredBrand.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group relative block overflow-hidden rounded-[3rem] bg-gradient-to-br from-gray-900 via-gray-800 to-black aspect-[21/9] md:aspect-[24/9]"
            >
              {/* خلفية الصورة */}
              <div className="absolute inset-0">
                <img
                  src={getImageUrl(featuredBrand.image)}
                  alt={featuredBrand.displayName}
                  className="w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-1000"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              </div>

              {/* تأثيرات ضوئية */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/20 rounded-full blur-[120px] group-hover:bg-pink-500/30 transition-colors duration-1000" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
              </div>

              {/* المحتوى */}
              <div className={`relative z-10 h-full flex flex-col justify-between p-8 md:p-12 lg:p-16 ${lang === "ar" ? "text-right" : "text-left"}`}>
                {/* الأعلى: الرقم والتصنيف */}
                <div className={`flex items-center justify-between ${lang === "ar" ? "flex-row-reverse" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-400 bg-pink-500/10 px-4 py-2 rounded-full border border-pink-500/20">
                      {lang === "ar" ? "⭐ الماركة المميزة" : "⭐ Featured Brand"}
                    </span>
                  </div>
                  <span className="text-6xl md:text-8xl font-black text-white/10 tabular-nums">
                    01
                  </span>
                </div>

                {/* الأسفل: المعلومات */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-none group-hover:text-pink-400 transition-colors duration-500">
                      {featuredBrand.displayName}
                    </h2>
                    <div className={`flex items-center gap-4 ${lang === "ar" ? "flex-row-reverse" : ""}`}>
                      <span className="text-white/60 text-sm font-medium">
                        {featuredBrand.productCount} {t('products')}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-white/40" />
                      <span className="text-pink-400 text-sm font-bold uppercase tracking-wider">
                        {lang === "ar" ? "اكتشفي المجموعة" : "Explore Collection"}
                      </span>
                    </div>
                  </div>

                  {/* زر الاستكشاف */}
                  <div className={`inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl text-white text-sm font-bold uppercase tracking-wider group-hover:bg-white group-hover:text-gray-900 transition-all duration-500 ${lang === "ar" ? "flex-row-reverse" : ""}`}>
                    <span>{lang === "ar" ? "تسوقي الآن" : "Shop Now"}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-300 ${lang === "en" ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`}>
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* اللوجو في الزاوية */}
              <div className={`absolute bottom-8 ${lang === "ar" ? "left-8" : "right-8"} w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl p-4 md:p-6 shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-700`}>
                <img
                  src={getImageUrl(featuredBrand.image)}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ===== BENTO GRID - باقي البراندات ===== */}
      <section className="px-6 pb-20">
        <div className="max-w-[1400px] mx-auto">
          {/* عنوان القسم */}
          <div className={`flex items-center justify-between mb-10 ${lang === "ar" ? "flex-row-reverse" : ""}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-[2px] bg-gray-900" />
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-gray-900">
                {lang === "ar" ? "جميع الماركات" : "All Brands"}
              </h3>
            </div>
            <span className="text-xs font-bold text-gray-400">
              {gridBrands.length} {t('brands')}
            </span>
          </div>

          {/* الشبكة غير المتماثلة */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridBrands.map((brand, index) => {
              const isHovered = hoveredId === brand.id;
              const brandImageUrl = getImageUrl(brand.image);
              // ✅ أحجام مختلفة للشبكة (بعضها كبير وبعضها عادي)
              const isLarge = index % 5 === 0; // كل خامس يكون كبير
              const isWide = index % 3 === 1; // كل ثالث يكون عريض

              return (
                <Link
                  key={brand.id}
                  to={`/brands/${brand.id}`}
                  onMouseEnter={() => setHoveredId(brand.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group relative block overflow-hidden rounded-[2.5rem] bg-white border border-gray-100 transition-all duration-700 hover:shadow-[0_30px_80px_rgba(0,0,0,0.08)] hover:-translate-y-
