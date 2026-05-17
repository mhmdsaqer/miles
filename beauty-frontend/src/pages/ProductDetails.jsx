// src/pages/ProductDetails.jsx - النسخة المُصححة نهائيًا
import SEO from "../components/SEO";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import LuxuryCard from "../components/LuxuryCard";
import { toast } from "sonner";
import { getImageUrl } from "../utils/imageUtils";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { lang, t } = useLang();
  
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [brandProducts, setBrandProducts] = useState([]);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [mainImage, setMainImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

  const productSeoData = useMemo(() => {
    if (!product) return null;
    return {
      name: product[lang === "ar" ? "name_ar" : "name_en"] || product.name_ar,
      description: product[lang === "ar" ? "description_ar" : "description_en"] || product.description_ar,
      brand: product.brand_name,
      price: selectedVariant?.price ?? product.price,
      inStock: true, rating: 4.8, reviewCount: 127
    };
  }, [product, selectedVariant, lang]);



  const getProductName = (p) => p?.[lang === "ar" ? "name_ar" : "name_en"] || p?.name_ar || "";
  const getProductDescription = (p) => p?.[lang === "ar" ? "description_ar" : "description_en"] || p?.description_ar || "";
  
  const shuffleArray = useCallback((array) => {
    if (!array) return [];
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // ✅ دالة مساعدة ذكية: تتعامل مع كائن أو مصفوفة لعرض خصائص المتغير
  const getVariantText = useCallback((attributes) => {
    if (!attributes) return "";
    
    // إذا كانت مصفوفة (هيكلية الـ Frontend الجديدة)
    if (Array.isArray(attributes)) {
      return attributes
        .filter(attr => attr?.key?.trim())
        .map(attr => String(attr.value ?? ""))
        .slice(0, 2)
        .join(" • ");
    }
    
    // إذا كانت كائناً (هيكلية الداتابيس القديمة)
    return Object.entries(attributes)
      .map(([_, value]) => String(value))
      .slice(0, 2)
      .join(" • ");
  }, []);

  useEffect(() => {
    const fetchAndFilter = async () => {
      try {
        const res = await axios.get(`${API_URL}/products/${id}`);
        const current = res.data;
        setProduct(current);
        if (current.options?.length > 0) {
          setSelectedVariant(current.options[0]);
          setMainImage(getImageUrl(current.options[0].image));
        } else {
          setMainImage(getImageUrl(current.image));
        }
        setImageLoaded(false); 
        setImageError(false);

        const allRes = await axios.get(`${API_URL}/products`);
        const allData = Array.isArray(allRes.data) ? allRes.data : allRes.data?.products || [];
        const brandMatch = allData.filter((p) => p.brand_id === current.brand_id && String(p.id) !== String(id)).filter(p => p.image);
        setBrandProducts(shuffleArray(brandMatch).slice(0, 8));
        const categoryMatch = allData.filter((p) => p.category_id === current.category_id && String(p.id) !== String(id) && p.brand_id !== current.brand_id).filter(p => p.image);
        setSuggestedProducts(shuffleArray(categoryMatch).slice(0, 8));
      } catch (err) { 
        console.error("Fetch Error:", err); 
      }
    };
    fetchAndFilter();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id, lang, getImageUrl, shuffleArray]);

  useEffect(() => {
    if (selectedVariant?.image) {
      const newImage = getImageUrl(selectedVariant.image);
      if (newImage !== mainImage) { 
        setImageLoaded(false); 
        setImageError(false); 
        setMainImage(newImage); 
      }
    }
  }, [selectedVariant, getImageUrl, mainImage]);

  const handleImageLoad = useCallback(() => { 
    setImageLoaded(true); 
    setImageError(false); 
  }, []);
  
  const handleImageError = useCallback((e) => { 
    setImageError(true); 
    setImageLoaded(true); 
    e.target.style.display = 'none'; 
  }, []);
  
  const handleBack = useCallback(() => { 
    window.history.length > 1 ? navigate(-1) : navigate("/"); 
  }, [navigate]);

  const currentPrice = selectedVariant?.price ?? product?.price;

  // ✅ دالة الإضافة للسلة - مُصححة لعرض الخصائص بشكل صحيح
  const handleAddToCart = useCallback(() => {
    if (product) {
      addToCart(product, selectedVariant, quantity);
      const prodName = getProductName(product);
      
      // ✅ استخدام الدالة الذكية لعرض خصائص المتغير
      const variantText = selectedVariant
        ? getVariantText(selectedVariant.attributes)
        : (lang === "ar" ? "إصدار أساسي" : "Standard Version");
      
      toast.success(
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-lg mt-0.5">✨</div>
          <div>
            <p className="font-bold text-gray-900">{t("addToBag")}</p>
            <p className="text-sm text-gray-600 mt-1">{prodName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {variantText} • {t("quantity")}: {quantity} • ₪{(currentPrice * quantity).toFixed(2)}
            </p>
          </div>
        </div>,
        {
          action: { 
            label: <span className="font-bold text-pink-600">{t("viewCart")}</span>, 
            onClick: () => navigate("/cart") 
          },
          duration: 5000
        }
      );
    }
  }, [product, selectedVariant, quantity, addToCart, lang, currentPrice, t, navigate, getVariantText]);

  if (!product) return ( 
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gray-100 border-t-pink-500 rounded-full animate-spin"></div>
        <span className="font-black text-gray-200 tracking-[0.5em] uppercase animate-pulse">Miles</span>
      </div>
    </div> 
  );

  const itemTotal = currentPrice * quantity;

  return (
    <div className="min-h-screen bg-[#FDFDFD]" dir={lang === "ar" ? "rtl" : "ltr"}>
      {product && (
        <SEO 
          title={productSeoData?.name} 
          description={productSeoData?.description} 
          image={mainImage} 
          url={`/product/${product.id}`} 
          type="product" 
          productData={productSeoData} 
        />
      )}
      
      <section className="flex flex-col lg:flex-row min-h-screen">
        {/* ===== Visual Gallery (Left) ===== */}
        <div className="w-full lg:w-[55%] bg-[#F1F1F1] flex flex-col items-center justify-center p-4 lg:p-12 relative overflow-hidden">
          <button 
            onClick={handleBack} 
            className="fixed top-24 right-6 lg:top-12 lg:right-8 z-[110] group flex items-center gap-4 bg-white/60 backdrop-blur-xl py-2.5 px-5 rounded-full border border-white/50 shadow-lg transition-all hover:bg-white hover:shadow-xl"
          >
            <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center group-hover:rotate-12 transition-transform">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </span>
            <span className="text-[9px] font-black tracking-widest text-gray-900 uppercase hidden sm:block">{t("back")}</span>
          </button>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-100/20 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="relative z-10 w-full max-w-lg aspect-square flex items-center justify-center">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
              </div>
            )}
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-[2rem]">
                <svg className="w-20 h-20 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <img 
              key={`${product.id}-${selectedVariant?.id || 'main'}`} 
              src={mainImage} 
              className={`max-h-full w-auto object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.08)] transition-all duration-500 ${
                imageLoaded ? "opacity-100 hover:scale-[1.03] cursor-zoom-in" : "opacity-0"
              }`} 
              alt={getProductName(product)} 
              onLoad={handleImageLoad} 
              onError={handleImageError} 
            />
          </div>
          
          {product.options?.length > 1 && (
            <div className="flex gap-3 mt-6 overflow-x-auto pb-2 scrollbar-hide">
              {product.options.map((opt) => {
                const thumbUrl = getImageUrl(opt.image);
                const isActive = selectedVariant?.id === opt.id;
                return (
                  <button 
                    key={opt.id} 
                    onClick={() => setSelectedVariant(opt)} 
                    className={`relative w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                      isActive ? "border-black shadow-lg scale-105" : "border-transparent hover:border-gray-200"
                    }`}
                  >
                    <img src={thumbUrl} alt="" className="w-full h-full object-contain p-2" loading="lazy" onError={(e) => e.target.style.display = 'none'} />
                    {isActive && (
                      <div className="absolute inset-0 border-2 border-black rounded-2xl pointer-events-none"></div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== Product Info (Right) ===== */}
        <div className="w-full lg:w-[45%] p-6 lg:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-lg mx-auto w-full space-y-8">
            <header className="space-y-5 text-right">
              <Link to={`/?brand=${product.brand_id}`} className="inline-flex items-center gap-2 bg-pink-50 text-pink-600 px-4 py-1.5 rounded-full hover:bg-pink-100 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">{product.brand_name}</span>
              </Link>
              <h1 className="text-4xl lg:text-5xl font-black text-gray-900 leading-[1.1] tracking-tight">{getProductName(product)}</h1>
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="text-4xl font-black text-gray-900 tracking-tight">₪{currentPrice}</span>
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{t("taxIncluded")}</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">✅ {t("availableForShipping")}</span>
              </div>
            </header>
            
            <p className="text-gray-500 leading-relaxed text-base font-medium text-right border-r-4 border-pink-100 pr-5">{getProductDescription(product)}</p>
            
            {/* Variants Selector */}
            {product.has_variants && product.options?.length > 0 && (
              <div className="space-y-4 text-right">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">{t("chooseVariant")}</h4>
                  <span className="text-[10px] text-gray-400">{product.options.length} {t("options")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.options?.map((opt) => {
                    const label = getVariantText(opt.attributes);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedVariant(opt)}
                        className={`px-5 py-3 rounded-xl border-2 transition-all duration-300 text-[10px] font-black text-right max-w-full truncate ${
                          selectedVariant?.id === opt.id
                            ? "border-black bg-black text-white shadow-lg"
                            : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {label || (lang === "ar" ? "بدون خصائص" : "No attributes")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Quantity + Add to Cart */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">{t("quantity")}</span>
                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-100">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-900 font-black hover:bg-pink-50 hover:border-pink-100 hover:text-pink-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed">−</button>
                  <span className="w-8 text-center text-sm font-black text-gray-900">{quantity}</span>
                  <button onClick={() => setQuantity((q) => q + 1)} className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-900 font-black hover:bg-pink-50 hover:border-pink-100 hover:text-pink-600 transition-all">+</button>
                </div>
              </div>
              <button 
                onClick={handleAddToCart} 
                className="group w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black text-base transition-all hover:bg-pink-600 shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_50px_rgba(236,72,153,0.25)] flex items-center justify-center gap-4 active:scale-[0.98]"
              >
                <span>{t("addToBag")} • ₪{itemTotal.toFixed(2)}</span>
                <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
                  </svg>
                </div>
              </button>
            </div>
            
            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[{ icon: "✨", label: t("100PercentOriginal") }, { icon: "↩️", label: t("freeReturns") }, { icon: "💳", label: t("securePayment") }].map((badge) => (
                <div key={badge.label} className="flex flex-col items-center gap-2 text-center p-3 rounded-xl bg-gray-50">
                  <span className="text-xl">{badge.icon}</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* ===== Product Info Tabs ===== */}
      <section className="max-w-[1000px] mx-auto px-6 lg:px-12 py-16">
        <div className="border-b border-gray-100 mb-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {[{ id: "description", label: t("description") }, { id: "ingredients", label: t("ingredients") }, { id: "usage", label: t("howToUse") }].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "border-black text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-right text-gray-600 leading-relaxed space-y-4">
          {activeTab === "description" && (<p className="text-base">{getProductDescription(product)}</p>)}
          {activeTab === "ingredients" && (<p className="text-base">{product?.[lang === "ar" ? "ingredients_ar" : "ingredients_en"] || t("ingredientsOnPackaging")}</p>)}
          {activeTab === "usage" && (<p className="text-base">{product?.[lang === "ar" ? "usage_ar" : "usage_en"] || t("applyOnCleanSkin")}</p>)}
        </div>
      </section>
      
      {/* ===== Discovery Sections ===== */}
      <footer className="py-20 space-y-32 bg-[#FAFAFA]">
        {brandProducts.length > 0 && (
          <div className="space-y-12">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-end gap-4 text-right">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">🎲 {t("youMayAlsoLike")} {product.brand_name}</h2>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.4em]">{t("curatedForYou")}</p>
              </div>
              <Link to={`/?brand=${product.brand_id}`} className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all">
                {t("allProducts")}
                <span className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">←</span>
              </Link>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-12 px-6 lg:px-[calc((100vw-1400px)/2+24px)] scrollbar-hide snap-x">
              {brandProducts.map((item) => (<LuxuryCard key={item.id} item={item} />))}
            </div>
          </div>
        )}
        {suggestedProducts.length > 0 && (
          <div className="py-20">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-12 text-right mb-12 space-y-2">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">✨ {t("youMayAlsoLike")}</h2>
              <p className="text-pink-500 text-[10px] font-black uppercase tracking-[0.5em]">{t("curatedForYou")}</p>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-12 px-6 lg:px-[calc((100vw-1400px)/2+24px)] scrollbar-hide snap-x">
              {suggestedProducts.map((item) => (<LuxuryCard key={item.id} item={item} />))}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};

export default ProductDetails;
