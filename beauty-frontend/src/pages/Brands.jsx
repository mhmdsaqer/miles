import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useLang } from "../context/LanguageContext";
import SEO from "../components/SEO";
import { getImageUrl } from "../utils/imageUtils";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

const Brands = () => {
  const { lang, t } = useLang();
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setError(null);
        const [brandsRes, productsRes] = await Promise.all([
          axios.get(`${API_URL}/brands`),
          axios.get(`${API_URL}/products?limit=1000`),
        ]);
        const productsData = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.products || [];
        setBrands(brandsRes.data);
        setProducts(productsData);
      } catch (err) {
        setError(err.message || "فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const enrichedBrands = useMemo(() => {
    return brands.map((brand) => ({
      ...brand,
      productCount: products.filter((p) => p.brand_id === brand.id).length,
      displayName: brand[`name_${lang}`] || brand.name
    }));
  }, [brands, products, lang]);

  const brandsSeoData = useMemo(() => ({
    title: lang === "ar" ? "الماركات العالمية" : "Global Brands",
    description: lang === "ar"
      ? "اكتشفي مجموعتنا الحصرية من 10 ماركات عالمية في العناية والجمال. منتجات أصلية 100%، شحن آمن، ودفع عند الاستلام."
      : "Discover our exclusive collection of 10 global beauty and care brands. 100% authentic products, secure shipping, and cash on delivery.",
    image: "/assets/hero/og-brands.jpg",
    url: "/brands",
    type: "collection"
  }), [lang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pt-32 px-6 lg:px-12" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="max-w-[1400px] mx-auto">
          <div className="h-12 w-48 bg-gray-100 rounded-2xl animate-pulse mb-12" />
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-100 rounded-[2rem] animate-pulse" />
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
    <div className={`min-h-screen bg-[#FAFAFA] pt-28 sm:pt-32 pb-20 sm:pb-24 ${lang === "ar" ? "font-arabic" : "font-latin"}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <SEO title={brandsSeoData.title} description={brandsSeoData.description} image={brandsSeoData.image} url={brandsSeoData.url} type={brandsSeoData.type} />
      
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="mb-12 sm:mb-16 border-b border-gray-100 pb-8 sm:pb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div className={`space-y-2 sm:space-y-3 ${lang === "ar" ? "text-right" : "text-left"}`}>
            <nav className={`flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-pink-500 uppercase tracking-[0.2em] ${lang === "ar" ? "flex-row" : "flex-row-reverse"}`}>
              <Link to="/shop" className="hover:text-black transition-colors">{t('shop')}</Link>
              <span className="text-gray-200">/</span>
              <span className="text-gray-900">{t('brands')}</span>
            </nav>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tighter leading-none">{t('globalBrands')}</h1>
            <p className="text-gray-400 text-xs sm:text-sm font-medium">{enrichedBrands.length} {t('brands')} · {products.length} {t('products')}</p>
          </div>
          <Link to="/shop" className={`group inline-flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all ${lang === "ar" ? "flex-row-reverse" : ""}`}>
            <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all ${lang === "ar" ? "" : "rotate-180"}`}>←</span>
            {t('allProducts')}
          </Link>
        </div>

        {/* Brands Grid - Premium Clean Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {enrichedBrands.map((brand, index) => {
            const isHovered = hoveredId === brand.id;
            const brandImageUrl = getImageUrl(brand.image);
            return (
              <Link
                key={brand.id}
                to={`/brands/${brand.id}`}
                onMouseEnter={() => setHoveredId(brand.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group relative block"
              >
                <div className="relative rounded-[2rem] overflow-hidden bg-white border border-gray-100 transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] hover:-translate-y-1 h-full flex flex-col">
                  {/* Soft Gradient Background */}
                  <div className={`absolute inset-0 opacity-30 ${['bg-gradient-to-br from-pink-50 to-purple-50', 'bg-gradient-to-br from-blue-50 to-cyan-50', 'bg-gradient-to-br from-amber-50 to-orange-50', 'bg-gradient-to-br from-emerald-50 to-teal-50'][index % 4]} transition-opacity duration-500 group-hover:opacity-60`} />
                  
                  {/* Logo Area */}
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center p-4 mb-4 transition-transform duration-500 group-hover:scale-105 group-hover:shadow-md overflow-hidden">
                      {brand.image ? (
                        <img src={brandImageUrl} alt={brand.displayName} className="w-full h-full object-contain" loading="lazy" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span class="text-2xl text-gray-300">🏷️</span>`; }} />
                      ) : <span className="text-2xl text-gray-300">🏷️</span>}
                    </div>
                    <h2 className={`text-center font-black text-gray-900 text-lg sm:text-xl tracking-tight ${lang === "en" ? "font-latin" : ""}`}>{brand.displayName}</h2>
                    <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">{brand.productCount} {t('products')}</p>
                  </div>

                  {/* Hover CTA */}
                  <div className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-white/90 via-white/60 to-transparent transition-all duration-500 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <span className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-700 px-4 py-2 rounded-full bg-white/80 border border-gray-100 shadow-sm ${lang === "ar" ? "flex-row-reverse" : ""}`}>
                      {lang === "ar" ? "استكشف المجموعة" : "View Collection"}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={lang === "en" ? "rotate-180" : ""}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </span>
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
