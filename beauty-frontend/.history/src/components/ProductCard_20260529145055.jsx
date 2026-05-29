// src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";
import { getImageUrl } from "../utils/imageUtils";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { lang, t } = useLang();
  const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";
  const variantsCount = product.options?.length || 0;


  const productName = lang === "ar" ? product.name_ar : product.name_en;

  return (
    <div className="group relative">
    {/* 1️⃣ رابط التنقل (الصورة + العنوان + السعر فقط) */}
    <Link
      to={`/product/${product.id}`}
      className="relative block bg-white rounded-[2.5rem] p-4 transition-all duration-700 hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)] overflow-hidden border border-transparent hover:border-gray-50/50"
    >
      {/* ... (نفس محتوى الـ Badge والشعار والأعلى) ... */}
      <div className="aspect-[1/1.1] rounded-[2rem] bg-[#F8F8F8] mb-6 overflow-hidden relative transition-colors duration-700 group-hover:bg-[#F3F3F3] p-4 md:p-6 lg:p-10">
        <img
          src={getImageUrl(product.image)}
          className="w-full h-full object-contain transform transition-all duration-[1.5s] cubic-bezier(0.4, 0, 0.2, 1) group-hover:scale-110"
          alt={productName}
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>

      <div className="px-3 pb-2 text-right space-y-4">
        <h3 className="text-gray-900 font-bold text-[15px] leading-snug line-clamp-2 min-h-[42px] group-hover:text-pink-600 transition-colors duration-300">{productName}</h3>
        <div className="flex items-end justify-between pt-2 border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-pink-500 uppercase tracking-[0.2em] mb-1">{t('price')}</span>
            <span className="text-2xl font-black text-gray-900 tracking-tighter tabular-nums"><span className="text-lg ml-0.5">₪</span>{product.price}</span>
          </div>
          {/* ... (نفس مؤشر المتغيرات) ... */}
        </div>
      </div>
    </Link>

    {/* 2️⃣ زر الإضافة منفصل تماماً عن الـ Link */}
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation(); // ✅ يمنع النقرة من الوصول للرابط أو أي عنصر أب
        addToCart(product);
        const price = product.price;
        toast.success(
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-lg">🛍️</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{t("addToCart")}</p>
              <p className="text-xs text-gray-500 truncate max-w-[180px]">{productName} • ₪{price}</p>
            </div>
          </div>,
          { duration: 3000 }
        );
      }}
      className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 bg-gray-900 text-white px-6 py-3 rounded-full text-[10px] font-black shadow-xl hover:bg-pink-600 transition-all uppercase tracking-[0.1em] flex items-center gap-2 md:opacity-0 md:translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0 opacity-100 translate-y-0"
    >
      <span>{t('addToCart')}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
    </button>
  </div>
  );
};
export default ProductCard;
