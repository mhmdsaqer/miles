// src/components/LuxuryCard.jsx
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { useMemo, useState } from "react";
import { getImageUrl } from "../utils/imageUtils"; // ✅ استخدام الدالة المركزية

const LuxuryCard = ({ item }) => {
  const { lang } = useLang();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // ✅ اسم المنتج حسب اللغة
  const productName = useMemo(() => {
    if (!item) return "";
    return item[lang === "ar" ? "name_ar" : "name_en"] || item.name_ar;
  }, [item, lang]);

  const itemImageUrl = getImageUrl(item.image);

  return (
    <Link
      to={`/product/${item.id}`}
      className="min-w-[260px] md:min-w-[320px] snap-start group relative"
    >
      {/* ✅ ✅ ✅ الإصلاح: padding متجاوب لجميع أحجام الشاشات */}
      {/* الجوال: p-4 (1rem) | التابلت: sm:p-6 (1.5rem) | الديسكتوب: md:p-8 lg:p-10 */}
      <div className="aspect-[4/5] bg-white rounded-[2.5rem] p-4 sm:p-6 md:p-8 lg:p-10 flex items-center justify-center mb-6 overflow-hidden relative border border-gray-50 transition-all duration-700 group-hover:shadow-[0_40px_100px_rgba(0,0,0,0.05)] group-hover:-translate-y-2">
        
        {/* Loading Spinner */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Error State */}
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-[2rem]">
            <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        ) : (
          <img
            src={itemImageUrl}
            className={`max-h-full w-full object-contain transition-transform duration-700 group-hover:scale-110 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            alt={productName}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageError(true);
              setImageLoaded(true);
              e.target.style.display = 'none';
            }}
          />
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      </div>
      
      {/* Product Info */}
      <div className="px-2 text-right space-y-1">
        <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest">
          {item.brand_name}
        </p>
        <h3 className="font-bold text-[14px] text-gray-800 truncate group-hover:text-pink-600 transition-colors">
          {productName}
        </h3>
        <p className="text-gray-950 font-black text-base">₪{item.price}</p>
      </div>
    </Link>
  );
};

export default LuxuryCard;