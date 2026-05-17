// src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { lang, t } = useLang();
  const API_URL = "http://localhost:3000";
  const variantsCount = product.options?.length || 0;

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    const cleanPath = imagePath.replace(/^assets\//i, "");
    return `${API_URL}/assets/${cleanPath}`;
  };

  const productName = lang === "ar" ? product.name_ar : product.name_en;

  return (
    <div className="group relative">
      <Link
        to={`/product/${product.id}`}
        className="relative block bg-white rounded-[2.5rem] p-4 transition-all duration-700 hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)] overflow-hidden border border-transparent hover:border-gray-50/50"
      >
        <div className="absolute top-6 inset-x-6 z-10 flex justify-between items-start flex-row-reverse">
          <span className="bg-white/80 backdrop-blur-md text-[8px] font-black text-gray-900 px-3 py-2 rounded-xl uppercase tracking-[0.15em] shadow-sm border border-white/50">
            {product.brand_name}
          </span>
          <div className="bg-green-500/10 backdrop-blur-md p-1.5 rounded-full border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          </div>
        </div>
        <div className="aspect-[1/1.1] rounded-[2rem] bg-[#F8F8F8] mb-6 overflow-hidden relative transition-colors duration-700 group-hover:bg-[#F3F3F3]">
          <img
            src={getImageUrl(product.image)}
            className="w-full h-full object-contain p-10 transform transition-all duration-[1.5s] cubic-bezier(0.4, 0, 0.2, 1) group-hover:scale-110 group-hover:rotate-2"
            alt={productName}
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="absolute inset-x-4 bottom-4 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out">
            <button
              onClick={(e) => {
                e.preventDefault();
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
              className="w-full bg-gray-900 text-white py-4 rounded-[1.2rem] text-[10px] font-black shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:bg-pink-600 transition-all duration-300 uppercase tracking-[0.1em] flex items-center justify-center gap-2"
            >
              <span>{t('addToCart')}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </div>
        <div className="px-3 pb-2 text-right space-y-4">
          <h3 className="text-gray-900 font-bold text-[15px] leading-snug line-clamp-2 min-h-[42px] group-hover:text-pink-600 transition-colors duration-300">{productName}</h3>
          <div className="flex items-end justify-between pt-2 border-t border-gray-50">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-pink-500 uppercase tracking-[0.2em] mb-1">{t('price')}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black text-gray-900 tracking-tighter tabular-nums"><span className="text-lg ml-0.5">₪</span>{product.price}</span>
              </div>
            </div>
            {product.has_variants && product.options?.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                  <img src={getImageUrl(product.options[0].image)} alt="" className="w-full h-full object-contain p-0.5" onError={(e) => e.target.style.display = 'none'} />
                </div>
                <span className="text-[9px] font-bold text-gray-600">{lang === "ar" ? `+${variantsCount - 1} أخرى` : `+${variantsCount - 1} more`}</span>
              </div>
            ) : (
              <span className="text-[9px] font-bold text-gray-300 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">{lang === "ar" ? "شكل واحد" : "Single Style"}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};
export default ProductCard;