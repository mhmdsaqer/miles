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
    <div className="group relative">
      <Link
        to={`/product/${product.id}`}
        className="relative block bg-white rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 overflow-hidden border border-gray-100/50 hover:border-pink-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brand Badge & Stock Indicator */}
        <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-start">
          <span className="bg-white/90 backdrop-blur-sm text-[9px] font-bold text-gray-700 px-2.5 py-1 rounded-lg uppercase tracking-wide shadow-sm border border-gray-100">
            {product.brand_name}
          </span>
          <div className="bg-green-500/10 backdrop-blur-sm p-1 rounded-full border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          </div>
        </div>

        {/* Image Container */}
        <div className="aspect-[4/5] rounded-xl bg-[#F8F8F8] mb-3 overflow-hidden relative transition-colors duration-300 group-hover:bg-[#F3F3F3] p-4 sm:p-5 flex items-center justify-center">
          <img
            src={getImageUrl(product.image)}
            className="w-full h-full object-contain transform transition-transform duration-500 group-hover:scale-105"
            alt={productName}
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          {/* Add to Cart Button - Mobile: always visible | Desktop: hover reveal */}
          <div className="absolute inset-x-2 bottom-2 md:inset-x-4 md:bottom-4 md:translate-y-4 md:opacity-0 translate-y-0 opacity-100 transition-all duration-300 ease-out">
            <button
              onClick={handleAddToCart}
              className="w-full bg-gray-900 text-white py-2.5 md:py-3 rounded-xl text-[10px] md:text-[11px] font-bold shadow-lg hover:bg-pink-600 transition-all duration-300 uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              {t('addToCart')}
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="px-1 pb-1 space-y-2">
          <h3 className="text-gray-900 font-semibold text-sm sm:text-base leading-snug line-clamp-2 min-h-[40px] sm:min-h-[48px] group-hover:text-pink-600 transition-colors duration-300">
            {productName}
          </h3>
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
        </div>
      </Link>
    </div>
  );
};
export default ProductCard;
