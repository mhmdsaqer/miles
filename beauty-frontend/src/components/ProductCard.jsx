import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";
import { getImageUrl } from "../utils/imageUtils";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { lang, t } = useLang();
  const variantsCount = product.options?.length || 0;
  const productName = lang === "ar" ? product.name_ar : product.name_en;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
  };

  return (
    <div className="group relative bg-white rounded-[2rem] p-3 sm:p-4 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 overflow-hidden border border-gray-100/50 hover:border-pink-100">
      
      {/* Brand & Stock Badge */}
      <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-start">
        <span className="bg-white/90 backdrop-blur-sm text-[9px] font-bold text-gray-700 px-2.5 py-1 rounded-lg uppercase tracking-wide shadow-sm border border-gray-100">
          {product.brand_name}
        </span>
        <div className="bg-green-500/10 backdrop-blur-sm p-1 rounded-full border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
        </div>
      </div>

      {/* 🔹 Image Area - Clean & Uncluttered */}
      <Link
        to={`/product/${product.id}`}
        className="block relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aspect-[4/5] rounded-[1.5rem] bg-[#F8F8F8] mb-4 overflow-hidden flex items-center justify-center p-5 sm:p-6 transition-colors duration-300 group-hover:bg-[#F3F3F3]">
          <img
            src={getImageUrl(product.image)}
            className="w-full h-full object-contain transform transition-transform duration-500 group-hover:scale-105"
            alt={productName}
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </Link>

      {/* 🔹 Product Info Section */}
      <div className="px-1 pb-1 space-y-3">
        <Link to={`/product/${product.id}`} className="block" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-gray-900 font-semibold text-sm sm:text-base leading-snug line-clamp-2 min-h-[40px] sm:min-h-[48px] group-hover:text-pink-600 transition-colors duration-300">
            {productName}
          </h3>
        </Link>

        <div className="flex items-end justify-between pt-2 border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-pink-500 uppercase tracking-wider mb-0.5">{t('price')}</span>
            <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight tabular-nums">
              <span className="text-sm ml-0.5">₪</span>{product.price}
            </span>
          </div>
          
          {product.has_variants && variantsCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                <img src={getImageUrl(product.options[0].image)} alt="" className="w-full h-full object-contain p-0.5" onError={(e) => e.target.style.display = 'none'} />
              </div>
              <span className="text-[9px] font-medium text-gray-500">
                {lang === "ar" ? `+${variantsCount - 1} أخرى` : `+${variantsCount - 1} more`}
              </span>
            </div>
          ) : (
            <span className="text-[9px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
              {lang === "ar" ? "شكل واحد" : "Single Style"}
            </span>
          )}
        </div>

        {/* 🔹 Add to Cart Button - Separated & Optimized */}
        <button
          onClick={handleAddToCart}
          className="w-full bg-gray-900 text-white py-3 rounded-xl text-[11px] font-bold shadow-sm hover:bg-pink-600 transition-all duration-300 uppercase tracking-wider flex items-center justify-center gap-2 mt-2
                     /* Mobile: Always visible */ opacity-100 translate-y-0 
                     /* Desktop: Hidden until hover */ md:opacity-0 md:translate-y-2 group-hover:md:opacity-100 group-hover:md:translate-y-0"
          aria-label={`${t('addToCart')} ${productName}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          {t('addToCart')}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
