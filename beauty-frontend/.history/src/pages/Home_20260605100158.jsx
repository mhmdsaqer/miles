// src/pages/Home.jsx - النسخة النهائية المتوافقة مع MongoDB
import SEO from "../components/SEO";
import { Link } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useLang } from "../context/LanguageContext";
import { getImageUrl } from "../utils/imageUtils";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";
const HERO_IMAGES = {
  ar: "https://res.cloudinary.com/dvd2u8csu/image/upload/v1780642535/hero-main-ar_wfhsaa.png",
  en: "https://res.cloudinary.com/dvd2u8csu/image/upload/v1780642540/hero-main-en_l68qfa.png"
};
const ABOUT_US = ""

const Home = () => {
  const { lang, t } = useLang();
  
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);



  // ✅ جلب البيانات - مع معالجة أخطاء منفصلة
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        
        // نجلب البيانات بشكل منفصل لتجنب فشل الكل إذا فشل واحد
        const brandsRes = await axios.get(`${API_URL}/brands`);
        const productsRes = await axios.get(`${API_URL}/products?limit=100`);
        const categoriesRes = await axios.get(`${API_URL}/categories`);
        
        // ⚠️ نجلب variants بشكل منفصل مع try/catch لأنه قد لا يكون موجوداً
        let variantsData = [];
        try {
          const variantsRes = await axios.get(`${API_URL}/variants`);
          variantsData = variantsRes.data;
        } catch (err) {
          console.warn("⚠️ /variants endpoint not found - skipping variants stats");
          variantsData = [];
        }
        
        // ✅ دعم هيكلية الاستجابة الجديدة للمنتجات (مع Pagination)
        const productsData = Array.isArray(productsRes.data) 
          ? productsRes.data 
          : productsRes.data?.products || [];
        
        setBrands(brandsRes.data);
        setProducts(productsData);
        setCategories(categoriesRes.data);
        setVariants(variantsData);
        
      } catch (err) {
        console.error("❌ Fetch Error:", {
          message: err.message,
          status: err.response?.status,
          url: err.config?.url
        });
        setError(err.response?.status === 404 
          ? "Endpoint غير موجود - تأكد من تشغيل السيرفر" 
          : "فشل الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ حساب الإحصائيات (حتى لو variants فارغة)
  const stats = useMemo(() => ({
    brands: brands.length,
    products: products.length,
    categories: categories.filter(c => c.parent_id === null).length,
    variants: variants.length
  }), [brands, products, categories, variants]);

  const topBrands = useMemo(() => brands.slice(0, 10), [brands]);

  // ===== Loading State =====
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-gray-100 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 font-medium">{t('loading')}</p>
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
    <div className={`min-h-screen bg-white ${lang === "ar" ? "font-arabic" : "font-latin"}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      {/* ✅ أضف مكون الـ SEO هنا */}
      <SEO
        title={lang === "ar" ? "الرئيسية" : "Home"}
        description={lang === "ar" 
          ? "MILES Beauty Store - وكيل حصري لـ 10 ماركات عالمية في فلسطين. تسوقي الآن أفضل منتجات العناية والجمال." 
          : "MILES Beauty Store - Exclusive agent for 10 global beauty brands in Palestine. Shop the finest care products now."}
        image="/assets/hero/og-image.jpg"
        url="/"
        type="website"
      />
      {/* ===== 1. HERO SECTION ===== */}
      <section className="relative h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            key={`hero-image-${lang}`} 
            src={HERO_IMAGES[lang]}
            alt="MILES Beauty" 
            className="w-full h-full object-cover"
            loading="eager" // ✅ مهم جداً: يخبر المتصفح أن هذه الصورة أولوية قصوى
            fetchPriority="high" // ✅ ميزة حديثة تسرع تحميل الصورة الرئيسية
            decoding="async"
            onError={(e) => {
              console.warn("Failed to load hero image");
              e.target.style.display = 'none';
              e.target.parentElement.style.backgroundColor = '#1a1a1a';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/30 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 w-full">
          <div className="max-w-2xl text-white space-y-8">
            <div className="space-y-4">
              <p className="text-pink-400 text-sm font-black uppercase tracking-[0.3em]">{t('exclusiveAgent')}</p>
              <h1 className="text-6xl md:text-8xl font-black leading-none tracking-tighter">
                <span className="font-latin block">MILES</span>
                <span className="block text-pink-500 text-5xl md:text-7xl mt-2 font-latin">BEAUTY STORE</span>
              </h1>
            </div>
            <p className="text-xl text-gray-200 font-medium leading-relaxed max-w-xl">{t('beautyDestination')}</p>
            <div className="flex flex-wrap gap-6 pt-4">
              <Link to="/shop" className="group bg-pink-600 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.15em] hover:bg-pink-700 transition-all duration-500 shadow-[0_20px_60px_rgba(236,72,153,0.4)] flex items-center gap-4">
                {t('shopNow')}
                <svg className={`w-5 h-5 transition-transform ${lang === "ar" ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link to="/brands" className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.15em] hover:bg-white hover:text-gray-900 transition-all duration-500">{t('exploreBrands')}</Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 start-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center p-2"><div className="w-1 h-3 bg-white rounded-full animate-pulse"></div></div>
        </div>
      </section>

      {/* ===== 2. ABOUT SECTION ===== */}
      <section className="py-32 bg-[#FAFAFA]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-[4/5] rounded-[3rem] overflow-hidden bg-gray-100">
                <img 
                  src="https://res.cloudinary.com/dvd2u8csu/image/upload/v1780642560/about-us_an41np.png" 
                  alt="About MILES" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.warn("Failed to load about image");
                    e.target.style.display = 'none';
                    e.target.parentElement.style.backgroundColor = '#f3f4f6';
                  }}
                />
              </div>
              <div className={`absolute -bottom-8 ${lang === "ar" ? "-left-8" : "-right-8"} w-48 h-48 bg-pink-100 rounded-full blur-3xl opacity-60`}></div>
              <div className={`absolute -top-8 ${lang === "ar" ? "-right-8" : "-left-8"} w-32 h-32 bg-gray-200 rounded-full blur-2xl opacity-40`}></div>
            </div>
            <div className={`space-y-8 ${lang === "ar" ? "text-right" : "text-left"}`}>
              <div className="space-y-4">
                <p className="text-pink-600 text-sm font-black uppercase tracking-[0.3em]">{t('aboutUs')}</p>
                <h2 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">{t('beautyLeader')}<span className="block text-gray-400 text-3xl mt-2">Palestine</span></h2>
              </div>
              <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
                <p><span className="font-black text-gray-900 text-2xl font-latin">MILES Beauty Store</span> {lang === "ar" ? "هي وكيل حصري لـ 10 من أرقى الماركات العالمية في مجال العناية والجمال." : "is an exclusive agent for 10 of the finest global brands in beauty and care."}</p>
                <p>{lang === "ar" ? "منذ تأسيسنا، نلتزم بتقديم منتجات عالية الجودة تلبي تطلعات عملائنا في الضفة الغربية وخارجها. نختار بعناية كل منتج لضمان أفضل تجربة عناية وجمال." : "Since our founding, we have been committed to delivering high-quality products that meet our customers' aspirations in the West Bank and beyond. We carefully select every product to ensure the best care and beauty experience."}</p>
                <p>{lang === "ar" ? "نؤمن بأن الجمال حق للجميع، لذلك نوفر تشكيلة واسعة من المنتجات التي تناسب جميع الاحتياجات والميزانيات." : "We believe beauty is a right for everyone, so we provide a wide range of products that suit all needs and budgets."}</p>
              </div>
              <div className="flex gap-8 pt-4">
                <div className={lang === "ar" ? "text-right" : "text-left"}>
                  <p className="text-4xl font-black text-pink-600 font-latin tabular-nums">100%</p>
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">{t('originalProducts')}</p>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div className={lang === "ar" ? "text-right" : "text-left"}>
                  <p className="text-4xl font-black text-pink-600 font-latin tabular-nums">5+</p>
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">{t('yearsExperience')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3. STATS SECTION ===== */}
      <section className="py-24 bg-gray-900 relative overflow-hidden">
        <div className={`absolute top-0 ${lang === "ar" ? "right-0" : "left-0"} w-96 h-96 bg-pink-600/20 rounded-full blur-[120px]`}></div>
        <div className={`absolute bottom-0 ${lang === "ar" ? "left-0" : "right-0"} w-64 h-64 bg-white/5 rounded-full blur-[80px]`}></div>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: `${stats.brands}`, label: t('globalBrands') },
              { number: `${stats.products}+`, label: t('diverseProducts') },
              { number: `${stats.categories}+`, label: t('productCategories') },
              { number: `${stats.variants}+`, label: t('availableOptions') }
            ].map((stat, index) => (
              <div key={index} className="text-center space-y-3 p-8 rounded-[2rem] bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-500">
                <p className="text-5xl md:text-6xl font-black text-white tracking-tighter font-latin tabular-nums">{stat.number}</p>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 4. TOP BRANDS SECTION ===== */}
      <section className="py-32 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="text-center mb-20 space-y-6">
            <p className="text-pink-600 text-sm font-black uppercase tracking-[0.3em]">{t('ourBrands')}</p>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter">{t('topGlobalBrands')}</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">{lang === "ar" ? "نختار لكِ بعناية أفضل الماركات العالمية لضمان جودة واستثنائية كل منتج" : "We carefully select the best global brands to ensure quality and excellence in every product"}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {topBrands.map((brand, index) => (
              <Link key={brand.id} to={`/brands/${brand.id}`} className="group relative bg-[#F8F8F8] rounded-[2.5rem] p-8 aspect-square flex flex-col items-center justify-center hover:bg-gray-50 transition-all duration-500 hover:shadow-[0_30px_80px_rgba(0,0,0,0.08)] hover:-translate-y-2" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="w-24 h-24 mb-6 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-500">
                  <img 
                    src={getImageUrl(brand.image)} 
                    alt={brand.name}
                    className="w-full h-full object-contain p-4"
                    loading="lazy"
                    onError={(e) => {
                      console.warn(`Failed to load brand image: ${brand.name}`);
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<svg class="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>`;
                    }}
                  />
                </div>
                <h3 className="text-center font-black text-gray-900 text-lg group-hover:text-pink-600 transition-colors font-latin">{brand.name}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{t('discoverMore')}</p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-16">
            <Link to="/brands" className={`inline-flex items-center gap-4 text-gray-900 font-black text-sm uppercase tracking-widest border-b-2 border-gray-900 pb-2 hover:text-pink-600 hover:border-pink-600 transition-all ${lang === "ar" ? "flex-row-reverse" : ""}`}>
              {t('viewAllBrands')}
              <svg className={`w-5 h-5 ${lang === "ar" ? "rtl:rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 5. CTA SECTION ===== */}
      <section className="py-32 bg-gradient-to-br from-pink-600 via-pink-700 to-pink-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className={`absolute top-10 ${lang === "ar" ? "right-10" : "left-10"} w-64 h-64 bg-white/10 rounded-full blur-[80px]`}></div>
          <div className={`absolute bottom-10 ${lang === "ar" ? "left-10" : "right-10"} w-96 h-96 bg-pink-400/20 rounded-full blur-[100px]`}></div>
        </div>
        <div className="max-w-[1000px] mx-auto px-6 lg:px-12 text-center relative z-10 space-y-10">
          <div className="space-y-6">
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">{t('startYourBeauty')}</h2>
            <p className="text-xl text-pink-100 font-medium max-w-2xl mx-auto">{lang === "ar" ? "تسوقي الآن واحصلي على أفضل منتجات العناية والجمال من أرقى الماركات العالمية" : "Shop now and get the best beauty and care products from the finest global brands"}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/shop" className={`group bg-white text-pink-600 px-12 py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.15em] hover:bg-gray-100 transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex items-center gap-4 ${lang === "ar" ? "flex-row-reverse" : ""}`}>
              {t('shopNow')}
              <svg className={`w-5 h-5 transition-transform ${lang === "ar" ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <a href="https://wa.me/970595761050" target="_blank" rel="noopener noreferrer" className={`bg-white/10 backdrop-blur-md border border-white/30 text-white px-12 py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.15em] hover:bg-white hover:text-pink-600 transition-all duration-500 flex items-center gap-4 ${lang === "ar" ? "flex-row-reverse" : ""}`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              {t('contactUs')}
            </a>
          </div>
        </div>
      </section>

      {/* ===== 6. FOOTER CTA ===== */}
      <section className="py-20 bg-[#F8F8F8]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 text-center">
          <p className="text-gray-400 text-sm font-bold uppercase tracking-[0.25em] mb-4">{t('haveQuestion')}</p>
          <h3 className="text-3xl font-black text-gray-900 mb-8">{lang === "ar" ? "فريقنا جاهز لمساعدتكِ في اختيار المنتجات المناسبة" : "Our team is ready to help you choose the right products"}</h3>
          <Link to="/shop" className="inline-block bg-gray-900 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.15em] hover:bg-pink-600 transition-all duration-500">{t('browseProducts')}</Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
